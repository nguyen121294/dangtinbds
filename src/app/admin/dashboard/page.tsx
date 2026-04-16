import { db } from '@/db';
import { profiles, payments, plans } from '@/db/schema';
import { count, eq, sql } from 'drizzle-orm';
import { Users, CreditCard, ShoppingCart, TrendingUp } from 'lucide-react';

export default async function AdminDashboardPage() {
  const [userCount] = await db.select({ value: count() }).from(profiles);
  const [paymentCount] = await db.select({ value: count() }).from(payments);
  const [planCount] = await db.select({ value: count() }).from(plans);
  const [totalRevenue] = await db.select({ 
    value: sql<number>`COALESCE(SUM(${payments.amount}), 0)` 
  }).from(payments).where(eq(payments.status, 'paid'));

  const stats = [
    { label: 'Tổng người dùng', value: userCount.value, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Giao dịch', value: paymentCount.value, icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Doanh thu (đã trả)', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue.value), icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Gói dịch vụ', value: planCount.value, icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-zinc-400 mt-2">Tổng quan bộ chỉ số của hệ thống</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6">Hoạt động gần đây</h3>
          <p className="text-zinc-500 text-sm">Đang phát triển thêm biểu đồ và chi tiết...</p>
        </div>
      </div>
    </div>
  );
}
