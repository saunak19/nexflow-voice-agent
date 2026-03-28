/**
 * NexFlow BolnaClient - Server-side utility wrapper for Bolna AI.
 * strictly ensures API Key security by executing only on the server.
 */

interface BolnaAgentPayload {
  name: string;
  prompt: string;
  voice: string;
  // Extensible configs...
}

interface BolnaCallPayload {
  agent_id: string;
  phone_number: string;
}

interface PhoneNumberSearchPayload {
  country: string;
  pattern?: string;
}

interface BuyPhoneNumberPayload {
  phone_number: string;
  country: string;
}

export class BolnaClient {
  private readonly baseUrl = "https://api.bolna.ai";
  private readonly apiKey: string;

  constructor() {
    if (!process.env.BOLNA_API_KEY) {
      throw new Error("Missing BOLNA_API_KEY environment variable");
    }
    this.apiKey = process.env.BOLNA_API_KEY;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Creates an AI agent on the Bolna platform.
   */
  async createAgent(payload: BolnaAgentPayload): Promise<{ agent_id: string }> {
    const res = await this.fetchApi("/agents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res as { agent_id: string };
  }

  /**
   * Triggers an outbound call using an existing agent.
   */
  async triggerCall(payload: BolnaCallPayload): Promise<{ execution_id: string }> {
    const res = await this.fetchApi("/call", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res as { execution_id: string };
  }

  async listPhoneNumbers(): Promise<
    Array<{
      phone_number: string;
      friendly_name?: string | null;
      locality?: string | null;
      region?: string | null;
      postal_code?: string | null;
    }>
  > {
    const res = await this.fetchApi("/phone-numbers/all", {
      method: "GET",
    });
    return res as Array<{
      phone_number: string;
      friendly_name?: string | null;
      locality?: string | null;
      region?: string | null;
      postal_code?: string | null;
    }>;
  }

  async searchPhoneNumbers(payload: PhoneNumberSearchPayload): Promise<
    Array<{
      phone_number: string;
      price?: number;
      locality?: string | null;
      region?: string | null;
      friendly_name?: string | null;
      postal_code?: string | null;
    }>
  > {
    const params = new URLSearchParams({
      country: payload.country,
    });

    if (payload.pattern) {
      params.set("pattern", payload.pattern);
    }

    const res = await this.fetchApi(`/phone-numbers/search?${params.toString()}`, {
      method: "GET",
    });

    return res as Array<{
      phone_number: string;
      price?: number;
      locality?: string | null;
      region?: string | null;
      friendly_name?: string | null;
      postal_code?: string | null;
    }>;
  }

  async buyPhoneNumber(payload: BuyPhoneNumberPayload): Promise<{
    message?: string;
    status?: string;
    phone_number?: string;
  }> {
    const res = await this.fetchApi("/phone-numbers/buy", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return res as {
      message?: string;
      status?: string;
      phone_number?: string;
    };
  }

  async deletePhoneNumber(phoneNumber: string): Promise<{ message?: string; status?: string }> {
    const encoded = encodeURIComponent(phoneNumber);
    const res = await this.fetchApi(`/phone-numbers/${encoded}`, {
      method: "DELETE",
    });
    return res as { message?: string; status?: string };
  }

  /**
   * Fetches transcript for a completed call.
   */
  async fetchTranscript(executionId: string): Promise<{ transcript: string }> {
    const res = await this.fetchApi(`/executions/${executionId}/transcript`, {
      method: "GET",
    });
    return res as { transcript: string };
  }

  private async fetchApi(endpoint: string, options: RequestInit) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Bolna API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }
}

export const bolnaClient = new BolnaClient();
