import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";

async function refreshTokenUser(token: JWT) {
  if (!token.id) return token;

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: {
      email: true,
      fullName: true,
      role: true,
      username: true,
    },
  });

  if (!user) return token;

  token.email = user.email;
  token.name = user.fullName;
  token.role = user.role;
  token.username = user.username;
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

        // Find by email OR username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier.toLowerCase() },
            ],
          },
        });

        if (!user) return null;

        const valid = await bcryptjs.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1. Initial Sign In
      if (user) {
        if (user.id) token.id = user.id;
        token.role = user.role;
        token.username = user.username;
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
        session.user.role = token.role as string;
        session.user.username = token.username as string;
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
