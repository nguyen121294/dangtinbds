import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULTS: Record<string, string> = {
  trial_credits: '200',
  trial_days: '15',
};

export async function getAppSetting(key: string): Promise<string> {
  const result = await db.select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  
  if (result.length > 0) return result[0].value;
  return DEFAULTS[key] || '';
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await db.insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getTrialCredits(): Promise<number> {
  const val = await getAppSetting('trial_credits');
  return parseInt(val, 10) || 200;
}

export async function getTrialDays(): Promise<number> {
  const val = await getAppSetting('trial_days');
  return parseInt(val, 10) || 15;
}
