import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Upload, ClipboardList, Users, BookOpen, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { role, name } = session.user;

  const roleCards: Record<string, { title: string; description: string; href: string; icon: React.ElementType; gradient: string }[]> = {
    ADMIN: [
      { title: "Manage Users", description: "View all users and change their roles", href: "/admin/users", icon: Users, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
      { title: "All Quizzes", description: "Oversee every quiz on the platform", href: "/admin/quizzes", icon: BookOpen, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
      { title: "Upload PDF", description: "Generate a new quiz from a PDF", href: "/instructor/upload", icon: Upload, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
      { title: "Browse Quizzes", description: "Take any published quiz", href: "/student/quizzes", icon: ClipboardList, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
    ],
    INSTRUCTOR: [
      { title: "Upload PDF", description: "Upload a PDF and let AI generate MCQs", href: "/instructor/upload", icon: Upload, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
      { title: "My Quizzes", description: "View and edit your created quizzes", href: "/instructor/quizzes", icon: BookOpen, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
      { title: "Browse Quizzes", description: "Take any published quiz", href: "/student/quizzes", icon: ClipboardList, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
    ],
    STUDENT: [
      { title: "Browse Quizzes", description: "Explore all available quizzes", href: "/student/quizzes", icon: ClipboardList, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
      { title: "My Results", description: "Review your past quiz attempts", href: "/student/results", icon: BookOpen, gradient: "from-[#F2EFE8] to-[#E9E4DC]" },
    ],
  };

  const cards = roleCards[role] || roleCards.STUDENT;

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Greeting */}
      <div>
        <h1 className="text-[28px] md:text-[36px] font-black text-[#2C2A28] tracking-tight leading-tight">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8C5D3E] to-[#D98A5B]">{name?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-[#918B80] mt-2 text-[14px] md:text-[16px] font-medium">
          {role === "ADMIN" && "You have full platform access."}
          {role === "INSTRUCTOR" && "Create and manage your quizzes below."}
          {role === "STUDENT" && "Ready to test your knowledge?"}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white/60 backdrop-blur-xl border border-white/80 hover:border-[#8C5D3E]/30 hover:bg-white/90 hover:shadow-[0_16px_32px_rgba(44,42,40,0.06),inset_0_2px_4px_rgba(255,255,255,1)] hover:-translate-y-1 rounded-[24px] p-7 flex flex-col gap-4 group cursor-pointer transition-all duration-300 relative overflow-hidden shadow-[0_4px_12px_rgba(163,149,126,0.08),inset_0_2px_4px_rgba(255,255,255,0.7)]"
            >
              {/* Subtle top gradient line on hover */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#8C5D3E] to-[#D98A5B] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className={`w-12 h-12 rounded-[16px] bg-gradient-to-br ${card.gradient.replace('white/10', 'white/80')} flex items-center justify-center flex-shrink-0 border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.05)]`}>
                <Icon className="w-[22px] h-[22px] text-[#2C2A28]" strokeWidth={2.2} />
              </div>
              <div className="flex-1 mt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[18px] text-[#2C2A28] group-hover:text-[#8C5D3E] transition-colors tracking-tight">{card.title}</h3>
                  <ArrowRight className="w-5 h-5 text-[#918B80] group-hover:text-[#8C5D3E] group-hover:translate-x-1.5 transition-all duration-300" />
                </div>
                <p className="text-[14px] font-medium text-[#918B80] mt-2 leading-relaxed">{card.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
