import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js'; 
import postgres from 'postgres'; 
import { sql } from 'drizzle-orm'; 
import { plans } from './src/db/schema';

const client = postgres(process.env.DATABASE_URL as string, { prepare: false }); 
const db = drizzle(client); 

const matrixPlans = [
  { id: 'pro1', name: 'Pro 1.000 (1 Tháng)', category: 'personal', price: 159000, days: 30, creditsOffered: 1000, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Email'] },
  { id: 'pro2', name: 'Pro 1.000 (2 Tháng)', category: 'personal', price: 219000, days: 60, creditsOffered: 1000, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Email'] },
  { id: 'pro3', name: 'Pro 1.000 (3 Tháng)', category: 'personal', price: 259000, days: 90, creditsOffered: 1000, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Email'] },
  
  { id: 'pro4', name: 'Pro 3.500 (1 Tháng)', category: 'personal', price: 299000, days: 30, creditsOffered: 3500, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Ưu tiên'] },
  { id: 'pro5', name: 'Pro 3.500 (2 Tháng)', category: 'personal', price: 359000, days: 60, creditsOffered: 3500, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Ưu tiên'] },
  { id: 'pro6', name: 'Pro 3.500 (3 Tháng)', category: 'personal', price: 399000, days: 90, creditsOffered: 3500, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Ưu tiên'] },

  { id: 'pro7', name: 'Pro 10.000 (1 Tháng)', category: 'personal', price: 649000, days: 30, creditsOffered: 10000, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Chuyên gia lớn', 'Thiết lập tuỳ chỉnh'] },
  { id: 'pro8', name: 'Pro 10.000 (2 Tháng)', category: 'personal', price: 719000, days: 60, creditsOffered: 10000, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Chuyên gia lớn', 'Thiết lập tuỳ chỉnh'] },
  { id: 'pro9', name: 'Pro 10.000 (3 Tháng)', category: 'personal', price: 789000, days: 90, creditsOffered: 10000, maxWorkspaces: 1, maxInvites: 3, features: ['1 Workspace', 'Tối đa 3 thành viên', 'Tạo bài tự động bằng AI', 'Hỗ trợ Chuyên gia lớn', 'Thiết lập tuỳ chỉnh'] },
]

async function main() { 
  try { 
    await db.execute(sql`ALTER TABLE plans ADD COLUMN category TEXT NOT NULL DEFAULT 'personal';`); 
    console.log("Added category column to plans");
  } catch(e: any) { 
    console.log("Column category might already exist:", e.message);
  } 
  
  try {
    // Backup and remove old plans
    await db.execute(sql`DELETE FROM plans;`);
    console.log("Cleared old plans data.");

    // Insert new plans
    for (const plan of matrixPlans) {
       await db.insert(plans).values(plan);
       console.log(`Inserted ${plan.name}`);
    }
  } catch(e: any) {
    console.log(e.message);
  }

  console.log('Matrix Seeding Done'); 
  process.exit(0); 
} 

main();
