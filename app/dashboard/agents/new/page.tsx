import Link from "next/link";
import { ArrowLeft, Bot, Loader2, Sparkles } from "lucide-react";
import { Suspense } from "react";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAgentAction } from "@/app/dashboard/agents/actions";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant";
import { getTenantVoiceProvider, type VoiceProviderVoice } from "@/lib/voice-providers";

// ─── Submit button  (needs "use client" for useFormStatus) ────────────────────
import { SubmitButton } from "./_submit-button";

// ─── Shared select style ───────────────────────────────────────────────────────


// ─── Page (Server Component — fetches real voices from Bolna) ─────────────────

export default async function NewAgentPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const voiceProvider = await getTenantVoiceProvider(tenantId);
  // Fetch the account's registered voices. Gracefully fall back to empty array
  // so the page still renders if the API is temporarily unavailable.
  let voices: VoiceProviderVoice[] = [];
  try {
    const all = await voiceProvider.listVoices();
    const sarvamVoices = all.filter((v) => v.provider === "sarvam");
    
    // Deduplicate voices by voice_id, since the Bolna API may return multiples
    const seen = new Set<string>();
    voices = sarvamVoices.filter((v) => {
      if (seen.has(v.voice_id)) return false;
      seen.add(v.voice_id);
      return true;
    });
  } catch (err) {
    console.error("[NewAgentPage] Failed to fetch voices:", err);
  }

  const hasVoices = voices.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/agents"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Create New Agent
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Configure your voice agent. NexFlow will provision it with
          the Sarvam speech stack and Azure LLM.
        </p>
      </div>

      {/* No voices warning */}
      {!hasVoices && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <strong>No Sarvam voices found</strong> in your account.{" "}
          <a
            href="https://platform.bolna.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Add voices in the configuration
          </a>{" "}
          before creating an agent.
        </div>
      )}

      {/* Form card */}
      <form
        action={createAgentAction}
        className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        {/* Card header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Agent configuration
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              LLM · STT · TTS · Telephony are pre-configured for Indian markets.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 1. Agent Name */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Agent name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Sales Qualifier"
              required
              minLength={2}
              className="h-11 rounded-xl"
            />
          </div>

          {/* 2. Language */}
          <div className="space-y-2">
            <label
              htmlFor="language"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Language <span className="text-red-500">*</span>
            </label>
            <Select name="language" defaultValue="" required>
              <SelectTrigger className="h-11 rounded-xl w-full">
                <SelectValue placeholder="Select language…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi — हिन्दी</SelectItem>
                <SelectItem value="gu">Gujarati — ગુજરાતી</SelectItem>
                <SelectItem value="mr">Marathi — मराठी</SelectItem>
                <SelectItem value="bn">Bengali — বাংলা</SelectItem>
                <SelectItem value="ta">Tamil — தமிழ்</SelectItem>
                <SelectItem value="te">Telugu — తెలుగు</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Voice — populated from GET /me/voices (Sarvam only) */}
          <div className="space-y-2">
            <label
              htmlFor="voiceId"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Voice <span className="text-red-500">*</span>
            </label>
            <Select name="voiceId" defaultValue="" required disabled={!hasVoices}>
              <SelectTrigger className="h-11 rounded-xl w-full">
                <SelectValue placeholder={hasVoices ? "Select voice…" : "No voices available"} />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.voice_id} value={v.voice_id}>
                    {v.name}
                    {v.accent ? ` — ${v.accent}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasVoices && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {voices.length} Sarvam voice{voices.length !== 1 ? "s" : ""}{" "}
                registered in your account.
              </p>
            )}
          </div>

          {/* 3.1 Welcome Message */}
          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="welcomeMessage"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Welcome message <span className="text-red-500">*</span>
            </label>
            <Input
              id="welcomeMessage"
              name="welcomeMessage"
              placeholder="e.g. Hello, I am calling from..."
              required
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              The first thing the agent says when the call connects.
            </p>
          </div>

          {/* 4. System Prompt — spans full width */}
          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="prompt"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            >
              System prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              id="prompt"
              name="prompt"
              rows={7}
              required
              minLength={10}
              placeholder="You are a helpful sales assistant. Your goal is to qualify leads by asking about their budget, timeline, and pain points. Be friendly and concise."
              className="flex min-h-40 w-full rounded-2xl border border-zinc-200 bg-transparent px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              This becomes the system-level instruction for your LLM. Be
              specific about role, tone, and goals.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Stack:{" "}
            <strong>Azure GPT-4.1 mini</strong> ·{" "}
            <strong>Sarvam saaras:v2.5</strong> (STT) ·{" "}
            <strong>Sarvam bulbul:v2</strong> (TTS) ·{" "}
            <strong>Twilio</strong>
          </p>
          <SubmitButton disabled={!hasVoices} />
        </div>
      </form>
    </div>
  );
}
