import { getPlans } from '@/lib/plans';
import PlansTable from './plans-table';

export default async function PlansPage() {
  const allPlans = await getPlans();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Quản lý gói dịch vụ</h1>
        <p className="text-zinc-400 mt-2">Thêm, sửa, xóa các gói dịch vụ và điều chỉnh giá</p>
      </div>

      <PlansTable initialPlans={allPlans} />
    </div>
  );
}
