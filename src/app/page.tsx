import Link from 'next/link';
import { ArrowRight, Shield, Zap, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0b1c30] selection:bg-[#059669]/30">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-16 pb-24 lg:pt-32">
        <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-full -translate-x-1/2 [background:radial-gradient(50%_50%_at_50%_0%,rgba(5,150,105,0.08)_0%,rgba(248,250,252,0)_100%)]" />
        
        <div className="mx-auto max-w-7xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#059669]/20 bg-[#059669]/10 px-4 py-1.5 text-sm font-medium text-[#059669]">
            <Sparkles className="h-4 w-4" />
            <span>Đăng tin bằng AI siêu tốc</span>
          </div>
          
          <h1 className="mt-8 text-5xl font-extrabold tracking-tight sm:text-7xl">
             Trợ lý AI <span className="bg-gradient-to-r from-[#006948] to-[#059669] bg-clip-text text-transparent">Bất Động Sản</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Tự động tạo nội dung tin đăng, tối ưu hóa hình ảnh và sắp xếp bài viết thẳng vào thư mục Google Drive của bạn dưới 10 giây.
          </p>
          
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#006948] to-[#059669] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-[#059669]/20 transition hover:opacity-90 active:scale-[0.98]"
            >
              Đăng nhập / Dùng thử
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-12 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">Lưu Trữ Tự Động</h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Liên kết trực tiếp với Google Drive cá nhân của bạn. Dữ liệu tin đăng và hình ảnh luôn được cất giữ an toàn.
              </p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#059669]/10 text-[#059669]">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">Tốc Độ Phản Hồi</h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Tạo 1 bài đăng chuẩn SEO kèm hình ảnh xóa rác chỉ trong tích tắc, giúp bạn ra hàng nhanh chóng.
              </p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">Thanh Toán Quét Mã</h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Tích hợp PayOS cho phép nạp Credit bằng mã QR 24/7. Hết thẻ nạp vào ngay trong vòng 3 giây!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
