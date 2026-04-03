import prisma from "@/lib/db";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "@/lib/secret-crypto";

export type TenantProviderConfig = {
  tenant_id: string;
  provider_name: string;
  provider_value: string;
  created_at: Date;
  updated_at: Date;
};

type UpsertTenantProviderConfigInput = {
  tenantId: string;
  providerName: string;
  providerValue: string;
};

let ensureTablePromise: Promise<void> | null = null;

async function ensureTenantProviderConfigsTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS tenant_provider_configs (
          tenant_id TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
          provider_name TEXT NOT NULL,
          provider_value TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (tenant_id, provider_name)
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS tenant_provider_configs_provider_name_idx
        ON tenant_provider_configs (provider_name)
      `);

      const rows = await prisma.$queryRaw<Array<{ tenant_id: string; provider_name: string; provider_value: string }>>`
        SELECT tenant_id, provider_name, provider_value
        FROM tenant_provider_configs
      `;

      for (const row of rows) {
        if (row.provider_value && !isEncryptedSecret(row.provider_value)) {
          await prisma.$executeRaw`
            UPDATE tenant_provider_configs
            SET provider_value = ${encryptSecret(row.provider_value)}, updated_at = NOW()
            WHERE tenant_id = ${row.tenant_id}
              AND provider_name = ${row.provider_name}
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

export async function listTenantProviderConfigs(tenantId: string) {
  await ensureTenantProviderConfigsTable();

  const rows = await prisma.$queryRaw<TenantProviderConfig[]>`
    SELECT
      tenant_id,
      provider_name,
      provider_value,
      created_at,
      updated_at
    FROM tenant_provider_configs
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC, provider_name ASC
  `;

  return rows.map((row) => ({
    ...row,
    provider_value: decryptSecret(row.provider_value) ?? "",
  }));
}

export async function getTenantProviderConfig(tenantId: string, providerName: string) {
  await ensureTenantProviderConfigsTable();

  const rows = await prisma.$queryRaw<TenantProviderConfig[]>`
    SELECT
      tenant_id,
      provider_name,
      provider_value,
      created_at,
      updated_at
    FROM tenant_provider_configs
    WHERE tenant_id = ${tenantId}
      AND provider_name = ${providerName}
    LIMIT 1
  `;

  const row = rows[0] ?? null;
  return row
    ? {
        ...row,
        provider_value: decryptSecret(row.provider_value) ?? "",
      }
    : null;
}

export async function upsertTenantProviderConfig(input: UpsertTenantProviderConfigInput) {
  await ensureTenantProviderConfigsTable();

  await prisma.$executeRaw`
    INSERT INTO tenant_provider_configs (
      tenant_id,
      provider_name,
      provider_value,
      updated_at
    )
    VALUES (
      ${input.tenantId},
      ${input.providerName},
      ${encryptSecret(input.providerValue)},
      NOW()
    )
    ON CONFLICT (tenant_id, provider_name) DO UPDATE
    SET
      provider_value = EXCLUDED.provider_value,
      updated_at = NOW()
  `;

  return getTenantProviderConfig(input.tenantId, input.providerName);
}

export async function deleteTenantProviderConfig(tenantId: string, providerName: string) {
  await ensureTenantProviderConfigsTable();

  return prisma.$executeRaw`
    DELETE FROM tenant_provider_configs
    WHERE tenant_id = ${tenantId}
      AND provider_name = ${providerName}
  `;
}

export async function countOtherTenantsUsingProviderName(tenantId: string, providerName: string) {
  await ensureTenantProviderConfigsTable();

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM tenant_provider_configs
    WHERE provider_name = ${providerName}
      AND tenant_id <> ${tenantId}
  `;

  return Number(rows[0]?.count ?? 0);
}
