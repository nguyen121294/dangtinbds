# 📋 Release Notes — Môi Giới AI (BĐS Platform)

---

## v0.4.3 — 20/04/2026

### 🆕 Tính năng mới

- **⚠️ Cảnh báo Credits thấp** — Workspace hiển thị banner:
  - 🟡 Amber khi credits ≤ 10: "Bạn chỉ còn X credits. Hãy nâng cấp"
  - 🔴 Red khi credits = 0: "Bạn đã hết credits. Vui lòng mua gói"
  - Kèm nút "Mua thêm" / "Nâng cấp ngay" dẫn về `/pricing`

- **🔔 Toast Notification System** — Thay thế `alert()` trong toàn bộ app
  - Component: `src/components/toast.tsx` (ToastProvider + useToast hook)
  - Hỗ trợ 3 loại: success (xanh), error (đỏ), warning (vàng)
  - Auto-dismiss sau 5 giây, slide-in animation
  - Áp dụng cho: Payment status, checkout errors

- **Admin Plans — Category Filter**
  - Tabs: Tất cả / Cá nhân / Doanh nghiệp (hiện số lượng)
  - Load tất cả plans qua `getAllPlans()` thay vì chỉ `personal`

### 🏗️ Kỹ thuật

- Component mới: `toast.tsx` (ToastProvider, useToast)
- `layout.tsx` (root): Wrap app với `<ToastProvider>`
- `PaymentStatusHandler.tsx`: `alert()` → `showToast()`
- `MatrixPricingTable.tsx`: `alert()` → `showToast()`
- `[workspaceId]/layout.tsx`: Low-credit banner logic
- `plans.ts`: Thêm `getAllPlans()`, `plans-table.tsx`: Category tabs + `filteredPlans`
- TypeScript: 0 errors

---


## v0.4.2 — 20/04/2026

### 🆕 Tính năng mới

- **Lịch sử Thanh toán** (`/dashboard/payments`)
  - Danh sách tất cả giao dịch: tên gói, mã đơn, số tiền, trạng thái (Thành công/Đang xử lý/Đã huỷ)
  - Link mới trên sidebar Dashboard: "Lịch sử Thanh toán"

- **Account page hiển thị Credits**
  - 2 card mới: Trial Credits (orange) + Paid Credits (green), mỗi card hiện số dư + ngày hết hạn
  - Nút "🚀 Nâng cấp tài khoản" khi user chưa mua gói

### 🔧 Cải thiện

- **Checkout description** — PayOS SMS/notification hiện tên gói + số credits thay vì "Don hang 123"
- **Pricing header** — Bỏ text hardcode "1 Workspace / 3 Thành viên" → "Định giá linh hoạt theo nhu cầu"
- **Dead code cleanup** — Xóa `PLANS_PLACEHOLDER` khỏi `plans.ts`

### 🏗️ Kỹ thuật

- Trang mới: `dashboard/payments/page.tsx`
- `client-view.tsx`: Thêm props `trialCredits`, `trialExpiresAt`, `paidCredits` + credit balance UI
- `checkout/route.ts`: Description = `${plan.name} ${plan.creditsOffered}Cr` (max 25 chars)
- TypeScript: 0 errors

---


## v0.4.1 — 20/04/2026 (Hotfix)

### 🐛 Critical Bug Fixes

- **confirm-payment race condition** — Nếu webhook PayOS chạy chậm hơn redirect, user nhận được gói nhưng **không nhận credits**. Đã fix: API confirm-payment giờ cũng cộng `paidCredits` + stack ngày hết hạn nếu subscription đang active.
- **Trial credits hiển thị sai khi hết hạn** — User hết hạn trial nhưng UI vẫn hiện "150 credits dùng thử" (dù không dùng được). Đã fix: ẩn chip trial credits trên navbar/topbar khi `trialExpiresAt < now`. GlobalNavbar cũng chỉ tính credits còn hiệu lực.
- **Schema default hardcode `200`** — `profiles.trialCredits` default trong schema là 200 (hardcode), không khớp khi admin đổi trial credits qua app_settings. Đã fix: default = `0`, chỉ auth callback set giá trị thực từ DB.

### 🏗️ Kỹ thuật

- `confirm-payment/route.ts`: Thêm `sql` import, cộng `paidCredits` atomic, stack subscription days
- `[workspaceId]/layout.tsx` + `dashboard/layout.tsx`: Thêm check `trialRemaining > 0`
- `GlobalNavbar.tsx`: Tính `totalCredits` chỉ gồm trial chưa hết hạn
- `schema.ts`: `trialCredits.default(0)`
- TypeScript: 0 errors

