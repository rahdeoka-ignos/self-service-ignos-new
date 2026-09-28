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
