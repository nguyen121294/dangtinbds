import Link from 'next/link';
import { Bot, Image as ImageIcon, FileText, Sparkles, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const appLink = user ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-[#F2F4F5] text-[#2C3136] font-sans selection:bg-[#E03C31]/20">
      {/* Header/Nav Section */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#E03C31] text-white">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#E03C31]">Trợ lý AI <span className="text-gray-800">BĐS</span></span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
              <Link href={appLink} className="hover:text-[#E03C31]">Viết Content AI</Link>
              {/* Chỉnh Sửa Ảnh — Ẩn vì tool đã tạm ẩn */}
              <Link href={appLink} className="hover:text-[#E03C31]">Tạo Sale Kit</Link>
              <Link href="/pricing" className="hover:text-[#E03C31]">Bảng Giá</Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard" className="hidden sm:flex items-center justify-center rounded-sm bg-[#E03C31] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700">
                Bảng điều khiển
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-[#E03C31]">
                  Đăng nhập / Đăng ký
                </Link>
                <Link href="/login" className="hidden sm:flex items-center justify-center rounded-sm bg-[#E03C31] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700">
                  Dùng thử miễn phí
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-16 border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-[#E03C31] mb-6 uppercase">
            <Sparkles className="h-3 w-3" />
            Giải pháp toàn diện cho Môi giới Bất động sản
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Tự động hóa công việc bán hàng <br className="hidden md:block"/> với Trợ lý AI Thông minh
          </h1>
          
          <p className="mx-auto max-w-2xl text-base md:text-lg text-gray-600 mb-10">
            Ứng dụng web duy nhất bạn cần để viết bài đăng mạng xã hội, làm đẹp ảnh bất động sản, xóa vật thể thừa và thiết kế Sale Kit chuyên nghiệp xuất file PDF chỉ trong vài cú click.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <Link href={appLink} className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-sm bg-[#E03C31] px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700">
                {user ? 'Vào Bảng điều khiển' : 'Bắt đầu ngay'}
             </Link>
             <Link href="#features" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-sm border border-gray-300 bg-white px-8 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50">
                Tìm hiểu thêm
             </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold uppercase text-gray-800">
              Các tính năng nổi bật
            </h2>
            <div className="mx-auto mt-4 h-1 w-16 bg-[#E03C31]"></div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-sm border border-gray-200 bg-white p-8 transition-all hover:border-[#E03C31] hover:shadow-md">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center bg-red-50 text-[#E03C31] rounded-sm">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gray-900">Viết Bài Tự Động bằng AI</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Chỉ cần cung cấp các thông số cơ bản của bất động sản. AI sẽ tự động tạo ra những bài đăng hấp dẫn, chuẩn SEO, tối ưu để bạn đăng tải ngay lên Facebook, Zalo, Tiktok...
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-sm border border-gray-200 bg-white p-8 transition-all hover:border-[#E03C31] hover:shadow-md">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center bg-red-50 text-[#E03C31] rounded-sm">
                <Wand2 className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gray-900">Làm Đẹp Ảnh BĐS</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Tự động cân bằng sáng, căn chỉnh màu sắc, làm không gian sáng sủa hơn. Kèm theo công cụ xóa xe cộ dư thừa, dây điện rác trong ảnh cực kì thông minh.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-sm border border-gray-200 bg-white p-8 transition-all hover:border-[#E03C31] hover:shadow-md">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center bg-red-50 text-[#E03C31] rounded-sm">
                <ImageIcon className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gray-900">Tạo Sale Kit & Tờ rơi PDF</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Lắp ráp hình ảnh chuẩn và thông tin tự động vào các template tờ rơi (Flyer) và Sale kit chuyên nghiệp. Hỗ trợ xuất file PDF độ phân giải cao sẵn sàng gửi cho khách.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-white py-16 border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Sẵn sàng gia tăng hiệu suất chốt sale?
          </h2>
          <p className="text-sm text-gray-600 mb-8">
            Trải nghiệm công cụ đắc lực nhất dành riêng cho nghề môi giới bất động sản.
          </p>
          <Link href={appLink} className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#E03C31] px-10 py-4 text-base font-bold text-white transition-colors hover:bg-red-700 shadow-md">
            {user ? 'Vào Bảng điều khiển' : 'Trải nghiệm dịch vụ ngay'}
          </Link>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-gray-900 py-8 text-center text-sm text-gray-400">
         <p>© {new Date().getFullYear()} Trợ lý AI BĐS.</p>
      </footer>
    </div>
  );
}
