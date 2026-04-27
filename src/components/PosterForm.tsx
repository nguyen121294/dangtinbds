"use client";
import { useState, useCallback, useEffect } from "react";
import { Loader2, Sparkles, ImagePlus, X, FolderOpen, Star, HardDrive } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import useDrivePicker from 'react-google-drive-picker';

const COLOR_THEMES = [
  { id: 'luxury', name: 'Sang trọng', primary: 'Đen', secondary: 'Vàng Gold', bg: '#1a1a1a', accent: '#D4AF37' },
  { id: 'modern', name: 'Hiện đại', primary: 'Xanh Navy', secondary: 'Trắng', bg: '#1B2A4A', accent: '#FFFFFF' },
  { id: 'warm', name: 'Ấm áp', primary: 'Nâu Đất', secondary: 'Kem', bg: '#5C4033', accent: '#F5E6CA' },
  { id: 'fresh', name: 'Tươi mới', primary: 'Xanh Lá', secondary: 'Trắng', bg: '#2D6A4F', accent: '#FFFFFF' },
  { id: 'elegant', name: 'Thanh lịch', primary: 'Xám Đậm', secondary: 'Bạc', bg: '#3D3D3D', accent: '#C0C0C0' },
  { id: 'dynamic', name: 'Năng động', primary: 'Cam', secondary: 'Trắng', bg: '#E8590C', accent: '#FFFFFF' },
  { id: 'premium', name: 'Đẳng cấp', primary: 'Rượu vang', secondary: 'Vàng', bg: '#722F37', accent: '#D4AF37' },
  { id: 'custom', name: 'Tùy chỉnh', primary: '', secondary: '', bg: '#6B7280', accent: '#FFFFFF' },
];

