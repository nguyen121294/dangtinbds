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
    <div className="p-8 w-full">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
           <h1 className="text-2xl font-bold text-gray-900 mb-1">Cài đặt Cá nhân</h1>
           <p className="text-sm text-gray-500">Quản lý thông tin tài khoản và cấu hình của bạn.</p>
        </div>
        
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
      </div>
    </div>
  );
}
