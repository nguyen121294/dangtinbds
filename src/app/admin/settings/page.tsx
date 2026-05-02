import { getAppSetting } from '@/lib/app-settings';
import SettingsForm from './settings-form';

export default async function AdminSettingsPage() {
  const trialCredits = await getAppSetting('trial_credits') || '200';
  const trialDays = await getAppSetting('trial_days') || '15';
  const commTier1 = await getAppSetting('commission_tier1') || '10';
  const commTier2 = await getAppSetting('commission_tier2') || '5';
  const commTier3 = await getAppSetting('commission_tier3') || '1';
  const minWithdrawal = await getAppSetting('min_withdrawal') || '5000000';
  const creditBaseV1 = await getAppSetting('credit_base_v1') || '1';
  const creditBaseV2V3 = await getAppSetting('credit_base_v2v3') || '2';
  const creditImageStandard = await getAppSetting('credit_image_standard') || '10';
  const creditImageBanana = await getAppSetting('credit_image_banana') || '40';
  const creditPosterStandard = await getAppSetting('credit_poster_standard') || '25';
  const creditPosterBanana = await getAppSetting('credit_poster_banana') || '65';
  const creditQwenImageEdit = await getAppSetting('credit_qwen_image_edit') || '75';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt Hệ thống</h1>
        <p className="text-zinc-400 mt-2">Quản lý cấu hình hệ thống, trial mặc định và các thông số khác</p>
      </div>

      <SettingsForm 
        initialTrialCredits={trialCredits} 
        initialTrialDays={trialDays}
        initialCommTier1={commTier1}
        initialCommTier2={commTier2}
        initialCommTier3={commTier3}
        initialMinWithdrawal={minWithdrawal}
        initialCreditBaseV1={creditBaseV1}
        initialCreditBaseV2V3={creditBaseV2V3}
        initialCreditImageStandard={creditImageStandard}
        initialCreditImageBanana={creditImageBanana}
        initialCreditPosterStandard={creditPosterStandard}
        initialCreditPosterBanana={creditPosterBanana}
        initialCreditQwenImageEdit={creditQwenImageEdit}
      />
    </div>
  );
}
