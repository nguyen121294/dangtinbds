"use client";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react"; 
import { useGoogleLogin } from '@react-oauth/google';

export default function PropertyForm({ onGenerate }: { onGenerate: (data: string) => void }) {
  const [formData, setFormData] = useState({
    type: "Đất nền",
    area: "",
    price: "",
    location: "",
    condition: "",
    direction: "",
    purpose: "",
    contact: "",
    highlights: "",
    style: "Sang trọng & Đẳng cấp",
    headings: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setAccessToken(codeResponse.access_token),
    onError: (error) => console.log('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      login();
      return;
    }
    
    setLoading(true);
    setIsSuccess(false);
    
    try {
      const res = await fetch("/api/generate-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, access_token: accessToken })
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

           {/* 8. Liên hệ */}
           <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Liên hệ</label>
            <input required type="text" placeholder="Vd: 09xx xxx xxx (Gặp A.Nam)" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition outline-none" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
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
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Tự động lưu Google Drive</h2>
        <div>
          <p className="text-sm text-gray-700 mb-2">Hệ thống sẽ tự động tạo thư mục và tài liệu trên Google Drive của bạn mà không lo giới hạn server.</p>
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
          <button disabled={loading} type="submit" className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:shadow-none disabled:transform-none ${accessToken ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5' : 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-md hover:-translate-y-0.5'}`}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            <span>{loading ? "Đang xử lý..." : (!accessToken ? "Uỷ quyền Google Drive để Tiếp tục" : "Tạo bài & Lưu ẩn vào Drive 🪄")}</span>
          </button>
        )}
      </div>
    </form>
  );
}
