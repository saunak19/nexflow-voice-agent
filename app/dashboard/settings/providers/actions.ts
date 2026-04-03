"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { requireTenantRole } from "@/lib/authorization";
import { bolnaClient } from "@/lib/bolna-client";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { PlivoClient } from "@/lib/plivo-client";
import { TwilioClient } from "@/lib/twilio-client";
import {
  deleteTenantPhoneNumber,
  normalizePhoneNumber,
  upsertTenantPhoneNumber,
} from "@/lib/tenant-phone-numbers";
import {
  countOtherTenantsUsingProviderName,
  deleteTenantProviderConfig,
  getTenantProviderConfig,
  upsertTenantProviderConfig,
} from "@/lib/tenant-provider-configs";
import {
  getTenantVoiceProviderRuntime,
} from "@/lib/tenant-provider-runtime";
import {
  DIRECT_PROVIDER_MODE_KEY,
  type TenantVoiceProviderMode,
} from "@/lib/voice-provider-mode";

function parseBolnaProviderErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getTelephonyProviderName(providerKey: string) {
  if (!providerKey.endsWith("_PHONE_NUMBER")) {
    return null;
  }

  return providerKey.replace(/_PHONE_NUMBER$/, "").toLowerCase();
}

function isProviderKeyManagedLocally(
  providerMode: TenantVoiceProviderMode,
  providerKey: string
) {
  if (providerMode === "twilio-direct") {
    return providerKey.startsWith("TWILIO_");
  }

  if (providerMode === "plivo-direct") {
    return providerKey.startsWith("PLIVO_");
  }

  return false;
}

async function assertSharedProviderMutationAllowed() {
  if (process.env.ALLOW_SHARED_BOLNA_PROVIDER_MUTATIONS === "true") {
    return;
  }

  const tenantCount = await prisma.tenant.count();
  if (tenantCount > 1) {
    throw new Error(
      "Provider credential changes are disabled in multi-tenant mode until tenant-scoped provider backends are configured. Set ALLOW_SHARED_BOLNA_PROVIDER_MUTATIONS=true only if you intentionally accept shared-provider risk."
    );
  }
}

async function syncTenantPhoneNumberForProviderKey(
  tenantId: string,
  providerKey: string,
  providerValue: string
) {
  const telephonyProvider = getTelephonyProviderName(providerKey);
  if (!telephonyProvider) {
    return;
  }

  const phoneNumber = normalizePhoneNumber(providerValue);
  await upsertTenantPhoneNumber({
    tenantId,
    phoneNumber,
    telephonyProvider,
    friendlyName: `${telephonyProvider} connected number`,
  });
}

function parseTenantVoiceProviderMode(rawValue: FormDataEntryValue | null): TenantVoiceProviderMode {
  const value = String(rawValue || "").trim().toLowerCase();
  switch (value) {
    case "twilio-direct":
      return "twilio-direct";
    case "plivo-direct":
      return "plivo-direct";
    default:
      return "bolna";
  }
}

function getTwilioReadinessErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "Twilio readiness check failed.";
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("invalid username")) {
    return "Twilio sign-in failed. Check that TWILIO_ACCOUNT_SID starts with AC and matches the saved TWILIO_AUTH_TOKEN.";
  }

  if (normalized.includes("authenticate") || normalized.includes("auth token")) {
    return "Twilio authentication failed. Re-save the matching TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for this workspace.";
  }

  if (normalized.includes("not found")) {
    return "Twilio credentials are valid, but the configured TWILIO_PHONE_NUMBER was not found on the connected Twilio account.";
  }

  return `Twilio readiness check failed: ${rawMessage}`;
}

function getPlivoReadinessErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "Plivo readiness check failed.";
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("auth") || normalized.includes("credential")) {
    return "Plivo authentication failed. Re-save the matching PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN for this workspace.";
  }

  if (normalized.includes("not found") || normalized.includes("invalid number")) {
    return "Plivo credentials are valid, but the configured PLIVO_PHONE_NUMBER was not found on the connected Plivo account.";
  }

  return `Plivo readiness check failed: ${rawMessage}`;
}

