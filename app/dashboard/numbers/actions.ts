"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant";
import {
  deleteTenantPhoneNumber,
  getTenantPhoneNumber,
  normalizePhoneNumber,
  upsertTenantPhoneNumber,
} from "@/lib/tenant-phone-numbers";
import { getTenantVoiceProvider } from "@/lib/voice-providers";

export async function buyPhoneNumberAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const voiceProvider = await getTenantVoiceProvider(tenantId);
  const rawPhoneNumber = String(formData.get("phoneNumber") || "");
  const country = String(formData.get("country") || "US");
  const locality = String(formData.get("locality") || "") || null;
  const region = String(formData.get("region") || "") || null;
  const friendlyName = String(formData.get("friendlyName") || "") || null;

  if (!rawPhoneNumber) {
    throw new Error("Phone number is required");
  }

  const phoneNumber = normalizePhoneNumber(rawPhoneNumber);

  await voiceProvider.buyPhoneNumber({
    phone_number: phoneNumber,
    country,
  });

  await upsertTenantPhoneNumber({
    tenantId,
    phoneNumber,
    country,
    locality,
    region,
    friendlyName,
    telephonyProvider: "bolna",
  });

  revalidatePath("/dashboard/numbers");
  revalidatePath("/dashboard/numbers/search");
  revalidatePath("/dashboard/agents");
  revalidatePath("/dashboard/batches/new");
}

export async function deletePhoneNumberAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const voiceProvider = await getTenantVoiceProvider(tenantId);
  const rawPhoneNumber = String(formData.get("phoneNumber") || "");

  if (!rawPhoneNumber) {
    throw new Error("Phone number is required");
  }

  const phoneNumber = normalizePhoneNumber(rawPhoneNumber);

  const existingNumber = await getTenantPhoneNumber(tenantId, phoneNumber);
  if (!existingNumber) {
    throw new Error("Phone number not found in this workspace.");
  }

  await voiceProvider.deletePhoneNumber(phoneNumber);
  await deleteTenantPhoneNumber(tenantId, phoneNumber);

  revalidatePath("/dashboard/numbers");
  revalidatePath("/dashboard/agents");
  revalidatePath("/dashboard/batches/new");
}

export async function importPhoneNumberAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const voiceProvider = await getTenantVoiceProvider(tenantId);
  const provider = String(formData.get("provider") || "twilio");
  const rawPhoneNumber = String(formData.get("phoneNumber") || "");

  if (!rawPhoneNumber) {
    throw new Error("Phone number is required");
  }

  const phoneNumber = normalizePhoneNumber(rawPhoneNumber);

  await voiceProvider.importPhoneNumber(provider, phoneNumber);
  await upsertTenantPhoneNumber({
    tenantId,
    phoneNumber,
    telephonyProvider: provider,
  });

  revalidatePath("/dashboard/numbers");
  revalidatePath("/dashboard/agents");
  revalidatePath("/dashboard/batches/new");
}
