/**
 * Sarvam AI (Bulbul/Saaras) specific voice and language configurations.
 */

export const SUPPORTED_AGENT_LANGUAGES = ["en", "hi", "gu", "mr", "bn", "ta", "te"] as const;

export type AgentLanguage = (typeof SUPPORTED_AGENT_LANGUAGES)[number];

/**
 * Maps dashboard language keys to Sarvam API language codes.
 */
export function getSarvamLanguageCode(lang: string): string {
  switch (lang) {
    case "en": return "en-IN";
    case "hi": return "hi-IN";
    case "gu": return "gu-IN";
    case "mr": return "mr-IN";
    case "bn": return "bn-IN";
    case "ta": return "ta-IN";
    case "te": return "te-IN";
    default: return "en-IN";
  }
}

/**
 * Normalizes language codes from Bolna's /me/voices to our dashboard keys.
 */
export function normalizeVoiceLanguageCode(code: string): string {
  const c = code.toLowerCase();
  if (c.startsWith("en")) return "en";
  if (c.startsWith("hi")) return "hi";
  if (c.startsWith("gu")) return "gu";
  if (c.startsWith("mr")) return "mr";
  if (c.startsWith("bn")) return "bn";
  if (c.startsWith("ta")) return "ta";
  if (c.startsWith("te")) return "te";
  return "en";
}

/**
 * Common Sarvam voice model versions.
 */
export const SARVAM_MODELS = {
  TTS: "bulbul:v2",
  STT: "saaras:v2.5",
} as const;
