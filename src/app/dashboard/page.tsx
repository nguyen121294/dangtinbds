import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { workspaces, workspaceMembers, profiles } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
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
       const membership = userMemberships.find(m => m.workspaceId === ws.id);
       const isOwner = ws.ownerId === user.id;
       return {
         id: ws.id,
         name: ws.name,
         role: membership?.role || 'member',
         creditLimit: membership?.creditLimit || 0,
         creditsUsed: membership?.creditsUsed || 0,
         ownerId: ws.ownerId
       };
    });

  const ownerIds = Array.from(new Set(allowedWorkspaces.map(ws => ws.ownerId)));
  const ownerProfiles = ownerIds.length > 0 
    ? await db.select().from(profiles).where(inArray(profiles.id, ownerIds))
    : [];

  const profileDetails = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  const dbUser = profileDetails[0];

  const quota = await checkWorkspaceCreationQuota(user.id);
  const now = Date.now();

  return (
    <>
      <div className="h-16 border-b border-gray-200 bg-white hidden md:flex items-center px-8 shrink-0">
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
                {allowedWorkspaces.map(ws => {
                  const owner = ownerProfiles.find(p => p.id === ws.ownerId);
                  
                  let trialRemaining = 0;
                  if (owner?.trialExpiresAt) {
                     trialRemaining = Math.max(0, Math.ceil((new Date(owner.trialExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
                  }
                  const validTrial = trialRemaining > 0 ? (owner?.trialCredits || 0) : 0;

                  let paidRemaining = 0;
                  if (owner?.subscriptionExpiresAt) {
                     paidRemaining = Math.max(0, Math.ceil((new Date(owner.subscriptionExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
                  }
                  const validPaid = paidRemaining > 0 ? (owner?.paidCredits || 0) : 0;
                  const ownerTotalUsable = validTrial + validPaid;

                  const remainingLimit = Math.max(0, ws.creditLimit - ws.creditsUsed);
                  const memberUsable = Math.min(remainingLimit, ownerTotalUsable);

                  return (
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
                        {ws.role === 'owner' ? (
                           <>
                             <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-sm font-medium border border-gray-200">
                               Chủ sở hữu
                             </span>
                             {trialRemaining > 0 && (
                                <span className="flex items-center gap-1.5">
                                   Trial: <strong className="text-gray-900">{validTrial}</strong> ({trialRemaining}n)
                                </span>
                             )}
                             {paidRemaining > 0 && (
                                <span className="flex items-center gap-1.5 text-emerald-700">
                                   PRO: <strong className="text-emerald-700">{validPaid}</strong> ({paidRemaining}n)
                                </span>
                             )}
                           </>
                        ) : (
                           <span className="flex items-center gap-1.5">
                              Hạn mức cấp phép: <strong className="text-blue-600">{memberUsable} Credits</strong> 
                              <span className="text-gray-400 text-xs">(Đã dùng: {ws.creditsUsed}/{ws.creditLimit})</span>
                           </span>
                        )}
                     </div>
                  </a>
                )})}
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
    </>
  );
}
