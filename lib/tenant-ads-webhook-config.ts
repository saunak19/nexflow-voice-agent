import { randomBytes } from "crypto";

import prisma from "@/lib/db";
import { decryptSecret, encryptSecret, hashSecret, isEncryptedSecret } from "@/lib/secret-crypto";

export type TenantAdsWebhookConfig = {
  tenant_id: string;
  agent_id: string | null;
  from_phone_number: string | null;
  webhook_secret: string | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
};

type UpsertTenantAdsWebhookConfigInput = {
  tenantId: string;
  agentId?: string | null;
  fromPhoneNumber?: string | null;
  webhookSecret?: string | null;
  enabled?: boolean;
};

let ensureTablePromise: Promise<void> | null = null;

async function ensureTenantAdsWebhookConfigsTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS tenant_ads_webhook_configs (
          tenant_id TEXT PRIMARY KEY REFERENCES "Tenant"(id) ON DELETE CASCADE,
          agent_id TEXT REFERENCES "Agent"(id) ON DELETE SET NULL,
          from_phone_number TEXT,
          webhook_secret TEXT UNIQUE,
          webhook_secret_hash TEXT UNIQUE,
          enabled BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS tenant_ads_webhook_configs_agent_idx
        ON tenant_ads_webhook_configs (agent_id)
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE tenant_ads_webhook_configs
        ADD COLUMN IF NOT EXISTS webhook_secret_hash TEXT
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS tenant_ads_webhook_configs_secret_hash_idx
        ON tenant_ads_webhook_configs (webhook_secret_hash)
      `);

      const rows = await prisma.$queryRaw<Array<{ tenant_id: string; webhook_secret: string | null; webhook_secret_hash: string | null }>>`
        SELECT tenant_id, webhook_secret, webhook_secret_hash
        FROM tenant_ads_webhook_configs
      `;

      for (const row of rows) {
        if (!row.webhook_secret) {
          continue;
        }

        const plaintextSecret = decryptSecret(row.webhook_secret);
        if (!plaintextSecret) {
          continue;
        }
        const needsEncryption = !isEncryptedSecret(row.webhook_secret);
        const nextHash = row.webhook_secret_hash ?? hashSecret(plaintextSecret);

        if (needsEncryption || row.webhook_secret_hash !== nextHash) {
          await prisma.$executeRaw`
            UPDATE tenant_ads_webhook_configs
            SET
              webhook_secret = ${encryptSecret(plaintextSecret)},
              webhook_secret_hash = ${nextHash},
              updated_at = NOW()
            WHERE tenant_id = ${row.tenant_id}
          `;
        }
      }
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

export async function getTenantAdsWebhookConfig(tenantId: string) {
  await ensureTenantAdsWebhookConfigsTable();

  const rows = await prisma.$queryRaw<TenantAdsWebhookConfig[]>`
    SELECT
      tenant_id,
      agent_id,
      from_phone_number,
      webhook_secret,
      enabled,
      created_at,
      updated_at
    FROM tenant_ads_webhook_configs
    WHERE tenant_id = ${tenantId}
    LIMIT 1
  `;

  const row = rows[0] ?? null;
  return row
    ? {
        ...row,
        webhook_secret: decryptSecret(row.webhook_secret),
      }
    : null;
}

export async function getTenantAdsWebhookConfigBySecret(secret: string) {
  await ensureTenantAdsWebhookConfigsTable();

  const rows = await prisma.$queryRaw<TenantAdsWebhookConfig[]>`
    SELECT
      tenant_id,
      agent_id,
      from_phone_number,
      webhook_secret,
      enabled,
      created_at,
      updated_at
    FROM tenant_ads_webhook_configs
    WHERE webhook_secret_hash = ${hashSecret(secret)}
    LIMIT 1
  `;

  const row = rows[0] ?? null;
  return row
    ? {
        ...row,
        webhook_secret: decryptSecret(row.webhook_secret),
      }
    : null;
}

export async function upsertTenantAdsWebhookConfig(input: UpsertTenantAdsWebhookConfigInput) {
  await ensureTenantAdsWebhookConfigsTable();

  await prisma.$executeRaw`
    INSERT INTO tenant_ads_webhook_configs (
      tenant_id,
      agent_id,
      from_phone_number,
      webhook_secret,
      webhook_secret_hash,
      enabled,
      updated_at
    )
    VALUES (
      ${input.tenantId},
      ${input.agentId ?? null},
      ${input.fromPhoneNumber ?? null},
      ${input.webhookSecret ? encryptSecret(input.webhookSecret) : null},
      ${input.webhookSecret ? hashSecret(input.webhookSecret) : null},
      ${input.enabled ?? false},
      NOW()
    )
    ON CONFLICT (tenant_id) DO UPDATE
    SET
      agent_id = EXCLUDED.agent_id,
      from_phone_number = EXCLUDED.from_phone_number,
      webhook_secret = COALESCE(EXCLUDED.webhook_secret, tenant_ads_webhook_configs.webhook_secret),
      webhook_secret_hash = COALESCE(EXCLUDED.webhook_secret_hash, tenant_ads_webhook_configs.webhook_secret_hash),
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
  `;

  return getTenantAdsWebhookConfig(input.tenantId);
}

export async function generateTenantAdsWebhookSecret() {
  await ensureTenantAdsWebhookConfigsTable();

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomBytes(24).toString("hex");
    const existing = await getTenantAdsWebhookConfigBySecret(candidate);
    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique webhook secret.");
}
