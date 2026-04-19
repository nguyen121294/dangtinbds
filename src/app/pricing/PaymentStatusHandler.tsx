"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/toast';

export function PaymentStatusHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const cancel = searchParams.get('cancel');
    const status = searchParams.get('status');
    const orderCode = searchParams.get('orderCode');
    
    // If we have payOS params indicating cancellation
    if (cancel === 'true' || status === 'CANCELLED') {
      showToast('warning', `Thanh toán đã bị huỷ. Phiên giao dịch #${orderCode || ''} vừa bị huỷ.`);
      router.replace('/pricing');
      return;
    }
    
    // If success
    if (status === 'PAID') {
      showToast('success', 'Thanh toán thành công! Tài khoản của bạn đã được cập nhật.');
      router.replace('/dashboard');
    }
  }, [searchParams, router, showToast]);

  return null;
}
