import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { touchUserPresence } from "@/lib/presence";

type GoogleUserInput = {
  googleId: string;
  email: string;
  fullName: string;
  profileImageUrl?: string | null;
  emailVerified?: boolean;
};

function usernameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "user";
  const cleaned = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned.length >= 3 ? cleaned : `${cleaned || "user"}123`;
}

async function uniqueUsername(baseUsername: string) {
  let candidate = baseUsername;
  let suffix = 1;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;

    suffix += 1;
    candidate = `${baseUsername}${suffix}`;
  }
}

export async function upsertGoogleUser(input: GoogleUserInput) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim() || usernameFromEmail(email);
  const googleId = input.googleId.trim();

  const byGoogleId = await prisma.user.findUnique({
    where: { googleId },
  });

  if (byGoogleId) {
    const user = await prisma.user.update({
      where: { id: byGoogleId.id },
      data: {
        email,
        profileImageUrl: input.profileImageUrl || byGoogleId.profileImageUrl,
        emailVerifiedAt: input.emailVerified ? (byGoogleId.emailVerifiedAt ?? new Date()) : byGoogleId.emailVerifiedAt,
        lastLoginAt: new Date(),
      },
    });
    void touchUserPresence(user.id);
    return user;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (byEmail) {
    const user = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId,
        authProvider: byEmail.authProvider === "credentials" ? "credentials_google" : byEmail.authProvider,
        profileImageUrl: input.profileImageUrl || byEmail.profileImageUrl,
        emailVerifiedAt: input.emailVerified ? (byEmail.emailVerifiedAt ?? new Date()) : byEmail.emailVerifiedAt,
        lastLoginAt: new Date(),
      },
    });
    void touchUserPresence(user.id);
    return user;
  }

  const username = await uniqueUsername(usernameFromEmail(email));
  const passwordHash = await bcrypt.hash(`google:${randomUUID()}`, 12);

  const user = await prisma.user.create({
    data: {
      fullName,
      username,
      email,
      passwordHash,
      authProvider: "google",
      googleId,
      profileImageUrl: input.profileImageUrl || null,
      emailVerifiedAt: input.emailVerified ? new Date() : null,
      lastLoginAt: new Date(),
      role: "STUDENT",
    },
  });
  void touchUserPresence(user.id);
  return user;
}
