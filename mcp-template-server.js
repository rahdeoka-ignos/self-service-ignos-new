import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "public/templates");
const TEMPLATES_JSON = path.join(TEMPLATES_DIR, "templates.json");

function readTemplates() {
  return JSON.parse(fs.readFileSync(TEMPLATES_JSON, "utf-8"));
}

function writeTemplates(data) {
  fs.writeFileSync(TEMPLATES_JSON, JSON.stringify(data, null, 2), "utf-8");
}

function findTemplate(data, id) {
  for (const category of Object.keys(data.templates)) {
    const idx = data.templates[category].findIndex((t) => t.id === id);
    if (idx !== -1) return { category, idx, tpl: data.templates[category][idx] };
  }
  return null;
}

// Hardcoded slot geometry for built-in layouts (from print4r.ts)
const LAYOUT_CONSTANTS = {
  "1": {
    description: "1 slot portrait, canvas 2400x3600",
    slots: [{ slotNumber: 1, x: 81, y: 92, width: 2236, height: 2970, rotation: 0 }],
  },
  "2": {
    description: "2 slot vertikal, canvas 2400x3600",
    slots: [
      { slotNumber: 1, x: 81, y: 92, width: 2236, height: 1468, rotation: 0 },
      { slotNumber: 2, x: 81, y: 1619, width: 2236, height: 1468, rotation: 0 },
    ],
  },
  "4": {
    description: "2x2 grid, canvas 2400x3600",
    slots: [
      { slotNumber: 1, x: 81, y: 92, width: 1089, height: 1468, rotation: 0 },
      { slotNumber: 2, x: 1228, y: 92, width: 1089, height: 1468, rotation: 0 },
      { slotNumber: 3, x: 81, y: 1619, width: 1089, height: 1468, rotation: 0 },
      { slotNumber: 4, x: 1228, y: 1619, width: 1089, height: 1468, rotation: 0 },
    ],
  },
  "6": {
    description: "2x3 grid, canvas 2400x3600",
    slots: [
      { slotNumber: 1, x: 130, y: 315, width: 940, height: 743, rotation: 0 },
      { slotNumber: 2, x: 1334, y: 315, width: 940, height: 743, rotation: 0 },
      { slotNumber: 3, x: 130, y: 1207, width: 940, height: 743, rotation: 0 },
      { slotNumber: 4, x: 1334, y: 1207, width: 940, height: 743, rotation: 0 },
      { slotNumber: 5, x: 130, y: 2100, width: 940, height: 743, rotation: 0 },
      { slotNumber: 6, x: 1334, y: 2100, width: 940, height: 743, rotation: 0 },
    ],
  },
  "8": {
    description: "2x4 grid, canvas 2400x3600",
    slots: [
      { slotNumber: 1, x: 122, y: 548, width: 958, height: 678, rotation: 0 },
      { slotNumber: 2, x: 1322, y: 548, width: 958, height: 678, rotation: 0 },
      { slotNumber: 3, x: 122, y: 1246, width: 958, height: 678, rotation: 0 },
      { slotNumber: 4, x: 1322, y: 1246, width: 958, height: 678, rotation: 0 },
      { slotNumber: 5, x: 122, y: 1944, width: 958, height: 678, rotation: 0 },
      { slotNumber: 6, x: 1322, y: 1944, width: 958, height: 678, rotation: 0 },
      { slotNumber: 7, x: 122, y: 2642, width: 958, height: 678, rotation: 0 },
      { slotNumber: 8, x: 1322, y: 2642, width: 958, height: 678, rotation: 0 },
    ],
  },
  newspaper: {
    description: "1 slot landscape besar, canvas 2400x3600",
    slots: [{ slotNumber: 1, x: 82, y: 874, width: 2238, height: 1136, rotation: 0 }],
  },
  wannabeyours: {
    description: "1 slot portrait, canvas 2400x3600",
    slots: [{ slotNumber: 1, x: 852, y: 850, width: 1508, height: 1520, rotation: 0 }],
  },
  "300days": {
    description: "1 slot landscape, canvas 2400x3600",
    slots: [{ slotNumber: 1, x: 40, y: 1368, width: 2320, height: 976, rotation: 0 }],
  },
  "aboutu-v2": {
    description: "2 slot portrait dengan rotasi -10.39deg, canvas 2400x3600",
    slots: [
      { slotNumber: 1, x: 448, y: 740, width: 1309, height: 1157, rotation: -10.39 },
      { slotNumber: 2, x: 656, y: 1878, width: 1309, height: 1157, rotation: -10.39 },
    ],
  },
};

