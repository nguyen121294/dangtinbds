'use client';

import Link from 'next/link';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Status = 'loading' | 'success' | 'already_paid' | 'failed' | 'no_order';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('orderCode');
  const [status, setStatus] = useState<Status>(orderCode ? 'loading' : 'no_order');
  const [planName, setPlanName] = useState<string>('');

  useEffect(() => {
    if (!orderCode) return;

    fetch('/api/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus(data.alreadyPaid ? 'already_paid' : 'success');
          setPlanName(data.plan ?? '');
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [orderCode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md text-center rounded-2xl border border-zinc-800 bg-zinc-900 p-12 shadow-2xl">

        {status === 'loading' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
              <Loader2 className="h-12 w-12 animate-spin" />
            </div>
            <h1 className="mt-8 text-2xl font-bold text-white">Đang xác nhận thanh toán...</h1>
            <p className="mt-4 text-zinc-400">Vui lòng chờ trong giây lát.</p>
          </>
        )}

        {(status === 'success' || status === 'already_paid') && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h1 className="mt-8 text-3xl font-bold text-white">Thanh toán thành công!</h1>
            <p className="mt-4 text-zinc-400">
              {planName
                ? <>Tài khoản của bạn đã được kích hoạt gói <span className="font-semibold text-white">{planName}</span>.</>
                : 'Tài khoản của bạn đã được nâng cấp.'}
            </p>
            <div className="mt-10">
              <Link
                href="/dashboard"
                className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-center font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
              >
                Vào Dashboard
              </Link>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <XCircle className="h-12 w-12" />
            </div>
            <h1 className="mt-8 text-2xl font-bold text-white">Không xác nhận được thanh toán</h1>
            <p className="mt-4 text-zinc-400">
              Nếu bạn đã chuyển tiền thành công, vui lòng liên hệ hỗ trợ hoặc thử lại sau.
            </p>
            <div className="mt-10 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-block rounded-xl bg-zinc-800 px-8 py-4 text-center font-semibold text-zinc-300 transition hover:bg-zinc-700"
              >
                Về Dashboard
              </Link>
              <Link
                href="/pricing"
                className="inline-block rounded-xl border border-zinc-700 px-8 py-4 text-center text-sm text-zinc-400 transition hover:border-zinc-500"
              >
                Xem lại các gói
              </Link>
            </div>
          </>
        )}

        {status === 'no_order' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700/30 text-zinc-500">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h1 className="mt-8 text-2xl font-bold text-white">Chào mừng!</h1>
            <p className="mt-4 text-zinc-400">Trang thanh toán thành công.</p>
            <div className="mt-10">
              <Link href="/dashboard" className="inline-block rounded-xl bg-zinc-800 px-8 py-4 font-semibold text-white transition hover:bg-zinc-700">
                Vào Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-md text-center rounded-2xl border border-zinc-800 bg-zinc-900 p-12 shadow-2xl">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-400" />
          <h1 className="mt-8 text-2xl font-bold text-white">Đang tải...</h1>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
