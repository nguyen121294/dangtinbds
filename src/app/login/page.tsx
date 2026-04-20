'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogIn, UserPlus, KeyRound, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
        router.refresh(); // Refresh server state for cookies
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
      setMode('sign_up'); // Auto-switch to signup mode when coming from referral link
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'sign_in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // redirection handled by onAuthStateChange
      } 
      else if (mode === 'sign_up') {
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu nhập lại không khớp!');
        }
        if (password.length < 6) {
          throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
        }
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              firstName,
              lastName
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        if (signUpError) throw signUpError;
        
        setMessage('Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác nhận tài khoản.');
      } 
      else if (mode === 'forgot_password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (resetError) throw resetError;
        
        setMessage('Email khôi phục đã được gửi! Vui lòng kiểm tra hộp thư của bạn.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Mode Reset Form
  useEffect(() => {
    setError(null);
    setMessage(null);
    setFirstName('');
    setLastName('');
    setPassword('');
    setConfirmPassword('');
  }, [mode]);

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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-red-50 text-[#E03C31]">
            {mode === 'sign_in' ? <LogIn className="h-6 w-6" /> : mode === 'sign_up' ? <UserPlus className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            {mode === 'sign_in' ? 'Đăng nhập' : mode === 'sign_up' ? 'Tạo tài khoản' : 'Khôi phục mật khẩu'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {mode === 'sign_in' ? 'Nhập thông tin để tiếp tục vào hệ thống' : mode === 'sign_up' ? 'Điền thông tin để đăng ký thành viên' : 'Nhập email để nhận liên kết khôi phục'}
          </p>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 rounded-sm bg-red-50 p-3 text-red-600 border border-red-200 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {message && (
          <div className="flex items-center gap-2 rounded-sm bg-green-50 p-3 text-green-700 border border-green-200 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Email hoặc số điện thoại</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
              placeholder="VD: name@example.com"
            />
          </div>

          {mode === 'sign_up' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Họ</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="block w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
                  placeholder="Nguyễn Văn"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Tên</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="block w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
                  placeholder="A"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot_password' && (
            <div className="space-y-1.5 relative">
              <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-sm border border-gray-300 bg-white px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 transition focus:border-[#E03C31] focus:outline-none focus:ring-1 focus:ring-[#E03C31]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'sign_up' && (
            <div className="space-y-1.5 relative">
              <label className="text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (password && e.target.value !== password) {
                      setError("Mật khẩu không khớp!");
                    } else {
                      setError(null);
                    }
                  }}
                  className={`block w-full rounded-sm border ${error === 'Mật khẩu không khớp!' ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#E03C31] focus:ring-[#E03C31]'} bg-white px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-1`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (mode === 'sign_up' && error === 'Mật khẩu không khớp!')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-[#E03C31] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-[#E03C31] focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'sign_in' ? 'Đăng nhập' : mode === 'sign_up' ? 'Tạo tài khoản' : 'Gửi link khôi phục'}
          </button>
        </form>

        {mode === 'sign_in' && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Hoặc tiếp tục với</span>
              </div>
            </div>
            
            <button
              onClick={() => {
                 supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents',
                      redirectTo: `${window.location.origin}/auth/callback`
                    }
                 });
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4" />
                <path d="M5.84 14.147l-2.28 1.773C4.52 18.253 7.827 20.4 12.48 20.4c3.12 0 5.8-.973 7.827-2.613l-2.307-1.84c-1.12.76-2.627 1.253-5.52 1.253-4.227 0-7.853-2.733-9.173-6.453H5.84v2.4z" fill="#34A853" />
                <path d="M3.307 9.853C2.96 11 2.96 12.24 3.307 13.387V15.76H1.053C.387 14.28 0 12.693 0 11s.387-3.28 1.053-4.747l2.253 1.76z" fill="#FBBC05" />
                <path d="M12.48 3.587c1.707 0 3.227.587 4.413 1.64l2.4-2.4C17.48 1.053 14.973 0 12.48 0 7.827 0 4.52 2.147 2.813 5.467L5.08 7.24C6.4 3.52 10.027 3.587 12.48 3.587z" fill="#EA4335" />
              </svg>
              <span>Google (Khuyên dùng)</span>
            </button>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 text-center text-sm text-gray-500">
          {mode === 'sign_in' ? (
            <>
              <button onClick={() => setMode('forgot_password')} className="hover:text-[#E03C31] hover:underline transition">Quên mật khẩu?</button>
              <p>
                Chưa có tài khoản?{' '}
                <button onClick={() => setMode('sign_up')} className="text-[#E03C31] hover:text-red-700 font-bold hover:underline transition">Đăng ký ngay</button>
              </p>
            </>
          ) : mode === 'sign_up' ? (
            <p>
              Đã có tài khoản?{' '}
              <button onClick={() => setMode('sign_in')} className="text-[#E03C31] hover:text-red-700 font-bold hover:underline transition">Đăng nhập</button>
            </p>
          ) : (
            <p>
              <button onClick={() => setMode('sign_in')} className="text-[#E03C31] hover:text-red-700 font-bold hover:underline transition">Quay lại Đăng nhập</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
