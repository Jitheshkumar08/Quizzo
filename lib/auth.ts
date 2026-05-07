import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { findUserByIdentifier } from "@/lib/user-lookup";
import { upsertGoogleUser } from "@/lib/google-user";
import { touchUserPresence } from "@/lib/presence";

type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

async function refreshTokenUser(token: JWT) {
  if (!token.id) return token;

  const [user] = await prisma.$queryRaw<Array<{
    email: string;
    fullName: string;
    role: string;
    username: string;
    sessionVersion: number;
    profileImageUrl: string | null;
    authProvider: string;
  }>>`
    SELECT "email", "fullName", "role", "username", "sessionVersion", "profileImageUrl", "authProvider"
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
  token.picture = user.profileImageUrl ?? token.picture;
  token.profileImageUrl = user.profileImageUrl;
  token.authProvider = user.authProvider;
  return token;
}

const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
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
        void touchUserPresence(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          username: user.username,
          sessionVersion: sessionState?.sessionVersion ?? 0,
          image: user.profileImageUrl,
          profileImageUrl: user.profileImageUrl,
          authProvider: user.authProvider,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      const googleProfile = profile as GoogleProfile | undefined;
      return Boolean(googleProfile?.sub && googleProfile?.email);
    },
    async jwt({ token, user, trigger, session, account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as GoogleProfile | undefined;
        if (!googleProfile?.sub || !googleProfile.email) {
          return token;
        }

        const dbUser = await upsertGoogleUser({
          googleId: googleProfile.sub,
          email: googleProfile.email,
          fullName: googleProfile.name || user?.name || googleProfile.email.split("@")[0],
          profileImageUrl: googleProfile.picture || user?.image || null,
          emailVerified: Boolean(googleProfile.email_verified),
        });

        token.id = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.fullName;
        token.role = dbUser.role;
        token.username = dbUser.username;
        token.sessionVersion = dbUser.sessionVersion;
        token.picture = dbUser.profileImageUrl ?? googleProfile.picture ?? token.picture;
        token.profileImageUrl = dbUser.profileImageUrl;
        token.authProvider = dbUser.authProvider;

        return token;
      }

      // 1. Initial Sign In
      if (user) {
        if (user.id) token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.username = user.username;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.profileImageUrl = user.profileImageUrl ?? null;
        token.authProvider = user.authProvider;
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
        session.user.image = (token.profileImageUrl ?? token.picture ?? null) as string | null;
        session.user.profileImageUrl = (token.profileImageUrl ?? token.picture ?? null) as string | null;
        session.user.authProvider = token.authProvider as string | undefined;
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
