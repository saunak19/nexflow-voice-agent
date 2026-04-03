type TwilioClientConfig = {
  accountSid: string;
  authToken: string;
};

type TwilioAvailableNumber = {
  phone_number: string;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
  postal_code?: string | null;
};

type TwilioIncomingPhoneNumber = TwilioAvailableNumber & {
  sid: string;
  friendly_name?: string | null;
};

type TwilioApiListResponse<T> = {
  incoming_phone_numbers?: T[];
  available_phone_numbers?: T[];
};

const TWILIO_API_BASE_URL = "https://api.twilio.com/2010-04-01";

function toFormBody(payload: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    params.set(key, value);
  }
  return params.toString();
}

function normalizeCountryCode(country: string) {
  return country.trim().toUpperCase();
}

export class TwilioClient {
  constructor(private readonly config: TwilioClientConfig) {}

  private get authHeader() {
    const credentials = Buffer.from(
      `${this.config.accountSid}:${this.config.authToken}`,
      "utf8"
    ).toString("base64");

    return `Basic ${credentials}`;
  }

  private async request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${TWILIO_API_BASE_URL}/Accounts/${this.config.accountSid}${path}`, {
      ...init,
      headers: {
        Authorization: this.authHeader,
        ...(init?.body
          ? {
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
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
        parsedBody?.detail ||
        `Twilio API error ${response.status} on ${path}`;

      throw new Error(errorMessage);
    }

    return parsedBody as T;
  }

  async searchAvailableLocalNumbers(country: string, pattern?: string) {
    const normalizedCountry = normalizeCountryCode(country);
    const params = new URLSearchParams();

    if (pattern?.trim()) {
      params.set("Contains", pattern.trim());
    }

    const suffix = params.toString();
    const response = await this.request<TwilioApiListResponse<TwilioAvailableNumber>>(
      `/AvailablePhoneNumbers/${normalizedCountry}/Local.json${suffix ? `?${suffix}` : ""}`
    );

    return response.available_phone_numbers ?? [];
  }

  async buyPhoneNumber(phoneNumber: string) {
    const response = await this.request<TwilioIncomingPhoneNumber>(`/IncomingPhoneNumbers.json`, {
      method: "POST",
      body: toFormBody({
        PhoneNumber: phoneNumber,
      }),
    });

    return response;
  }

  async listIncomingPhoneNumbers(phoneNumber?: string) {
    const params = new URLSearchParams();
    if (phoneNumber) {
      params.set("PhoneNumber", phoneNumber);
    }

    const response = await this.request<TwilioApiListResponse<TwilioIncomingPhoneNumber>>(
      `/IncomingPhoneNumbers.json${params.toString() ? `?${params.toString()}` : ""}`
    );

    return response.incoming_phone_numbers ?? [];
  }

  async getIncomingPhoneNumber(phoneNumber: string) {
    const numbers = await this.listIncomingPhoneNumbers(phoneNumber);
    return numbers.find((number) => number.phone_number === phoneNumber) ?? null;
  }

  async releaseIncomingPhoneNumber(phoneNumber: string) {
    const number = await this.getIncomingPhoneNumber(phoneNumber);
    if (!number) {
      throw new Error("This Twilio number was not found on the connected account.");
    }

    await this.request(`/IncomingPhoneNumbers/${number.sid}.json`, {
      method: "DELETE",
    });

    return number;
  }

  async assertNumberExists(phoneNumber: string) {
    const number = await this.getIncomingPhoneNumber(phoneNumber);
    if (!number) {
      throw new Error("This Twilio number is not present on the connected Twilio account.");
    }

    return number;
  }
}
