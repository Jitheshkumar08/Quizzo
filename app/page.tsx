import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: {
    absolute: "Quizzo - AI Quiz Platform",
  },
  description:
    "Quizzo helps instructors create AI-generated quizzes from PDFs and lets students take organized online quizzes.",
  alternates: {
    canonical: "https://quizzo.tech",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Quizzo",
  url: "https://quizzo.tech",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description:
    "Quizzo is an AI-powered quiz platform for creating, managing, and taking online quizzes.",
};

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#FAF8F3] text-[#1F1B19]">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="relative flex min-h-[100dvh] items-center bg-[#FAF8F3] px-5 pb-12 pt-28 sm:px-8 lg:px-12">
        <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(#D8D1C6_1px,transparent_1px),linear-gradient(90deg,#D8D1C6_1px,transparent_1px)] [background-size:56px_56px]" />

        <div className="pointer-events-none absolute inset-x-[-3rem] bottom-[-11rem] h-[40dvh] min-h-[300px] rotate-[-2deg] border-y border-[#D8D1C6]/60 bg-white/62 shadow-[0_-36px_90px_rgba(44,42,40,0.08)] backdrop-blur-sm sm:inset-x-[-6rem] sm:bottom-[-10rem]">
          <div className="mx-auto flex h-full max-w-5xl items-start justify-center px-6 py-7 opacity-70 sm:px-8">
            <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {["Create", "Publish", "Attempt", "Review"].map((label) => (
                <div
                  key={label}
                  className="min-h-[116px] rounded-[8px] border border-[#E3DDD3] bg-[#FBFAF7] p-4 sm:min-h-[132px]"
                >
                  <div className="mb-4 h-2 w-16 rounded-full bg-[#2C2A28]/80" />
                  <div className="h-2 w-24 rounded-full bg-[#D8D1C6]" />
                  <div className="mt-3 h-2 w-20 rounded-full bg-[#E6E0D6]" />
                  <div className="mt-7 text-[11px] font-black uppercase tracking-[0.16em] text-[#8C5D3E]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#E7E1D7] bg-white/72 px-3.5 py-2 text-sm font-black text-[#8C5D3E] shadow-[0_12px_30px_rgba(44,42,40,0.06)] backdrop-blur-xl">
            <Image src="/brand-icon.svg" alt="" width={28} height={28} className="h-7 w-7" priority />
            quizzo.tech
          </div>

          <h1 className="text-6xl font-black leading-[0.88] tracking-normal text-[#1F1B19] sm:text-7xl md:text-8xl lg:text-9xl">
            Quizzo
          </h1>

          <p className="mt-7 max-w-2xl text-balance text-[18px] font-semibold leading-8 text-[#5F5952] sm:text-[21px]">
            A clean AI quiz workspace for generating quizzes, running attempts, and reviewing results without friction.
          </p>

          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#1F1B19] px-7 text-[15px] font-black text-[#FAF8F3] shadow-[0_18px_34px_rgba(31,27,25,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#14110F] sm:w-auto"
            >
              Start with Quizzo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-[54px] w-full items-center justify-center rounded-full border border-[#2C2A28]/15 bg-white/70 px-7 text-[15px] font-black text-[#2C2A28] shadow-[0_12px_28px_rgba(44,42,40,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white sm:w-auto"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
