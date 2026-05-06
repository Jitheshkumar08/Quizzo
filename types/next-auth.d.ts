import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      username?: string;
      role: string;
      sessionVersion: number;
    };
  }
  interface User {
    role: string;
    username?: string;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    username?: string;
    sessionVersion?: number;
  }
}

export {};
