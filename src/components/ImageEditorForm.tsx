"use client";
import { useState, useCallback, useEffect } from "react";
import { Loader2, Sparkles, ImagePlus, X, FolderOpen } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import useDrivePicker from 'react-google-drive-picker';

export default function ImageEditorForm({ workspaceId }: { workspaceId?: string }) {
  const [images, setImages] = useState<{file: File, preview: string, base64: string, needsEditing: boolean}[]>([]);
  const [objectsToRemove, setObjectsToRemove] = useState<string[]>(["Xe máy, xe hơi", "Thùng rác", "Biển số nhà"]);
  const [customObjectsToRemove, setCustomObjectsToRemove] = useState("");
  const [enhanceImage, setEnhanceImage] = useState(true);
  const [imageProcessingEngine, setImageProcessingEngine] = useState("openai_gpt");
  const [taskName, setTaskName] = useState("");

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [userCredits, setUserCredits] = useState<number>(0);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<{id: string, name: string} | null>(null);
  const [openPicker] = useDrivePicker();
  const supabase = createClient();

  const [pricing, setPricing] = useState({ creditBaseV1: 1, creditBaseV2V3: 2, creditImageStandard: 10, creditImageBanana: 40 });
  const imageMultiplier = imageProcessingEngine === 'replicate_banana' ? pricing.creditImageBanana : pricing.creditImageStandard;
  const editedImagesCount = images.filter(img => img.needsEditing).length;
  const totalCost = editedImagesCount * imageMultiplier;

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
          setSelectedDriveFolder({ id: data.docs[0].id, name: data.docs[0].name });
        }
      },
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) setAccessToken(session.provider_token);
      if (session?.user) {
        fetch('/api/tool-settings')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.defaultDriveFolderId) {
              setSelectedDriveFolder({ id: data.defaultDriveFolderId, name: data.defaultDriveFolderName || "Thư mục tùy chỉnh" });
            }
          }).catch(() => {});

        if (workspaceId) {
          fetch(`/api/workspace-credits?workspaceId=${workspaceId}`)
            .then(res => res.json())
            .then(d => { if (d.success) setUserCredits(d.credits); })
            .catch(() => {});
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.provider_token) setAccessToken(session.provider_token);
      else if (!session) setAccessToken("");
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    fetch('/api/credit-pricing').then(r => r.json()).then(d => { if (d.success) setPricing(d.pricing); }).catch(() => {});
  }, []);

  const login = useGoogleLogin({
    onSuccess: (cr) => setAccessToken(cr.access_token),
    onError: (e) => console.log('Login Failed:', e),
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly',
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
    if (images.length + acceptedFiles.length > 10) { alert("Tối đa 10 ảnh!"); return; }

    const compressed = await Promise.all(acceptedFiles.map(async (file) => {
      try {
        const cf = await imageCompression(file, options);
        const b64 = await fileToBase64(cf);
        return { file: cf, preview: URL.createObjectURL(cf), base64: b64, needsEditing: true };
      } catch { return null; }
    }));
    setImages(prev => [...prev, ...compressed.filter((i): i is any => i !== null)]);
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });
  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const defaultObjects = ["Xe máy, xe hơi", "Thùng rác", "Biển số nhà"];
  const handleCheckbox = (obj: string) => {
    setObjectsToRemove(prev => prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("Vui lòng đăng nhập."); window.location.href = '/login'; return; }
    if (!accessToken) { login(); return; }
    if (!taskName.trim()) { alert("Vui lòng nhập tên cho task chỉnh sửa ảnh."); return; }
    if (images.length === 0) { alert("Vui lòng chọn ít nhất 1 ảnh."); return; }

    setLoading(true);
    setIsSuccess(false);

    try {
      let uploadedDriveIds: string[] = [];
      const base64Images = images.map(img => img.base64);
      const uploadRes = await fetch("/api/upload-drive-temp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, images: base64Images })
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) { alert("Lỗi upload ảnh: " + uploadData.error); setLoading(false); return; }
      uploadedDriveIds = uploadData.driveFileIds;

      const imagesToEdit: string[] = [];
      const imagesToKeep: string[] = [];
      images.forEach((img, idx) => {
        if (img.needsEditing) {
          imagesToEdit.push(uploadedDriveIds[idx]);
        } else {
          imagesToKeep.push(uploadedDriveIds[idx]);
        }
      });

      const objectsStr = [...objectsToRemove, customObjectsToRemove].filter(Boolean).join(", ");

      const res = await fetch("/api/generate-image-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          imagesToEdit,
          imagesToKeep,
          objectsToRemoveStr: objectsStr,
          enhanceImage,
          imageProcessingEngine,
          workspaceId,
          driveFolderId: selectedDriveFolder?.id || null,
          taskName: taskName.trim(),
        })
      });
      const data = await res.json();
      if (data.success) setIsSuccess(true);
      else alert("Lỗi: " + (data.error || ""));
    } catch { alert("Lỗi kết nối."); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
      {/* UPLOAD */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Tên Task & Tải ảnh lên</h2>
        
        <div className="space-y-1.5 pb-2">
          <label className="block text-sm font-semibold text-gray-700">
            Tên Task (Bắt buộc) <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={taskName} 
            onChange={(e) => setTaskName(e.target.value)} 
            placeholder="VD: Nhà hẻm Quận 1, Biệt thự Thảo Điền..." 
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            required
          />
          <p className="text-[11px] text-gray-500">Tên này sẽ được dùng làm tên thư mục trên Google Drive để dễ dàng tra cứu.</p>
        </div>

        <div {...getRootProps()} className={`border-2 border-dashed p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
          <input {...getInputProps()} />
          <ImagePlus className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-600 text-center">Bấm để chọn ảnh hoặc kéo thả vào đây</p>
          <p className="text-xs text-gray-400 mt-1">Tối đa 10 ảnh, tự động nén</p>
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {images.map((img, index) => (
              <div key={index} className="relative w-24 h-32 bg-gray-100 rounded-lg overflow-hidden group border border-gray-200 shadow-sm flex flex-col">
                <div className="relative w-full h-20 bg-gray-200">
                  <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute p-1.5 bg-red-500 text-white rounded-full top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 bg-white border-t border-gray-200">
                  <label className="flex items-center justify-center w-full h-full cursor-pointer p-1">
                    <input 
                      type="checkbox" 
                      checked={img.needsEditing} 
                      onChange={(e) => {
                        const newImages = [...images];
                        newImages[index].needsEditing = e.target.checked;
                        setImages(newImages);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer mr-1.5"
                    />
                    <span className="text-xs font-medium text-gray-700 leading-none select-none">Cần AI</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIG */}
      {images.length > 0 && (
        <div className="pt-2 space-y-5 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Cấu hình AI xử lý ảnh</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Xóa vật thể:</label>
            <div className="flex flex-wrap gap-2">
              {defaultObjects.map(obj => (
                <label key={obj} className="flex items-center space-x-2 text-sm text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                  <input type="checkbox" checked={objectsToRemove.includes(obj)} onChange={() => handleCheckbox(obj)} className="rounded text-blue-600 w-3.5 h-3.5" />
                  <span>{obj}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Xóa thêm (tự nhập):</label>
            <input type="text" placeholder="Bãi rác, xe ba gác, ổ gà..." className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={customObjectsToRemove} onChange={e => setCustomObjectsToRemove(e.target.value)} />
          </div>

          <label className="flex items-start space-x-3 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={enhanceImage} onChange={e => setEnhanceImage(e.target.checked)} className="mt-0.5 rounded text-blue-600 w-4 h-4 cursor-pointer" />
            <span className="font-medium">Kéo sáng, tăng độ nét (có thể mất thêm 10s)</span>
          </label>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-2">Công cụ AI:</label>
            <div className="flex flex-col space-y-2">
              <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${imageProcessingEngine === 'replicate_banana' ? 'bg-white border-blue-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
                <input type="radio" name="imgEngine" value="replicate_banana" checked={imageProcessingEngine === 'replicate_banana'} onChange={e => setImageProcessingEngine(e.target.value)} className="mt-0.5 text-blue-600 cursor-pointer" />
                <div className="ml-3">
                  <span className="block text-sm font-semibold text-gray-900">⭐ Premium Model — {pricing.creditImageBanana} credits/ảnh</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Xóa và lấp đầy vật thể chất lượng cao, chi tiết sắc nét.</span>
                </div>
              </label>
              <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${imageProcessingEngine === 'openai_gpt' ? 'bg-white border-blue-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
                <input type="radio" name="imgEngine" value="openai_gpt" checked={imageProcessingEngine === 'openai_gpt'} onChange={e => setImageProcessingEngine(e.target.value)} className="mt-0.5 text-blue-600 cursor-pointer" />
                <div className="ml-3">
                  <span className="block text-sm font-semibold text-gray-900">🟢 Standard Model — {pricing.creditImageStandard} credits/ảnh</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Chỉnh sửa ảnh nhanh gọn, phù hợp nhu cầu cơ bản.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* DRIVE + COST */}
      <div className="pt-2 space-y-5 border-t border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Lưu trữ & Chi phí</h2>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Thư mục Google Drive</label>
          <div className="flex items-center space-x-3">
            <button type="button" onClick={handleOpenPicker} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm">
              <FolderOpen className="w-4 h-4 mr-2 text-gray-500" />{selectedDriveFolder ? 'Thay đổi' : 'Chọn thư mục'}
            </button>
            {selectedDriveFolder && (
              <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-sm">
                <span className="truncate max-w-[200px] font-medium">{selectedDriveFolder.name}</span>
                <button type="button" onClick={() => setSelectedDriveFolder(null)} className="ml-2 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex justify-between items-center">
          <div>
            <h4 className="font-bold text-gray-800">Chi phí</h4>
            <p className="text-sm text-gray-500 mt-0.5">
              {images.length > 0 ? `${editedImagesCount} ảnh cần AI × ${imageMultiplier} credits` : 'Chưa có ảnh để xử lý'}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${images.length === 0 ? 'text-gray-300' : userCredits >= totalCost ? 'text-gray-900' : 'text-red-500'}`}>{totalCost}</div>
            <div className="text-xs font-semibold text-gray-500">Số dư: {userCredits} {totalCost > 0 && userCredits < totalCost && <span className="text-red-500 ml-1">(Không đủ)</span>}</div>
          </div>
        </div>
      </div>

      {/* SUBMIT */}
      <div className="pt-4">
        {isSuccess ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-xl flex items-center space-x-3 shadow-sm">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <p className="font-bold">Đã tiếp nhận!</p>
              <p className="text-sm mt-0.5">Hệ thống đang xử lý {images.length} ảnh và sẽ tự lưu vào Drive.</p>
            </div>
          </div>
        ) : (
          <button disabled={loading || images.length === 0 || (accessToken.length > 0 && userCredits < totalCost)} type="submit" className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:shadow-none ${accessToken && images.length > 0 && userCredits >= totalCost ? 'bg-orange-600 hover:bg-orange-700 shadow-[0_4px_14px_0_rgba(234,88,12,0.39)] hover:-translate-y-0.5' : 'bg-gray-400'}`}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            <span>{loading ? "Đang gửi ảnh..." : (!accessToken ? "Uỷ quyền Google Drive" : (images.length === 0 ? "Chọn ảnh để bắt đầu" : (userCredits < totalCost ? "Không đủ Credit" : `Xử lý ${images.length} ảnh 🖼️`)))}</span>
          </button>
        )}
      </div>
    </form>
  );
}
