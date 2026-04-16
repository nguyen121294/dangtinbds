'use server';

import { verifyAdminSession } from '@/lib/admin-auth';
import { db } from '@/db';
import { workspaces, workspaceMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Hành động Cưỡng Chế Đổi Chủ: Dành riêng cho Admin
 * Vượt qua mọi rào cản kiểm tra gói cước VIP.
 */
export async function forceTransferOwnershipAction(workspaceId: string, newOwnerId: string) {
  // Bức tường thép: Kiểm tra Mật Khẩu Admin Tối Cao
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { error: 'Từ chối Truy Cập: Lỗi quyền cục bộ.' };
  }

  try {
    // 1. Sang Tên Sổ Đỏ (Đổi OwnerID) trực tiếp trên Core Table
    await db.update(workspaces)
      .set({ ownerId: newOwnerId })
      .where(eq(workspaces.id, workspaceId));

    // 2. Tự động thêm Tài xế mới vào Danh sách Ghế Lái (Role=owner) nếu họ chưa từng trong phòng.
    // Nếu họ có rồi, Nâng cấp Role cho họ thành owner.
    
    const existingMember = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, newOwnerId))).limit(1);
    
    if (existingMember && existingMember.length > 0) {
      // Đã có trong phòng, nâng cấp role
      await db.update(workspaceMembers)
        .set({ role: 'owner' })
        .where(eq(workspaceMembers.id, existingMember[0].id));
    } else {
      // Chưa từng vào phòng, nhét vào với vai trò Vua
      await db.insert(workspaceMembers).values({
        id: crypto.randomUUID(),
        workspaceId: workspaceId,
        userId: newOwnerId,
        role: 'owner'
      });
    }

    revalidatePath('/admin/workspaces');
    return { success: true };
  } catch (error) {
    console.error("Lỗi Admin Cưỡng chế:", error);
    return { error: 'Lỗi Database, Vui lòng xem log Server.' };
  }
}
