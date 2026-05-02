import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create Account — MCQify",
  description: "Join MCQify and start learning",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0A0A0B]">
      {/* Grid overlay for texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Animated ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDuration: '9s' }} />
        <div className="absolute w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
        <div className="absolute w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[80px] -translate-x-1/3 -translate-y-1/3" />
      </div>

      <div className="relative z-10 w-full animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="h-12 w-12 rounded-xl mb-4 flex items-center justify-center bg-white/5 border border-white/10 shadow-xl shadow-purple-500/20 backdrop-blur-md">
            <span className="text-2xl font-black gradient-text tracking-tight">M</span>
          </div>
          <span className="text-3xl font-black text-white tracking-tight">MCQify</span>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
