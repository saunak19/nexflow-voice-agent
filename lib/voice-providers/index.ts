import { bolnaVoiceProvider } from "@/lib/voice-providers/bolna-provider";

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

export async function getTenantVoiceProvider(_tenantId?: string) {
  // Today every tenant still uses Bolna underneath.
  // This resolver is the seam where tenant-level provider selection will happen next.
  return bolnaVoiceProvider;
}
