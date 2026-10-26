export type ProductType =
  | "4r"
  | "a4"
  | "keychain-default"
  | "keychain-kotak-plastik"
  | "keychain-kotak-metal"
  | "keychain-oval-metal"
  | "keychain-love-metal"
  | "idcard"
  | "pasfoto"
  | "struk";

export interface PrinterProfile {
  id: string;
  label: string;
  printerName: string;
  appliesTo: ProductType[];
  copies?: number;
}

export interface PrintersData {
  version: number;
  profiles: PrinterProfile[];
}

export interface SystemPrinter {
  name: string;
  isDefault?: boolean;
}

export type PrinterStatusCode =
  | "ready"
  | "printing"
  | "paper_out"
  | "door_open"
  | "paper_jam"
  | "offline"
  | "user_intervention"
  | "error";

export interface PrinterAlertInfo {
  type: "paper_out" | "door_open" | "paper_jam" | "offline" | "user_intervention";
  title: string;
  customerMessage: string;
  adminMessage: string;
  printerName: string;
  profileLabel: string;
  isSimulated?: boolean;
}

export interface PrinterStatusInfo {
  name: string;
  status: string;
  statusCode: PrinterStatusCode;
  isOffline: boolean;
  isPaperOut: boolean;
  isDoorOpen: boolean;
  isPaperJam: boolean;
  isUserIntervention: boolean;
  isPrinting: boolean;
  jobsCount: number;
  jobs: { Name?: string; JobStatus?: string; Status?: string; Document?: string }[];
  profiles: { id: string; label: string; appliesTo: ProductType[] }[];
}

export interface PrinterMonitorResponse {
  success: boolean;
  hasError: boolean;
  alert: PrinterAlertInfo | null;
  printers: PrinterStatusInfo[];
  updatedAt: string;
}
