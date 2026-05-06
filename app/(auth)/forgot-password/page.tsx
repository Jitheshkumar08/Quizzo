import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset Password — MCQify",
  description: "Reset your MCQify password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] w-full flex-1 items-center justify-center overflow-hidden bg-[#FCF9F2] p-4 xl:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(#E8E3DA_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-40 pointer-events-none">
        <div className="absolute h-[560px] w-[560px] -translate-x-1/4 -translate-y-1/4 rounded-[40%_60%_70%_30%] bg-emerald-300/30 blur-[90px] animate-[spin_16s_linear_infinite]" />
        <div className="absolute h-[520px] w-[520px] translate-x-1/4 translate-y-1/3 rounded-[60%_40%_30%_70%] bg-amber-300/40 blur-[80px] animate-[spin_12s_linear_infinite_reverse]" />
        <div className="absolute h-[440px] w-[440px] -translate-x-1/3 translate-y-1/4 rounded-[50%_50%_40%_60%] bg-rose-300/30 blur-[70px] animate-[spin_19s_linear_infinite]" />
      </div>

      <div className="relative z-10 w-full animate-fade-in-up">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
