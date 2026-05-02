"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, Shield } from "lucide-react";

interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  createdAt: string;
  _count: { quizzes: number; results: number };
}

const ROLES = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;

const roleStyles: Record<string, string> = {
  ADMIN: "text-red-400 bg-red-400/10 border-red-400/20",
  INSTRUCTOR: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  STUDENT: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

export default function UserTable({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function changeRole(userId: string, role: string) {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: data.role } : u))
        );
      } else {
        alert(data.error);
      }
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["User", "Email", "Role", "Quizzes", "Attempts", "Joined"].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/2 transition-colors">
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium text-sm">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{user.email}</td>
                <td className="px-5 py-4">
                  {user.id === currentUserId ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${roleStyles[user.role]}`}>
                      {user.role} (you)
                    </span>
                  ) : (
                    <div className="relative">
                      {updating === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => changeRole(user.id, e.target.value)}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium bg-transparent cursor-pointer focus:outline-none ${roleStyles[user.role]}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} className="bg-gray-900 text-white">
                              {r}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-center">{user._count.quizzes}</td>
                <td className="px-5 py-4 text-sm text-center">{user._count.results}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
