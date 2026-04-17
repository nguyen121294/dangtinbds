"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function PaymentStatusHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const cancel = searchParams.get('cancel');
    const status = searchParams.get('status');
    const orderCode = searchParams.get('orderCode');
    
    // If we have payOS params indicating cancellation
    if (cancel === 'true' || status === 'CANCELLED') {
      alert(`Thanh toán đã bị huỷ. Phiên giao dịch ${orderCode || ''} vừa bị huỷ.`);
      // Clean up the URL
      router.replace('/pricing');
      return;
    }
    
    // If success
    if (status === 'PAID') {
      alert('Thanh toán thành công! Tài khoản của bạn đã được cập nhật.');
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  return null;
}
