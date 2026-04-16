'use server';

import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { workspaces, workspaceMembers } from '@/db/schema';
import { checkWorkspaceCreationQuota } from '@/lib/workspace-utils';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createWorkspaceAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const name = formData.get('name') as string;
  if (!name || name.trim().length === 0) {
    return { error: 'Tên Workspace không được để trống' };
  }

  // Check Quota
  const quota = await checkWorkspaceCreationQuota(user.id);
  if (!quota.canCreate) {
    return { error: `Bạn đã đạt giới hạn tối đa (${quota.total} Workspace) cho gói cước hiện tại. Vui lòng nâng cấp tài khoản để tạo thêm!` };
  }

  const workspaceId = crypto.randomUUID();

  try {
    await db.insert(workspaces).values({
      id: workspaceId,
      name: name.trim(),
      ownerId: user.id
    });

    await db.insert(workspaceMembers).values({
      id: crypto.randomUUID(),
      workspaceId: workspaceId,
      userId: user.id,
      role: 'owner'
    });
    
  } catch (dbError) {
    return { error: 'Lỗi Database, vui lòng thử lại sau.' };
  }

  // Điều hướng đi thẳng vào phòng mới
  redirect(`/${workspaceId}/dashboard`);
}
