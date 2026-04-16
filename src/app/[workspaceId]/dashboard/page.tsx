import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CreditCard, CheckCircle2, XCircle, FileType, Bot } from 'lucide-react';
import { checkWorkspaceAccess, checkFeatureAccess, getWorkspacePlanDetails } from '@/lib/workspace-utils';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let dbUser;
  try {
    const results = await db.select().from(profiles).where(eq(profiles.id, user!.id)).limit(1);
    dbUser = results[0];
  } catch (error) {}

  // Thay vì check subscription cá nhân như cũ, check quyền VIP của Workspace hiện hành (dùng cho thông báo cấp độ)
  const isVipWorkspace = await checkWorkspaceAccess(workspaceId);
  const { planName: workspacePlanName } = await getWorkspacePlanDetails(workspaceId);

  // [TÍNH NĂNG MỚI] Check chi tiết Từng Feature riêng biệt
  const canExportPdf = await checkFeatureAccess(workspaceId, 'export_pdf');
  const canUseAi = await checkFeatureAccess(workspaceId, 'ai_model');

  // Xem thử tài khoản cá nhân của người dùng NÀY có phải VIP không (để hiện nút Mua gói)
  const isPersonalVip = dbUser?.subscriptionStatus === 'active' &&
    dbUser?.subscriptionExpiresAt &&
    new Date(dbUser.subscriptionExpiresAt) > new Date();

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tight">Trang chủ không gian làm việc</h1>
      <p className="mt-2 text-zinc-400">Bạn đang ở trong phòng làm việc. Các dữ liệu bên dưới là riêng biệt.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Quyền lợi Workspace */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl relative overflow-hidden">
          {isVipWorkspace && <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>}
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-lg font-semibold text-zinc-300">Cấp độ Không Gian (Team)</h3>
            {isVipWorkspace ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <XCircle className="h-6 w-6 text-rose-500" />
            )}
          </div>
          <div className="mt-4 relative z-10">
            <div className={`text-3xl font-bold ${isVipWorkspace ? 'text-emerald-400 bg-emerald-500/10 p-2 rounded-lg inline-block' : 'text-rose-400'}`}>
              {isVipWorkspace ? `🌟 ${workspacePlanName}` : 'Free Tier'}
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {isVipWorkspace
                ? 'Không gian này được kế thừa ĐẶC QUYỀN PRO từ gói cước của Chủ sở hữu. Tài nguyên không giới hạn!'
                : 'Mọi tính năng nâng cao trong không gian này đang bị khóa. Hãy nói người tạo phòng nâng cấp gói.'}
            </p>
          </div>
        </div>

        {/* Trạng thái BẢN THÂN CÁ NHÂN */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
          <h3 className="text-lg font-semibold text-zinc-300">Ví Của Bạn (Personal Billing)</h3>
          <div className="mt-4">
             <div className="text-xl font-bold bg-zinc-800/50 p-2 rounded-xl text-zinc-300 border border-zinc-800">
               {isPersonalVip ? 'Tài khoản Đã Nâng Cấp' : 'Tài khoản Miễn phí'}
             </div>
          </div>
          <div className="mt-6">
            {isPersonalVip ? (
              <button
                disabled
                className="w-full rounded-xl bg-zinc-800 px-6 py-4 text-center font-bold text-zinc-500 cursor-not-allowed"
              >
                Bạn là Đại bàng
              </button>
            ) : (
               <a
                href="/pricing"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-center font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
              >
                <CreditCard className="h-5 w-5" />
                Nâng cấp tài khoản bạn
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Pro Content */}
      <h2 className="text-2xl font-bold mt-12 mb-6 text-zinc-300 border-b border-zinc-800 pb-4">Công cụ trong phòng làm việc</h2>
      <div className="grid md:grid-cols-2 gap-6">
         {/* Tính năng AI */}
         <div className={`rounded-2xl border p-8 transition-all relative overflow-hidden ${canUseAi ? 'border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10' : 'border-dashed border-zinc-800 bg-zinc-900/50'}`}>
            <div className="flex justify-between items-start mb-4">
               <Bot className={`w-8 h-8 ${canUseAi ? 'text-indigo-400' : 'text-zinc-600'}`} />
               {canUseAi ? (
                  <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-md font-bold uppercase">Đã mở</span>
               ) : (
                  <span className="text-xs bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md font-bold uppercase">Khoá</span>
               )}
            </div>
            <h3 className={`text-xl font-bold mb-2 ${canUseAi ? 'text-white' : 'text-zinc-600'}`}>Tạo Báo cáo bằng AI</h3>
            <p className={canUseAi ? 'text-zinc-400' : 'text-zinc-600'}>
               Sử dụng mô hình AI tiên tiến để đọc hiểu dữ liệu trong Workspace này.
            </p>
            <div className="mt-6">
               {canUseAi ? (
                  <a href="/dashboard/tool" className="inline-block text-center px-5 py-2.5 rounded-xl font-semibold transition w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg">
                     Khởi động AI Đoán Định BĐS
                  </a>
               ) : (
                  <button disabled className="px-5 py-2.5 rounded-xl font-semibold transition w-full bg-zinc-800 text-zinc-600 cursor-not-allowed">
                     Yêu cầu gói VIP
                  </button>
               )}
            </div>
         </div>

         {/* Tính năng Export PDF */}
         <div className={`rounded-2xl border p-8 transition-all relative overflow-hidden ${canExportPdf ? 'border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10' : 'border-dashed border-zinc-800 bg-zinc-900/50'}`}>
            <div className="flex justify-between items-start mb-4">
               <FileType className={`w-8 h-8 ${canExportPdf ? 'text-rose-400' : 'text-zinc-600'}`} />
               {canExportPdf ? (
                  <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded-md font-bold uppercase">Đã mở</span>
               ) : (
                  <span className="text-xs bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md font-bold uppercase">Khoá</span>
               )}
            </div>
            <h3 className={`text-xl font-bold mb-2 ${canExportPdf ? 'text-white' : 'text-zinc-600'}`}>Xuất PDF Tốc độ cao</h3>
            <p className={canExportPdf ? 'text-zinc-400' : 'text-zinc-600'}>
               Đóng gói dữ liệu ra định dạng in ấn chuyên nghiệp không giới hạn trang.
            </p>
            <div className="mt-6">
               <button disabled={!canExportPdf} className={`px-5 py-2.5 rounded-xl font-semibold transition w-full ${canExportPdf ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                  {canExportPdf ? 'Tải PDF Xuống' : 'Yêu cầu gói Premium'}
               </button>
            </div>
         </div>
      </div>
    </>
  );
}
