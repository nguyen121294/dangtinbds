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
 * ✅ FIX: Phát hiện vòng lặp (circular referral) để tránh tự nhận hoa hồng
 */
export async function getReferralChain(userId: string): Promise<string[]> {
  const chain: string[] = [];
  const seen = new Set<string>([userId]); // Bao gồm buyer để chặn self-referral trong chain
  let currentId = userId;

  for (let i = 0; i < 3; i++) {
    const user = await db.select({ referredBy: profiles.referredBy })
      .from(profiles)
      .where(eq(profiles.id, currentId))
      .limit(1);

    const referrerId = user[0]?.referredBy;
    if (!referrerId) break;

    // Phát hiện vòng lặp → dừng ngay
    if (seen.has(referrerId)) break;
    seen.add(referrerId);

    chain.push(referrerId);
    currentId = referrerId;
  }

  return chain; // [F0 trực tiếp, F0 gián tiếp tầng 2, F0 gián tiếp tầng 3]
}

/**
 * Tạo các bản ghi hoa hồng pending khi có giao dịch thanh toán thành công.
 * Được gọi từ PayOS webhook sau khi cập nhật subscription.
 * 
 * ✅ FIX BUG #1: Idempotency — Kiểm tra paymentId đã tồn tại chưa trước khi insert.
 *    Ngăn webhook retry tạo hoa hồng trùng lặp.
 */
export async function createPendingCommissions(
  paymentId: string,
  buyerUserId: string,
  paymentAmount: number
): Promise<void> {
  // ✅ Idempotency check: Nếu đã tạo commission cho payment này → bỏ qua
  const existing = await db.select({ id: referralCommissions.id })
    .from(referralCommissions)
    .where(eq(referralCommissions.paymentId, paymentId))
    .limit(1);
  if (existing.length > 0) {
    console.log(`[Commission] Payment ${paymentId} already has commissions, skipping duplicate.`);
    return;
  }

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
 * 
 * ✅ FIX BUG #2: Wrap trong transaction + WHERE status='pending' trong UPDATE
 *    để ngăn race condition khi admin double-click.
 */
export async function approveCommission(commissionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    return await db.transaction(async (tx) => {
      // SELECT FOR UPDATE: Lock bản ghi để ngăn concurrent approve
      const record = await tx.select()
        .from(referralCommissions)
        .where(and(
          eq(referralCommissions.id, commissionId),
          eq(referralCommissions.status, 'pending')
        ))
        .for('update')
        .limit(1);

      if (!record[0]) {
        return { success: false, error: 'Không tìm thấy bản ghi hoa hồng hoặc đã được xử lý.' };
      }

      // Cập nhật trạng thái
      await tx.update(referralCommissions)
        .set({ status: 'approved', approvedAt: new Date() })
        .where(eq(referralCommissions.id, commissionId));

      // Cộng tiền vào ví — atomic trong cùng transaction
      await tx.update(profiles)
        .set({ commissionBalance: sql`${profiles.commissionBalance} + ${record[0].amount}` })
        .where(eq(profiles.id, record[0].beneficiaryId));

      return { success: true };
    });
  } catch (err) {
    console.error('[approveCommission] Transaction error:', err);
    return { success: false, error: 'Lỗi hệ thống khi duyệt hoa hồng.' };
  }
}

/**
 * Admin từ chối hoa hồng
 */
export async function rejectCommission(commissionId: string): Promise<{ success: boolean; error?: string }> {
  // Dùng WHERE status='pending' trực tiếp trong UPDATE để tránh race
  const result = await db.update(referralCommissions)
    .set({ status: 'rejected' })
    .where(and(
      eq(referralCommissions.id, commissionId),
      eq(referralCommissions.status, 'pending')
    ))
    .returning({ id: referralCommissions.id });

  if (result.length === 0) {
    return { success: false, error: 'Không tìm thấy bản ghi hoa hồng hoặc đã được xử lý.' };
  }

  return { success: true };
}

/**
 * Admin hoàn thành yêu cầu rút tiền → trừ ví hoa hồng
 * 
 * ✅ FIX BUG #3: Wrap trong transaction + SELECT FOR UPDATE trên profiles
 *    để ngăn race condition khi rút tiền đồng thời.
 */
export async function completeWithdrawal(withdrawalId: string): Promise<{ success: boolean; error?: string }> {
  try {
    return await db.transaction(async (tx) => {
      // Lock withdrawal record
      const record = await tx.select()
        .from(withdrawalRequests)
        .where(and(
          eq(withdrawalRequests.id, withdrawalId),
          eq(withdrawalRequests.status, 'pending')
        ))
        .for('update')
        .limit(1);

      if (!record[0]) {
        return { success: false, error: 'Không tìm thấy yêu cầu rút tiền hoặc đã được xử lý.' };
      }

      // Lock profile row để kiểm tra số dư chính xác
      const userProfile = await tx.select({ balance: profiles.commissionBalance })
        .from(profiles)
        .where(eq(profiles.id, record[0].userId))
        .for('update')
        .limit(1);

      const currentBalance = userProfile[0]?.balance || 0;
      if (currentBalance < record[0].amount) {
        return { success: false, error: 'Số dư ví không đủ để thực hiện rút tiền.' };
      }

      // Trừ ví — atomic trong cùng transaction
      await tx.update(profiles)
        .set({ commissionBalance: sql`${profiles.commissionBalance} - ${record[0].amount}` })
        .where(eq(profiles.id, record[0].userId));

      // Cập nhật trạng thái
      await tx.update(withdrawalRequests)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(withdrawalRequests.id, withdrawalId));

      return { success: true };
    });
  } catch (err) {
    console.error('[completeWithdrawal] Transaction error:', err);
    return { success: false, error: 'Lỗi hệ thống khi xử lý rút tiền.' };
  }
}

/**
 * Admin từ chối yêu cầu rút tiền
 */
export async function rejectWithdrawal(withdrawalId: string): Promise<{ success: boolean; error?: string }> {
  const result = await db.update(withdrawalRequests)
    .set({ status: 'rejected' })
    .where(and(
      eq(withdrawalRequests.id, withdrawalId),
      eq(withdrawalRequests.status, 'pending')
    ))
    .returning({ id: withdrawalRequests.id });

  if (result.length === 0) {
    return { success: false, error: 'Không tìm thấy yêu cầu rút tiền hoặc đã được xử lý.' };
  }

  return { success: true };
}