export async function addProviderAction(formData: FormData) {
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const runtime = await getTenantVoiceProviderRuntime(tenantId);
    const name = formData.get("provider_name") as string;
    const value = formData.get("provider_value") as string;
    if (!name || !value) throw new Error("Name and value are required");

    if (!isProviderKeyManagedLocally(runtime.configuredMode, name)) {
      await assertSharedProviderMutationAllowed();
      await bolnaClient.addProvider(name, value);
    }

    await upsertTenantProviderConfig({
      tenantId,
      providerName: name,
      providerValue: value,
    });
    await syncTenantPhoneNumberForProviderKey(tenantId, name, value);
    revalidatePath("/dashboard/settings/providers");
    revalidatePath("/dashboard/numbers");
    revalidatePath("/dashboard/agents");
    revalidatePath("/dashboard/batches/new");
  } catch (error) {
    console.error("[addProviderAction]:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to add provider.");
  }
}

export async function deleteProviderAction(formData: FormData) {
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const runtime = await getTenantVoiceProviderRuntime(tenantId);
    const name = formData.get("provider_name") as string;
    if (!name) throw new Error("Provider name is required");
    const localProvider = await getTenantProviderConfig(tenantId, name);
    if (!localProvider) {
      throw new Error("Provider config not found for this workspace.");
    }

    if (!isProviderKeyManagedLocally(runtime.configuredMode, name)) {
      await assertSharedProviderMutationAllowed();
      const otherTenantCount = await countOtherTenantsUsingProviderName(tenantId, name);
      if (otherTenantCount === 0) {
        await bolnaClient.deleteProvider(name);
      }
    }

    await deleteTenantProviderConfig(tenantId, name);
    if (localProvider.provider_value && getTelephonyProviderName(name)) {
      await deleteTenantPhoneNumber(tenantId, normalizePhoneNumber(localProvider.provider_value));
    }
    revalidatePath("/dashboard/settings/providers");
    revalidatePath("/dashboard/numbers");
    revalidatePath("/dashboard/agents");
    revalidatePath("/dashboard/batches/new");
  } catch (error) {
    console.error("[deleteProviderAction]:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to delete provider.");
  }
}

export async function connectProviderConfigsAction(formData: FormData) {
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const runtime = await getTenantVoiceProviderRuntime(tenantId);
    const entries = Array.from(formData.entries());
    let changedCount = 0;
    let sharedProviderContextLoaded = false;
    let existingMap = new Map<string, string>();

    const ensureSharedProviderMutationContext = async () => {
      if (sharedProviderContextLoaded) {
        return;
      }

      await assertSharedProviderMutationAllowed();
      const existingProviders = await bolnaClient.listProviders().catch(() => []);
      existingMap = new Map(
        existingProviders.map((provider) => [provider.provider_name, provider.provider_value])
      );
      sharedProviderContextLoaded = true;
    };

    for (const [key, value] of entries) {
      if (key.startsWith("$ACTION_") || !value) continue;
      const valStr = String(value).trim();
      if (!valStr) continue;

       if (isProviderKeyManagedLocally(runtime.configuredMode, key)) {
        await upsertTenantProviderConfig({
          tenantId,
          providerName: key,
          providerValue: valStr,
        });
        await syncTenantPhoneNumberForProviderKey(tenantId, key, valStr);
        changedCount++;
        continue;
      }

      await ensureSharedProviderMutationContext();

      const existingValue = existingMap.get(key);

      if (existingValue === valStr) {
        await upsertTenantProviderConfig({
          tenantId,
          providerName: key,
          providerValue: valStr,
        });
        await syncTenantPhoneNumberForProviderKey(tenantId, key, valStr);
        changedCount++;
        continue;
      }

      if (existingValue) {
        await bolnaClient.deleteProvider(key);
      }

      try {
        await bolnaClient.addProvider(key, valStr);
      } catch (error) {
        const message = parseBolnaProviderErrorMessage(error);

        // If another request already created the same key with the same value,
        // treat it as success to keep the form idempotent.
        if (message.includes("409") && message.includes("already exists")) {
          continue;
        }

        throw error;
      }

      await upsertTenantProviderConfig({
        tenantId,
        providerName: key,
        providerValue: valStr,
      });
      await syncTenantPhoneNumberForProviderKey(tenantId, key, valStr);
      changedCount++;
    }

    if (changedCount > 0) {
      revalidatePath("/dashboard/settings/providers");
      revalidatePath("/dashboard/numbers");
      revalidatePath("/dashboard/agents");
      revalidatePath("/dashboard/batches/new");
    }
  } catch (error) {
    console.error("[connectProviderConfigsAction]:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to save provider configs.");
  }
}

