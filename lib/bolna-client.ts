/**
 * NexFlow BolnaClient — Server-side only.
 * Never import this in Client Components.
 *
 * Lazy API key validation: the check runs in `headers` getter,
 * NOT in the constructor, so Next.js build does not crash when
 * BOLNA_API_KEY is absent from the build environment.
 */

// ─── Request / Response interfaces ────────────────────────────────────────────

export interface TriggerCallPayload {
  agent_id: string;
  recipient_phone_number: string;
  from_phone_number?: string;
  user_data?: Record<string, string | number | boolean>;
  scheduled_at?: string; // ISO 8601
}

export interface TriggerCallResponse {
  call_id: string;
  status: string;
}

export interface AgentTask {
  task_type: string;
  task_config: Record<string, unknown>;
}

export interface AgentV2Payload {
  agent_name: string;
  tasks: AgentTask[];
  webhook_url?: string;
}

export interface AgentV2Response {
  agent_id: string;
  agent_name: string;
  created_at?: string;
}

export interface PhoneNumber {
  phone_number: string;
  friendly_name?: string | null;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
  postal_code?: string | null;
  price?: number;
}

export interface BolnaPhoneNumber {
  id?: string;
  phone_number: string;
  agent_id?: string;
  telephony_provider?: string;
}

export interface BuyPhoneNumberPayload {
  phone_number: string;
  country: string;
}

export interface PhoneNumberSearchPayload {
  country: string;
  pattern?: string;
}

export interface BatchResponse {
  batch_id: string;
  status: string;
  agent_id: string;
  total_calls: number;
  completed_calls?: number;
  failed_calls?: number;
  file_name?: string;
  valid_contacts?: number;
  workflow?: string;
  created_at?: string;
  name?: string;
  execution_status?: Record<string, number>;
}

export interface BatchExecutionResponse {
  execution_id: string;
  call_id?: string;
  phone_number: string;
  status: string;
}

export interface KnowledgeBasePayload {
  name: string;
  url?: string;
  file?: File | Blob;
}

export interface KnowledgeBaseResponse {
  kb_id: string;
  name: string;
  status: string;
}

export interface SipTrunkPayload {
  name: string;
  inbound_uri?: string;
  outbound_uri?: string;
}

export interface SipTrunkResponse {
  trunk_id: string;
  name: string;
}

export interface CallStatusResponse {
  call_id: string;
  status: string;
  transcript?: string;
  recording_url?: string;
  duration?: number;
  cost?: number;
  agent_id?: string;
  recipient_phone_number?: string;
}

export interface BolnaExecution {
  id: string;
  agent_id: string;
  batch_id?: string;
  conversation_time?: number;
  total_cost?: number;
  cost?: number;
  status: string;
  error_message?: string;
  answered_by_voice_mail?: boolean;
  transcript?: string;
  created_at: string;
  updated_at?: string;
  telephony_data?: {
    duration?: number;
    to_number?: string;
    from_number?: string;
    recording_url?: string;
    call_type?: string;
    provider?: string;
    cost?: number;
  };
  metrics?: {
    cost?: number;
  };
  cost_breakdown?: {
    platform?: number;
    llm?: number;
    network?: number;
    synthesizer?: number;
    transcriber?: number;
  };
  recording_url?: string;
}

export interface BolnaExecutionsResponse {
  page_number?: number;
  page_size?: number;
  total?: number;
  has_more?: boolean;
  data: BolnaExecution[];
}

export interface ListExecutionsQuery {
  agent_id?: string;
  page?: number;
  page_size?: number;
}

export interface BolnaProvider {
  provider_id?: string;
  provider_name: string;
  provider_value: string;
  created_at?: string;
}

