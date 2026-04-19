import { getAllPlans } from '@/lib/plans';
import PlansTable from './plans-table';

export default async function PlansPage() {
  const allPlans = await getAllPlans();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quản lý gói dịch vụ</h1>
        <p className="text-gray-500 mt-2 font-medium">Thêm, sửa, xóa các gói dịch vụ và điều chỉnh giá</p>
      </div>

      <PlansTable initialPlans={allPlans} />
    </div>
  );
}
