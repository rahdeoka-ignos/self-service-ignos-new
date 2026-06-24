export type LayoutType =
  | "1"
  | "2"
  | "4"
  | "6"
  | "8"
  | "newspaper"
  | "wannabeyours"
  | "300days"
  | "aboutu-v2"
  | "custom";

export interface CustomSlotDef {
  slotNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TemplateEntry {
  id: number;
  name: string;
  preview: string;
  overlay?: string | null;
  layout: LayoutType;
  previewTemplate: string;
  slots: CustomSlotDef[] | null;
}

export interface TemplateCategory {
  id: string;
  name: string;
  image: string;
}

export interface TemplatesData {
  version: number;
  categories: TemplateCategory[];
  templates: Record<string, TemplateEntry[]>;
}
