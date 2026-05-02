import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create Account — MCQify",
  description: "Join MCQify and start learning",
};

export default function SignupPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 xl:p-8 relative overflow-hidden bg-[#FCF9F2] w-full min-h-[calc(100vh-4rem)]">
      {/* Delicate background texture */}
      <div className="absolute inset-0 transition-opacity bg-[radial-gradient(#E8E3DA_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Colorful mesh blob animation slightly visible */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-40">
        <div className="absolute w-[600px] h-[600px] bg-teal-300/30 rounded-[40%_60%_70%_30%] blur-[90px] animate-[spin_16s_linear_infinite] -translate-x-1/4 -translate-y-1/4" />
        <div className="absolute w-[500px] h-[500px] bg-amber-300/40 rounded-[60%_40%_30%_70%] blur-[80px] animate-[spin_12s_linear_infinite_reverse] translate-x-1/4 translate-y-1/3" />
        <div className="absolute w-[450px] h-[450px] bg-rose-300/30 rounded-[50%_50%_40%_60%] blur-[70px] animate-[spin_19s_linear_infinite] -translate-x-1/3 translate-y-1/4" />
      </div>

      <div className="relative z-10 w-full animate-fade-in-up">
        <SignupForm />
      </div>
    </div>
  );
}
