import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { getSiteConfig } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import SlugManagementTable from "@/components/admin/SlugManagementTable";

export const metadata = { title: "Site Settings - Admin" };

export default async function AdminSiteSettingsPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) {
    redirect("/dashboard");
  }

  const [siteConfig, slugRows] = await Promise.all([
    getSiteConfig(),
    prisma.quiz.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        isPublished: true,
        shareSlug: true,
        createdBy: { select: { fullName: true, username: true } },
        shareAliases: {
          orderBy: { createdAt: "desc" },
          select: { id: true, slug: true, createdAt: true },
        },
      },
    }),
  ]);

  const slugQuizzes = slugRows.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    isPublished: quiz.isPublished,
    shareSlug: quiz.shareSlug,
    createdBy: quiz.createdBy,
    aliases: quiz.shareAliases.map((alias) => ({
      id: alias.id,
      slug: alias.slug,
      createdAt: alias.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Site Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admin controls for global website behavior.</p>
        </div>
      </div>

      <SiteSettingsForm initialCelebrationSoundEnabled={siteConfig.celebrationSoundEnabled} />
      <SlugManagementTable initialQuizzes={slugQuizzes} />
    </div>
  );
}
