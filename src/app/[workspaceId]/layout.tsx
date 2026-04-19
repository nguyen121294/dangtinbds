import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { profiles, workspaces, workspaceMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { XCircle, LogOut, Building2, Settings, Wallet, Clock, User as UserIcon, Menu } from 'lucide-react';
import { reactivateAccount } from '@/app/dashboard/account/actions';
import WorkspaceSwitcher from '@/components/workspace-switcher';
import { checkWorkspaceAccess, getUserPlanDetails } from '@/lib/workspace-utils';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let dbUser = null;
  try {
    const results = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
    dbUser = results[0];
  } catch (error) {
    console.error('Layout DB Query Error:', error);
  }

  // 1. Phân quyền
  if (dbUser?.status === 'locked') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Tài khoản bị khóa</h1>
          <p className="text-zinc-400 mb-6">Tài khoản của bạn đã bị khóa.</p>
          <form action="/auth/signout" method="post"><button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition">Đăng xuất</button></form>
        </div>
      </div>
    );
  }

  if (dbUser?.status === 'inactive') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        {/* code bị ẩn đi để gọn */}
      </div>
    );
  }

  // Lấy thông tin về các Workspaces của User để hiển thị Dropdown
  const userMemberships = await db.select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));

  // Lấy chi tiết Workspaces đó (để có Tên)
  const workspaceListObj = await db.select({
      id: workspaces.id,
      name: workspaces.name
  })
    .from(workspaces); // (Trong môi trường production nên inner join để tránh select all, tôi query đơn giản tạm)

  const allowedWorkspaces = workspaceListObj
    .filter(ws => userMemberships.some(m => m.workspaceId === ws.id))
    .map(ws => {
       const membership = userMemberships.find(m => m.workspaceId === ws.id);
       return {
         id: ws.id,
         name: ws.name,
         role: membership?.role || 'member'
       };
    });

  // Verify access to the current active workspace
  const hasAccess = allowedWorkspaces.some(w => w.id === workspaceId);
  if (!hasAccess && allowedWorkspaces.length > 0) {
    redirect(`/${allowedWorkspaces[0].id}/dashboard`);
  } else if (!hasAccess && allowedWorkspaces.length === 0) {
    redirect('/auth/callback'); // fix
  }

  // Kiểm tra cái workspace hiện tại có VIP không
  const isVipWorkspace = await checkWorkspaceAccess(workspaceId);

  const { isVip, planName } = await getUserPlanDetails(user.id);
  const isFree = dbUser?.subscriptionStatus !== 'active';
  const now = Date.now();
  let trialRemaining = 0;
  if (dbUser?.trialExpiresAt) {
     trialRemaining = Math.max(0, Math.ceil((new Date(dbUser.trialExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
  }

  let paidRemaining = 0;
  if (dbUser?.subscriptionExpiresAt) {
     paidRemaining = Math.max(0, Math.ceil((new Date(dbUser.subscriptionExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F5] text-gray-900 font-sans">
      {/* CSS-only Mobile Sidebar Toggle state */}
      <input type="checkbox" id="mobile-sidebar-toggle" className="peer hidden" />
      
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
         <Link href="/dashboard" className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#E03C31]" />
         </Link>
         <div className="flex-1 px-4 overflow-hidden truncate font-medium text-gray-900">
            {allowedWorkspaces.find(w => w.id === workspaceId)?.name || 'Môi Giới AI'}
         </div>
         <label htmlFor="mobile-sidebar-toggle" className="p-2 cursor-pointer text-gray-600 hover:text-[#E03C31] transition">
            <Menu className="w-6 h-6" />
         </label>
      </div>

      {/* Mobile Overlay Backdrop */}
      <label htmlFor="mobile-sidebar-toggle" className="fixed inset-0 bg-gray-900/50 z-40 hidden peer-checked:block md:peer-checked:hidden cursor-pointer"></label>

      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-50 transform -translate-x-full peer-checked:translate-x-0 md:translate-x-0 transition-transform duration-300 shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-gray-200 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 mr-2">
            <Building2 className="w-6 h-6 text-[#E03C31]" />
          </Link>
          <div className="flex-1 w-full overflow-hidden">
             <WorkspaceSwitcher 
               currentWorkspaceId={workspaceId} 
               workspaces={allowedWorkspaces} 
             />
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-2">
           <Link href={`/${workspaceId}/dashboard`} className="flex items-center justify-between px-3 py-2.5 rounded-sm bg-red-50 text-[#E03C31] font-medium text-sm border-r-2 border-[#E03C31]">
              <div className="flex items-center gap-3">
                 <Building2 className="w-5 h-5" />
                 Bảng Công cụ
              </div>
              {isVipWorkspace && (
                 <span className="text-[9px] bg-[#E03C31] text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider">PRO</span>
              )}
           </Link>
           <Link href={`/${workspaceId}/dashboard/workspace-settings`} className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-gray-600 hover:bg-gray-100 hover:text-[#E03C31] font-medium text-sm transition-colors">
              <Settings className="w-5 h-5" />
              Quản lý Nhóm
           </Link>
           <Link href="/dashboard/account" target="_blank" className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-gray-600 hover:bg-gray-100 hover:text-[#E03C31] font-medium text-sm transition-colors">
              <UserIcon className="w-5 h-5" />
              Cài đặt Cá nhân
           </Link>
        </div>

        {/* THÔNG TIN GÓI HIỆN TẠI */}
        <div className="mx-4 mb-4 p-4 border border-gray-200 bg-gray-50 rounded-sm shadow-sm flex flex-col gap-3">
           <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Gói cước của bạn</p>
              <div className="font-bold text-gray-900 flex items-center gap-2">
                 <span>{planName}</span>
              </div>
           </div>

           <div className="flex flex-col gap-2">
             {trialRemaining > 0 && (
                <div className="flex flex-col gap-1 text-sm bg-white p-2 rounded-sm border border-gray-100 shadow-sm">
                   <div className="font-medium text-xs text-gray-500 uppercase">Ví Dùng Thử</div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-gray-600">
                        <Wallet className="w-4 h-4 text-[#E03C31]" /> 
                        <span className="font-medium text-gray-900">{dbUser?.trialCredits || 0}</span>
                     </div>
                     <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <Clock className="w-3.5 h-3.5 text-orange-500" /> 
                        <span className="font-medium text-gray-900">{trialRemaining}</span> ngày
                     </div>
                   </div>
                </div>
             )}

             {paidRemaining > 0 && (
                <div className="flex flex-col gap-1 text-sm bg-emerald-50 p-2 rounded-sm border border-emerald-100 shadow-sm">
                   <div className="font-medium text-xs text-emerald-700 uppercase">Ví PRO</div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-gray-600">
                        <Wallet className="w-4 h-4 text-emerald-600" /> 
                        <span className="font-medium text-gray-900">{dbUser?.paidCredits || 0}</span>
                     </div>
                     <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> 
                        <span className="font-medium text-gray-900">{paidRemaining}</span> ngày
                     </div>
                   </div>
                </div>
             )}
           </div>

           <Link href="/pricing" className={`w-full py-2 flex justify-center items-center text-sm font-semibold rounded-sm transition-colors border ${
              isFree 
                ? 'bg-[#E03C31] text-white hover:bg-[#c9362c] border-[#E03C31]' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
           }`}>
              {isFree ? 'Nâng cấp / Dùng thử ngay' : 'Mua thêm tín dụng'}
           </Link>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-shrink-0 items-center justify-center text-gray-600 font-bold uppercase">
                {dbUser?.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase() || <UserIcon className="w-5 h-5" />}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">{dbUser?.firstName || 'Người dùng'} {dbUser?.lastName || ''}</p>
             </div>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-gray-500 hover:text-[#E03C31] transition-colors p-2 rounded-sm" title="Đăng xuất">
               <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0">
        <div className="h-16 border-b border-gray-200 bg-white hidden md:flex items-center px-8 shrink-0">
           {/* Topbar trống nhường chỗ thiết kế */}
        </div>
        <div className="flex-1 w-full bg-[#F2F4F5]">
           {children}
        </div>
      </main>
    </div>
  );
}
