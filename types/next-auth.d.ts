import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      username?: string;
      role: string;
      sessionVersion: number;
      profileImageUrl?: string | null;
      authProvider?: string;
    };
  }
  interface User {
    role: string;
    username?: string;
    sessionVersion?: number;
    profileImageUrl?: string | null;
    authProvider?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    username?: string;
    sessionVersion?: number;
    profileImageUrl?: string | null;
    authProvider?: string;
  }
}

export {};
