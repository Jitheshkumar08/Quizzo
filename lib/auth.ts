import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { findUserByIdentifier } from "@/lib/user-lookup";

async function refreshTokenUser(token: JWT) {
  if (!token.id) return token;

  const [user] = await prisma.$queryRaw<Array<{
    email: string;
    fullName: string;
    role: string;
    username: string;
    sessionVersion: number;
  }>>`
    SELECT "email", "fullName", "role", "username", "sessionVersion"
    FROM "User"
    WHERE "id" = ${token.id}
    LIMIT 1
  `;

  if (!user) return token;

  token.email = user.email;
  token.name = user.fullName;
  token.role = user.role;
  token.username = user.username;
  token.sessionVersion = user.sessionVersion;
  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier as string;
        const password = credentials?.password as string;

        if (!identifier || !password) return null;

        const user = await findUserByIdentifier(identifier);

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const [sessionState] = await prisma.$queryRaw<Array<{ sessionVersion: number }>>`
          UPDATE "User"
          SET "lastLoginAt" = NOW()
          WHERE "id" = ${user.id}
          RETURNING "sessionVersion"
        `;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          username: user.username,
          sessionVersion: sessionState?.sessionVersion ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1. Initial Sign In
      if (user) {
        if (user.id) token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.username = user.username;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      
      // 2. Client-side update trigger handling
      if (trigger === "update" && session) {
        const requested = session as Session & { refreshUser?: boolean };
        if (requested.refreshUser) {
          token = await refreshTokenUser(token);
        }
      }

      // JWTs stay cheap on normal requests. Explicit session updates can opt into
      // reloading user fields after profile or role edits.

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.user.sessionVersion = Number(token.sessionVersion ?? 0);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
});
