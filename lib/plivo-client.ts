type PlivoClientConfig = {
  authId: string;
  authToken: string;
};

type PlivoMeta = {
  limit?: number;
  next?: string | null;
  offset?: number;
  total_count?: number;
};

type PlivoAvailableNumber = {
  number: string;
  region?: string | null;
  country?: string | null;
  country_iso?: string | null;
};

type PlivoOwnedNumber = PlivoAvailableNumber & {
  alias?: string | null;
  application?: string | null;
  number_type?: string | null;
  setup_rate?: string | null;
  monthly_rental_rate?: string | null;
};

type PlivoListResponse<T> = {
  meta?: PlivoMeta;
  objects?: T[];
};

const PLIVO_API_BASE_URL = "https://api.plivo.com/v1/Account";
const DEFAULT_PAGE_LIMIT = 20;

function normalizeCountryCode(country: string) {
  return country.trim().toUpperCase();
}

function toComparableNumber(phoneNumber: string) {
  return phoneNumber.replace(/[^\d]/g, "");
}

function toDisplayNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  const digitsOnly = toComparableNumber(trimmed);
  return digitsOnly ? `+${digitsOnly}` : trimmed;
}

function toApiNumber(phoneNumber: string) {
  const digitsOnly = toComparableNumber(phoneNumber);
  return digitsOnly || phoneNumber.trim();
}

export class PlivoClient {
  constructor(private readonly config: PlivoClientConfig) {}

  private get authHeader() {
    const credentials = Buffer.from(
      `${this.config.authId}:${this.config.authToken}`,
      "utf8"
    ).toString("base64");

    return `Basic ${credentials}`;
  }

  private async request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${PLIVO_API_BASE_URL}/${this.config.authId}${path}`, {
      ...init,
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        ...(init?.body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
        ...init?.headers,
      },
    });

    const rawBody = await response.text();
    const parsedBody = rawBody ? JSON.parse(rawBody) : null;

    if (!response.ok) {
      const errorMessage =
        parsedBody?.message ||
        parsedBody?.error ||
        parsedBody?.detail ||
        `Plivo API error ${response.status} on ${path}`;

      throw new Error(errorMessage);
    }

    return parsedBody as T;
  }

  async searchAvailableLocalNumbers(country: string, pattern?: string) {
    const params = new URLSearchParams({
      country_iso: normalizeCountryCode(country),
      services: "voice",
      type: "local",
    });

    if (pattern?.trim()) {
      params.set("pattern", pattern.trim());
    }

    const response = await this.request<PlivoListResponse<PlivoAvailableNumber>>(
      `/PhoneNumber/?${params.toString()}`
    );

    return (response.objects ?? []).map((number) => ({
      ...number,
      number: toDisplayNumber(number.number),
    }));
  }

  async buyPhoneNumber(phoneNumber: string) {
    const response = await this.request<{ message?: string }>(
      `/PhoneNumber/${encodeURIComponent(toApiNumber(phoneNumber))}/`,
      {
        method: "POST",
      }
    );

    return {
      message: response?.message,
      phone_number: toDisplayNumber(phoneNumber),
    };
  }

  async listIncomingPhoneNumbers() {
    const numbers: PlivoOwnedNumber[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        limit: String(DEFAULT_PAGE_LIMIT),
        offset: String(offset),
      });

      const response = await this.request<PlivoListResponse<PlivoOwnedNumber>>(
        `/Number/?${params.toString()}`
      );

      const batch = response.objects ?? [];
      numbers.push(...batch);

      const totalCount = response.meta?.total_count ?? numbers.length;
      offset += DEFAULT_PAGE_LIMIT;
      hasMore = Boolean(response.meta?.next) || offset < totalCount;

      if (batch.length === 0) {
        hasMore = false;
      }
    }

    return numbers.map((number) => ({
      ...number,
      number: toDisplayNumber(number.number),
    }));
  }

  async getIncomingPhoneNumber(phoneNumber: string) {
    const formattedTarget = toDisplayNumber(phoneNumber);

    try {
      const response = await this.request<PlivoOwnedNumber>(
        `/Number/${encodeURIComponent(toApiNumber(phoneNumber))}/`
      );

      return {
        ...response,
        number: toDisplayNumber(response.number || formattedTarget),
      };
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message.toLowerCase() : "";
      if (rawMessage.includes("not found") || rawMessage.includes("invalid number")) {
        return null;
      }

      const allNumbers = await this.listIncomingPhoneNumbers();
      return (
        allNumbers.find(
          (number) => toComparableNumber(number.number) === toComparableNumber(formattedTarget)
        ) ?? null
      );
    }
  }

  async releaseIncomingPhoneNumber(phoneNumber: string) {
    const existingNumber = await this.getIncomingPhoneNumber(phoneNumber);
    if (!existingNumber) {
      throw new Error("This Plivo number was not found on the connected account.");
    }

    await this.request(`/Number/${encodeURIComponent(toApiNumber(existingNumber.number))}/`, {
      method: "DELETE",
    });

    return existingNumber;
  }

  async assertNumberExists(phoneNumber: string) {
    const existingNumber = await this.getIncomingPhoneNumber(phoneNumber);
    if (!existingNumber) {
      throw new Error("This Plivo number is not present on the connected Plivo account.");
    }

    return existingNumber;
  }
}