---

## v0.4.0 — 20/04/2026

### 🆕 Tính năng mới

- **Super Admin — Cài đặt Hệ thống** (`/admin/settings`)
  - Chỉnh số **Trial Credits** mặc định cho user mới đăng ký (hiện tại: 200)
  - Chỉnh số **Ngày dùng thử** mặc định (hiện tại: 15 ngày)
  - Giá trị đọc từ DB (`app_settings`), không còn hardcode trong code
  - Thay đổi chỉ ảnh hưởng user mới, user cũ không bị tác động

- **Super Admin — Chỉnh Credits & Hạn User trực tiếp**
  - Modal chỉnh sửa user có thêm 4 trường: Trial Credits, Paid Credits, Hạn Trial, Hạn Subscription
  - Admin có toàn quyền tặng/trừ credits và gia hạn cho user cụ thể

### 🔧 Cải thiện UX

- **Gói cước dời từ Sidebar → Topbar (Navbar)**
  - Sidebar gọn hơn, chỉ còn nav links + avatar
  - Topbar hiển thị compact: `Gói: [tên] | 💰 Trial · Hạn | 💰 PRO · Hạn | [Nâng cấp]`
  - Áp dụng cho cả Dashboard và Workspace layout

- **Bảng Pricing — Loại bỏ gói Free khỏi ma trận**
  - Bỏ hàng 15 credits / cột 0 ngày gây rối bảng giá
  - Giữ nguyên nút CTA "Đăng ký dùng thử miễn phí" cho guest (hiển thị số credits động từ DB)

- **Nút "Đăng ký dùng thử"** trên trang Pricing cho khách chưa đăng nhập

### 🐛 Bug Fixes

- Fix trial credits không hiển thị trên sidebar khi `trialExpiresAt = null` (user mới tạo)
- Fix PayOS payment link lỗi do description chứa ký tự đặc biệt (tiếng Việt có dấu)
- Fix modal đăng nhập khi bấm thanh toán mà chưa login (trước đây hiện lỗi generic)

### 🏗️ Kỹ thuật

- Bảng DB mới: `app_settings` (key-value config)
- Helper mới: `src/lib/app-settings.ts` — `getTrialCredits()`, `getTrialDays()`, `getAppSetting()`, `setAppSetting()`
- Auth callback đọc config động từ DB thay vì hardcode
- TypeScript: 0 errors (`tsc --noEmit`)

### 📌 Ghi chú

- **Logic trừ credit:** Trial trừ trước → hết trial mới trừ Paid. Hai ví tách biệt, không ảnh hưởng lẫn nhau.
- **User mới:** Tự động nhận trial credits khi đăng ký (không cần bấm nút kích hoạt)
- **Build warning:** `PAYOS_CLIENT_ID` env var cần có trong môi trường build (Netlify)

---

## v0.3.0 — 19/04/2026

### 🆕 Tính năng mới

- **Global Loading Indicator** — Spinner xoay khi chuyển trang, tránh user tưởng web treo
- **GlobalNavbar** trên trang Pricing và Success page
- **Checkout Flow** — Modal xác nhận đăng nhập trước khi thanh toán
- **Settings mở tab mới** — Bấm "Cài đặt Cá nhân" từ workspace không mất form

### 🔧 Cải thiện

- Refactor Success page theo Light Theme (batdongsan-ui-rules)
- Sidebar responsive với CSS-only toggle cho mobile

### 🐛 Bug Fixes

- Fix redirect loop sau đăng nhập (status 303)
- Fix PayOS description field vượt giới hạn ký tự

---

## v0.2.0 — 18/04/2026

### 🆕 Tính năng mới

- **Matrix Pricing Table** — Bảng giá dạng ma trận (Credits × Thời gian)
- **Admin CMS** — Quản lý Plans, Users, Workspaces
- **PayOS Integration** — Thanh toán trực tuyến

### 🔧 Cải thiện

- Mobile-first responsive sidebar
- Admin pricing management card-based layout cho mobile

---

## v0.1.0 — 17/04/2026

### 🆕 Tính năng mới

- Supabase Authentication (Magic Link)
- Credit system (Trial + Paid wallets)
- Workspace system (Owner/Member roles)
- AI Tool integration (Content generation)
- Super Admin panel (basic)
