import {
  DIRECT_PROVIDER_MODE_KEY,
  type TenantVoiceProviderMode,
  type TenantVoiceProviderRuntimeView,
} from "@/lib/voice-provider-mode";
import { getTenantProviderConfig } from "@/lib/tenant-provider-configs";
import { bolnaVoiceProvider } from "@/lib/voice-providers/bolna-provider";
import { PlivoDirectProvider } from "@/lib/voice-providers/plivo-provider";
import { TwilioDirectProvider } from "@/lib/voice-providers/twilio-provider";
import type { VoiceProvider } from "@/lib/voice-providers/types";

export type TenantVoiceProviderRuntime = TenantVoiceProviderRuntimeView & {
  provider: VoiceProvider;
};

function normalizeMode(value?: string | null): TenantVoiceProviderMode {
  switch (value?.trim().toLowerCase()) {
    case "twilio":
    case "twilio-direct":
      return "twilio-direct";
    case "plivo":
    case "plivo-direct":
      return "plivo-direct";
    default:
      return "bolna";
  }
}

async function getConfiguredMode(tenantId?: string | null) {
  if (!tenantId) {
    return "bolna" as const;
  }

  const providerModeConfig = await getTenantProviderConfig(tenantId, DIRECT_PROVIDER_MODE_KEY).catch(
    () => null
  );

  return normalizeMode(providerModeConfig?.provider_value);
}

async function hasProviderKeys(tenantId: string, providerKeys: string[]) {
  const configs = await Promise.all(
    providerKeys.map((providerKey) => getTenantProviderConfig(tenantId, providerKey).catch(() => null))
  );

  return configs.every((config) => Boolean(config?.provider_value?.trim()));
}

export async function getTenantVoiceProviderRuntime(
  tenantId?: string | null
): Promise<TenantVoiceProviderRuntime> {
  const configuredMode = await getConfiguredMode(tenantId);

  if (!tenantId) {
    return {
      tenantId: null,
      configuredMode: "bolna",
      resolvedMode: "bolna",
      provider: bolnaVoiceProvider,
      directProviderRequested: false,
      reason: "No tenant context was provided, so NexFlow is using the default managed voice path.",
    };
  }

  if (configuredMode === "bolna") {
    return {
      tenantId,
      configuredMode,
      resolvedMode: "bolna",
      provider: bolnaVoiceProvider,
      directProviderRequested: false,
      reason: "This workspace is configured to stay on the current NexFlow managed path.",
    };
  }

  const providerKeys =
    configuredMode === "twilio-direct"
      ? ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]
      : ["PLIVO_AUTH_ID", "PLIVO_AUTH_TOKEN", "PLIVO_PHONE_NUMBER"];

  const hasAllProviderKeys = await hasProviderKeys(tenantId, providerKeys);
  if (!hasAllProviderKeys) {
    return {
      tenantId,
      configuredMode,
      resolvedMode: "bolna",
      provider: bolnaVoiceProvider,
      directProviderRequested: true,
      reason: `The workspace requested ${configuredMode}, but the required provider credentials are incomplete. Staying on the NexFlow managed path keeps current flows working.`,
    };
  }

  if (configuredMode === "twilio-direct") {
    const accountSid = (
      await getTenantProviderConfig(tenantId, "TWILIO_ACCOUNT_SID").catch(() => null)
    )?.provider_value;
    const authToken = (
      await getTenantProviderConfig(tenantId, "TWILIO_AUTH_TOKEN").catch(() => null)
    )?.provider_value;

    if (accountSid && authToken) {
      return {
        tenantId,
        configuredMode,
        resolvedMode: "twilio-direct",
        provider: new TwilioDirectProvider({
          accountSid,
          authToken,
        }),
        directProviderRequested: true,
        reason:
          "This workspace now uses direct Twilio for number search, purchase, import, and release. AI calling remains on the NexFlow managed path.",
      };
    }
  }

  if (configuredMode === "plivo-direct") {
    const authId = (await getTenantProviderConfig(tenantId, "PLIVO_AUTH_ID").catch(() => null))
      ?.provider_value;
    const authToken = (
      await getTenantProviderConfig(tenantId, "PLIVO_AUTH_TOKEN").catch(() => null)
    )?.provider_value;

    if (authId && authToken) {
      return {
        tenantId,
        configuredMode,
        resolvedMode: "plivo-direct",
        provider: new PlivoDirectProvider({
          authId,
          authToken,
        }),
        directProviderRequested: true,
        reason:
          "This workspace now uses direct Plivo for number search, purchase, import, and release. AI calling remains on the NexFlow managed path.",
      };
    }
  }

  return {
    tenantId,
    configuredMode,
    resolvedMode: "bolna",
    provider: bolnaVoiceProvider,
    directProviderRequested: true,
    reason: `The ${configuredMode} adapter is not fully ready yet, so this workspace remains on the NexFlow managed path for stability.`,
  };
}

export function getDirectProviderScaffold(mode: Exclude<TenantVoiceProviderMode, "bolna">) {
  throw new Error(
    `${mode} scaffolds now require tenant credentials. Resolve them with getTenantVoiceProviderRuntime instead.`
  );
}
