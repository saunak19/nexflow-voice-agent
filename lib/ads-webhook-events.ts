import prisma from "@/lib/db";

export type AdsWebhookEvent = {
  tenant_id: string;
  lead_id: string;
  agent_id: string;
  phone_number: string;
  ad_id: string | null;
  provider_call_id: string | null;
  created_at: Date;
};

type RecordAdsWebhookEventInput = {
  tenantId: string;
  leadId: string;
  agentId: string;
  phoneNumber: string;
  adId?: string | null;
  providerCallId?: string | null;
};

let ensureTablePromise: Promise<void> | null = null;

async function ensureAdsWebhookEventsTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ads_webhook_events (
          tenant_id TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
          lead_id TEXT NOT NULL,
          agent_id TEXT NOT NULL REFERENCES "Agent"(id) ON DELETE CASCADE,
          phone_number TEXT NOT NULL,
          ad_id TEXT,
          provider_call_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (tenant_id, lead_id)
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ads_webhook_events_agent_created_at_idx
        ON ads_webhook_events (agent_id, created_at DESC)
      `);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

export async function getAdsWebhookEvent(tenantId: string, leadId: string) {
  await ensureAdsWebhookEventsTable();

  const rows = await prisma.$queryRaw<AdsWebhookEvent[]>`
    SELECT
      tenant_id,
      lead_id,
      agent_id,
      phone_number,
      ad_id,
      provider_call_id,
      created_at
    FROM ads_webhook_events
    WHERE tenant_id = ${tenantId}
      AND lead_id = ${leadId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function recordAdsWebhookEvent(input: RecordAdsWebhookEventInput) {
  await ensureAdsWebhookEventsTable();

  await prisma.$executeRaw`
    INSERT INTO ads_webhook_events (
      tenant_id,
      lead_id,
      agent_id,
      phone_number,
      ad_id,
      provider_call_id
    )
    VALUES (
      ${input.tenantId},
      ${input.leadId},
      ${input.agentId},
      ${input.phoneNumber},
      ${input.adId ?? null},
      ${input.providerCallId ?? null}
    )
    ON CONFLICT (tenant_id, lead_id) DO NOTHING
  `;

  return getAdsWebhookEvent(input.tenantId, input.leadId);
}
