import Link from 'next/link';
import { Building2, User, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function GlobalNavbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-gray-900 hover:opacity-80 transition-opacity">
          <Building2 className="w-6 h-6 text-[#E03C31]" />
          <span className="font-bold text-xl tracking-tight text-[#E03C31] hidden sm:block">Môi Giới AI</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#E03C31] transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-sm border border-gray-200"
            >
              <User className="w-4 h-4" />
              Bảng điều khiển
            </Link>
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
