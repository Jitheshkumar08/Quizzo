import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0B] relative overflow-hidden text-white">
      {/* Grid overlay for texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {/* Subtle ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-0 opacity-40">
        <div className="absolute w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDuration: '15s' }} />
        <div className="absolute w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] -translate-x-1/3 -translate-y-1/2" />
      </div>

      <Sidebar role={session.user.role} userName={session.user.name} />
      
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top bar */}
        <header className="h-16 bg-[#121214]/60 backdrop-blur-xl border-b border-white/[0.05] flex items-center px-8 flex-shrink-0 sticky top-0 z-20">
          <p className="text-sm text-white/50 ml-auto">
            Signed in as <span className="text-white font-medium">{session.user.name}</span>
          </p>
        </header>
        {/* Content */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
