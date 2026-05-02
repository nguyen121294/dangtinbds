import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft, Bot, FileText, ImageIcon, ChevronRight, Crown, Sparkles, History, ClipboardList, Palette, Wand2 } from 'lucide-react';
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
             {/* Thẻ Công cụ số 1 — Ẩn theo yêu cầu */}

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
                      <span className="text-[10px] font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded-sm uppercase">AI</span>
                   </div>
                   <p className="text-sm text-gray-500 line-clamp-3">Xóa vật thể, làm nét ảnh BĐS bằng AI. Tự lưu kết quả vào Drive.</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-orange-600 transition-colors">
                   <span>Truy cập ngay</span>
                   <ChevronRight className="w-4 h-4" />
                </div>
             </Link>

              {/* Thẻ Công cụ AI Chỉnh Ảnh Sáng Tạo */}
              <Link href={`/${workspaceId}/tools/qwen-image-edit`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-cyan-500/50 hover:shadow-md transition-all h-full">
                 <div className="p-5 flex-1">
                    <div className="w-12 h-12 bg-cyan-50 text-cyan-600 flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                       <Wand2 className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                       <h3 className="text-lg font-bold text-gray-900 group-hover:text-cyan-600 transition-colors">AI Chỉnh Ảnh Sáng Tạo</h3>
                       <span className="text-[10px] font-bold bg-cyan-600 text-white px-1.5 py-0.5 rounded-sm uppercase">PREMIUM</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-3">Tự viết prompt để chỉnh sửa ảnh AI. Thay nền, ghép ảnh, chuyển phong cách — tự lưu Drive.</p>
                 </div>
                 <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-cyan-600 transition-colors">
                    <span>Truy cập ngay</span>
                    <ChevronRight className="w-4 h-4" />
                 </div>
              </Link>

              {/* Thẻ Công cụ Poster AI */}
              <Link href={`/${workspaceId}/tools/poster`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-pink-500/50 hover:shadow-md transition-all h-full">
                 <div className="p-5 flex-1">
                    <div className="w-12 h-12 bg-pink-50 text-pink-600 flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                       <Palette className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                       <h3 className="text-lg font-bold text-gray-900 group-hover:text-pink-600 transition-colors">Poster AI BĐS</h3>
                       <span className="text-[10px] font-bold bg-pink-600 text-white px-1.5 py-0.5 rounded-sm uppercase">MỚI</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-3">Tạo poster quảng cáo BĐS chuyên nghiệp bằng AI từ dữ liệu và ảnh thật.</p>
                 </div>
                 <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-pink-600 transition-colors">
                    <span>Tạo Poster</span>
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

             {/* Thẻ Danh sách Tài sản */}
             <Link href={`/${workspaceId}/dashboard/properties`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-[#E03C31]/50 hover:shadow-md transition-all h-full">
                <div className="p-5 flex-1">
                   <div className="w-12 h-12 bg-red-50 text-[#E03C31] flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                      <ClipboardList className="w-6 h-6" />
                   </div>
                   <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#E03C31] transition-colors">Danh sách Tài sản</h3>
                      <span className="text-[10px] font-bold bg-[#E03C31] text-white px-1.5 py-0.5 rounded-sm uppercase">MỚI</span>
                   </div>
                   <p className="text-sm text-gray-500 line-clamp-3">Xem toàn bộ tài sản BĐS đã ghi nhận từ V2/V3. Tra cứu, so sánh và quản lý dữ liệu.</p>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-[#E03C31] transition-colors">
                   <span>Xem danh sách</span>
                   <ChevronRight className="w-4 h-4" />
                </div>
             </Link>

              {/* Thẻ Sale Kit */}
              <Link href={`/${workspaceId}/tools/sale-kit`} className="group flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm hover:border-blue-500/50 hover:shadow-md transition-all h-full">
                 <div className="p-5 flex-1">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform">
                       <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                       <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Sale Kit Builder</h3>
                       <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-sm uppercase">MỚI</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-3">Tạo tài liệu PDF thuyết trình bất động sản chuyên nghiệp dạng Sale Kit.</p>
                 </div>
                 <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">
                    <span>Tạo Sale Kit</span>
                    <ChevronRight className="w-4 h-4" />
                 </div>
              </Link>
          </div>
       </main>
    </div>
  );
}
