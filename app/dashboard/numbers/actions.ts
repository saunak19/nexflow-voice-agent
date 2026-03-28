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
