import Link from 'next/link';
import { Check, Sparkles, Zap, Shield, Star } from 'lucide-react';
import { getPlans } from '@/lib/plans';
import CheckoutButton from './CheckoutButton';

export const dynamic = 'force-dynamic';

const planIcons = {
  free: Shield,
  plus: Zap,
  pro: Sparkles,
  premium: Star,
};

const planGradients = {
  free: 'from-gray-500 to-gray-400',
  plus: 'from-[#006948] to-[#059669]', // Batdongsan Emerald Green
  pro: 'from-[#0b1c30] to-[#1e3a5f]',     // Batdongsan Navy
  premium: 'from-amber-500 to-orange-500',
};

const planBorderColors = {
  free: 'border-gray-200',
  plus: 'border-[#059669]/20',
  pro: 'border-[#0b1c30]/20',
  premium: 'border-amber-500/20',
};

const planBgColors = {
  free: 'bg-white',
  plus: 'bg-emerald-50 max-lg:bg-white', 
  pro: 'bg-slate-50', // light navy tint
  premium: 'bg-orange-50',
};

function formatPrice(price: number) {
  if (price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDuration(days: number) {
  if (days === 0) return '';
  if (days < 30) return `${days} ngày`;
  if (days === 30) return '/ 30 ngày';
  if (days === 180) return '/ 6 tháng';
  if (days === 365) return '/ 1 năm';
  return `/ ${days} ngày`;
}

export default async function PricingPage() {
  const plans = await getPlans();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0b1c30] selection:bg-[#059669]/30">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-full -translate-x-1/2 [background:radial-gradient(50%_50%_at_50%_0%,rgba(5,150,105,0.08)_0%,rgba(248,250,252,0)_100%)]" />

      {/* Header */}
      <header className="pt-20 pb-16 text-center px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#059669]/20 bg-[#059669]/10 px-4 py-1.5 text-sm font-medium text-[#059669] mb-6">
          <Sparkles className="h-4 w-4" />
          <span>Bảng giá đơn giản, minh bạch</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Chọn gói{' '}
          <span className="bg-gradient-to-r from-[#006948] to-[#059669] bg-clip-text text-transparent">
            phù hợp
          </span>
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-xl mx-auto">
          Bắt đầu miễn phí, nâng cấp bất cứ lúc nào. Không ràng buộc, không phí ẩn.
        </p>
      </header>

      {/* Pricing Cards */}
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const Icon = planIcons[plan.id as keyof typeof planIcons] || Shield;
            const gradient = planGradients[plan.id as keyof typeof planGradients] || planGradients.free;
            const border = planBorderColors[plan.id as keyof typeof planBorderColors] || planBorderColors.free;
            const bg = planBgColors[plan.id as keyof typeof planBgColors] || planBgColors.free;
            const isPro = plan.id === 'pro';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border ${border} ${bg} p-6 shadow-xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                  isPro ? 'ring-2 ring-[#059669]/50 ring-offset-2 ring-offset-[#f8fafc]' : ''
                }`}
              >
                {/* Popular badge */}
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                      PHỔ BIẾN NHẤT
                    </span>
                  </div>
                )}

                {/* Plan icon */}
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} p-0.5 shadow-lg`}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white">
                    <Icon className={`h-5 w-5 bg-gradient-to-br ${gradient} bg-clip-text`} style={{ color: 'transparent', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.1))' }} />
                  </div>
                </div>

                {/* Name & desc */}
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="mt-1 text-xs text-zinc-400">{plan.description}</p>

                {/* Price */}
                <div className="mt-5 mb-6">
                  <div className="flex items-end gap-1">
                    <span
                      className={`text-3xl font-extrabold tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
                    >
                      {formatPrice(plan.price)}
                    </span>
                    {plan.days > 0 && (
                      <span className="mb-0.5 text-sm text-zinc-500">
                        {formatDuration(plan.days)}
                      </span>
                    )}
                  </div>
                  {plan.days > 0 && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Hiệu lực {plan.days} ngày
                    </p>
                  )}
                </div>

                {/* CTA */}
                {plan.id === 'free' ? (
                  <Link
                    href="/login"
                    className="mb-6 block rounded-xl border border-slate-200 bg-slate-100/80 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
                  >
                    Bắt đầu miễn phí
                  </Link>
                ) : (
                  <CheckoutButton 
                    planId={plan.id} 
                    gradient={gradient} 
                    isPro={isPro} 
                  />
                )}

                {/* Divider */}
                <div className="mb-5 h-px bg-slate-200" />

                {/* Features */}
                <ul className="flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 bg-gradient-to-br ${gradient} bg-clip-text`}
                        style={{ color: 'transparent', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.1))' }}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="mt-12 text-center text-sm text-slate-500">
          Tất cả gói hỗ trợ thanh toán qua <span className="font-semibold text-slate-700">PayOS</span> — nhanh chóng &amp; bảo mật.
          Cần hỗ trợ?{' '}
          <a href="mailto:support@example.com" className="text-[#059669] underline underline-offset-4 hover:text-[#006948]">
            Liên hệ chúng tôi
          </a>
        </p>
      </main>
    </div>
  );
}
