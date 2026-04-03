import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

const ENCRYPTED_PREFIX = "enc:v1";

function getKeyMaterial() {
  return (
    process.env.APP_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.NEXTAUTH_URL ||
    null
  );
}

function getEncryptionKey() {
  const keyMaterial = getKeyMaterial();

  if (!keyMaterial) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_ENCRYPTION_KEY or AUTH_SECRET must be set in production.");
    }

    return null;
  }

  return createHash("sha256").update(keyMaterial).digest();
}

export function isEncryptedSecret(value: string) {
  return value.startsWith(`${ENCRYPTED_PREFIX}:`);
}

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  if (!key) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) {
    return value ?? null;
  }

  if (!isEncryptedSecret(value)) {
    return value;
  }

  const key = getEncryptionKey();
  if (!key) {
    throw new Error("Encrypted secrets cannot be decrypted without APP_ENCRYPTION_KEY or AUTH_SECRET.");
  }

  const [, , ivBase64, authTagBase64, ciphertextBase64] = value.split(":");
  if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error("Invalid encrypted secret format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function secureCompareSecret(expected: string, received: string) {
  const expectedBuffer = createHash("sha256").update(expected).digest();
  const receivedBuffer = createHash("sha256").update(received).digest();

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
