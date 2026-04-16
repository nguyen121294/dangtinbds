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
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-zinc-400 hover:text-white transition flex items-center">
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span>Quay lại</span>
            </a>
            <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent border-l border-zinc-800 pl-4">
              Cài đặt Tài khoản
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-zinc-400 hover:text-white transition" title="Đăng xuất">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight mb-8">Quản lý Thông tin</h1>
        
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
