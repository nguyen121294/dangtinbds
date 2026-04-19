import Link from 'next/link';
import { Building2, User, ArrowRight, Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function GlobalNavbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-gray-900 hover:opacity-80 transition-opacity">
          <Building2 className="w-6 h-6 text-[#E03C31]" />
          <span className="font-bold text-xl tracking-tight text-[#E03C31] hidden sm:block">Môi Giới AI</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {user && profile ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <Coins className="w-4 h-4 text-amber-500" />
                  {(profile.paidCredits || 0) + (profile.trialCredits || 0)} Credits
                </span>
                <span className="text-xs text-gray-500">
                  Hết hạn: {profile.subscriptionExpiresAt ? new Date(profile.subscriptionExpiresAt).toLocaleDateString('vi-VN') : 'Vô hạn'}
                </span>
              </div>
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#E03C31] transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-sm border border-gray-200"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Bảng điều khiển</span>
              </Link>
            </div>
          ) : (
            <Link 
              href="/login?returnTo=/pricing" 
              className="flex items-center gap-2 text-sm font-semibold text-white bg-[#E03C31] hover:bg-[#c9362c] px-4 py-2 rounded-sm shadow-sm transition-all"
            >
              Đăng nhập ngay
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
