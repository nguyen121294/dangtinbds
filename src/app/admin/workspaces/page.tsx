import { db } from '@/db';
import { workspaces, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { WorkspacesTable } from './workspaces-table';

export default async function AdminWorkspacesPage() {
  // Lấy toàn bộ workspaces
  const wsData = await db.select().from(workspaces);
  
  // Lấy toàn bộ users để đối chiếu email
  const usersData = await db.select().from(profiles);
  const usersMap = new Map();
  usersData.forEach(u => usersMap.set(u.id, u));

  // Ghép nối data
  const workspacesWithOwner = wsData.map(w => ({
    ...w,
    ownerEmail: usersMap.get(w.ownerId)?.email || 'Unknown',
    ownerName: usersMap.get(w.ownerId)?.firstName || 'Unknown',
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Quản lý Không gian (Workspaces)
        </h1>
        <p className="text-zinc-400">
          Danh sách toàn bộ các phòng làm việc. Bạn có quyền thao tác kỹ thuật (Như Chuyển Chủ Phòng) cho bất cứ phòng nào bị kẹt.
        </p>
      </div>

      <WorkspacesTable initialData={workspacesWithOwner} users={usersData} />
    </div>
  );
}
