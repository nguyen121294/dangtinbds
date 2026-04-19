import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getPlan } from '@/lib/plans';
import { Receipt, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const userPayments = await db.select()
    .from(payments)
    .where(eq(payments.userId, user.id))
    .orderBy(desc(payments.createdAt));

  // Enrich with plan names
  const enriched = await Promise.all(
    userPayments.map(async (p) => {
      const plan = await getPlan(p.plan ?? 'plus');
      return { ...p, planName: plan?.name ?? p.plan };
    })
  );

  const statusMap: Record<string, { label: string; color: string }> = {
    paid: { label: 'Thành công', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending: { label: 'Đang xử lý', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    cancelled: { label: 'Đã huỷ', color: 'bg-red-50 text-red-600 border-red-200' },
  };

  return (
    <div className="p-8 w-full">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#E03C31] transition mb-4">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#E03C31]" />
            Lịch sử Thanh toán
          </h1>
          <p className="text-sm text-gray-500">Tất cả giao dịch thanh toán của bạn.</p>
        </div>

        {enriched.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Chưa có giao dịch nào</p>
            <Link href="/pricing" className="text-[#E03C31] font-bold text-sm hover:underline mt-2 inline-block">
              Xem bảng giá →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {enriched.map((p) => {
              const st = statusMap[p.status] || statusMap.pending;
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{p.planName}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Mã đơn: #{p.id}</span>
                      <span>{p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '—'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-extrabold text-gray-900">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(p.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
