import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import SessionProviderWrapper from "@/components/auth/SessionProviderWrapper";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://quizzo.tech"),
  applicationName: "Quizzo",
  title: {
    default: "Quizzo - AI Quiz Platform",
    template: "%s | Quizzo",
  },
  description:
    "Quizzo is an AI-powered quiz platform for creating, managing, and taking quizzes from PDFs.",
  keywords: ["Quizzo", "quizzo.tech", "AI quiz platform", "quiz maker", "PDF quiz generator", "online quizzes"],
  openGraph: {
    title: "Quizzo - AI Quiz Platform",
    description:
      "Create, manage, and take AI-generated quizzes with Quizzo.",
    url: "https://quizzo.tech",
    siteName: "Quizzo",
    type: "website",
    images: [
      {
        url: "/brand-icon.svg",
        width: 512,
        height: 512,
        alt: "Quizzo logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Quizzo - AI Quiz Platform",
    description:
      "Create, manage, and take AI-generated quizzes with Quizzo.",
    images: ["/brand-icon.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
