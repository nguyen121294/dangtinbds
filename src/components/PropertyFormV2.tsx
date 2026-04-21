"use client";
import { useState, useCallback, useEffect } from "react";
import { Loader2, Sparkles, ImagePlus, X, FolderOpen, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react"; 
import { useGoogleLogin } from '@react-oauth/google';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import useDrivePicker from 'react-google-drive-picker';

// Không expose prompt mặc định ở client — chỉ label cho user biết
const PROMPT_MODE_DEFAULT = 'default';
const PROMPT_MODE_CUSTOM = 'custom';

const styleOptions = [
  "Chuyên nghiệp ngắn gọn",
  "Chuyên nghiệp chỉnh chu",
  "Chuyên nghiệp tạo sự khan hiếm",
  "Chuyên nghiệp sang trọng đẳng cấp",
];

export default function PropertyFormV2({ workspaceId }: { workspaceId?: string }) {
  const [rawInfo, setRawInfo] = useState("");
  const [style, setStyle] = useState(styleOptions[0]);
  const [promptMode, setPromptMode] = useState<'default' | 'custom'>(PROMPT_MODE_DEFAULT);
  const [customPrompt, setCustomPrompt] = useState("");
  const [signature, setSignature] = useState("");
  const [availableSignatures, setAvailableSignatures] = useState<string[]>([]);

  // Image state (reuse from V1)
  const [images, setImages] = useState<{file: File, preview: string, base64: string}[]>([]);
  const [objectsToRemove, setObjectsToRemove] = useState<string[]>(["Xe máy, xe hơi", "Thùng rác", "Biển số nhà"]);
  const [customObjectsToRemove, setCustomObjectsToRemove] = useState("");
  const [enhanceImage, setEnhanceImage] = useState(true);
  const [imageProcessingEngine, setImageProcessingEngine] = useState("openai_gpt");

  // General state
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [isSuccess, setIsSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [userCredits, setUserCredits] = useState<number>(0);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<{id: string, name: string} | null>(null);
  const [openPicker, authResponse] = useDrivePicker();
  const supabase = createClient();

  const imageMultiplier = imageProcessingEngine === 'replicate_banana' ? 40 : 10;
  const totalCost = 2 + (images.length * imageMultiplier);

  const handleOpenPicker = () => {
    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
      viewId: 'DOCS',
      token: accessToken,
      showUploadView: false,
      showUploadFolders: false,
      supportDrives: true,
      multiselect: false,
      setIncludeFolders: true,
      setSelectFolderEnabled: true,
      callbackFunction: (data) => {
        if (data.action === 'picked') {
          const doc = data.docs[0];
          setSelectedDriveFolder({ id: doc.id, name: doc.name });
        }
      },
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        setAccessToken(session.provider_token);
      }
      if (session?.user) {
        // Load user settings
        fetch('/api/tool-settings')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              if (data.defaultDriveFolderId) {
                setSelectedDriveFolder({
                  id: data.defaultDriveFolderId,
                  name: data.defaultDriveFolderName || "Thư mục tùy chỉnh"
                });
              }
              if (data.signatures && data.signatures.length > 0) {
                setAvailableSignatures(data.signatures);
                setSignature(data.signatures[0]);
              }
              if (data.customPromptV2 && data.customPromptV2.trim().length > 0) {
                setCustomPrompt(data.customPromptV2);
                setPromptMode(PROMPT_MODE_CUSTOM);
              }
            }
          })
          .catch(() => {});

        // Load credits
        if (workspaceId) {
          fetch(`/api/workspace-credits?workspaceId=${workspaceId}`)
            .then(res => res.json())
            .then(resData => {
              if (resData.success) {
                setUserCredits(resData.credits);
              }
            })
            .catch(() => {});
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) {
        setAccessToken(session.provider_token);
      } else if (!session) {
        setAccessToken("");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setAccessToken(codeResponse.access_token),
    onError: (error) => console.log('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly',
  });

  // Image handling
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };
    
    if (images.length + acceptedFiles.length > 10) {
      alert("Chỉ được up tối đa 10 ảnh!");
      return;
    }

    const compressedImages = await Promise.all(acceptedFiles.map(async (file) => {
      try {
        const compressedFile = await imageCompression(file, options);
        const base64 = await fileToBase64(compressedFile);
        return {
          file: compressedFile,
          preview: URL.createObjectURL(compressedFile),
          base64: base64
        };
      } catch (error) {
        console.error(error);
        return null;
      }
    }));
    
    setImages(prev => [...prev, ...compressedImages.filter((i): i is any => i !== null)]);
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] }
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const defaultObjectsToRemove = ["Xe máy, xe hơi", "Thùng rác", "Biển số nhà"];
  const handleObjectCheckboxChange = (obj: string) => {
    setObjectsToRemove((prev) => {
      if (prev.includes(obj)) {
        return prev.filter((o) => o !== obj);
      } else {
        return [...prev, obj];
      }
    });
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Vui lòng đăng nhập để sử dụng tính năng AI.");
      window.location.href = '/login';
      return;
    }

    if (!accessToken) {
      login();
      return;
    }
    
    setLoading(true);
    setIsSuccess(false);
    
    try {
      let uploadedDriveIds: string[] = [];

      if (images.length > 0) {
        const base64Images = images.map(img => img.base64);
        const uploadRes = await fetch("/api/upload-drive-temp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken, images: base64Images })
        });
        
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
           alert("Lỗi upload ảnh lên Drive: " + uploadData.error);
           setLoading(false);
           return;
        }
        uploadedDriveIds = uploadData.driveFileIds;
      }

      const objectsStr = [...objectsToRemove, customObjectsToRemove].filter(Boolean).join(", ");
      
      const payload = {
         rawInfo,
         style,
         customPrompt: promptMode === PROMPT_MODE_CUSTOM ? customPrompt : null,
         signature,
         access_token: accessToken,
         images: uploadedDriveIds,
         objectsToRemoveStr: objectsStr,
         enhanceImage,
         imageProcessingEngine,
         workspaceId: workspaceId,
         driveFolderId: selectedDriveFolder?.id || null,
         estimatedCost: totalCost
      };

      const res = await fetch("/api/generate-async-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setToastType('success');
        setToastMessage(data.message || 'Yêu cầu đã được gửi. Credit sẽ chỉ bị trừ khi xử lý hoàn thành.');
      } else {
        setToastType('error');
        setToastMessage('Lỗi: ' + (data.error || 'Không rõ nguyên nhân. Không trừ credit.'));
      }
    } catch (err) {
      setToastType('error');
      setToastMessage('Lỗi kết nối máy chủ. Không trừ credit. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
      {/* --- 1. THÔNG TIN BĐS --- */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Thông tin BĐS</h2>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nhập thông tin bất động sản</label>
          <textarea
            required
            rows={6}
            placeholder={`Ví dụ:\nĐất nền 100m2 (5x20m) tại đường Nguyễn Duy Trinh, Q2.\nHướng Đông Nam, sổ riêng, thổ cư 100%.\nGần chợ, trường học. Giá 3.5 tỷ thương lượng.\nLH: 0909 xxx xxx`}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none resize-none text-sm leading-relaxed"
            value={rawInfo}
            onChange={e => setRawInfo(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Hãy cung cấp đầy đủ thông tin: loại BĐS, vị trí, diện tích, giá, pháp lý, liên hệ, v.v. AI sẽ tự trích xuất và viết bài.</p>
        </div>
      </div>

      {/* --- 2. TÙY BIẾN AI --- */}
      <div className="pt-2 space-y-5 border-t border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Tuỳ biến AI</h2>
        
        {/* Phong cách */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Phong cách bài viết</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {styleOptions.map(s => (
              <label 
                key={s} 
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-sm ${
                  style === s 
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <input 
                  type="radio" 
                  name="styleV2" 
                  value={s} 
                  checked={style === s} 
                  onChange={e => setStyle(e.target.value)} 
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer" 
                />
                <span className="font-medium">{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Chế độ Prompt */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Chế độ Prompt AI</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-sm ${
              promptMode === PROMPT_MODE_DEFAULT
                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}>
              <input type="radio" name="promptMode" value={PROMPT_MODE_DEFAULT}
                checked={promptMode === PROMPT_MODE_DEFAULT}
                onChange={() => setPromptMode(PROMPT_MODE_DEFAULT)}
                className="text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <div>
                <span className="font-medium">Prompt chuẩn BĐS</span>
                <span className="block text-xs text-gray-500">Tối ưu SEO, chuẩn Facebook/Zalo, có hashtag viral</span>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-sm ${
              promptMode === PROMPT_MODE_CUSTOM
                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}>
              <input type="radio" name="promptMode" value={PROMPT_MODE_CUSTOM}
                checked={promptMode === PROMPT_MODE_CUSTOM}
                onChange={() => setPromptMode(PROMPT_MODE_CUSTOM)}
                className="text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <div>
                <span className="font-medium">Prompt tự viết</span>
                <span className="block text-xs text-gray-500">Tùy chỉnh hoàn toàn theo ý bạn</span>
              </div>
            </label>
          </div>

          {promptMode === PROMPT_MODE_CUSTOM && (
            <div className="mt-3 space-y-2">
                <textarea
                  rows={6}
                  placeholder={`Nhập hướng dẫn cho AI từ đây...\n\nVí dụ:\n- Bạn là chuyên gia BĐS. Viết bài đăng hấp dẫn cho Facebook.\n- Dùng nhiều emoji, ngôn ngữ thân thiện.\n- Cuối bài phải có hashtag viral.\n- Không dùng markdown.`}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none resize-none text-sm leading-relaxed"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
              />
              <button 
                type="button" 
                onClick={async () => {
                  try {
                    await fetch('/api/tool-settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ customPromptV2: customPrompt })
                    });
                    setToastType('success');
                    setToastMessage('Đã lưu prompt tùy chỉnh vào cài đặt!');
                  } catch {
                    setToastType('error');
                    setToastMessage('Lỗi lưu prompt.');
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium transition"
              >
                💾 Lưu vào Cài đặt
              </button>
            </div>
          )}
        </div>

        {/* Chữ ký */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mẫu Chữ ký</label>
          <select 
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" 
            value={signature} 
            onChange={e => setSignature(e.target.value)}
          >
            <option value="">-- Không đính kèm chữ ký --</option>
            {availableSignatures.map((sig, idx) => (
              <option key={idx} value={sig}>
                {sig.length > 30 ? `${sig.substring(0, 30)}...` : sig}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- 3. HÌNH ẢNH & XỬ LÝ AI --- */}
      <div className="pt-2 space-y-5 border-t border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Hình ảnh & Xử lý AI</h2>
        
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
        >
          <input {...getInputProps()} />
          <ImagePlus className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-600 text-center">Bấm để lấy ảnh từ thư viện/máy tính<br/>hoặc kéo thả vào đây</p>
          <p className="text-xs text-gray-500 mt-1">Ảnh sẽ tự động được nén trước khi upload</p>
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-4">
            {images.map((img, index) => (
              <div key={index} className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden group border border-gray-200 shadow-sm">
                <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => removeImage(index)} 
                  className="absolute p-1 bg-red-500 text-white rounded-full top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-5 space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-sm text-blue-800">Cấu hình AI Xóa vật thể & Làm đẹp</h3>
            <div>
               <label className="block text-xs font-semibold text-gray-700 mb-2">Mặc định xoá:</label>
               <div className="flex flex-wrap gap-2">
                 {defaultObjectsToRemove.map(obj => (
                   <label key={obj} className="flex items-center space-x-2 text-sm text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                     <input type="checkbox" checked={objectsToRemove.includes(obj)} onChange={() => handleObjectCheckboxChange(obj)} className="rounded text-blue-600 w-3.5 h-3.5" />
                     <span>{obj}</span>
                   </label>
                 ))}
               </div>
            </div>
            
            <div>
               <label className="block text-xs font-semibold text-gray-700 mb-1">Xóa thêm vật thể khác (Nhập text):</label>
               <input type="text" placeholder="Bãi rác, xe ba gác, ổ gà..." className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={customObjectsToRemove} onChange={e => setCustomObjectsToRemove(e.target.value)} />
            </div>

            <label className="flex items-start space-x-3 text-sm text-gray-700 cursor-pointer pt-2">
                <input type="checkbox" checked={enhanceImage} onChange={e => setEnhanceImage(e.target.checked)} className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                <span className="font-medium text-blue-900">Kéo sáng, tăng độ nét cho hình ảnh (Có thể mất thêm 10s)</span>
            </label>

            <div className="pt-2 border-t border-blue-100 mt-2">
               <label className="block text-xs font-semibold text-gray-700 mb-2 mt-2">Công cụ AI xử lý ảnh:</label>
               <div className="flex flex-col space-y-2">
                 <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${imageProcessingEngine === 'replicate_banana' ? 'bg-white border-blue-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
                   <input type="radio" name="imageEngineV2" value="replicate_banana" checked={imageProcessingEngine === 'replicate_banana'} onChange={e => setImageProcessingEngine(e.target.value)} className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                   <div className="ml-3">
                     <span className="block text-sm font-semibold text-gray-900">🍌 Gemini 2.5 Flash (Nano-Banana)</span>
                     <span className="block text-xs text-gray-500 mt-0.5">Xóa và lấp đầy vật thể siêu nhanh bằng Prompt tự nhiên qua Webhook Replicate.</span>
                   </div>
                 </label>

                 <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${imageProcessingEngine === 'openai_gpt' ? 'bg-white border-blue-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
                   <input type="radio" name="imageEngineV2" value="openai_gpt" checked={imageProcessingEngine === 'openai_gpt'} onChange={e => setImageProcessingEngine(e.target.value)} className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                   <div className="ml-3">
                     <span className="block text-sm font-semibold text-gray-900">🟢 OpenAI GPT-Image 1.5 (Replicate)</span>
                     <span className="block text-xs text-gray-500 mt-0.5">Chỉnh sửa qua Replicate sử dụng model GPT-Image 1.5 với tham số nâng cao.</span>
                   </div>
                 </label>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* --- 4. LƯU TRỮ & CHI PHÍ --- */}
      <div className="pt-2 space-y-5 border-t border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Lưu trữ & Chi phí</h2>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Thư mục trên Google Drive (Tuỳ chọn)</label>
          <div className="flex items-center space-x-3">
             <button type="button" onClick={() => handleOpenPicker()} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm">
                <FolderOpen className="w-4 h-4 mr-2 text-gray-500" />
                {selectedDriveFolder ? 'Thay đổi thư mục' : 'Chọn thư mục lưu'}
             </button>
             {selectedDriveFolder && (
                <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-sm">
                   <span className="truncate max-w-[200px] font-medium">{selectedDriveFolder.name}</span>
                   <button type="button" onClick={() => setSelectedDriveFolder(null)} className="ml-2 hover:bg-blue-100 rounded-full p-0.5">
                     <X className="w-3.5 h-3.5" />
                   </button>
                </div>
             )}
          </div>
          <p className="text-xs text-gray-500 mt-2">Mặc định hệ thống sẽ tự động tạo thư mục Gốc mới nếu bạn không chọn.</p>
        </div>

        <div className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded-xl flex justify-between items-center">
            <div>
                <h4 className="font-bold text-gray-800">Dự kiến chi phí (Credits)</h4>
                <p className="text-sm text-gray-500 mt-0.5">
                     {images.length > 0 
                       ? `2 Bài đăng (dài+ngắn) + ${images.length} ảnh × ${imageProcessingEngine === 'replicate_banana' ? '40' : '10'} Credits` 
                       : 'Xử lý văn bản (2 bài đăng, không ảnh): 2 Credits'}
                </p>
            </div>
            <div className="text-right">
                <div className={`text-2xl font-black ${userCredits >= totalCost ? 'text-gray-900' : 'text-red-500'}`}>
                    {totalCost}
                </div>
                <div className="text-xs font-semibold text-gray-500">
                    Số dư: {userCredits} 
                    {userCredits < totalCost && <span className="text-red-500 ml-1">(Không đủ)</span>}
                </div>
            </div>
        </div>
      </div>

      {/* --- TOAST NOTIFICATION --- */}
      {toastMessage && (
        <div className={`px-4 py-3 rounded-xl flex items-start space-x-3 shadow-sm border ${
          toastType === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
          toastType === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-800' :
          'bg-red-50 border-red-300 text-red-800'
        }`}>
          {toastType === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" /> :
           <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <p className="text-sm flex-1">{toastMessage}</p>
          <button type="button" onClick={() => setToastMessage(null)} className="text-current opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* --- 5. SUBMIT --- */}
      <div className="pt-4">
        {isSuccess ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-xl flex items-center space-x-3 shadow-sm">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <p className="font-bold">Đã tiếp nhận yêu cầu!</p>
              <p className="text-sm mt-0.5">Hệ thống đang xử lý. Credit sẽ chỉ bị trừ khi hoàn thành thành công. File sẽ xuất hiện trên Drive của bạn.</p>
            </div>
          </div>
        ) : (
          <button disabled={loading || (accessToken.length > 0 && userCredits < totalCost)} type="submit" className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:shadow-none disabled:transform-none ${accessToken && userCredits >= totalCost ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5' : 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-md hover:-translate-y-0.5 disabled:bg-gray-400'}`}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            <span>{loading ? "Đang xử lý..." : (!accessToken ? "Uỷ quyền Google Drive để Tiếp tục" : (userCredits < totalCost ? "Không đủ Credit" : "Tạo 2 bài & Lưu ẩn vào Drive 🪄"))}</span>
          </button>
        )}
      </div>
    </form>
  );
}
