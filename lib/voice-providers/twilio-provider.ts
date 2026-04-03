import type {
  VoiceProvider,
  VoiceProviderCreateAgentParams,
  VoiceProviderTriggerCallPayload,
} from "@/lib/voice-providers/types";
import { bolnaVoiceProvider } from "@/lib/voice-providers/bolna-provider";
import { TwilioClient } from "@/lib/twilio-client";

type TwilioDirectProviderConfig = {
  accountSid: string;
  authToken: string;
};

export class TwilioDirectProvider implements VoiceProvider {
  readonly kind = "twilio-direct";

  private readonly client: TwilioClient;

  constructor(
    config: TwilioDirectProviderConfig,
    private readonly fallbackProvider: VoiceProvider = bolnaVoiceProvider
  ) {
    this.client = new TwilioClient(config);
  }

  listVoices() {
    return this.fallbackProvider.listVoices();
  }

  createAgent(params: VoiceProviderCreateAgentParams) {
    return this.fallbackProvider.createAgent(params);
  }

  listAgents() {
    return this.fallbackProvider.listAgents();
  }

  updateAgent(
    agentId: string,
    payload: {
      agent_config?: {
        agent_name?: string;
      };
      agent_prompts?: Record<string, { system_prompt: string }>;
    }
  ) {
    return this.fallbackProvider.updateAgent(agentId, payload);
  }

  deleteAgent(agentId: string) {
    return this.fallbackProvider.deleteAgent(agentId);
  }

  stopAgentCalls(agentId: string) {
    return this.fallbackProvider.stopAgentCalls(agentId);
  }

  triggerCall(payload: VoiceProviderTriggerCallPayload) {
    return this.fallbackProvider.triggerCall(payload);
  }

  makeCall(agentId: string, recipientPhoneNumber: string, fromPhoneNumber?: string) {
    return this.fallbackProvider.makeCall(agentId, recipientPhoneNumber, fromPhoneNumber);
  }

  stopCall(executionId: string) {
    return this.fallbackProvider.stopCall(executionId);
  }

  getCallStatus(callId: string) {
    return this.fallbackProvider.getCallStatus(callId);
  }

  getExecutions(
    agentId?: string,
    batchId?: string,
    dateRange?: { start: string; end: string }
  ) {
    return this.fallbackProvider.getExecutions(agentId, batchId, dateRange);
  }

  async searchPhoneNumbers(payload: { country?: string; pattern?: string }) {
    if (!payload.country) {
      return [];
    }

    const numbers = await this.client.searchAvailableLocalNumbers(payload.country, payload.pattern);
    return numbers.map((number) => ({
      phone_number: number.phone_number,
      locality: number.locality ?? null,
      region: number.region ?? null,
      country: number.country ?? null,
      postal_code: number.postal_code ?? null,
    }));
  }

  async buyPhoneNumber(payload: { phone_number: string; country: string }) {
    const purchasedNumber = await this.client.buyPhoneNumber(payload.phone_number);

    return {
      message: "Phone number purchased successfully from Twilio.",
      status: "success",
      phone_number: purchasedNumber.phone_number,
    };
  }

  async deletePhoneNumber(phoneNumber: string) {
    await this.client.releaseIncomingPhoneNumber(phoneNumber);

    return {
      message: "Phone number released from Twilio successfully.",
      status: "success",
    };
  }

  async importPhoneNumber(provider: string, phoneNumber: string) {
    if (provider.toLowerCase() !== "twilio") {
      return this.fallbackProvider.importPhoneNumber(provider, phoneNumber);
    }

    const existingNumber = await this.client.assertNumberExists(phoneNumber);

    return {
      message: "Twilio number verified and linked successfully.",
      status: "success",
      phone_number: existingNumber.phone_number,
    };
  }

  createBatch(
    agentId: string,
    csvBlob: Blob,
    metadata?: { name?: string; from_number?: string }
  ) {
    return this.fallbackProvider.createBatch(agentId, csvBlob, metadata);
  }

  scheduleBatch(batchId: string, scheduledAt: string) {
    return this.fallbackProvider.scheduleBatch(batchId, scheduledAt);
  }

  stopBatch(batchId: string) {
    return this.fallbackProvider.stopBatch(batchId);
  }

  getBatch(batchId: string) {
    return this.fallbackProvider.getBatch(batchId);
  }

  listBatchesForAgent(agentId: string) {
    return this.fallbackProvider.listBatchesForAgent(agentId);
  }

  deleteBatch(batchId: string) {
    return this.fallbackProvider.deleteBatch(batchId);
  }
}
