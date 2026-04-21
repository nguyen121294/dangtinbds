import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft, Bot, FileText, ImageIcon, ChevronRight, Crown, Sparkles, History } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  // fetch workspace info
  const workspaceDetails = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const currentWorkspace = workspaceDetails[0];

  return (
    <div className="w-full">
       <main className="max-w-[1000px] mx-auto p-4 sm:p-8">
          <div className="mb-8">
             <h1 className="text-2xl font-bold text-gray-900 mb-2">Tiện ích & Ứng dụng</h1>
             <p className="text-gray-500 text-sm">Bộ công cụ công nghệ tích hợp AI dành riêng cho người làm Môi Giới Bất Động Sản.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
             {/* Thẻ Công cụ số 1 */}
             <Link href={`/${workspaceId}/tools/content`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-[#E03C31]/50 hover:shadow-md transition-all h-full">
                <div className="p-5 flex-1">
                   <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                      <Bot className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#E03C31] transition-colors">Trợ lý Viết Bài Đăng AI</h3>
                   <p className="text-sm text-gray-500 line-clamp-3">Công cụ tự động hóa sáng tạo nội dung mô tả bất động sản chuyên nghiệp, tự động định dạng và đề xuất Headline.</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-[#E03C31] transition-colors">
                   <span>Truy cập ngay</span>
                   <ChevronRight className="w-4 h-4" />
                </div>
             </Link>

             {/* Thẻ Công cụ số 2 - V2 */}
             <Link href={`/${workspaceId}/tools/content-v2`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all h-full">
                <div className="p-5 flex-1">
                   <div className="w-12 h-12 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6" />
                   </div>
                   <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Trợ lý AI V2</h3>
                      <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-sm uppercase">MỚI</span>
                   </div>
                   <p className="text-sm text-gray-500 line-clamp-3">Chỉ cần dán thông tin → AI tự viết bài dài + tóm tắt ngắn theo cấu trúc chuẩn. Nhanh gọn, 2 credits.</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-emerald-600 transition-colors">
                   <span>Truy cập ngay</span>
                   <ChevronRight className="w-4 h-4" />
                </div>
             </Link>
             {/* Thẻ Công cụ số 3 - V3 */}
             <Link href={`/${workspaceId}/tools/content-v3`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-blue-500/50 hover:shadow-md transition-all h-full">
                <div className="p-5 flex-1">
                   <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6" />
                   </div>
                   <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Viết bài nhanh V3</h3>
                      <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-sm uppercase">⚡ NHANH</span>
                   </div>
                   <p className="text-sm text-gray-500 line-clamp-3">Bài đăng xuất hiện liền! Không xử lý ảnh, chỉ 2 credits. Tự lưu Drive.</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">
                   <span>Truy cập ngay</span>
                   <ChevronRight className="w-4 h-4" />
                </div>
             </Link>

             {/* Thẻ Công cụ số 4 - Image Editor */}
             <Link href={`/${workspaceId}/tools/image-editor`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-orange-500/50 hover:shadow-md transition-all h-full">
                <div className="p-5 flex-1">
                   <div className="w-12 h-12 bg-orange-50 text-orange-600 flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6" />
                   </div>
                   <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">Chỉnh sửa Ảnh AI</h3>
                      <span className="text-[10px] font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded-sm uppercase">MỚI</span>
                   </div>
                   <p className="text-sm text-gray-500 line-clamp-3">Xóa vật thể, làm nét ảnh BĐS bằng AI. Tự lưu kết quả vào Drive.</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-orange-600 transition-colors">
                   <span>Truy cập ngay</span>
                   <ChevronRight className="w-4 h-4" />
                </div>
             </Link>


             {/* Thẻ Lịch sử sử dụng */}
             <Link href={`/${workspaceId}/usage-history`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all h-full">
                <div className="p-5 flex-1">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                      <History className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">Lịch sử sử dụng</h3>
                   <p className="text-sm text-gray-500 line-clamp-3">Theo dõi credit, trạng thái xử lý và lịch sử sử dụng các công cụ AI.</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors">
                   <span>Xem lịch sử</span>
                   <ChevronRight className="w-4 h-4" />
                </div>
             </Link>

             {/* Thẻ Coming soon 2 */}
             <div className="flex flex-col bg-gray-50 border border-gray-200 border-dashed rounded-sm h-full opacity-60">
                <div className="p-5 flex-1 relative">
                   <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Sắp ra mắt</div>
                   <div className="w-12 h-12 bg-gray-200 text-gray-400 flex items-center justify-center rounded-sm mb-4">
                      <FileText className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-500 mb-2">Xuất Sale Kit Thực Tế</h3>
                   <p className="text-sm text-gray-500 line-clamp-3">Tự động bắt form và xuất tài liệu PDF thuyết trình căn hộ chuyên nghiệp dạng Slide.</p>
                </div>
             </div>
          </div>
       </main>
    </div>
  );
}
