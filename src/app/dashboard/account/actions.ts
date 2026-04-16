'use server';

import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Không tìm thấy phiên đăng nhập' };
  }

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  try {
    await db.update(profiles)
      .set({ firstName, lastName })
      .where(eq(profiles.id, user.id));

    revalidatePath('/dashboard/account');
    return { success: true, message: 'Đã cập nhật hồ sơ thành công!' };
  } catch (error) {
    console.error('Lỗi khi cập nhật hồ sơ:', error);
    return { error: 'Cập nhật thất bại. Vui lòng thử lại.' };
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Không tìm thấy phiên đăng nhập' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (newPassword !== confirmPassword) {
    return { error: 'Mật khẩu xác nhận không khớp' };
  }

  if (newPassword.length < 6) {
    return { error: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
  }

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Mật khẩu hiện tại không chính xác' };
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: 'Đã xảy ra lỗi khi cập nhật mật khẩu' };
  }

  return { success: true, message: 'Đổi mật khẩu thành công!' };
}

export async function deactivateAccount(formData?: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Không tìm thấy phiên đăng nhập' };
  }

  try {
    await db.update(profiles)
      .set({ status: 'inactive' })
      .where(eq(profiles.id, user.id));

    revalidatePath('/dashboard', 'layout');
    return { success: true, message: 'Tài khoản đã được vô hiệu hóa' };
  } catch (error) {
    console.error('Lỗi khi vô hiệu hóa tài khoản:', error);
    return { error: 'Không thể vô hiệu hóa tài khoản lúc này.' };
  }
}

export async function reactivateAccount(formData?: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Không tìm thấy phiên đăng nhập' };
  }

  try {
    await db.update(profiles)
      .set({ status: 'active' })
      .where(eq(profiles.id, user.id));

    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Lỗi khi kích hoạt lại tài khoản:', error);
    return { error: 'Không thể kích hoạt tài khoản lúc này.' };
  }
}
