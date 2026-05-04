import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import SessionProviderWrapper from "@/components/auth/SessionProviderWrapper";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MCQify — AI-Powered Quiz Platform",
  description:
    "Upload PDFs and let AI generate comprehensive multiple-choice quizzes instantly. Built for instructors, loved by students.",
  keywords: ["quiz", "MCQ", "AI", "education", "pdf", "exam"],
  icons: {
    icon: "/brand-icon.svg",
    shortcut: "/brand-icon.svg",
    apple: "/brand-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProviderWrapper>
          {children}
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
