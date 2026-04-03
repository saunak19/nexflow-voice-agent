import { headers } from "next/headers";
import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { requireTenantRole } from "@/lib/authorization";
import { AccessDeniedState } from "@/components/access-denied-state";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { getTenantAdsWebhookConfig } from "@/lib/tenant-ads-webhook-config";
import { listTenantPhoneNumbers } from "@/lib/tenant-phone-numbers";

import { LeadAutomationSettings } from "./_components/lead-automation-settings";

function buildWebhookUrl(host: string | null, protocol: string | null) {
  if (!host) {
    return "/api/webhooks/ads";
  }

  return `${protocol ?? "https"}://${host}/api/webhooks/ads`;
}

export default async function LeadAutomationPage() {
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

    const [config, agents, tenantPhoneNumbers] = await Promise.all([
      getTenantAdsWebhookConfig(tenantId),
      prisma.agent.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
        },
      }),
      listTenantPhoneNumbers(tenantId),
    ]);

    return (
      <LeadAutomationSettings
        webhookUrl={buildWebhookUrl(host, protocol)}
        tenantId={tenantId}
        initialEnabled={config?.enabled ?? false}
        initialAgentId={config?.agent_id ?? null}
        initialFromNumber={config?.from_phone_number ?? null}
        initialWebhookSecret={config?.webhook_secret ?? null}
        agents={agents}
        phoneNumbers={tenantPhoneNumbers.map((phoneNumber) => ({
          phoneNumber: phoneNumber.phone_number,
          label: phoneNumber.friendly_name?.trim()
            ? `${phoneNumber.friendly_name} (${phoneNumber.phone_number})`
            : phoneNumber.phone_number,
        }))}
      />
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return (
        <AccessDeniedState
          title="Lead Automation Restricted"
          description="Only workspace admins and owners can manage webhook secrets, default agents, caller IDs, and lead automation settings."
        />
      );
    }

    throw error;
  }
}
