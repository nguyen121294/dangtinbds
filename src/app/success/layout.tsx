import GlobalNavbar from '@/components/GlobalNavbar';

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F2F4F5] flex flex-col">
      <GlobalNavbar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
