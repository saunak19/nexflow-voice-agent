import { bolnaVoiceProvider } from "@/lib/voice-providers/bolna-provider";
import {
  getTenantVoiceProviderRuntime,
  type TenantVoiceProviderRuntime,
} from "@/lib/tenant-provider-runtime";
import {
  getVoiceProviderModeLabel,
  type TenantVoiceProviderMode,
} from "@/lib/voice-provider-mode";

export type {
  VoiceProvider,
  VoiceProviderAgent,
  VoiceProviderBatch,
  VoiceProviderCallStatus,
  VoiceProviderCreateAgentParams,
  VoiceProviderCreateAgentResult,
  VoiceProviderExecution,
  VoiceProviderPhoneNumber,
  VoiceProviderTriggerCallPayload,
  VoiceProviderTriggerCallResult,
  VoiceProviderVoice,
} from "@/lib/voice-providers/types";
export type { TenantVoiceProviderMode, TenantVoiceProviderRuntime };

export async function getTenantVoiceProvider(tenantId?: string | null) {
  const runtime = await getTenantVoiceProviderRuntime(tenantId);
  return runtime.provider ?? bolnaVoiceProvider;
}

export { getTenantVoiceProviderRuntime, getVoiceProviderModeLabel };
