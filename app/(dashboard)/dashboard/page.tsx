import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Upload, ClipboardList, Users, BookOpen, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Dashboard — MCQify",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { role, name } = session.user;

  const roleCards: Record<string, { title: string; description: string; href: string; icon: React.ElementType; gradient: string }[]> = {
    ADMIN: [
      { title: "Manage Users", description: "View all users and change their roles", href: "/admin/users", icon: Users, gradient: "from-red-500/20 to-orange-500/20" },
      { title: "All Quizzes", description: "Oversee every quiz on the platform", href: "/admin/quizzes", icon: BookOpen, gradient: "from-purple-500/20 to-pink-500/20" },
      { title: "Upload PDF", description: "Generate a new quiz from a PDF", href: "/instructor/upload", icon: Upload, gradient: "from-cyan-500/20 to-blue-500/20" },
      { title: "Browse Quizzes", description: "Take any published quiz", href: "/student/quizzes", icon: ClipboardList, gradient: "from-green-500/20 to-emerald-500/20" },
    ],
    INSTRUCTOR: [
      { title: "Upload PDF", description: "Upload a PDF and let AI generate MCQs", href: "/instructor/upload", icon: Upload, gradient: "from-cyan-500/20 to-blue-500/20" },
      { title: "My Quizzes", description: "View and edit your created quizzes", href: "/instructor/quizzes", icon: BookOpen, gradient: "from-purple-500/20 to-pink-500/20" },
      { title: "Browse Quizzes", description: "Take any published quiz", href: "/student/quizzes", icon: ClipboardList, gradient: "from-green-500/20 to-emerald-500/20" },
    ],
    STUDENT: [
      { title: "Browse Quizzes", description: "Explore all available quizzes", href: "/student/quizzes", icon: ClipboardList, gradient: "from-purple-500/20 to-pink-500/20" },
      { title: "My Results", description: "Review your past quiz attempts", href: "/student/results", icon: BookOpen, gradient: "from-cyan-500/20 to-blue-500/20" },
    ],
  };

  const cards = roleCards[role] || roleCards.STUDENT;

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Greeting */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{name?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-white/50 mt-2 text-lg">
          {role === "ADMIN" && "You have full platform access."}
          {role === "INSTRUCTOR" && "Create and manage your quizzes below."}
          {role === "STUDENT" && "Ready to test your knowledge?"}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="bg-[#121214]/60 backdrop-blur-xl border border-white/[0.05] hover:border-purple-500/30 hover:bg-[#1a1a1d]/80 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] rounded-2xl p-6 flex flex-col gap-4 group cursor-pointer transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle top gradient line on hover */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center flex-shrink-0 border border-white/10 shadow-inner`}>
                <Icon className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              <div className="flex-1 mt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-white group-hover:text-purple-300 transition-colors tracking-tight">{card.title}</h3>
                  <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{card.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