const TOOLS = [
  {
    name: "list_templates",
    description: "Tampilkan semua template dan kategori yang tersedia",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_template",
    description:
      "Buat template baru. Untuk layout 'custom', sertakan array slots. Ini membuat entry di templates.json dan direktori di public/templates/.",
    inputSchema: {
      type: "object",
      required: ["name", "category", "layout"],
      properties: {
        name: { type: "string", description: "Nama template (folder name, no spaces)" },
        category: { type: "string", description: "ID kategori (misal: basic, aboutU)" },
        layout: {
          type: "string",
          enum: ["1", "2", "4", "6", "8", "newspaper", "wannabeyours", "300days", "aboutu-v2", "custom"],
          description: "Tipe layout",
        },
        slots: {
          type: "array",
          description: "Array slot untuk layout custom",
          items: {
            type: "object",
            required: ["slotNumber", "x", "y", "width", "height"],
            properties: {
              slotNumber: { type: "number" },
              x: { type: "number", description: "Print canvas x (0-2400)" },
              y: { type: "number", description: "Print canvas y (0-3600)" },
              width: { type: "number" },
              height: { type: "number" },
              rotation: { type: "number", description: "Rotasi dalam derajat (default 0)" },
            },
          },
        },
      },
    },
  },
  {
    name: "upload_image",
    description: "Copy file gambar ke direktori template (background.png, overlay.png, atau preview.png)",
    inputSchema: {
      type: "object",
      required: ["templateName", "imageType", "filePath"],
      properties: {
        templateName: { type: "string", description: "Nama template folder" },
        imageType: {
          type: "string",
          enum: ["background", "overlay", "preview"],
          description: "Jenis gambar",
        },
        filePath: { type: "string", description: "Path absolut file gambar sumber" },
      },
    },
  },
  {
    name: "update_template",
    description: "Update field template yang sudah ada berdasarkan ID",
    inputSchema: {
      type: "object",
      required: ["id", "changes"],
      properties: {
        id: { type: "number", description: "ID template" },
        changes: {
          type: "object",
          description: "Object dengan field yang ingin diubah (layout, slots, dll)",
        },
      },
    },
  },
  {
    name: "delete_template",
    description: "Hapus template dari templates.json",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number", description: "ID template" },
        deleteFiles: {
          type: "boolean",
          description: "Jika true, hapus juga direktori file gambar (default: false)",
          default: false,
        },
      },
    },
  },
  {
    name: "add_custom_slot",
    description: "Tambahkan slot baru ke template dengan layout custom",
    inputSchema: {
      type: "object",
      required: ["templateId", "slotNumber", "x", "y", "width", "height"],
      properties: {
        templateId: { type: "number" },
        slotNumber: { type: "number", description: "Nomor urut slot (1-based)" },
        x: { type: "number", description: "Print canvas x (0-2400)" },
        y: { type: "number", description: "Print canvas y (0-3600)" },
        width: { type: "number" },
        height: { type: "number" },
        rotation: { type: "number", description: "Derajat rotasi (default 0)", default: 0 },
      },
    },
  },
  {
    name: "update_custom_slot",
    description: "Update posisi/ukuran slot yang sudah ada di template custom",
    inputSchema: {
      type: "object",
      required: ["templateId", "slotNumber", "x", "y", "width", "height"],
      properties: {
        templateId: { type: "number" },
        slotNumber: { type: "number" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        rotation: { type: "number", default: 0 },
      },
    },
  },
  {
    name: "get_layout_constants",
    description:
      "Dapatkan koordinat slot (dalam print canvas 2400x3600) untuk built-in layout. Berguna sebagai referensi saat membuat custom layout.",
    inputSchema: {
      type: "object",
      required: ["layout"],
      properties: {
        layout: {
          type: "string",
          enum: ["1", "2", "4", "6", "8", "newspaper", "wannabeyours", "300days", "aboutu-v2"],
        },
      },
    },
  },
];

