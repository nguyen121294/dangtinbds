import { db } from '@/db';
import { workspaces, workspaceMembers, profiles, plans } from '@/db/schema';
import { eq, and, countDistinct } from 'drizzle-orm';

const MAX_INVITES_PER_VIP_OWNER = 5; // Có thể chuyển thành config env sau

/**
 * Kiểm tra xem Workspace hiện tại có phải là trạng thái VIP hay không, 
 * dựa vào trạng thái gói cước (subscription) của người tạo (Owner).
 */
export async function checkWorkspaceAccess(workspaceId: string): Promise<boolean> {
  const ws = await db.select({
      ownerId: workspaces.ownerId
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws || ws.length === 0) return false;

  const ownerProfile = await db.select({
      subStatus: profiles.subscriptionStatus
    })
    .from(profiles)
    .where(eq(profiles.id, ws[0].ownerId))
    .limit(1);

  if (!ownerProfile || ownerProfile.length === 0) return false;

  // Nếu owner là active -> Workspace này là VIP
  return ownerProfile[0].subStatus === 'active';
}

/**
 * Đếm số lượng người tham gia DUY NHẤT (Unique Users) trong tất cả các Workspace
 * do một user làm chủ. Để chặn khi mời quá Quota cấu hình trong gói.
 */
export async function checkInviteQuota(ownerId: string): Promise<{ canInvite: boolean; used: number; total: number }> {
  // 1. Tìm tất cả các Workspace do ownerId làm chủ
  const ownerWorkspaces = await db.select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, ownerId));

  // 1b. Truy vấn gói hiện tại của Owner để xem được mời bao nhiêu người
  const ownerProfile = await db.select({ subId: profiles.subscriptionId, subStatus: profiles.subscriptionStatus })
    .from(profiles)
    .where(eq(profiles.id, ownerId))
    .limit(1);

  let activePlanId = 'free';
  if (ownerProfile && ownerProfile.length > 0 && ownerProfile[0].subStatus === 'active') {
      activePlanId = ownerProfile[0].subId || 'free';
  }

  const currentPlan = await db.select({ maxInvites: plans.maxInvites })
    .from(plans)
    .where(eq(plans.id, activePlanId))
    .limit(1);

  const totalAllowed = (currentPlan && currentPlan.length > 0) ? currentPlan[0].maxInvites : 0; // Mặc định Free có thể là 0.

  if (ownerWorkspaces.length === 0) {
    return { canInvite: true, used: 0, total: totalAllowed };
  }

  const workspaceIds = ownerWorkspaces.map(w => w.id);

  // Tạm tính Drizzle logic: Rút danh sách userId duy nhất đang tồn tại trong các workspace đó
  const allMembers = await db.select()
    .from(workspaceMembers);
    
  // Filter memory
  const uniqueMemberIds = new Set<string>();
  allMembers.forEach(m => {
    if (workspaceIds.includes(m.workspaceId) && m.userId !== ownerId) {
      uniqueMemberIds.add(m.userId);
    }
  });

  const used = uniqueMemberIds.size;
  return { 
    canInvite: used < totalAllowed, 
    used, 
    total: totalAllowed 
  };
}

/**
 * Chuyển giao Workspace cho 1 người khác. 
 * Điều kiện BẮT BUỘC: Người nhận phải đang có tài khoản VIP (active).
 */
export async function transferWorkspaceOwnership(workspaceId: string, currentOwnerId: string, newOwnerId: string): Promise<{ success: boolean; error?: string }> {
  // 1. Kiểm tra người nhận có gói VIP chưa
  const newOwner = await db.select({ subStatus: profiles.subscriptionStatus })
    .from(profiles)
    .where(eq(profiles.id, newOwnerId))
    .limit(1);

  if (!newOwner || newOwner.length === 0 || newOwner[0].subStatus !== 'active') {
    return { success: false, error: 'Người nhận phải sở hữu gói VIP đang hoạt động để nhận bàn giao.' };
  }

  // 2. Chuyển quyền Ownership trong bảng Workspaces
  await db.update(workspaces)
    .set({ ownerId: newOwnerId })
    .where(eq(workspaces.id, workspaceId));

  // 3. (Tuỳ chọn) Đổi Role trong mảng thành viên
  await db.update(workspaceMembers)
    .set({ role: 'owner' })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, newOwnerId)));

  return { success: true };
}

/**
 * Mời người dùng vào Workspace bằng Email.
 * Nếu email chưa đăng ký tài khoản -> Báo lỗi.
 */
