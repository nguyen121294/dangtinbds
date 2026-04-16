import { db } from '@/db';
import { profiles } from '@/db/schema';
import { getPlans } from '@/lib/plans';
import UsersTable from './users-table';

export default async function UsersPage() {
  const allUsers = await db.select().from(profiles).orderBy(profiles.createdAt);
  const allPlans = await getPlans();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
        <p className="text-zinc-400 mt-2">Tìm kiếm, chỉnh sửa và quản lý tài khoản người dùng</p>
      </div>

      <UsersTable initialUsers={allUsers} plans={allPlans} />
    </div>
  );
}