const server = new Server(
  { name: "template-manager", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_templates") {
      const data = readTemplates();
      const summary = {
        categories: data.categories,
        templateCounts: Object.fromEntries(
          Object.entries(data.templates).map(([cat, tpls]) => [cat, tpls.length]),
        ),
        templates: data.templates,
      };
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }

    if (name === "create_template") {
      const { name: tplName, category, layout, slots } = args;
      const data = readTemplates();

      if (!data.templates[category]) {
        return { content: [{ type: "text", text: `Error: Kategori '${category}' tidak ditemukan. Kategori tersedia: ${Object.keys(data.templates).join(", ")}` }] };
      }

      const existing = Object.values(data.templates).flat().find((t) => t.name === tplName);
      if (existing) {
        return { content: [{ type: "text", text: `Error: Template '${tplName}' sudah ada (ID: ${existing.id})` }] };
      }

      const dir = path.join(TEMPLATES_DIR, tplName);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const entry = {
        id: Date.now(),
        name: tplName,
        preview: `/templates/${tplName}/background.png`,
        layout,
        previewTemplate: `/templates/${tplName}/preview.png`,
        slots: layout === "custom" ? (slots || []) : null,
      };
      data.templates[category].push(entry);
      writeTemplates(data);

      return {
        content: [{
          type: "text",
          text: `Template '${tplName}' berhasil dibuat!\nID: ${entry.id}\nKategori: ${category}\nLayout: ${layout}\nDirektori: ${dir}\n\nSelanjutnya upload gambar dengan tool upload_image.`,
        }],
      };
    }

    if (name === "upload_image") {
      const { templateName, imageType, filePath } = args;
      if (!fs.existsSync(filePath)) {
        return { content: [{ type: "text", text: `Error: File tidak ditemukan: ${filePath}` }] };
      }
      const dir = path.join(TEMPLATES_DIR, templateName);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const dest = path.join(dir, `${imageType}.png`);
      fs.copyFileSync(filePath, dest);
      return { content: [{ type: "text", text: `Berhasil copy ${imageType}.png ke ${dest}` }] };
    }

    if (name === "update_template") {
      const { id, changes } = args;
      const data = readTemplates();
      const found = findTemplate(data, id);
      if (!found) {
        return { content: [{ type: "text", text: `Error: Template ID ${id} tidak ditemukan` }] };
      }
      data.templates[found.category][found.idx] = {
        ...found.tpl,
        ...changes,
      };
      writeTemplates(data);
      return { content: [{ type: "text", text: `Template ID ${id} berhasil diupdate.\n${JSON.stringify(data.templates[found.category][found.idx], null, 2)}` }] };
    }

    if (name === "delete_template") {
      const { id, deleteFiles = false } = args;
      const data = readTemplates();
      const found = findTemplate(data, id);
      if (!found) {
        return { content: [{ type: "text", text: `Error: Template ID ${id} tidak ditemukan` }] };
      }
      const [removed] = data.templates[found.category].splice(found.idx, 1);
      if (deleteFiles) {
        const dir = path.join(TEMPLATES_DIR, removed.name);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
      }
      writeTemplates(data);
      return { content: [{ type: "text", text: `Template '${removed.name}' (ID: ${id}) berhasil dihapus dari kategori '${found.category}'.${deleteFiles ? " File gambar juga dihapus." : " File gambar tidak dihapus."}` }] };
    }

    if (name === "add_custom_slot") {
      const { templateId, slotNumber, x, y, width, height, rotation = 0 } = args;
      const data = readTemplates();
      const found = findTemplate(data, templateId);
      if (!found) {
        return { content: [{ type: "text", text: `Error: Template ID ${templateId} tidak ditemukan` }] };
      }
      if (found.tpl.layout !== "custom") {
        return { content: [{ type: "text", text: `Error: Template '${found.tpl.name}' bukan layout custom (layout: ${found.tpl.layout})` }] };
      }
      if (!data.templates[found.category][found.idx].slots) {
        data.templates[found.category][found.idx].slots = [];
      }
      data.templates[found.category][found.idx].slots.push({ slotNumber, x, y, width, height, rotation });
      writeTemplates(data);
      return { content: [{ type: "text", text: `Slot ${slotNumber} ditambahkan ke template '${found.tpl.name}'.\nTotal slots: ${data.templates[found.category][found.idx].slots.length}` }] };
    }

    if (name === "update_custom_slot") {
      const { templateId, slotNumber, x, y, width, height, rotation = 0 } = args;
      const data = readTemplates();
      const found = findTemplate(data, templateId);
      if (!found) {
        return { content: [{ type: "text", text: `Error: Template ID ${templateId} tidak ditemukan` }] };
      }
      const slots = data.templates[found.category][found.idx].slots;
      if (!slots) {
        return { content: [{ type: "text", text: `Error: Template '${found.tpl.name}' tidak memiliki slots` }] };
      }
      const slotIdx = slots.findIndex((s) => s.slotNumber === slotNumber);
      if (slotIdx === -1) {
        return { content: [{ type: "text", text: `Error: Slot ${slotNumber} tidak ditemukan` }] };
      }
      slots[slotIdx] = { slotNumber, x, y, width, height, rotation };
      writeTemplates(data);
      return { content: [{ type: "text", text: `Slot ${slotNumber} template '${found.tpl.name}' berhasil diupdate.` }] };
    }

    if (name === "get_layout_constants") {
      const { layout } = args;
      const info = LAYOUT_CONSTANTS[layout];
      if (!info) {
        return { content: [{ type: "text", text: `Layout '${layout}' tidak ditemukan. Layout tersedia: ${Object.keys(LAYOUT_CONSTANTS).join(", ")}` }] };
      }
      return {
        content: [{
          type: "text",
          text: `Layout: ${layout}\nDeskripsi: ${info.description}\n\nSlot positions (print canvas 2400×3600):\n${JSON.stringify(info.slots, null, 2)}`,
        }],
      };
    }

    return { content: [{ type: "text", text: `Tool '${name}' tidak dikenali` }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
