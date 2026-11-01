export interface LicensePayload {
  client: string;
  plan: string;
  created: number;
  exp: number;
  days: number;
  notes?: string;
}

export type LicenseStatusCode =
  | "active"
  | "warning_expiring_soon"
  | "expired"
  | "clock_tampered"
  | "unregistered";

export interface LicenseRecord {
  licenseKey: string;
  clientName: string;
  plan: string;
  activatedAt: string;
  expiresAt: string;
  lastVerifiedAt: number;
  notes?: string;
}

export interface LicenseStatusResponse {
  isValid: boolean;
  isExpired: boolean;
  isClockTampered: boolean;
  status: LicenseStatusCode;
  clientName: string;
  plan: string;
  activatedAt?: string;
  expiresAt?: string;
  daysLeft: number;
  hoursLeft: number;
  machineInfo?: {
    hostname: string;
    platform: string;
  };
  supportContact?: {
    name: string;
    phone: string;
    whatsappUrl: string;
  };
  lastVerifiedAt: number;
}

export interface LicenseActivationPayload {
  licenseKey: string;
}

export interface LicenseActivationResponse {
  success: boolean;
  message: string;
  status?: LicenseStatusResponse;
}
