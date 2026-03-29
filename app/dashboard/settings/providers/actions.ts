"use server";

import { revalidatePath } from "next/cache";
import { bolnaClient } from "@/lib/bolna-client";

export async function addProviderAction(formData: FormData) {
  try {
    const name = formData.get("provider_name") as string;
    const value = formData.get("provider_value") as string;
    if (!name || !value) throw new Error("Name and value are required");
    
    await bolnaClient.addProvider(name, value);
    revalidatePath("/dashboard/settings/providers");
  } catch (error) {
    console.error("[addProviderAction]:", error);
    throw new Error("Failed to add provider.");
  }
}

export async function deleteProviderAction(formData: FormData) {
  try {
    const name = formData.get("provider_name") as string;
    if (!name) throw new Error("Provider name is required");
    
    await bolnaClient.deleteProvider(name);
    revalidatePath("/dashboard/settings/providers");
  } catch (error) {
    console.error("[deleteProviderAction]:", error);
    throw new Error("Failed to delete provider.");
  }
}

export async function connectProviderConfigsAction(formData: FormData) {
  try {
    const entries = Array.from(formData.entries());
    let addedCount = 0;

    for (const [key, value] of entries) {
      if (key.startsWith("$ACTION_") || !value) continue;
      const valStr = String(value).trim();
      if (!valStr) continue;

      await bolnaClient.addProvider(key, valStr);
      addedCount++;
    }

    if (addedCount > 0) {
      revalidatePath("/dashboard/settings/providers");
    }
  } catch (error) {
    console.error("[connectProviderConfigsAction]:", error);
    throw new Error("Failed to save provider configs.");
  }
}
