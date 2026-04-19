import { getAppSetting } from '@/lib/app-settings';
import SettingsForm from './settings-form';

export default async function AdminSettingsPage() {
  const trialCredits = await getAppSetting('trial_credits') || '200';
  const trialDays = await getAppSetting('trial_days') || '15';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt Hệ thống</h1>
        <p className="text-zinc-400 mt-2">Quản lý cấu hình hệ thống, trial mặc định và các thông số khác</p>
      </div>

      <SettingsForm initialTrialCredits={trialCredits} initialTrialDays={trialDays} />
    </div>
  );
}
