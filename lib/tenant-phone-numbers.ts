import prisma from "@/lib/db";

export type TenantPhoneNumber = {
  tenant_id: string;
  phone_number: string;
  friendly_name: string | null;
  locality: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  telephony_provider: string | null;
  provider_number_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type UpsertTenantPhoneNumberInput = {
  tenantId: string;
  phoneNumber: string;
  friendlyName?: string | null;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
  postalCode?: string | null;
  telephonyProvider?: string | null;
  providerNumberId?: string | null;
};

let ensureTablePromise: Promise<void> | null = null;

async function ensureTenantPhoneNumbersTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS tenant_phone_numbers (
          phone_number TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
          friendly_name TEXT,
          locality TEXT,
          region TEXT,
          country TEXT,
          postal_code TEXT,
          telephony_provider TEXT,
          provider_number_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS tenant_phone_numbers_tenant_created_at_idx
        ON tenant_phone_numbers (tenant_id, created_at DESC)
      `);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

export function normalizePhoneNumber(phoneNumber: string) {
  let normalized = phoneNumber.replace(/[^\d+]/g, "").trim();

  if (!normalized.startsWith("+")) {
    normalized = `+${normalized.replace(/^0+/, "")}`;
  }

  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(normalized)) {
    throw new Error(
      "Invalid phone number format. Must be E.164 starting with + and contain only digits (e.g. +14155552671)."
    );
  }

  return normalized;
}

export async function listTenantPhoneNumbers(tenantId: string) {
  await ensureTenantPhoneNumbersTable();

  return prisma.$queryRaw<TenantPhoneNumber[]>`
    SELECT
      phone_number,
      tenant_id,
      friendly_name,
      locality,
      region,
      country,
      postal_code,
      telephony_provider,
      provider_number_id,
      created_at,
      updated_at
    FROM tenant_phone_numbers
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC, phone_number ASC
  `;
}

export async function getTenantPhoneNumber(tenantId: string, phoneNumber: string) {
  await ensureTenantPhoneNumbersTable();

  const rows = await prisma.$queryRaw<TenantPhoneNumber[]>`
    SELECT
      phone_number,
      tenant_id,
      friendly_name,
      locality,
      region,
      country,
      postal_code,
      telephony_provider,
      provider_number_id,
      created_at,
      updated_at
    FROM tenant_phone_numbers
    WHERE tenant_id = ${tenantId} AND phone_number = ${phoneNumber}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function upsertTenantPhoneNumber(input: UpsertTenantPhoneNumberInput) {
  await ensureTenantPhoneNumbersTable();

  const existingOwner = await prisma.$queryRaw<Array<{ tenant_id: string }>>`
    SELECT tenant_id
    FROM tenant_phone_numbers
    WHERE phone_number = ${input.phoneNumber}
    LIMIT 1
  `;

  if (existingOwner[0] && existingOwner[0].tenant_id !== input.tenantId) {
    throw new Error("This phone number is already linked to another workspace.");
  }

  await prisma.$executeRaw`
    INSERT INTO tenant_phone_numbers (
      phone_number,
      tenant_id,
      friendly_name,
      locality,
      region,
      country,
      postal_code,
      telephony_provider,
      provider_number_id,
      updated_at
    )
    VALUES (
      ${input.phoneNumber},
      ${input.tenantId},
      ${input.friendlyName ?? null},
      ${input.locality ?? null},
      ${input.region ?? null},
      ${input.country ?? null},
      ${input.postalCode ?? null},
      ${input.telephonyProvider ?? null},
      ${input.providerNumberId ?? null},
      NOW()
    )
    ON CONFLICT (phone_number) DO UPDATE
    SET
      tenant_id = EXCLUDED.tenant_id,
      friendly_name = EXCLUDED.friendly_name,
      locality = EXCLUDED.locality,
      region = EXCLUDED.region,
      country = EXCLUDED.country,
      postal_code = EXCLUDED.postal_code,
      telephony_provider = COALESCE(EXCLUDED.telephony_provider, tenant_phone_numbers.telephony_provider),
      provider_number_id = COALESCE(EXCLUDED.provider_number_id, tenant_phone_numbers.provider_number_id),
      updated_at = NOW()
  `;

  return getTenantPhoneNumber(input.tenantId, input.phoneNumber);
}

export async function assertTenantOwnsPhoneNumber(tenantId: string, phoneNumber: string) {
  const number = await getTenantPhoneNumber(tenantId, phoneNumber);

  if (!number) {
    throw new Error("The selected phone number does not belong to this workspace.");
  }

  return number;
}

export async function deleteTenantPhoneNumber(tenantId: string, phoneNumber: string) {
  await ensureTenantPhoneNumbersTable();

  return prisma.$executeRaw`
    DELETE FROM tenant_phone_numbers
    WHERE tenant_id = ${tenantId} AND phone_number = ${phoneNumber}
  `;
}
