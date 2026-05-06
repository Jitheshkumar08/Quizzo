import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import ScrollToTop from "@/components/layout/ScrollToTop";
import ProfileDropdown from "@/components/layout/ProfileDropdown";
import RoleChangeRealtimeRefresh from "@/components/live/RoleChangeRealtimeRefresh";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Capitalize format
  const roleName = session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1).toLowerCase();

  return (
    <div className="flex h-[100dvh] bg-[#FDFBFA] relative overflow-hidden text-[#1A1A1A]">
      <RoleChangeRealtimeRefresh userId={session.user.id} />
      {/* Warm Ambient background blobs to match new auth theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-[#E5D8C5]/30 blur-[120px] mix-blend-multiply border border-white/20" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#D4C5B0]/30 blur-[100px] mix-blend-multiply border border-white/20" />
        <div className="absolute top-[40%] left-[20%] w-[900px] h-[900px] rounded-full bg-[#E8DFD3]/40 blur-[150px] mix-blend-multiply" />
      </div>

      {/* Texture Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(#D6C9B3_1px,transparent_1px)] [background-size:24px_24px] opacity-40 z-0 pointer-events-none"></div>

      <Sidebar role={session.user.role} userName={session.user.name} />

      <main className="flex-1 flex flex-col min-w-0 relative z-10 w-full overflow-hidden">
        {/* Top bar */}
        <header className="h-[88px] bg-[#F4EFE6]/40 backdrop-blur-2xl border-b border-white/80 flex items-center pl-[72px] pr-4 md:px-10 flex-shrink-0 sticky top-0 z-20 shadow-[0_4px_20px_rgba(163,149,126,0.05)]">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>

          <div className="ml-auto relative z-10 flex items-center">
            <ProfileDropdown user={session.user} roleName={roleName} />
          </div>
        </header>

        {/* Scrolling Content Zone */}
        <div id="dashboard-scroll-area" className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth p-4 md:p-10 relative">
          <div className="max-w-6xl mx-auto rounded-[20px] md:rounded-[32px] bg-[#F4EFE6]/70 backdrop-blur-2xl border border-white/80 shadow-[0_20px_40px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.05)] p-5 md:p-8 relative">
            {/* White glossy rim for inner container */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/50 to-transparent pointer-events-none rounded-t-[32px] z-0"></div>
            <div className="relative z-10">
              {children}
            </div>
          </div>
          <ScrollToTop />
        </div>
      </main>
    </div>
  );
}
