"use client";
import { useState, useCallback, useEffect } from "react";
import { Loader2, Sparkles, ImagePlus, X, FolderOpen } from "lucide-react"; 
import { useGoogleLogin } from '@react-oauth/google';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import useDrivePicker from 'react-google-drive-picker';

export default function PropertyForm({ workspaceId }: { workspaceId?: string }) {
  const [formData, setFormData] = useState({
    type: "Đất nền",
    area: "",
    price: "",
    location: "",
    condition: "",
    direction: "",
    purpose: "",
    purpose: "",
    highlights: "",
    style: "Sang trọng & Đẳng cấp",
    headings: [] as string[],
    objectsToRemove: ["Xe máy, xe hơi", "Thùng rác", "Biển số nhà"] as string[],
    customObjectsToRemove: "",
    enhanceImage: true,
    imageProcessingEngine: "openai_gpt",
    signature: ""
  });
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [images, setImages] = useState<{file: File, preview: string, base64: string}[]>([]);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<{id: string, name: string} | null>(null);
  const [availableSignatures, setAvailableSignatures] = useState<string[]>([]);
  const [openPicker, authResponse] = useDrivePicker();
  const supabase = createClient();

  const totalUsableCredits = userCredits;
  const imageMultiplier = formData.imageProcessingEngine === 'replicate_banana' ? 40 : 10;
  const totalCost = 1 + (images.length * imageMultiplier);

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
        supabase.from('profiles').select('trial_credits, paid_credits, default_drive_folder_id, default_drive_folder_name, signatures').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) {
               setUserCredits((data.trial_credits || 0) + (data.paid_credits || 0));
               if (data.default_drive_folder_id) {
                  setSelectedDriveFolder({
                     id: data.default_drive_folder_id,
                     name: data.default_drive_folder_name || "Thư mục tùy chỉnh"
                  });
               }
               if (data.signatures && data.signatures.length > 0) {
                  setAvailableSignatures(data.signatures);
                  setFormData(prev => ({ ...prev, signature: data.signatures[0] }));
               }
            }
          });
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

  const styleOptions = [
    "Sang trọng & Đẳng cấp",
    "Tạo sự khan hiếm (FOMO)",
    "Thân thiện & Gần gũi",
    "Ngắn gọn & Súc tích",
    "Kể chuyện & Cảm xúc"
  ];

  const headingOptions = [
    "Hiển thị Mức Giá",
    "Nêu rõ Địa Chỉ/Vị trí",
    "Nhấn mạnh Tiềm năng sinh lời",
    "Kèm Thông tin Liên hệ",
    "Kèm Pháp lý & Kết cấu"
  ];

  const handleCheckboxChange = (heading: string) => {
    setFormData((prev) => {
      if (prev.headings.includes(heading)) {
        return { ...prev, headings: prev.headings.filter((h) => h !== heading) };
      } else {
        return { ...prev, headings: [...prev.headings, heading] };
      }
    });
  };

  const defaultObjectsToRemove = ["Xe máy, xe hơi", "Thùng rác", "Biển số nhà"];
  const handleObjectCheckboxChange = (obj: string) => {
    setFormData((prev) => {
      if (prev.objectsToRemove.includes(obj)) {
        return { ...prev, objectsToRemove: prev.objectsToRemove.filter((o) => o !== obj) };
      } else {
        return { ...prev, objectsToRemove: [...prev.objectsToRemove, obj] };
      }
    });
  };

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
      // Giảm Resolution xuống 1024 để AI Replicate (Instruct-Pix2Pix)
      // không bị quá tải bộ nhớ CUDA (OOM). 
      // Lát AI Real-ESRGAN sẽ kéo nét bù lại x2 lên 2048px sau.
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };
    
    // Validate number of images just stringently for demo purpose
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

      // Bước 1: Upload hình ảnh lên Temp Drive nếu có
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

      // Bước 2: Bắn sang QStash / api-generate-async
      const objectsStr = [...formData.objectsToRemove, formData.customObjectsToRemove].filter(Boolean).join(", ");
      
      const payload = {
         ...formData,
         access_token: accessToken,
         images: uploadedDriveIds,
         objectsToRemoveStr: objectsStr,
         workspaceId: workspaceId,
         driveFolderId: selectedDriveFolder?.id || null,
         estimatedCost: totalCost
      };

      const res = await fetch("/api/generate-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
      } else {
        alert("Lỗi gửi yêu cầu: " + (data.error || ""));
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Thông tin BĐS</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Loại BĐS */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại BĐS</label>
            <select required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Đất nền">Đất nền</option>
              <option value="Nhà phố">Nhà phố</option>
              <option value="Chung cư/Căn hộ">Chung cư/Căn hộ</option>
              <option value="Biệt thự">Biệt thự</option>
              <option value="Nhà trọ/Cho thuê">Nhà trọ/Cho thuê</option>
              <option value="Khác">Khác...</option>
            </select>
          </div>
          
          {/* 2. Vị trí */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vị trí & Độ rộng đường</label>
            <input required type="text" placeholder="Vd: Hẻm xe hơi 5m, Nguyễn Đình Chiểu, Q3" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
          </div>

          {/* 3. Thông số */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thông số (DTCN, Ngang x Dài)</label>
            <input required type="text" placeholder="Vd: 50m2, 5x10m vuông vức" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
          </div>

          {/* 4. Hiện trạng */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hiện trạng / Kết cấu</label>
            <input required type="text" placeholder="Vd: Đất trống / 1 trệt 1 lầu, 2PN" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} />
          </div>

          {/* 5. Hướng */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hướng</label>
            <input type="text" placeholder="Vd: Đông Nam, Tây Tứ Trạch..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none" value={formData.direction} onChange={e => setFormData({...formData, direction: e.target.value})} />
          </div>

          {/* 6. Mua để làm gì? */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mua để làm gì? (Phù hợp cho)</label>
            <input type="text" placeholder="Vd: Xây CHDV, Định cư lâu dài, Đầu tư..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
          </div>

          {/* 7. Giá bán */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Giá bán (hoặc cho thuê)</label>
            <input required type="text" placeholder="Vd: 3 Tỷ 500 (Thương lượng)" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
          </div>

           {/* 8. Chữ ký */}
           <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mẫu Chữ ký</label>
            <select 
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" 
              value={formData.signature} 
              onChange={e => setFormData({...formData, signature: e.target.value})}
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

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Đặc điểm nổi bật khác (Tiện ích, phong thuỷ...)</label>
          <textarea rows={2} placeholder="Gần chợ, sát mặt tiền, sổ hồng riêng cất két..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none resize-none" value={formData.highlights} onChange={e => setFormData({...formData, highlights: e.target.value})}></textarea>
        </div>

      </div>

      <div className="pt-2 space-y-5 border-t border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Tuỳ biến AI</h2>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Phong cách bài viết</label>
          <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.style} onChange={e => setFormData({...formData, style: e.target.value})}>
            {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Thông tin bắt buộc phải có</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {headingOptions.map(heading => (
              <label key={heading} className="flex items-start space-x-3 text-sm text-gray-700 bg-gray-50 border border-gray-100 p-3 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition">
                <input type="checkbox" checked={formData.headings.includes(heading)} onChange={() => handleCheckboxChange(heading)} className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                <span className="font-medium">{heading}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

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
                     <input type="checkbox" checked={formData.objectsToRemove.includes(obj)} onChange={() => handleObjectCheckboxChange(obj)} className="rounded text-blue-600 w-3.5 h-3.5" />
                     <span>{obj}</span>
                   </label>
                 ))}
               </div>
            </div>
            
            <div>
               <label className="block text-xs font-semibold text-gray-700 mb-1">Xóa thêm vật thể khác (Nhập text):</label>
               <input type="text" placeholder="Bãi rác, xe ba gác, ổ gà..." className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.customObjectsToRemove} onChange={e => setFormData({...formData, customObjectsToRemove: e.target.value})} />
            </div>

            <label className="flex items-start space-x-3 text-sm text-gray-700 cursor-pointer pt-2">
                <input type="checkbox" checked={formData.enhanceImage} onChange={e => setFormData({...formData, enhanceImage: e.target.checked})} className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                <span className="font-medium text-blue-900">Kéo sáng, tăng độ nét cho hình ảnh (Có thể mất thêm 10s)</span>
            </label>

            <div className="pt-2 border-t border-blue-100 mt-2">
               <label className="block text-xs font-semibold text-gray-700 mb-2 mt-2">Công cụ AI xử lý ảnh:</label>
               <div className="flex flex-col space-y-2">

                 <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${formData.imageProcessingEngine === 'replicate_banana' ? 'bg-white border-blue-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
                   <input type="radio" name="imageEngine" value="replicate_banana" checked={formData.imageProcessingEngine === 'replicate_banana'} onChange={e => setFormData({...formData, imageProcessingEngine: e.target.value})} className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                   <div className="ml-3">
                     <span className="block text-sm font-semibold text-gray-900">🍌 Gemini 2.5 Flash (Nano-Banana)</span>
                     <span className="block text-xs text-gray-500 mt-0.5">Xóa và lấp đầy vật thể siêu nhanh bằng Prompt tự nhiên qua Webhook Replicate.</span>
                   </div>
                 </label>

                 <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${formData.imageProcessingEngine === 'openai_gpt' ? 'bg-white border-blue-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
                   <input type="radio" name="imageEngine" value="openai_gpt" checked={formData.imageProcessingEngine === 'openai_gpt'} onChange={e => setFormData({...formData, imageProcessingEngine: e.target.value})} className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer" />
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
                     {images.length > 0 ? `1 Bài đăng + ${images.length} ảnh × ${formData.imageProcessingEngine === 'replicate_banana' ? '40' : '10'} Credits` : 'Xử lý văn bản (Không kèm ảnh): 1 Credit'}
                </p>
            </div>
            <div className="text-right">
                <div className={`text-2xl font-black ${totalUsableCredits >= totalCost ? 'text-gray-900' : 'text-red-500'}`}>
                    {totalCost}
                </div>
                <div className="text-xs font-semibold text-gray-500">
                    Số dư: {totalUsableCredits} 
                    {totalUsableCredits < totalCost && <span className="text-red-500 ml-1">(Không đủ)</span>}
                </div>
            </div>
        </div>
      </div>

      <div className="pt-4">
        {isSuccess ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-xl flex items-center space-x-3 shadow-sm">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <p className="font-bold">Đã tiếp nhận yêu cầu!</p>
              <p className="text-sm mt-0.5">Hệ thống đang chạy ngầm và sẽ tự động tạo thư mục & bài viết trên Drive của bạn. Bạn đã có thể tắt ứng dụng!</p>
            </div>
          </div>
        ) : (
          <button disabled={loading || (accessToken.length > 0 && totalUsableCredits < totalCost)} type="submit" className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:shadow-none disabled:transform-none ${accessToken && totalUsableCredits >= totalCost ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5' : 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-md hover:-translate-y-0.5 disabled:bg-gray-400'}`}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            <span>{loading ? "Đang xử lý..." : (!accessToken ? "Uỷ quyền Google Drive để Tiếp tục" : (totalUsableCredits < totalCost ? "Không đủ Credit" : "Tạo bài & Lưu ẩn vào Drive 🪄"))}</span>
          </button>
        )}
      </div>
    </form>
  );
}
