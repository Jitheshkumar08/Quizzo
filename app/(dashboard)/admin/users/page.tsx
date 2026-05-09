import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserTable from "@/components/admin/UserTable";
import { Shield } from "lucide-react";
import { canAccessAdminControls, isAppRole } from "@/lib/roles";

export const metadata = { title: "Manage Users - Admin" };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || !canAccessAdminControls(session.user.role) || !isAppRole(session.user.role)) redirect("/dashboard");

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage roles across all platform users</p>
        </div>
      </div>
      <UserTable currentUserId={session.user.id} viewerRole={session.user.role} />
    </div>
  );
}
