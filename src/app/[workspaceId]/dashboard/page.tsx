import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CreditCard, CheckCircle2, XCircle, FileType, Bot } from 'lucide-react';
import { checkWorkspaceAccess, checkFeatureAccess, getWorkspacePlanDetails } from '@/lib/workspace-utils';
import PropertyForm from '@/components/PropertyForm';

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
             <p className="mt-6 text-emerald-400 font-bold text-3xl flex items-center gap-2">
                💳 {dbUser?.credits ?? 0} <span className="text-lg text-emerald-500/70">Credits</span>
             </p>
             {dbUser?.subscriptionExpiresAt && (
                <p className="mt-3 text-sm text-zinc-400 bg-zinc-950 px-3 py-2 rounded-lg inline-block border border-zinc-800">
                   Hết hạn: {new Date(dbUser.subscriptionExpiresAt).toLocaleDateString('vi-VN')}
                </p>
             )}
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
                Nạp thêm Credit
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tool Content Embedded */}
      <div className="mt-12 mb-20 bg-[#F8FAFC] rounded-3xl p-6 md:p-12 shadow-2xl overflow-hidden border border-zinc-800">
         <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">Công cụ Đăng tin AI Tốc độ cao</h2>
            <p className="text-gray-500">Thông tin biên soạn sẽ lưu trực tiếp vào Drive của bạn.</p>
         </div>
         <PropertyForm onGenerate={(content) => {}} />
      </div>
    </>
  );
}
