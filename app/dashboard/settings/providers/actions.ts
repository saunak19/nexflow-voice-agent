"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { bolnaClient } from "@/lib/bolna-client";
import { getCurrentTenantId } from "@/lib/tenant";
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

function parseBolnaProviderErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getTelephonyProviderName(providerKey: string) {
  if (!providerKey.endsWith("_PHONE_NUMBER")) {
    return null;
  }

  return providerKey.replace(/_PHONE_NUMBER$/, "").toLowerCase();
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

export async function addProviderAction(formData: FormData) {
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const name = formData.get("provider_name") as string;
    const value = formData.get("provider_value") as string;
    if (!name || !value) throw new Error("Name and value are required");
    
    await bolnaClient.addProvider(name, value);
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
    throw new Error("Failed to add provider.");
  }
}

export async function deleteProviderAction(formData: FormData) {
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const name = formData.get("provider_name") as string;
    if (!name) throw new Error("Provider name is required");

    const localProvider = await getTenantProviderConfig(tenantId, name);
    if (!localProvider) {
      throw new Error("Provider config not found for this workspace.");
    }

    const otherTenantCount = await countOtherTenantsUsingProviderName(tenantId, name);
    if (otherTenantCount === 0) {
      await bolnaClient.deleteProvider(name);
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
    throw new Error("Failed to delete provider.");
  }
}

export async function connectProviderConfigsAction(formData: FormData) {
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const existingProviders = await bolnaClient.listProviders().catch(() => []);
    const existingMap = new Map(
      existingProviders.map((provider) => [provider.provider_name, provider.provider_value])
    );
    const entries = Array.from(formData.entries());
    let changedCount = 0;

    for (const [key, value] of entries) {
      if (key.startsWith("$ACTION_") || !value) continue;
      const valStr = String(value).trim();
      if (!valStr) continue;

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
    throw new Error("Failed to save provider configs.");
  }
}
