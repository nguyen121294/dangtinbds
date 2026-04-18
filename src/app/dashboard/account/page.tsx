import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LogOut, ChevronLeft } from 'lucide-react';
import AccountClientView from './client-view';
import { getUserPlanDetails } from '@/lib/workspace-utils';

export default async function AccountPage() {
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
    console.error('Account DB Query Error:', error);
  }

  const { planName } = await getUserPlanDetails(user.id);

  return (
    <div className="min-h-screen bg-[#F2F4F5] text-[#2C3136] font-sans">
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-gray-600 hover:text-[#E03C31] transition flex items-center font-medium">
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">Quay lại Bảng điều khiển</span>
            </a>
            <div className="text-xl font-bold text-gray-900 border-l border-gray-300 pl-4">
              Cài đặt Cá nhân
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium hidden sm:inline">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-gray-500 hover:text-[#E03C31] transition" title="Đăng xuất">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-12">
        
        {/* Pass data to Client Components for interactive forms */}
        <AccountClientView 
          email={user.email!}
          firstName={dbUser?.firstName || ''}
          lastName={dbUser?.lastName || ''}
          subscriptionStatus={dbUser?.subscriptionStatus || 'inactive'}
          subscriptionExpiresAt={dbUser?.subscriptionExpiresAt || null}
          subscriptionId={dbUser?.subscriptionId || 'free'}
          planName={planName}
        />
      </main>
    </div>
  );
}
