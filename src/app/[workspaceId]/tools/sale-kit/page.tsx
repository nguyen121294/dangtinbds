import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SaleKitForm from '@/components/SaleKitForm';

export default async function SaleKitPage({
  params,
}: {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="w-full">
      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        <SaleKitForm workspaceId={workspaceId} />
      </main>
    </div>
  );
}
