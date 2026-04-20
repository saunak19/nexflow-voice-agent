import {
  bolnaClient,
  createBolnaAgent,
} from "@/lib/bolna-client";
import type {
  VoiceProvider,
  VoiceProviderCreateAgentParams,
} from "@/lib/voice-providers/types";

export class BolnaVoiceProvider implements VoiceProvider {
  readonly kind = "bolna";

  listVoices() {
    return bolnaClient.listVoices();
  }

  createAgent(params: VoiceProviderCreateAgentParams) {
    return createBolnaAgent(params);
  }

  listAgents() {
    return bolnaClient.listAgents();
  }

  getAgent(agentId: string) {
    return bolnaClient.getAgent(agentId);
  }

  updateAgent(agentId: string, payload: {
    agent_config?: {
      agent_name?: string;
    };
    agent_prompts?: Record<string, { system_prompt: string }>;
  }) {
    return bolnaClient.updateAgent(agentId, payload);
  }

  deleteAgent(agentId: string) {
    return bolnaClient.deleteAgent(agentId);
  }

  stopAgentCalls(agentId: string) {
    return bolnaClient.stopAgentCalls(agentId);
  }

  triggerCall(payload: Parameters<typeof bolnaClient.triggerCall>[0]) {
    return bolnaClient.triggerCall(payload);
  }

  makeCall(agentId: string, recipientPhoneNumber: string, fromPhoneNumber?: string) {
    return bolnaClient.makeCall(agentId, recipientPhoneNumber, fromPhoneNumber);
  }

  stopCall(executionId: string) {
    return bolnaClient.stopCall(executionId);
  }

  getCallStatus(callId: string) {
    return bolnaClient.getCallStatus(callId);
  }

  getExecutions(
    agentId?: string,
    batchId?: string,
    dateRange?: { start: string; end: string }
  ) {
    return bolnaClient.getExecutions(agentId, batchId, dateRange);
  }

  searchPhoneNumbers(payload: Parameters<typeof bolnaClient.searchPhoneNumbers>[0]) {
    return bolnaClient.searchPhoneNumbers(payload);
  }

  buyPhoneNumber(payload: Parameters<typeof bolnaClient.buyPhoneNumber>[0]) {
    return bolnaClient.buyPhoneNumber(payload);
  }

  deletePhoneNumber(phoneNumber: string) {
    return bolnaClient.deletePhoneNumber(phoneNumber);
  }

  importPhoneNumber(provider: string, phoneNumber: string) {
    return bolnaClient.importPhoneNumber(provider, phoneNumber);
  }

  createBatch(
    agentId: string,
    csvBlob: Blob,
    metadata: { name?: string; from_number?: string } = {}
  ) {
    return bolnaClient.createBatch(agentId, csvBlob, metadata);
  }

  scheduleBatch(batchId: string, scheduledAt: string) {
    return bolnaClient.scheduleBatch(batchId, scheduledAt);
  }

  stopBatch(batchId: string) {
    return bolnaClient.stopBatch(batchId);
  }

  getBatch(batchId: string) {
    return bolnaClient.getBatch(batchId);
  }

  listBatchesForAgent(agentId: string) {
    return bolnaClient.listBatchesForAgent(agentId);
  }

  deleteBatch(batchId: string) {
    return bolnaClient.deleteBatch(batchId);
  }
}

export const bolnaVoiceProvider = new BolnaVoiceProvider();
