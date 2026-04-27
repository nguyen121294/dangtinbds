import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Building2, LogOut, Wallet, Clock, User as UserIcon, Menu, Receipt, Gift } from 'lucide-react';
import { getUserPlanDetails } from '@/lib/workspace-utils';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch dbUser to display profile and credits in sidebar
  const profileDetails = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  const dbUser = profileDetails[0];

  const { isVip, planName } = await getUserPlanDetails(user.id);
  
  const isFree = dbUser?.subscriptionStatus !== 'active';
  const now = Date.now();
  let trialRemaining = 0;
  if (dbUser?.trialExpiresAt) {
     trialRemaining = Math.max(0, Math.ceil((new Date(dbUser.trialExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
  }

  let paidRemaining = 0;
  const hasPaidSubscription = !!(dbUser?.subscriptionExpiresAt);
  const isPaidExpired = hasPaidSubscription && dbUser!.subscriptionExpiresAt !== null &&
    new Date(dbUser!.subscriptionExpiresAt!).getTime() <= now;
  if (dbUser?.subscriptionExpiresAt) {
     paidRemaining = Math.max(0, Math.ceil((new Date(dbUser.subscriptionExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F5] text-gray-900 font-sans">
      
      {/* CSS-only Mobile Sidebar Toggle state */}
      <input type="checkbox" id="mobile-sidebar-toggle" className="peer hidden" />
      
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
         <Link href="/" className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#E03C31]" />
            <div className="font-bold text-lg tracking-tight text-[#E03C31]">Trợ lý AI BĐS</div>
         </Link>
         <label htmlFor="mobile-sidebar-toggle" className="p-2 cursor-pointer text-gray-600 hover:text-[#E03C31] transition">
            <Menu className="w-6 h-6" />
         </label>
      </div>

      {/* Mobile Overlay Backdrop */}
      <label htmlFor="mobile-sidebar-toggle" className="fixed inset-0 bg-gray-900/50 z-40 hidden peer-checked:block md:peer-checked:hidden cursor-pointer"></label>

      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-50 transform -translate-x-full peer-checked:translate-x-0 md:translate-x-0 transition-transform duration-300">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#E03C31]" />
            <div className="font-bold border-none text-xl tracking-tight text-[#E03C31]">Trợ lý AI BĐS</div>
          </Link>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-2">
           <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-red-50 hover:text-[#E03C31] font-medium text-sm transition-colors text-gray-600">
              <Building2 className="w-5 h-5" />
              Tổ chức
           </Link>
           <Link href="/dashboard/account" target="_blank" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-red-50 hover:text-[#E03C31] text-gray-600 font-medium text-sm transition-colors">
              <UserIcon className="w-5 h-5" />
              Cài đặt Cá nhân
           </Link>
           <Link href="/dashboard/payments" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-red-50 hover:text-[#E03C31] text-gray-600 font-medium text-sm transition-colors">
              <Receipt className="w-5 h-5" />
              Lịch sử Thanh toán
           </Link>
           <Link href="/dashboard/referral" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-red-50 hover:text-[#E03C31] text-gray-600 font-medium text-sm transition-colors">
              <Gift className="w-5 h-5" />
              Hoa hồng Giới thiệu
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
         <div className="h-auto min-h-[56px] border-b border-gray-200 bg-white hidden md:flex items-center justify-between px-6 py-2 shrink-0">
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Gói:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {planName}{isPaidExpired ? ' (Hết hạn)' : ''}
                  </span>
               </div>

               <div className="h-6 w-px bg-gray-200" />

               {((dbUser?.trialCredits || 0) > 0) && (trialRemaining > 0 || !dbUser?.trialExpiresAt) && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-sm">
                     <Wallet className="w-3.5 h-3.5 text-[#E03C31]" />
                     <span className="text-xs font-bold text-gray-900">{dbUser?.trialCredits || 0}</span>
                     <span className="text-[10px] text-gray-500">Dùng thử</span>
                     <span className="text-[10px] text-gray-400">·</span>
                     <Clock className="w-3 h-3 text-orange-500" />
                     <span className="text-[10px] font-medium text-gray-600">{dbUser?.trialExpiresAt ? `${trialRemaining}d` : 'Vô hạn'}</span>
                  </div>
               )}

               {/* Paid: còn hạn → badge xanh lá, hết hạn → badge đỏ */}
               {paidRemaining > 0 ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-sm">
                     <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                     <span className="text-xs font-bold text-gray-900">{dbUser?.paidCredits || 0}</span>
                     <span className="text-[10px] text-gray-500">PRO</span>
                     <span className="text-[10px] text-gray-400">·</span>
                     <Clock className="w-3 h-3 text-emerald-600" />
                     <span className="text-[10px] font-medium text-gray-600">{paidRemaining}d</span>
                  </div>
               ) : isPaidExpired && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-sm">
                     <Clock className="w-3 h-3 text-red-500" />
                     <span className="text-xs font-bold text-red-600">Hết hạn</span>
                  </div>
               )}
            </div>

            <Link href="/pricing" className={`text-xs font-bold px-4 py-2 rounded-sm transition-colors border ${
               isFree || isPaidExpired
                 ? 'bg-[#E03C31] text-white hover:bg-[#c9362c] border-[#E03C31]'
                 : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
            }`}>
               {isFree || isPaidExpired ? 'Nâng cấp' : 'Mua thêm'}
            </Link>
         </div>
        <div className="flex-1 w-full bg-[#F2F4F5]">
          {children}
        </div>
      </main>
    </div>
  );
}
