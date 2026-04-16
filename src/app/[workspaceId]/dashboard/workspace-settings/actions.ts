'use server';

import { createClient } from '@/lib/supabase/server';
import { inviteUserByEmail, transferWorkspaceOwnership } from '@/lib/workspace-utils';
import { db } from '@/db';
import { workspaceMembers, workspaces } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function inviteMemberAction(workspaceId: string, email: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  // Verification that inviter is the owner
  const ws = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!ws || ws.length === 0 || ws[0].ownerId !== user.id) {
    return { error: 'Chỉ Chủ sở hữu mới có quyền mời' };
  }

  const result = await inviteUserByEmail(workspaceId, user.id, email);
  
  if (result.success) {
    revalidatePath(`/${workspaceId}/dashboard/workspace-settings`);
  }
  return result;
}

export async function removeMemberAction(workspaceId: string, targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  // Tránh tự xoá mình nếu là Owner
  const ws = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (ws[0].ownerId !== user.id) {
    return { error: 'Chỉ Chủ sở hữu mới có quyền xoá người khác' };
  }
  if (targetUserId === user.id) {
    return { error: 'Không thể tự xoá chính mình' };
  }

  await db.delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)));
  
  revalidatePath(`/${workspaceId}/dashboard/workspace-settings`);
  return { success: true };
}

export async function transferOwnershipAction(workspaceId: string, newOwnerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const ws = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (ws[0].ownerId !== user.id) {
    return { error: 'Chỉ Chủ sở hữu hiện tại mới có thể chuyển nhượng.' };
  }

  const result = await transferWorkspaceOwnership(workspaceId, user.id, newOwnerId);
  if (result.success) {
    revalidatePath(`/${workspaceId}/dashboard/workspace-settings`);
  }
  return result;
}