export default function PosterForm({ workspaceId }: { workspaceId?: string }) {
  // Property selection
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertyData, setPropertyData] = useState<any>(null);

  // Images
  const [images, setImages] = useState<{file: File, preview: string, base64: string}[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  // Color theme
  const [selectedTheme, setSelectedTheme] = useState(COLOR_THEMES[0]);
  const [customPrimary, setCustomPrimary] = useState("#1a1a1a");
  const [customSecondary, setCustomSecondary] = useState("#D4AF37");

  // Contact
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [priceNote, setPriceNote] = useState("");

  // Engine & state
  const [imageProcessingEngine, setImageProcessingEngine] = useState("openai_gpt");
  const [taskName, setTaskName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [userCredits, setUserCredits] = useState(0);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<{id: string, name: string} | null>(null);
  const [openPicker] = useDrivePicker();
  const supabase = createClient();

  const [pricing, setPricing] = useState({ creditPosterStandard: 25, creditPosterBanana: 65 });
  const totalCost = imageProcessingEngine === 'replicate_banana' ? pricing.creditPosterBanana : pricing.creditPosterStandard;

  // Load properties, settings, credits
  useEffect(() => {
    if (workspaceId) {
      fetch(`/api/properties?workspaceId=${workspaceId}`)
        .then(r => r.json())
        .then(d => { if (d.success) setProperties(d.records || []); })
        .catch(() => {});

      fetch(`/api/workspace-credits?workspaceId=${workspaceId}`)
        .then(r => r.json())
        .then(d => { if (d.success) setUserCredits(d.credits); })
        .catch(() => {});
    }

    fetch('/api/credit-pricing').then(r => r.json()).then(d => {
      if (d.success) setPricing(d.pricing);
    }).catch(() => {});

    fetch('/api/tool-settings').then(r => r.json()).then(data => {
      if (data.success) {
        if (data.defaultDriveFolderId) {
          setSelectedDriveFolder({ id: data.defaultDriveFolderId, name: data.defaultDriveFolderName || "Thư mục tùy chỉnh" });
        }
        if (data.signatures?.length > 0) {
          const sig = data.signatures[0];
          setContactName(sig);
        }
      }
    }).catch(() => {});

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) setAccessToken(session.provider_token);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.provider_token) setAccessToken(session.provider_token);
      else if (!session) setAccessToken("");
    });
    return () => subscription.unsubscribe();
  }, [workspaceId, supabase.auth]);

  // Select property
  const handlePropertySelect = (id: string) => {
    setSelectedPropertyId(id);
    const prop = properties.find(p => p.id === id);
    if (prop) {
      setPropertyData(prop);
      setTaskName(prop.title || prop.propertyType || '');
      if (prop.price) setPriceNote(prop.price);
    }
  };

  const login = useGoogleLogin({
    onSuccess: (cr) => setAccessToken(cr.access_token),
    onError: (e) => console.log('Login Failed:', e),
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly',
  });

  const handleOpenPicker = () => {
    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
      viewId: 'DOCS', token: accessToken,
      showUploadView: false, showUploadFolders: false,
      supportDrives: true, multiselect: false,
      setIncludeFolders: true, setSelectFolderEnabled: true,
      callbackFunction: (data) => {
        if (data.action === 'picked') {
          setSelectedDriveFolder({ id: data.docs[0].id, name: data.docs[0].name });
        }
      },
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
    if (images.length + acceptedFiles.length > 6) { alert("Tối đa 6 ảnh!"); return; }

    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

    const compressed = await Promise.all(acceptedFiles.map(async (file) => {
      try {
        const cf = await imageCompression(file, options);
        const b64 = await fileToBase64(cf);
        return { file: cf, preview: URL.createObjectURL(cf), base64: b64 };
      } catch { return null; }
    }));
    setImages(prev => [...prev, ...compressed.filter((i): i is any => i !== null)]);
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (mainImageIndex === index) setMainImageIndex(0);
    else if (mainImageIndex > index) setMainImageIndex(prev => prev - 1);
  };

  // Pick images from Google Drive
  const handlePickDriveImages = () => {
    if (!accessToken) { login(); return; }
    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
      viewId: 'DOCS',
      token: accessToken,
      showUploadView: false,
      showUploadFolders: false,
      supportDrives: true,
      multiselect: true,
      setIncludeFolders: false,
      setSelectFolderEnabled: false,
      callbackFunction: async (data) => {
        if (data.action !== 'picked' || !data.docs?.length) return;
        const remaining = 6 - images.length;
        const docs = data.docs.slice(0, remaining);
        if (docs.length === 0) { alert('Đã đạt tối đa 6 ảnh!'); return; }

        for (const doc of docs) {
          try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!res.ok) continue;
            const blob = await res.blob();
            const file = new File([blob], doc.name || 'drive-image.jpg', { type: blob.type || 'image/jpeg' });

            const reader = new FileReader();
            reader.onload = () => {
              const b64 = reader.result as string;
              setImages(prev => [...prev, { file, preview: URL.createObjectURL(blob), base64: b64 }]);
            };
            reader.readAsDataURL(file);
          } catch (e) {
            console.error('Lỗi tải ảnh từ Drive:', e);
          }
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("Vui lòng đăng nhập."); window.location.href = '/login'; return; }
    if (!accessToken) { login(); return; }
    if (!taskName.trim()) { alert("Vui lòng nhập tên cho poster."); return; }
    if (images.length === 0) { alert("Vui lòng chọn ít nhất 1 ảnh."); return; }

    setLoading(true);
    setIsSuccess(false);

    try {
      // Upload images to Drive temp
      const base64Images = images.map(img => img.base64);
      const uploadRes = await fetch("/api/upload-drive-temp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, images: base64Images })
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) { alert("Lỗi upload ảnh: " + uploadData.error); setLoading(false); return; }

      const theme = selectedTheme.id === 'custom'
        ? { name: 'Tùy chỉnh', primary: customPrimary, secondary: customSecondary }
        : { name: selectedTheme.name, primary: selectedTheme.primary, secondary: selectedTheme.secondary };

      const res = await fetch("/api/generate-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          workspaceId,
          imageProcessingEngine,
          driveFileIds: uploadData.driveFileIds,
          mainImageIndex,
          propertyData: propertyData || {},
          colorTheme: theme,
          contactInfo: { name: contactName, phone: contactPhone, priceNote },
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* STEP 1: Chọn tài sản */}
      <div className="bg-white border border-gray-200 rounded-sm p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">1. Chọn Tài sản BĐS</h2>
        <p className="text-xs text-gray-500 mb-4">Dữ liệu sẽ tự động điền vào poster</p>

        <select
          value={selectedPropertyId}
          onChange={(e) => handlePropertySelect(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#E03C31] outline-none text-sm"
        >
          <option value="">— Chọn tài sản hoặc nhập tay —</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>
              {p.title || p.propertyType || 'N/A'} — {p.location || 'Chưa có vị trí'}
            </option>
          ))}
        </select>

        {propertyData && (
          <div className="mt-3 bg-gray-50 border border-gray-100 rounded-sm p-3 text-xs text-gray-600 space-y-1">
            <p><strong>Loại:</strong> {propertyData.propertyType || 'N/A'} | <strong>Vị trí:</strong> {propertyData.location || 'N/A'}</p>
            <p><strong>DT:</strong> {propertyData.area || 'N/A'} | <strong>Hướng:</strong> {propertyData.direction || 'N/A'} | <strong>Pháp lý:</strong> {propertyData.permit || 'N/A'}</p>
            <p><strong>Kết cấu:</strong> {propertyData.structure || 'N/A'} | <strong>Giá:</strong> {propertyData.price || 'Liên hệ'}</p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tên Poster <span className="text-red-500">*</span></label>
          <input
            type="text" value={taskName} onChange={(e) => setTaskName(e.target.value)}
            placeholder="VD: Biệt thự Thảo Điền, Đất nền Quận 9..."
            className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#E03C31] outline-none text-sm"
            required
          />
        </div>
      </div>

      {/* STEP 2: Upload ảnh */}
      <div className="bg-white border border-gray-200 rounded-sm p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">2. Ảnh Bất động sản</h2>
        <p className="text-xs text-gray-500 mb-4">Upload ảnh và chọn ảnh chính (⭐) để hiển thị lớn nhất trên poster</p>

        <div className="flex gap-3">
          <div {...getRootProps()} className={`flex-1 border-2 border-dashed p-6 rounded-sm flex flex-col items-center justify-center cursor-pointer transition ${isDragActive ? 'border-[#E03C31] bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
            <input {...getInputProps()} />
            <ImagePlus className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-600">Upload từ máy</p>
            <p className="text-xs text-gray-400 mt-1">Kéo thả hoặc bấm</p>
          </div>
          <button type="button" onClick={handlePickDriveImages} className="flex-1 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400 p-6 rounded-sm flex flex-col items-center justify-center cursor-pointer transition">
            <HardDrive className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-sm font-medium text-blue-600">Chọn từ Drive</p>
            <p className="text-xs text-gray-400 mt-1">Google Drive</p>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Tối đa 6 ảnh · Tự động nén</p>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {images.map((img, index) => (
              <div key={index} className={`relative w-28 h-36 rounded-sm overflow-hidden group border-2 shadow-sm flex flex-col ${mainImageIndex === index ? 'border-[#E03C31] ring-2 ring-[#E03C31]/30' : 'border-gray-200'}`}>
                <div className="relative w-full h-24 bg-gray-200">
                  <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute p-1 bg-red-500 text-white rounded-full top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    <X size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setMainImageIndex(index)}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold transition ${mainImageIndex === index ? 'bg-[#E03C31] text-white' : 'bg-white text-gray-500 hover:bg-red-50 hover:text-[#E03C31]'}`}
                >
                  <Star size={12} className={mainImageIndex === index ? 'fill-white' : ''} />
                  {mainImageIndex === index ? 'Ảnh chính' : 'Chọn chính'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STEP 3: Bảng màu */}
      <div className="bg-white border border-gray-200 rounded-sm p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">3. Bảng màu Poster</h2>
        <p className="text-xs text-gray-500 mb-4">Chọn phong cách màu sắc cho poster</p>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {COLOR_THEMES.map(theme => (
            <button
              key={theme.id} type="button"
              onClick={() => setSelectedTheme(theme)}
              className={`flex flex-col items-center p-2 rounded-sm border-2 transition ${selectedTheme.id === theme.id ? 'border-[#E03C31] ring-2 ring-[#E03C31]/20' : 'border-gray-200 hover:border-gray-400'}`}
            >
              <div className="w-8 h-8 rounded-full mb-1 border border-gray-200" style={{ background: `linear-gradient(135deg, ${theme.bg} 50%, ${theme.accent} 50%)` }} />
              <span className="text-[10px] font-medium text-gray-700 leading-tight text-center">{theme.name}</span>
            </button>
          ))}
        </div>

        {selectedTheme.id === 'custom' && (
          <div className="mt-3 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Chủ đạo:</span>
              <input type="color" value={customPrimary} onChange={e => setCustomPrimary(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Phụ:</span>
              <input type="color" value={customSecondary} onChange={e => setCustomSecondary(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            </label>
          </div>
        )}
      </div>

      {/* STEP 4: Thông tin liên hệ */}
      <div className="bg-white border border-gray-200 rounded-sm p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">4. Thông tin Liên hệ</h2>
        <p className="text-xs text-gray-500 mb-4">Hiển thị ở cuối poster</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tên đại lý / Chữ ký</label>
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full p-2.5 border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-[#E03C31] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại</label>
            <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="0901 234 567" className="w-full p-2.5 border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-[#E03C31] outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú giá (hiển thị trên poster)</label>
          <input type="text" value={priceNote} onChange={e => setPriceNote(e.target.value)} placeholder="VD: 5.2 TỶ THƯƠNG LƯỢNG hoặc LIÊN HỆ ĐỂ BIẾT GIÁ" className="w-full p-2.5 border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-[#E03C31] outline-none" />
        </div>
      </div>

      {/* STEP 5: Model AI + Drive + Chi phí */}
      <div className="bg-white border border-gray-200 rounded-sm p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">5. Chọn Model AI & Lưu trữ</h2>
        <p className="text-xs text-gray-500 mb-4">Chọn model xử lý và thư mục lưu poster</p>

        <div className="flex flex-col space-y-2 mb-4">
          <label className={`flex items-start p-3 rounded-sm border cursor-pointer transition ${imageProcessingEngine === 'openai_gpt' ? 'bg-white border-[#E03C31] shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
            <input type="radio" name="posterEngine" value="openai_gpt" checked={imageProcessingEngine === 'openai_gpt'} onChange={e => setImageProcessingEngine(e.target.value)} className="mt-0.5 text-[#E03C31] cursor-pointer" />
            <div className="ml-3">
              <span className="block text-sm font-semibold text-gray-900">🟢 Standard — {pricing.creditPosterStandard} credits/poster</span>
              <span className="block text-xs text-gray-500 mt-0.5">GPT-Image 1.5 · Poster chất lượng tốt</span>
            </div>
          </label>
          <label className={`flex items-start p-3 rounded-sm border cursor-pointer transition ${imageProcessingEngine === 'replicate_banana' ? 'bg-white border-[#E03C31] shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
            <input type="radio" name="posterEngine" value="replicate_banana" checked={imageProcessingEngine === 'replicate_banana'} onChange={e => setImageProcessingEngine(e.target.value)} className="mt-0.5 text-[#E03C31] cursor-pointer" />
            <div className="ml-3">
              <span className="block text-sm font-semibold text-gray-900">⭐ Premium — {pricing.creditPosterBanana} credits/poster</span>
              <span className="block text-xs text-gray-500 mt-0.5">Nano-Banana · Chất lượng cao cấp</span>
            </div>
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Thư mục Google Drive</label>
          <div className="flex items-center space-x-3">
            <button type="button" onClick={handleOpenPicker} className="flex items-center px-4 py-2 border border-gray-300 rounded-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm">
              <FolderOpen className="w-4 h-4 mr-2 text-gray-500" />{selectedDriveFolder ? 'Thay đổi' : 'Chọn thư mục'}
            </button>
            {selectedDriveFolder && (
              <div className="flex items-center bg-red-50 text-[#E03C31] px-3 py-1.5 rounded-sm border border-red-100 text-sm">
                <span className="truncate max-w-[200px] font-medium">{selectedDriveFolder.name}</span>
                <button type="button" onClick={() => setSelectedDriveFolder(null)} className="ml-2 hover:bg-red-100 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-sm flex justify-between items-center">
          <div>
            <h4 className="font-bold text-gray-800">Chi phí</h4>
            <p className="text-sm text-gray-500 mt-0.5">1 poster × {totalCost} credits</p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${userCredits >= totalCost ? 'text-gray-900' : 'text-red-500'}`}>{totalCost}</div>
            <div className="text-xs font-semibold text-gray-500">Số dư: {userCredits} {userCredits < totalCost && <span className="text-red-500 ml-1">(Không đủ)</span>}</div>
          </div>
        </div>
      </div>

      {/* SUBMIT */}
      <div>
        {isSuccess ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-sm flex items-center space-x-3 shadow-sm">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <p className="font-bold">Đã tiếp nhận!</p>
              <p className="text-sm mt-0.5">Hệ thống đang tạo poster và sẽ tự lưu vào Google Drive.</p>
            </div>
          </div>
        ) : (
          <button disabled={loading || images.length === 0 || (accessToken.length > 0 && userCredits < totalCost)} type="submit" className={`w-full text-white font-bold py-3.5 px-4 rounded-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:shadow-none ${accessToken && images.length > 0 && userCredits >= totalCost ? 'bg-[#E03C31] hover:bg-[#c9362c] shadow-[0_4px_14px_0_rgba(224,60,49,0.39)] hover:-translate-y-0.5' : 'bg-gray-400'}`}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            <span>{loading ? "Đang tạo poster..." : (!accessToken ? "Uỷ quyền Google Drive" : (images.length === 0 ? "Chọn ảnh để bắt đầu" : (userCredits < totalCost ? "Không đủ Credit" : "Tạo Poster AI 🎨")))}</span>
          </button>
        )}
      </div>
    </form>
  );
}
