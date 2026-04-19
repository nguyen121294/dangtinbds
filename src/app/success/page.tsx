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
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md text-center rounded-sm border border-gray-200 bg-white p-12 shadow-xl">

        {status === 'loading' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <Loader2 className="h-12 w-12 animate-spin" />
            </div>
            <h1 className="mt-8 text-2xl font-bold text-gray-900">Đang xác nhận thanh toán...</h1>
            <p className="mt-4 text-gray-500">Vui lòng chờ trong giây lát.</p>
          </>
        )}

        {(status === 'success' || status === 'already_paid') && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h1 className="mt-8 text-3xl font-bold text-gray-900">Thanh toán thành công!</h1>
            <p className="mt-4 text-gray-600">
              {planName
                ? <>Tài khoản của bạn đã được kích hoạt gói <span className="font-semibold text-gray-900">{planName}</span>.</>
                : 'Tài khoản của bạn đã được nâng cấp.'}
            </p>
            <div className="mt-10">
              <Link
                href="/dashboard"
                className="inline-block rounded-sm bg-[#E03C31] text-white px-8 py-4 text-center font-bold transition hover:bg-[#c9362c] active:scale-[0.98]"
              >
                Vào Dashboard
              </Link>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
              <XCircle className="h-12 w-12" />
            </div>
            <h1 className="mt-8 text-2xl font-bold text-gray-900">Không xác nhận được thanh toán</h1>
            <p className="mt-4 text-gray-600">
              Nếu bạn đã chuyển tiền thành công, vui lòng liên hệ hỗ trợ hoặc thử lại sau.
            </p>
            <div className="mt-10 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-block rounded-sm bg-gray-100 px-8 py-4 text-center font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Về Dashboard
              </Link>
              <Link
                href="/pricing"
                className="inline-block rounded-sm border border-gray-300 px-8 py-4 text-center text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:bg-gray-50"
              >
                Xem lại các gói
              </Link>
            </div>
          </>
        )}

        {status === 'no_order' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h1 className="mt-8 text-2xl font-bold text-gray-900">Chào mừng!</h1>
            <p className="mt-4 text-gray-500">Trang thanh toán thành công.</p>
            <div className="mt-10">
              <Link href="/dashboard" className="inline-block rounded-sm bg-[#E03C31] px-8 py-4 font-bold text-white transition hover:bg-[#c9362c]">
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
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="w-full max-w-md text-center rounded-sm border border-gray-200 bg-white p-12 shadow-xl">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <h1 className="mt-8 text-2xl font-bold text-gray-900">Đang tải...</h1>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
