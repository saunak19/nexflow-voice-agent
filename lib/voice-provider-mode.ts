export type TenantVoiceProviderMode = "bolna" | "twilio-direct" | "plivo-direct";
export const DIRECT_PROVIDER_MODE_KEY = "NEXFLOW_VOICE_PROVIDER_MODE";

export type TenantVoiceProviderRuntimeView = {
  tenantId: string | null;
  configuredMode: TenantVoiceProviderMode;
  resolvedMode: TenantVoiceProviderMode;
  directProviderRequested: boolean;
  reason: string;
};

export function getVoiceProviderModeLabel(mode: TenantVoiceProviderMode) {
  switch (mode) {
    case "twilio-direct":
      return "Direct Twilio";
    case "plivo-direct":
      return "Direct Plivo";
    default:
      return "NexFlow Managed";
  }
}
