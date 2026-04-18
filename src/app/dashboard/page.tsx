import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { workspaces, workspaceMembers, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Building2, Settings, LogOut, Wallet, Clock, User as UserIcon } from 'lucide-react';
import CreateWorkspaceModal from '@/components/create-workspace-modal';
import { checkWorkspaceCreationQuota, getUserPlanDetails } from '@/lib/workspace-utils';
import Link from 'next/link';

export default async function DashboardHub() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userMemberships = await db.select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));

  const workspaceListObj = await db.select({
       id: workspaces.id,
       name: workspaces.name,
       ownerId: workspaces.ownerId
  }).from(workspaces);

  const allowedWorkspaces = workspaceListObj
    .filter(ws => userMemberships.some(m => m.workspaceId === ws.id))
    .map(ws => {
       const isOwner = ws.ownerId === user.id;
       return {
         id: ws.id,
         name: ws.name,
         role: isOwner ? 'owner' : 'member'
       };
    });

  const profileDetails = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  const dbUser = profileDetails[0];

  const quota = await checkWorkspaceCreationQuota(user.id);
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
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-10">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#E03C31]" />
            <div className="font-bold border-none text-xl tracking-tight text-[#E03C31]">Môi Giới AI</div>
          </Link>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-2">
           <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-sm bg-[#e03c3115] text-[#E03C31] font-medium text-sm border-r-2 border-[#E03C31]">
              <Building2 className="w-5 h-5" />
              Tổ chức
           </Link>
           <Link href="/dashboard/account" className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-gray-600 hover:bg-gray-100 font-medium text-sm transition-colors">
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
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <div className="h-16 border-b border-gray-200 bg-white flex items-center px-8 shrink-0">
           {/* Topbar trống nhường chỗ tập trung vào tổ chức */}
        </div>

        <div className="p-8 max-w-[1000px] w-full mx-auto flex-1">
           <div className="mb-6 border-b border-gray-200 pb-4 flex justify-between items-end">
              <div>
                 <h1 className="text-2xl font-bold text-gray-900 mb-1">Các tổ chức của bạn</h1>
                 <p className="text-sm text-gray-500">Quản lý và truy cập các không gian làm việc.</p>
              </div>
              <CreateWorkspaceModal canCreate={quota.canCreate} used={quota.used} total={quota.total} />
           </div>

           <div className="bg-white border border-gray-200 rounded-sm shadow-sm space-y-0">
             {allowedWorkspaces.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {allowedWorkspaces.map(ws => (
                    <a
                      key={ws.id}
                      href={`/${ws.id}/dashboard`}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-sm bg-gray-100 flex items-center justify-center text-gray-500 font-bold uppercase border border-gray-200 text-lg">
                            {ws.name.substring(0, 1)}
                         </div>
                         <div>
                            <h3 className="text-gray-900 font-semibold group-hover:text-[#E03C31] transition-colors">{ws.name}</h3>
                         </div>
                       </div>
                       
                       <div className="mt-4 sm:mt-0 flex flex-wrap items-center sm:justify-end gap-x-6 gap-y-2 text-sm text-gray-600">
                          {ws.role === 'owner' && (
                             <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-sm font-medium border border-gray-200">
                               Chủ sở hữu
                             </span>
                          )}
                          {ws.role === 'owner' && trialRemaining > 0 && (
                                <span className="flex items-center gap-1.5">
                                   Trial: <strong className="text-gray-900">{dbUser?.trialCredits || 0}</strong> ({trialRemaining}n)
                                </span>
                          )}
                          {ws.role === 'owner' && paidRemaining > 0 && (
                                <span className="flex items-center gap-1.5 text-emerald-700">
                                   PRO: <strong className="text-emerald-700">{dbUser?.paidCredits || 0}</strong> ({paidRemaining}n)
                                </span>
                          )}
                       </div>
                    </a>
                  ))}
                </div>
             ) : (
                <div className="py-16 text-center text-gray-500">
                   <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                   <h3 className="text-lg font-medium text-gray-900 mb-1">Chưa có tổ chức nào</h3>
                   <p className="text-sm">Bấm "Tạo Tổ Chức mới" để bắt đầu sử dụng Hệ thống AI.</p>
                </div>
             )}
           </div>
        </div>
      </main>
    </div>
  );
}
