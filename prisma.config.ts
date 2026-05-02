import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

// Ensure .env is loaded before Prisma reads schema (dotenvx may inject later; this helps plain .env).
for (const file of [".env", ".env.local"]) {
  const full = resolve(process.cwd(), file);
  if (existsSync(full)) {
    config({ path: full, override: true });
  }
}

/**
 * Connection URLs live in schema.prisma: `url` (pooler) + `directUrl` (port 5432 for Migrate).
 * Do not set `datasource` here — Prisma was still opening :6543 when this duplicated `url` only.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