export async function setTenantVoiceProviderModeAction(formData: FormData) {
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const providerMode = parseTenantVoiceProviderMode(formData.get("providerMode"));

    await upsertTenantProviderConfig({
      tenantId,
      providerName: DIRECT_PROVIDER_MODE_KEY,
      providerValue: providerMode,
    });

    revalidatePath("/dashboard/settings/providers");
    revalidatePath("/dashboard/agents");
    revalidatePath("/dashboard/batches/new");
    revalidatePath("/dashboard/calls");
  } catch (error) {
    console.error("[setTenantVoiceProviderModeAction]:", error);
    throw new Error("Failed to save the workspace provider mode.");
  }
}

export async function validateTenantVoiceProviderReadinessAction() {
  const session = await auth();
  await requireTenantRole(session, Role.ADMIN);
  const tenantId = await getCurrentTenantId(session);
  const runtime = await getTenantVoiceProviderRuntime(tenantId);

  if (runtime.configuredMode === "bolna") {
    return {
      ok: true,
      message: "NexFlow Managed mode is selected and ready for this workspace.",
    };
  }

  if (runtime.configuredMode === "plivo-direct") {
    const authId = (await getTenantProviderConfig(tenantId, "PLIVO_AUTH_ID"))?.provider_value;
    const authToken = (await getTenantProviderConfig(tenantId, "PLIVO_AUTH_TOKEN"))?.provider_value;
    const configuredNumber = (await getTenantProviderConfig(tenantId, "PLIVO_PHONE_NUMBER"))
      ?.provider_value;

    if (!authId || !authToken || !configuredNumber) {
      return {
        ok: false,
        message:
          "Direct Plivo is selected, but the workspace is still missing PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, or PLIVO_PHONE_NUMBER.",
      };
    }

    try {
      const plivoClient = new PlivoClient({
        authId,
        authToken,
      });
      const linkedNumber = await plivoClient.getIncomingPhoneNumber(configuredNumber);

      if (!linkedNumber) {
        return {
          ok: false,
          message:
            "Plivo credentials are valid, but the configured PLIVO_PHONE_NUMBER was not found on the connected Plivo account.",
        };
      }

      return {
        ok: true,
        message:
          "Plivo credentials are valid and the configured Plivo phone number is available on the connected account.",
      };
    } catch (error) {
      return {
        ok: false,
        message: getPlivoReadinessErrorMessage(error),
      };
    }
  }

  if (runtime.configuredMode !== "twilio-direct") {
    return {
      ok: false,
      message: "The selected workspace voice mode is not ready yet.",
    };
  }

  const accountSid = (await getTenantProviderConfig(tenantId, "TWILIO_ACCOUNT_SID"))?.provider_value;
  const authToken = (await getTenantProviderConfig(tenantId, "TWILIO_AUTH_TOKEN"))?.provider_value;
  const configuredNumber = (await getTenantProviderConfig(tenantId, "TWILIO_PHONE_NUMBER"))?.provider_value;

  if (!accountSid || !authToken || !configuredNumber) {
    return {
      ok: false,
      message:
        "Direct Twilio is selected, but the workspace is still missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER.",
    };
  }

  try {
    const twilioClient = new TwilioClient({
      accountSid,
      authToken,
    });
    const linkedNumber = await twilioClient.getIncomingPhoneNumber(configuredNumber);

    if (!linkedNumber) {
      return {
        ok: false,
        message:
          "Twilio credentials are valid, but the configured TWILIO_PHONE_NUMBER was not found on the connected Twilio account.",
      };
    }

    return {
      ok: true,
      message:
        "Twilio credentials are valid and the configured Twilio phone number is available on the connected account.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getTwilioReadinessErrorMessage(error),
    };
  }
}
