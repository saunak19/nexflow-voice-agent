import type {
  AgentV2Response,
  BatchResponse,
  BolnaExecution,
  BolnaVoice,
  BuyPhoneNumberPayload,
  CallStatusResponse,
  CreateAgentParams,
  CreateAgentResult,
  PhoneNumber,
  PhoneNumberSearchPayload,
  TriggerCallPayload,
  TriggerCallResponse,
} from "@/lib/bolna-client";

export type VoiceProviderPhoneNumber = PhoneNumber;
export type VoiceProviderVoice = BolnaVoice;
export type VoiceProviderAgent = AgentV2Response;
export type VoiceProviderExecution = BolnaExecution;
export type VoiceProviderBatch = BatchResponse;
export type VoiceProviderCallStatus = CallStatusResponse;
export type VoiceProviderTriggerCallPayload = TriggerCallPayload;
export type VoiceProviderTriggerCallResult = TriggerCallResponse;
export type VoiceProviderCreateAgentParams = CreateAgentParams;
export type VoiceProviderCreateAgentResult = CreateAgentResult;

export interface VoiceProvider {
  readonly kind: string;
  listVoices(): Promise<VoiceProviderVoice[]>;
  createAgent(params: VoiceProviderCreateAgentParams): Promise<VoiceProviderCreateAgentResult>;
  listAgents(): Promise<VoiceProviderAgent[]>;
  updateAgent(agentId: string, payload: {
    agent_config?: {
      agent_name?: string;
    };
    agent_prompts?: Record<string, { system_prompt: string }>;
  }): Promise<VoiceProviderAgent>;
  deleteAgent(agentId: string): Promise<{ message?: string }>;
  stopAgentCalls(agentId: string): Promise<{ message?: string }>;
  triggerCall(payload: VoiceProviderTriggerCallPayload): Promise<VoiceProviderTriggerCallResult>;
  makeCall(agentId: string, recipientPhoneNumber: string, fromPhoneNumber?: string): Promise<VoiceProviderTriggerCallResult>;
  stopCall(executionId: string): Promise<{ message?: string }>;
  getCallStatus(callId: string): Promise<VoiceProviderCallStatus>;
  getExecutions(
    agentId?: string,
    batchId?: string,
    dateRange?: { start: string; end: string }
  ): Promise<VoiceProviderExecution[]>;
  searchPhoneNumbers(payload: PhoneNumberSearchPayload): Promise<VoiceProviderPhoneNumber[]>;
  buyPhoneNumber(payload: BuyPhoneNumberPayload): Promise<{ message?: string; status?: string; phone_number?: string }>;
  deletePhoneNumber(phoneNumber: string): Promise<{ message?: string; status?: string }>;
  importPhoneNumber(provider: string, phoneNumber: string): Promise<{ message?: string; status?: string; phone_number?: string }>;
  createBatch(
    agentId: string,
    csvBlob: Blob,
    metadata?: { name?: string; from_number?: string }
  ): Promise<VoiceProviderBatch>;
  scheduleBatch(batchId: string, scheduledAt: string): Promise<{ message?: string }>;
  stopBatch(batchId: string): Promise<{ message?: string }>;
  getBatch(batchId: string): Promise<VoiceProviderBatch>;
  listBatchesForAgent(agentId: string): Promise<VoiceProviderBatch[]>;
  deleteBatch(batchId: string): Promise<{ message?: string }>;
}