// Voices registered on the Bolna account (GET /me/voices)
export interface BolnaVoice {
  id: string;        // Bolna internal UUID (not used in agent creation)
  voice_id: string;  // Provider-specific ID — this is what goes in provider_config
  provider: string;  // "sarvam", "elevenlabs", etc.
  name: string;      // Human-friendly name for display
  model: string;     // e.g. "bulbul:v2"
  accent?: string;   // e.g. "Hindi female"
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class BolnaClient {
  private readonly baseUrl = "https://api.bolna.ai";

  /** Lazy validation — no throw at module-load / build time */
  private get apiKey(): string {
    const key = process.env.BOLNA_API_KEY;
    if (!key) throw new Error("Missing BOLNA_API_KEY environment variable");
    return key;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  // ─── Agents (v2) ──────────────────────────────────────────────────────────

  async createAgent(payload: AgentV2Payload): Promise<AgentV2Response> {
    return this.fetchApi<AgentV2Response>("/v2/agent", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getAgent(agentId: string): Promise<AgentV2Response> {
    return this.fetchApi<AgentV2Response>(`/v2/agent/${agentId}`, {
      method: "GET",
    });
  }

  async listAgents(): Promise<AgentV2Response[]> {
    return this.fetchApi<AgentV2Response[]>("/v2/agent", { method: "GET" });
  }

  async updateAgent(
    agentId: string,
    payload: Partial<AgentV2Payload>
  ): Promise<AgentV2Response> {
    return this.fetchApi<AgentV2Response>(`/v2/agent/${agentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteAgent(agentId: string): Promise<{ message?: string }> {
    return this.fetchApi<{ message?: string }>(`/v2/agent/${agentId}`, {
      method: "DELETE",
    });
  }

  /** Stop all queued calls for an agent (POST /v2/agent/{id}/stop) */
  async stopAgentCalls(agentId: string): Promise<{ message?: string }> {
    return this.fetchApi<{ message?: string }>(`/v2/agent/${agentId}/stop`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  /** List all executions/calls for a specific agent */
  async listAgentExecutions(agentId: string): Promise<CallStatusResponse[]> {
    const raw = await this.fetchApi<unknown>(
      `/v2/agent/${agentId}/executions`,
      { method: "GET" }
    );
    if (Array.isArray(raw)) return raw as CallStatusResponse[];
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      for (const key of ["executions", "data", "items", "results"]) {
        if (Array.isArray(obj[key])) return obj[key] as CallStatusResponse[];
      }
    }
    return [];
  }

  // ─── Voices ───────────────────────────────────────────────────────────────

  /**
   * Lists all voices registered on the Bolna account.
   * These are the only valid voice_ids for agent creation.
   * Use the `voice_id` field (not `id`) in provider_config.
   */
  async listVoices(): Promise<BolnaVoice[]> {
    // The API may return a bare array OR an object like { voices:[...] } / { data:[...] }
    const raw = await this.fetchApi<unknown>("/me/voices", { method: "GET" });

    if (process.env.NODE_ENV === "development") {
      console.log("[BolnaClient] listVoices raw response:", JSON.stringify(raw).slice(0, 2000));
    }

    if (Array.isArray(raw)) return raw as BolnaVoice[];

    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      // Try common envelope keys in order of likelihood
      for (const key of ["voices", "data", "items", "results"]) {
        if (Array.isArray(obj[key])) return obj[key] as BolnaVoice[];
      }
      // If it's a single voice object, wrap it
      if ("voice_id" in obj) return [obj as unknown as BolnaVoice];
    }

    console.warn("[BolnaClient] listVoices: unexpected response shape, returning []");
    return [];
  }

  // ─── Calls ────────────────────────────────────────────────────────────────

  async triggerCall(payload: TriggerCallPayload): Promise<TriggerCallResponse> {
    return this.fetchApi<TriggerCallResponse>("/call", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async makeCall(agentId: string, recipientPhoneNumber: string, fromPhoneNumber?: string): Promise<TriggerCallResponse> {
    const payload: any = {
      agent_id: agentId,
      recipient_phone_number: recipientPhoneNumber,
    };
    if (fromPhoneNumber) {
      payload.from_phone_number = fromPhoneNumber;
    }

    return this.fetchApi<TriggerCallResponse>("/call", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async stopCall(executionId: string): Promise<{ message?: string }> {
    return this.fetchApi<{ message?: string }>(`/call/${executionId}/stop`, {
      method: "POST",
    });
  }

  async getCallStatus(callId: string): Promise<CallStatusResponse> {
    return this.fetchApi<CallStatusResponse>(`/executions/${callId}`, {
      method: "GET",
    });
  }

  async listExecutions(query?: ListExecutionsQuery): Promise<CallStatusResponse[]> {
    const params = new URLSearchParams();
    if (query?.agent_id) params.set("agent_id", query.agent_id);
    if (query?.page !== undefined) params.set("page", String(query.page));
    if (query?.page_size !== undefined) params.set("page_size", String(query.page_size));
    const qs = params.toString();
    return this.fetchApi<CallStatusResponse[]>(`/executions${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  }

  async getExecutions(
    agentId?: string,
    batchId?: string,
    dateRange?: { start: string; end: string }
  ): Promise<BolnaExecution[]> {
    const params = new URLSearchParams();
    if (dateRange?.start) params.set("from", dateRange.start);
    if (dateRange?.end) params.set("to", dateRange.end);
    if (agentId) params.set("agent_id", agentId);
    
    // We only need raw data, let's grab the first page with a high limit
    params.set("page_size", "100");
    const qs = params.toString() ? `?${params.toString()}` : "";

    try {
      let raw: unknown;
      
      if (batchId) {
        raw = await this.fetchApi<unknown>(`/batch/${batchId}/executions${qs}`, { method: "GET" });
      } else if (agentId) {
        raw = await this.fetchApi<unknown>(`/v2/agent/${agentId}/executions${qs}`, { method: "GET" });
      } else {
        throw new Error("getExecutions requires either agentId or batchId");
      }

      let mapped: any[] = [];
      // Handle standard paginated wrapper
      if (typeof raw === "object" && raw !== null && "data" in raw) {
        mapped = (raw as BolnaExecutionsResponse).data || [];
      } else if (Array.isArray(raw)) {
        mapped = raw as BolnaExecution[];
      }
      
      if (mapped.length > 0) {
        // 1. Log and Inspect the Raw Payload as instructed
        console.log("[Raw Bolna Execution Payload]:", JSON.stringify(mapped[0], null, 2));
      }

      // 2. Map exact cost without ANY math manipulations
      return mapped.map((rawExecution: any) => ({
        ...rawExecution,
        // The exact field Bolna provides their true cost in. If total_cost is returning 2.040, 
        // they might be sending nested telephony_data.cost or just cost. 
        // We capture them purely without a single math operation.
        cost: rawExecution.cost || rawExecution.metrics?.cost || rawExecution.telephony_data?.cost || rawExecution.total_cost || 0
      })) as BolnaExecution[];
    } catch (err) {
      console.error("[BolnaClient] getExecutions failed:", err);
      return [];
    }
  }

  // ─── Phone Numbers ────────────────────────────────────────────────────────

  async getPhoneNumbers(): Promise<BolnaPhoneNumber[]> {
    try {
      const raw = await this.fetchApi<unknown>("/phone-numbers/all", { method: "GET" });
      if (Array.isArray(raw)) return raw as BolnaPhoneNumber[];
      if (raw && typeof raw === "object" && "data" in raw) {
        return (raw as any).data as BolnaPhoneNumber[];
      }
      return [];
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      return [];
    }
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    return this.fetchApi<PhoneNumber[]>("/phone-numbers/all", { method: "GET" });
  }

  async searchPhoneNumbers(payload: PhoneNumberSearchPayload): Promise<PhoneNumber[]> {
    const params = new URLSearchParams({ country: payload.country });
    if (payload.pattern) params.set("pattern", payload.pattern);
    return this.fetchApi<PhoneNumber[]>(
      `/phone-numbers/search?${params.toString()}`,
      { method: "GET" }
    );
  }

  async buyPhoneNumber(
    payload: BuyPhoneNumberPayload
  ): Promise<{ message?: string; status?: string; phone_number?: string }> {
    return this.fetchApi<{ message?: string; status?: string; phone_number?: string }>(
      "/phone-numbers/buy",
      { method: "POST", body: JSON.stringify(payload) }
    );
  }

  async deletePhoneNumber(
    phoneNumber: string
  ): Promise<{ message?: string; status?: string }> {
    const encoded = encodeURIComponent(phoneNumber);
    return this.fetchApi<{ message?: string; status?: string }>(
      `/phone-numbers/${encoded}`,
      { method: "DELETE" }
    );
  }

  async importPhoneNumber(
    provider: string,
    phoneNumber: string
  ): Promise<{ message?: string; status?: string; phone_number?: string }> {
    return this.fetchApi<{ message?: string; status?: string; phone_number?: string }>(
      "/phone-numbers",
      {
        method: "POST",
        body: JSON.stringify({
          phone_number: phoneNumber,
          telephony_provider: provider,
        }),
      }
    );
  }

  // ─── Batches ──────────────────────────────────────────────────────────────

  /**
   * Creates a batch using multipart/form-data.
   * csvBlob — a Blob/File of the CSV; metadata — extra fields.
   */
  async createBatch(
    agentId: string,
    csvBlob: Blob,
    metadata: { name?: string; from_number?: string } = {}
  ): Promise<BatchResponse> {
    const apiKey = this.apiKey; // validate early
    const form = new FormData();
    form.append("agent_id", agentId);
    form.append("file", csvBlob, metadata.name ? `${metadata.name}.csv` : "contacts.csv");

    if (metadata.from_number) {
      form.append("from_number", metadata.from_number);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${this.baseUrl}/batches`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` }, // NO Content-Type — let fetch set multipart boundary
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return this.handleResponse<BatchResponse>(res, "POST /batches");
    } finally {
      clearTimeout(timeout);
    }
  }

  async scheduleBatch(
    batchId: string,
    scheduledAt: string // ISO 8601
  ): Promise<{ message?: string }> {
    const apiKey = this.apiKey;
    const form = new FormData();
    // Python's datetime.fromisoformat() fails with "Z" and milliseconds.
    // Clean it to format: YYYY-MM-DDTHH:mm:ss+00:00
    const safeIsoDate = new Date(scheduledAt).toISOString().split('.')[0] + '+00:00';
    
    form.append("scheduled_at", safeIsoDate);
    
    const res = await fetch(`${this.baseUrl}/batches/${batchId}/schedule`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    return this.handleResponse<{ message?: string }>(res, `POST /batches/${batchId}/schedule`);
  }

  async stopBatch(batchId: string): Promise<{ message?: string }> {
    return this.fetchApi<{ message?: string }>(`/batches/${batchId}/stop`, {
      method: "POST",
    });
  }

  async getBatch(batchId: string): Promise<BatchResponse> {
    return this.fetchApi<BatchResponse>(`/batches/${batchId}`, {
      method: "GET",
    });
  }

  async getBatchExecutions(batchId: string): Promise<BatchExecutionResponse[]> {
    return this.fetchApi<BatchExecutionResponse[]>(
      `/batches/${batchId}/executions`,
      { method: "GET" }
    );
  }

  // List all batches for a specific agent
  async listBatchesForAgent(agentId: string): Promise<BatchResponse[]> {
    try {
      const raw = await this.fetchApi<any[]>(`/batches/${agentId}/all`, { method: "GET" });
      if (Array.isArray(raw)) {
        return raw.map((r: any) => ({
          batch_id: r.batch_id,
          status: r.status,
          agent_id: agentId,
          total_calls: r.total_contacts || r.total_calls || 0,
          completed_calls: r.execution_status?.completed || 0,
          failed_calls: (r.execution_status?.failed || 0) + (r.execution_status?.['no-answer'] || 0),
          file_name: r.file_name,
          valid_contacts: r.valid_contacts,
          workflow: "calls-only",
          created_at: r.created_at,
          name: r.file_name,
          execution_status: r.execution_status
        }));
      }
      return [];
    } catch { return []; }
  }

  // Delete a batch
  async deleteBatch(batchId: string): Promise<{ message?: string }> {
    return this.fetchApi<{ message?: string }>(`/batches/${batchId}`, { method: "DELETE" });
  }

  // Run a stopped batch now (re-schedule immediately)
  async runBatchNow(batchId: string): Promise<{ message?: string }> {
    return this.fetchApi<{ message?: string }>(`/batches/${batchId}/run`, { method: "POST" });
  }

  // ─── Knowledge Base ───────────────────────────────────────────────────────

  async createKnowledgeBase(
    payload: KnowledgeBasePayload
  ): Promise<KnowledgeBaseResponse> {
    const apiKey = this.apiKey;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      let res: Response;
      
      if (payload.file) {
        const form = new FormData();
        form.append("name", payload.name);
        form.append("file", payload.file);

        res = await fetch(`${this.baseUrl}/knowledgebase`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` }, // NO Content-Type
          body: form,
          signal: controller.signal,
        });
      } else {
        res = await fetch(`${this.baseUrl}/knowledgebase`, {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({ name: payload.name, url: payload.url }),
          signal: controller.signal,
        });
      }
      
      return this.handleResponse<KnowledgeBaseResponse>(res, "POST /knowledgebase");
    } finally {
      clearTimeout(timeout);
    }
  }

  async listKnowledgeBases(): Promise<KnowledgeBaseResponse[]> {
    return this.fetchApi<KnowledgeBaseResponse[]>("/knowledgebase", {
      method: "GET",
    });
  }

  async getKnowledgeBase(kbId: string): Promise<KnowledgeBaseResponse> {
    return this.fetchApi<KnowledgeBaseResponse>(`/knowledgebase/${kbId}`, {
      method: "GET",
    });
  }

  async deleteKnowledgeBase(kbId: string): Promise<{ message?: string }> {
    return this.fetchApi<{ message?: string }>(`/knowledgebase/${kbId}`, {
      method: "DELETE",
    });
  }

  // ─── SIP Trunks ───────────────────────────────────────────────────────────

  async createSipTrunk(payload: SipTrunkPayload): Promise<SipTrunkResponse> {
    return this.fetchApi<SipTrunkResponse>("/sip", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listSipTrunks(): Promise<SipTrunkResponse[]> {
    return this.fetchApi<SipTrunkResponse[]>("/sip", { method: "GET" });
  }

  async deleteSipTrunk(trunkId: string): Promise<{ message?: string }> {
    return this.fetchApi<{ message?: string }>(`/sip/${trunkId}`, {
      method: "DELETE",
    });
  }

  // ─── Providers ────────────────────────────────────────────────────────────

  async listProviders(): Promise<BolnaProvider[]> {
    const raw = await this.fetchApi<unknown>("/providers", { method: "GET" });
    if (Array.isArray(raw)) return raw as BolnaProvider[];
    if (raw && typeof raw === "object" && "providers" in raw) {
      return (raw as any).providers as BolnaProvider[];
    }
    return [];
  }

  async addProvider(provider_name: string, provider_value: string): Promise<BolnaProvider> {
    return this.fetchApi<BolnaProvider>("/providers", {
      method: "POST",
      body: JSON.stringify({ provider_name, provider_value }),
    });
  }

  async deleteProvider(provider_name: string): Promise<{ message?: string }> {
    // Bolna uses the provider_name for deletion in its endpoint paths
    return this.fetchApi<{ message?: string }>(`/providers/${provider_name}`, {
      method: "DELETE",
    });
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private async handleResponse<T>(
    response: Response,
    context: string,
    options?: { suppressLog?: boolean }
  ): Promise<T> {
    if (!response.ok) {
      let detail = "";
      try {
        const err = await response.json();
        detail = JSON.stringify(err);
      } catch {
        detail = await response.text().catch(() => "");
      }
      
      if (!options?.suppressLog) {
        console.error(`[BolnaClient] ${context} → ${response.status}: ${detail}`);
      }
      
      throw new Error(
        `Bolna API error ${response.status} on ${context}: ${detail || response.statusText}`
      );
    }
    // 204 No Content
    if (response.status === 204) return {} as T;
    return response.json() as Promise<T>;
  }

  private async fetchApi<T>(
    endpoint: string,
    options: RequestInit & { signal?: AbortSignal; suppressLog?: boolean } = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...(options.headers as Record<string, string> | undefined),
        },
        signal: options.signal ?? controller.signal,
      });
      return this.handleResponse<T>(res, `${options.method ?? "GET"} ${endpoint}`, { suppressLog: options.suppressLog });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const bolnaClient = new BolnaClient();

// ─── High-level helper: Create a fully-configured Bolna v2 agent ──────────────

export interface CreateAgentParams {
  name: string;
  welcomeMessage: string;
  prompt: string;
  language: string; // e.g. "hi", "en", "gu"
  voiceId: string;  // The `voice_id` string from GET /me/voices — NOT a display name
  voiceName: string;
}

export interface CreateAgentResult {
  agent_id: string;
}

/**
 * POSTs a fully-structured Bolna v2 agent payload and returns the agent_id.
 * Separates agent_config (infrastructure) from agent_prompts (LLM instructions)
 * exactly as required by the Bolna v2 API spec.
 */
// export async function createBolnaAgent(
//   params: CreateAgentParams
// ): Promise<CreateAgentResult> {
//   const apiKey = process.env.BOLNA_API_KEY;
//   if (!apiKey) throw new Error("Missing BOLNA_API_KEY environment variable");

//   // params.voiceId must be the `voice_id` string returned by GET /me/voices
//   // (e.g. "anushka" or a UUID depending on the provider's registration in Bolna)
//   const payload = {
//     agent_config: {
//       agent_name: params.name,
//       agent_welcome_message: params.welcomeMessage,
//       agent_type: "other",
//       tasks: [
//         {
//           task_type: "conversation",
//           task_config: { incremental_delay: 200 },
//           toolchain: {
//             execution: "parallel",
//             pipelines: [["transcriber", "llm", "synthesizer"]],
//           },
//           tools_config: {
//             llm_agent: {
//               agent_type: "simple_llm_agent",
//               agent_flow_type: "streaming",
//               llm_config: {
//                 provider: "openai",
//                 model: "gpt-4.1-mini",
//                 max_tokens: 150,
//                 temperature: 0.2,
//               },
//             },
//             synthesizer: {
//               provider: "sarvam",
//               provider_config: {
//                 voice_id: params.voiceId,  // Must be the voice_id from GET /me/voices
//                 // voice: params.voiceId,     // Bolna platform validator requires this field too
//                 voice: params.voiceName,
//                 model: "bulbul:v2",
//                 language: params.language,
//               },
//               stream: true,
//               buffer_size: 250,            // Sarvam recommended default from source code
//               audio_format: "wav",
//             },
//             transcriber: {
//               provider: "sarvam",
//               model: "saaras:v2.5",
//               language: params.language,
//               stream: true,
//               endpointing: 200,
//             },
//             input: {
//               provider: "twilio",
//               format: "wav",
//             },
//             output: {
//               provider: "twilio",
//               format: "wav",
//             },
//           },
//         },
//       ],
//     },
//     agent_prompts: {
//       task_1: {
//         system_prompt: params.prompt,
//       },
//     },
//   };

//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), 20_000);

//   try {
//     const res = await fetch("https://api.bolna.ai/v2/agent", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//       signal: controller.signal,
//     });

//     if (!res.ok) {
//       let detail = "";
//       try {
//         const err = await res.json();
//         detail = JSON.stringify(err);
//       } catch {
//         detail = await res.text().catch(() => "");
//       }
//       console.error(`[createBolnaAgent] ${res.status}: ${detail}`);
//       throw new Error(
//         `Bolna API error ${res.status} on POST /v2/agent: ${detail || res.statusText}`
//       );
//     }

//     const data = (await res.json()) as { agent_id: string };
//     if (!data.agent_id) {
//       throw new Error("Bolna did not return an agent_id in the response");
//     }
//     return { agent_id: data.agent_id };
//   } finally {
//     clearTimeout(timeout);
//   }
// }

export async function createBolnaAgent(
  params: CreateAgentParams
): Promise<CreateAgentResult> {
  const apiKey = process.env.BOLNA_API_KEY;
  if (!apiKey) throw new Error("Missing BOLNA_API_KEY environment variable");

  const payload = {
    agent_config: {
      agent_name: params.name,
      agent_welcome_message: params.welcomeMessage,
      agent_type: "other",
      tasks: [
        {
          task_type: "conversation",
          // Reduced artificial delay to 100 or 0 (100 is safer for stability)
          task_config: { incremental_delay: 100,voicemail: true,noise_cancellation: true }, 
          toolchain: {
            execution: "parallel",
            pipelines: [["transcriber", "llm", "synthesizer"]],
          },
          tools_config: {
            llm_agent: {
              agent_type: "simple_llm_agent",
              agent_flow_type: "streaming", // Ensures text streams immediately
              llm_config: {
                provider: "openai",
                model: "gpt-4o-mini", // CHANGED: Fastest OpenAI model for voice
                max_tokens: 150,
                temperature: 0.2, // CHANGED: Slightly higher for more natural, less robotic text
              },
            },
            synthesizer: {
              provider: "sarvam",
              provider_config: {
                voice_id: params.voiceId,
                voice: params.voiceName,
                model: "bulbul:v2",
                language: params.language,
              },
              stream: true,
              // CHANGED: Drastically reduced buffer. 
              // Now it will speak almost immediately when the LLM generates a few words.
              buffer_size: 80, 
              audio_format: "wav",
            },
            transcriber: {
              provider: "sarvam",
              model: "saaras:v2.5",
              language: params.language,
              stream: true,
              // CHANGED: Increased to 300ms so it doesn't interrupt you unnaturally
              endpointing: 300, 
            },
            input: {
              provider: "twilio",
              format: "wav",
            },
            output: {
              provider: "twilio",
              format: "wav",
            },
          },
        },
      ],
    },
    agent_prompts: {
      task_1: {
        system_prompt: params.prompt,
      },
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch("https://api.bolna.ai/v2/agent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const err = await res.json();
        detail = JSON.stringify(err);
      } catch {
        detail = await res.text().catch(() => "");
      }
      console.error(`[createBolnaAgent] ${res.status}: ${detail}`);
      throw new Error(
        `Bolna API error ${res.status} on POST /v2/agent: ${detail || res.statusText}`
      );
    }

    const data = (await res.json()) as { agent_id: string };
    if (!data.agent_id) {
      throw new Error("Bolna did not return an agent_id in the response");
    }
    return { agent_id: data.agent_id };
  } finally {
    clearTimeout(timeout);
  }
}