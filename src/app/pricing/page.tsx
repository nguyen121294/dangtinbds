import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getPlans } from '@/lib/plans';
import { MatrixPricingTable } from './MatrixPricingTable';
import { Suspense } from 'react';
import { PaymentStatusHandler } from './PaymentStatusHandler';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const allPlans = await getPlans('personal');
  const plans = allPlans.filter(p => p.price > 0);

  return (
    <div className="min-h-screen bg-[#F2F4F5] text-[#0b1c30] selection:bg-[#E03C31]/20 pb-20">
      <Suspense fallback={null}>
        <PaymentStatusHandler />
      </Suspense>
      {/* Header */}
      <header className="pt-20 pb-12 text-center px-4">
        <div className="inline-flex items-center gap-2 rounded-sm border border-[#E03C31]/20 bg-[#E03C31]/10 px-4 py-1.5 text-sm font-bold text-[#E03C31] mb-6 shadow-sm">
          <Sparkles className="h-4 w-4" />
          <span>Bảng giá chuẩn - 1 Workspace / 3 Thành viên</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Các Gói Khách Hàng <span className="text-[#E03C31]">Cá Nhân</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto font-medium">
          Ma trận cước linh hoạt, phù hợp nhu cầu mọi tổ chức. Chọn gói Credits và Thời hạn bạn mong muốn bên dưới.
        </p>
      </header>

      {/* Pricing Matrix */}
      <main className="mx-auto max-w-5xl px-4">
        <MatrixPricingTable plans={plans} />

        {/* Footer note */}
        <p className="mt-12 text-center text-sm font-medium text-gray-500 bg-white border border-gray-200 py-3 rounded-sm shadow-sm">
          Tất cả gói hỗ trợ thanh toán qua <span className="font-bold text-gray-900 border-b border-gray-300">PayOS</span> — nhanh chóng & bảo mật.
          Cần hỗ trợ doanh nghiệp lớn?{' '}
          <a href="mailto:support@batdongsan.com.vn" className="text-[#E03C31] hover:underline hover:text-[#c9362c] font-bold">
            Liên hệ Sale BĐS
          </a>
        </p>
      </main>
    </div>
  );
}
