import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

import prisma from "@/lib/db";

const PASSWORD_PREFIX = "scrypt";

type UserPasswordCredentialRow = {
  user_id: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
};

let ensureTablePromise: Promise<void> | null = null;

async function ensureUserPasswordCredentialsTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS user_password_credentials (
          user_id TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${PASSWORD_PREFIX}:${salt.toString("hex")}:${derived.toString("hex")}`;
}

function verifyPasswordHash(password: string, passwordHash: string) {
  const [algorithm, saltHex, derivedHex] = passwordHash.split(":");
  if (algorithm !== PASSWORD_PREFIX || !saltHex || !derivedHex) {
    return false;
  }

  const expected = Buffer.from(derivedHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export async function getUserPasswordCredential(userId: string) {
  await ensureUserPasswordCredentialsTable();

  const rows = await prisma.$queryRaw<UserPasswordCredentialRow[]>`
    SELECT user_id, password_hash, created_at, updated_at
    FROM user_password_credentials
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function verifyUserPassword(userId: string, password: string) {
  const credential = await getUserPasswordCredential(userId);
  if (!credential) {
    return false;
  }

  return verifyPasswordHash(password, credential.password_hash);
}

export async function upsertUserPassword(userId: string, password: string) {
  await ensureUserPasswordCredentialsTable();

  const passwordHash = hashPassword(password);
  await prisma.$executeRaw`
    INSERT INTO user_password_credentials (
      user_id,
      password_hash,
      updated_at
    )
    VALUES (
      ${userId},
      ${passwordHash},
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      password_hash = EXCLUDED.password_hash,
      updated_at = NOW()
  `;
}
