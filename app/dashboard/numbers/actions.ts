"use server";

import { revalidatePath } from "next/cache";

import { bolnaClient } from "@/lib/bolna-client";

export async function buyPhoneNumberAction(formData: FormData) {
  const phoneNumber = String(formData.get("phoneNumber") || "");
  const country = String(formData.get("country") || "US");

  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  await bolnaClient.buyPhoneNumber({
    phone_number: phoneNumber,
    country,
  });

  revalidatePath("/dashboard/numbers");
  revalidatePath("/dashboard/numbers/search");
}

export async function deletePhoneNumberAction(formData: FormData) {
  const phoneNumber = String(formData.get("phoneNumber") || "");

  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  await bolnaClient.deletePhoneNumber(phoneNumber);

  revalidatePath("/dashboard/numbers");
}

export async function importPhoneNumberAction(formData: FormData) {
  const provider = String(formData.get("provider") || "twilio");
  let phoneNumber = String(formData.get("phoneNumber") || "");

  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  // Strip non-digit, non-plus chars
  phoneNumber = phoneNumber.replace(/[^\d+]/g, "");
  
  // Prepend '+' if missing
  if (!phoneNumber.startsWith("+")) {
    phoneNumber = "+" + phoneNumber;
  }

  // E.164 simplistic validation test
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(phoneNumber)) {
    throw new Error("Invalid phone number format. Must be E.164 starting with + and contain only digits (e.g. +14155552671).");
  }

  await bolnaClient.importPhoneNumber(provider, phoneNumber);

  revalidatePath("/dashboard/numbers");
}
