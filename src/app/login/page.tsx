'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  // Redirect on session change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsRedirecting(true);
        router.push('/dashboard');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  // Capture referral code from URL and store in cookie
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      document.cookie = `ref_code=${ref}; path=/; max-age=604800; SameSite=Lax`; // 7 days
    }
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents',
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi đăng nhập.');
      setIsLoading(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F2F4F5] p-4 text-[#2C3136]">
        <Loader2 className="h-10 w-10 animate-spin text-[#E03C31] mb-4" />
        <p className="text-lg font-medium animate-pulse">
          Đang chuyển hướng...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F4F5] p-4 font-sans selection:bg-[#E03C31]/20 text-[#2C3136]">
      <div className="w-full max-w-md space-y-6 rounded-sm border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm bg-red-50 text-[#E03C31]">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Đăng nhập
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Sử dụng tài khoản Google để truy cập hệ thống
          </p>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 rounded-sm bg-red-50 p-3 text-red-600 border border-red-200 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-sm border border-gray-300 bg-white px-4 py-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E03C31] focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4" />
              <path d="M5.84 14.147l-2.28 1.773C4.52 18.253 7.827 20.4 12.48 20.4c3.12 0 5.8-.973 7.827-2.613l-2.307-1.84c-1.12.76-2.627 1.253-5.52 1.253-4.227 0-7.853-2.733-9.173-6.453H5.84v2.4z" fill="#34A853" />
              <path d="M3.307 9.853C2.96 11 2.96 12.24 3.307 13.387V15.76H1.053C.387 14.28 0 12.693 0 11s.387-3.28 1.053-4.747l2.253 1.76z" fill="#FBBC05" />
              <path d="M12.48 3.587c1.707 0 3.227.587 4.413 1.64l2.4-2.4C17.48 1.053 14.973 0 12.48 0 7.827 0 4.52 2.147 2.813 5.467L5.08 7.24C6.4 3.52 10.027 3.587 12.48 3.587z" fill="#EA4335" />
            </svg>
          )}
          <span>Đăng nhập với Google</span>
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          Tài khoản mới sẽ được tự động tạo khi bạn đăng nhập lần đầu.
          <br />
          Hệ thống yêu cầu quyền truy cập Google Drive để lưu bài viết.
        </p>
      </div>
    </div>
  );
}