export async function inviteUserByEmail(workspaceId: string, inviterId: string, email: string): Promise<{ success: boolean; error?: string }> {
  // 1. Kiểm tra Email có tồn tại trong hệ thống chưa (chỉ lấy top 1)
  const targetUser = await db.select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);

  if (!targetUser || targetUser.length === 0) {
    return { success: false, error: 'Email này chưa đăng ký tài khoản trên hệ thống. Không thể mời!' };
  }

  const targetUserId = targetUser[0].id;

  // 2. Không được mời chính mình
  if (targetUserId === inviterId) {
    return { success: false, error: 'Bạn không thể tự mời chính mình.' };
  }

  // 3. Quota check (đã viết hàm checkInviteQuota)
  const quota = await checkInviteQuota(inviterId);
  if (!quota.canInvite) {
     return { success: false, error: `Bạn đã đạt giới hạn mời tối đa (${quota.total} người duy nhất). Vui lòng nâng cấp gói hoặc xoá bớt người.`};
  }

  // 4. Kiểm tra xem người này đã ở trong Workspace chưa
  const existingMember = await db.select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)))
    .limit(1);

  if (existingMember && existingMember.length > 0) {
    return { success: false, error: 'Người này đã ở trong Workspace của bạn rồi.' };
  }

  // 5. Thêm vào Workspace
  await db.insert(workspaceMembers).values({
    id: crypto.randomUUID(),
    workspaceId: workspaceId,
    userId: targetUserId,
    role: 'member'
  });

  return { success: true };
}

/**
 * Kiểm tra xem User này còn được quyền tạo thêm Workspace mới hay không?
 * Đã nâng cấp: Đọc cấu hình Động từ bảng PLANS
 */
export async function checkWorkspaceCreationQuota(userId: string): Promise<{ canCreate: boolean; used: number; total: number }> {
  // 1. Đếm số phòng ĐANG LÀM CHỦ
  const ownerWorkspaces = await db.select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId));
  
  const used = ownerWorkspaces.length;

  // 2. Lấy Tình trạng gói cước của User
  const ownerProfile = await db.select({ 
      subId: profiles.subscriptionId,
      subStatus: profiles.subscriptionStatus 
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  // Mặc định fallback là gói Free
  let activePlanId = 'free';

  // Nếu User đang có gói Active, lấy ID của gói đó.
  if (ownerProfile && ownerProfile.length > 0 && ownerProfile[0].subStatus === 'active') {
      activePlanId = ownerProfile[0].subId || 'free';
  }

  // 3. Truy vấn giới hạn maxWorkspaces từ DB Plans
  const currentPlan = await db.select({ maxWorkspaces: plans.maxWorkspaces })
    .from(plans)
    .where(eq(plans.id, activePlanId))
    .limit(1);

  // Nếu không tìm thấy plan trong DB (có thể Admin lỡ xoá nhưng ko được xoá free), fallback về 1.
  const totalAllowed = (currentPlan && currentPlan.length > 0) ? currentPlan[0].maxWorkspaces : 1;

  return {
    canCreate: used < totalAllowed,
    used,
    total: totalAllowed
  };
}

/**
 * [MỚI] Kiểm tra Quyền truy cập Tính năng (Feature Key) Động.
 * Ví dụ: checkFeatureAccess(workspaceId, 'export_pdf')
 */
export async function checkFeatureAccess(workspaceId: string, featureKey: string): Promise<boolean> {
  // Lấy ownerId của Workspace
  const ws = await db.select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws || ws.length === 0) return false;

  // Lấy gói của Owner
  const ownerProfile = await db.select({ 
      subId: profiles.subscriptionId,
      subStatus: profiles.subscriptionStatus 
    })
    .from(profiles)
    .where(eq(profiles.id, ws[0].ownerId))
    .limit(1);

  let activePlanId = 'free';
  if (ownerProfile && ownerProfile.length > 0 && ownerProfile[0].subStatus === 'active') {
      activePlanId = ownerProfile[0].subId || 'free';
  }

  // Lấy list Features của gói đó
  const currentPlan = await db.select({ features: plans.features })
    .from(plans)
    .where(eq(plans.id, activePlanId))
    .limit(1);

  if (!currentPlan || currentPlan.length === 0) return false;

  const featuresArray = currentPlan[0].features || [];
  
  // Kiểm tra xem array có chứa Feature Key yêu cầu hay không
  return featuresArray.includes(featureKey);
}

/**
 * Lấy thông tin chi tiết tên gói của Người dùng
 */
export async function getUserPlanDetails(userId: string): Promise<{ isVip: boolean; planName: string }> {
  const userProfile = await db.select({ 
      subId: profiles.subscriptionId,
      subStatus: profiles.subscriptionStatus 
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!userProfile || userProfile.length === 0 || userProfile[0].subStatus !== 'active') {
    return { isVip: false, planName: 'Gói Miễn phí (Free)' };
  }

  const planId = userProfile[0].subId || 'free';
  const planData = await db.select({ name: plans.name })
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);

  if (!planData || planData.length === 0) {
    return { isVip: false, planName: 'Gói Miễn phí (Free)' };
  }

  return { isVip: true, planName: planData[0].name };
}

/**
 * Lấy thông tin chi tiết tên gói của Workspace (dựa vào Owner)
 */
export async function getWorkspacePlanDetails(workspaceId: string): Promise<{ isVip: boolean; planName: string }> {
  const ws = await db.select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws || ws.length === 0) return { isVip: false, planName: 'Gói Miễn phí (Free)' };

  return getUserPlanDetails(ws[0].ownerId);
}
