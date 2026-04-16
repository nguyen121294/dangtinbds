'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

interface CheckoutButtonProps {
  planId: string;
  gradient: string;
  isPro: boolean;
}

export default function CheckoutButton({ planId, gradient, isPro }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Có lỗi xảy ra khi tạo link thanh toán. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Không thể kết nối với máy chủ thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${gradient} px-4 py-3 text-center text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 ${
        isPro ? 'shadow-[#0b1c30]/20' : ''
      }`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <CreditCard className="h-5 w-5" />
          Nâng cấp ngay
        </>
      )}
    </button>
  );
}
