# ARCHITECTURE — Trợ lý AI BĐS

## Tech Stack

- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Auth**: Supabase Auth
- **Queue**: QStash (Upstash) — async job dispatch
- **AI Models**: Replicate API (GPT Image 2, GPT-5 Nano, GPT-4.1 Nano)
- **Storage**: Google Drive (user OAuth)
- **Hosting**: Vercel

---

## Business Rules

### Credit Policy

> **File tham chiếu**: `src/lib/app-settings.ts`

| Rule | Mô tả |
|------|--------|
| **Hết hạn subscription** | Credit KHÔNG bị xóa/reset. User giữ nguyên số credit còn lại và có thể dùng tiếp. |
| **Trừ credit khi nào** | Chỉ trừ khi tool chạy **thành công**. |
| **Tool fail** | Không trừ credit. |
| **Trial** | User mới nhận credit trial (mặc định 200) + thời hạn trial (mặc định 15 ngày). |

### Pricing Defaults (configurable bởi Super Admin)

| Key | Default | Mô tả |
|-----|---------|--------|
| `credit_base_v1` | 1 | Tạo bài đăng V1 |
| `credit_base_v2v3` | 2 | Tạo bài đăng V2/V3 |
| `credit_image_standard` | 10 | Xử lý ảnh (Standard) |
| `credit_image_banana` | 40 | Xử lý ảnh (Banana) |
| `credit_poster_standard` | 25 | Tạo poster (Standard) |
| `credit_poster_banana` | 65 | Tạo poster (Banana) |

---

## Key Directories

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── generate-v3/        # Text generation (V3)
│   │   ├── generate-poster/    # Poster orchestrator
│   │   ├── worker-poster-gpt/  # Poster worker (GPT Image 2)
│   │   ├── worker-openai-gpt/  # Image editing worker (GPT Image 2)
│   │   ├── webhook-poster-gpt/ # Webhook receiver for poster results
│   │   └── tool-settings/      # Admin pricing config
│   └── [workspaceId]/          # Workspace-scoped pages
├── components/                 # React components
├── db/                         # Drizzle schema & migrations
└── lib/
    ├── app-settings.ts         # Credit pricing & trial config
    └── workspace-utils.ts      # Credit deduction logic
```
