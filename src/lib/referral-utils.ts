import { db } from '@/db';
import { profiles, referralCommissions, withdrawalRequests, payments } from '@/db/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { getAppSetting } from './app-settings';

/**
 * Tạo mã giới thiệu duy nhất (6 ký tự uppercase + số)
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Bỏ O/0/I/1 để tránh nhầm lẫn
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Tạo mã giới thiệu cho user và đảm bảo không trùng
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await db.select({ referralCode: profiles.referralCode })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (existing[0]?.referralCode) {
    return existing[0].referralCode;
  }

  // Generate unique code with retry
  let attempts = 0;
  while (attempts < 10) {
    const code = generateReferralCode();
    try {
      await db.update(profiles)
        .set({ referralCode: code })
        .where(eq(profiles.id, userId));
      return code;
    } catch {
      attempts++;
    }
  }
  // Fallback: use shortened UUID
  const fallback = crypto.randomUUID().substring(0, 8).toUpperCase();
  await db.update(profiles)
    .set({ referralCode: fallback })
    .where(eq(profiles.id, userId));
  return fallback;
}

/**
 * Tìm user theo mã giới thiệu
 */
export async function findUserByReferralCode(code: string): Promise<string | null> {
  const result = await db.select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.referralCode, code.toUpperCase()))
    .limit(1);
  return result[0]?.id || null;
}

/**
 * Đọc tỷ lệ hoa hồng từ app_settings
 */
export async function getCommissionRates(): Promise<{ tier1: number; tier2: number; tier3: number }> {
  const tier1 = parseFloat(await getAppSetting('commission_tier1')) || 10;
  const tier2 = parseFloat(await getAppSetting('commission_tier2')) || 5;
  const tier3 = parseFloat(await getAppSetting('commission_tier3')) || 1;
  return { tier1, tier2, tier3 };
}

/**
 * Đọc ngưỡng rút tối thiểu
 */
export async function getMinWithdrawal(): Promise<number> {
  const val = await getAppSetting('min_withdrawal');
  return parseFloat(val) || 5000000;
}

/**
 * Truy ngược chuỗi giới thiệu: F1 → F2 → F3 (tối đa 3 tầng)
 * Trả về mảng user IDs theo thứ tự tầng [tầng1, tầng2, tầng3]
 */
export async function getReferralChain(userId: string): Promise<string[]> {
  const chain: string[] = [];
  let currentId = userId;

  for (let i = 0; i < 3; i++) {
    const user = await db.select({ referredBy: profiles.referredBy })
      .from(profiles)
      .where(eq(profiles.id, currentId))
      .limit(1);

    const referrerId = user[0]?.referredBy;
    if (!referrerId) break;

    chain.push(referrerId);
    currentId = referrerId;
  }

  return chain; // [F0 trực tiếp, F0 gián tiếp tầng 2, F0 gián tiếp tầng 3]
}

/**
 * Tạo các bản ghi hoa hồng pending khi có giao dịch thanh toán thành công.
 * Được gọi từ PayOS webhook sau khi cập nhật subscription.
 */
export async function createPendingCommissions(
  paymentId: string,
  buyerUserId: string,
  paymentAmount: number
): Promise<void> {
  const chain = await getReferralChain(buyerUserId);
  if (chain.length === 0) return; // Người mua không có ai giới thiệu

  const rates = await getCommissionRates();
  const tierRates = [rates.tier1, rates.tier2, rates.tier3];

  for (let i = 0; i < chain.length; i++) {
    const rate = tierRates[i];
    const amount = Math.round(paymentAmount * rate / 100); // Làm tròn VNĐ

    if (amount <= 0) continue;

    await db.insert(referralCommissions).values({
      id: crypto.randomUUID(),
      beneficiaryId: chain[i],
      sourceUserId: buyerUserId,
      paymentId: paymentId,
      tier: i + 1,
      rate: rate,
      amount: amount,
      status: 'pending',
    });
  }
}

/**
 * Admin duyệt hoa hồng → cộng tiền vào ví của người nhận
 */
export async function approveCommission(commissionId: string): Promise<{ success: boolean; error?: string }> {
  const record = await db.select()
    .from(referralCommissions)
    .where(eq(referralCommissions.id, commissionId))
    .limit(1);

  if (!record[0]) return { success: false, error: 'Không tìm thấy bản ghi hoa hồng.' };
  if (record[0].status !== 'pending') return { success: false, error: 'Bản ghi đã được xử lý.' };

  // Cập nhật trạng thái
  await db.update(referralCommissions)
    .set({ status: 'approved', approvedAt: new Date() })
    .where(eq(referralCommissions.id, commissionId));

  // Cộng tiền vào ví
  await db.update(profiles)
    .set({ commissionBalance: sql`${profiles.commissionBalance} + ${record[0].amount}` })
    .where(eq(profiles.id, record[0].beneficiaryId));

  return { success: true };
}

/**
 * Admin từ chối hoa hồng
 */
export async function rejectCommission(commissionId: string): Promise<{ success: boolean; error?: string }> {
  const record = await db.select()
    .from(referralCommissions)
    .where(eq(referralCommissions.id, commissionId))
    .limit(1);

  if (!record[0]) return { success: false, error: 'Không tìm thấy bản ghi hoa hồng.' };
  if (record[0].status !== 'pending') return { success: false, error: 'Bản ghi đã được xử lý.' };

  await db.update(referralCommissions)
    .set({ status: 'rejected' })
    .where(eq(referralCommissions.id, commissionId));

  return { success: true };
}

/**
 * Admin hoàn thành yêu cầu rút tiền → trừ ví hoa hồng
 */
export async function completeWithdrawal(withdrawalId: string): Promise<{ success: boolean; error?: string }> {
  const record = await db.select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.id, withdrawalId))
    .limit(1);

  if (!record[0]) return { success: false, error: 'Không tìm thấy yêu cầu rút tiền.' };
  if (record[0].status !== 'pending') return { success: false, error: 'Yêu cầu đã được xử lý.' };

  // Kiểm tra số dư đủ không
  const userProfile = await db.select({ balance: profiles.commissionBalance })
    .from(profiles)
    .where(eq(profiles.id, record[0].userId))
    .limit(1);

  const currentBalance = userProfile[0]?.balance || 0;
  if (currentBalance < record[0].amount) {
    return { success: false, error: 'Số dư ví không đủ để thực hiện rút tiền.' };
  }

  // Trừ ví
  await db.update(profiles)
    .set({ commissionBalance: sql`${profiles.commissionBalance} - ${record[0].amount}` })
    .where(eq(profiles.id, record[0].userId));

  // Cập nhật trạng thái
  await db.update(withdrawalRequests)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(withdrawalRequests.id, withdrawalId));

  return { success: true };
}

/**
 * Admin từ chối yêu cầu rút tiền
 */
export async function rejectWithdrawal(withdrawalId: string): Promise<{ success: boolean; error?: string }> {
  const record = await db.select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.id, withdrawalId))
    .limit(1);

  if (!record[0]) return { success: false, error: 'Không tìm thấy yêu cầu rút tiền.' };
  if (record[0].status !== 'pending') return { success: false, error: 'Yêu cầu đã được xử lý.' };

  await db.update(withdrawalRequests)
    .set({ status: 'rejected' })
    .where(eq(withdrawalRequests.id, withdrawalId));

  return { success: true };
}
