import { useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { usePricing } from "../../context/PricingContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AddonItemPricing, VariantPricing } from "../../types/pricing";

export function AdminPricingPage() {
  usePageTitle("Harga & Paket Studio");

  const {
    pricing,
    setPricing,
    savePricing,
    resetPricing,
    formatPrice,
    saving,
  } = usePricing();

  const [activeTab, setActiveTab] = useState<"session" | "prints" | "addons" | "variants">("session");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    category?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    variant?: "danger" | "warning" | "info" | "success";
    singleButton?: boolean;
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const handleSave = async () => {
    const result = await savePricing();
    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (!result.serverSynced) {
        setModalConfig({
          isOpen: true,
          title: "Pengaturan Tersimpan di Browser",
          category: "Sinkronisasi Server Backend",
          description: "Perubahan harga sudah langsung aktif di Kiosk. Namun terminal 'node server.js' perlu di-restart agar data tersimpan permanen ke file disk server.",
          singleButton: true,
          variant: "warning",
          confirmText: "Mengerti",
        });
      }
    }
  };

  const handleOpenResetModal = () => {
    setModalConfig({
      isOpen: true,
      title: "Kembalikan ke Harga Default?",
      category: "Konfirmasi Reset Harga",
      description: "Semua pengaturan harga sesi dasar, cetak foto, add-ons, dan varian produk akan dikembalikan ke nilai awal sistem. Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Reset Bawaan",
      cancelText: "Batal",
      isDangerous: true,
      variant: "danger",
      onConfirm: async () => {
        await resetPricing();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      },
    });
  };

  const updateSessionPricing = (key: keyof typeof pricing.session, value: number) => {
    setPricing((prev) => ({
      ...prev,
      session: {
        ...prev.session,
        [key]: Math.max(0, Number(value) || 0),
      },
    }));
  };

  const updatePrintsPricing = (key: keyof typeof pricing.prints, value: number) => {
    setPricing((prev) => ({
      ...prev,
      prints: {
        ...prev.prints,
        [key]: Math.max(0, Number(value) || 0),
      },
    }));
  };

  const updateAddonItem = (id: string, updates: Partial<AddonItemPricing>) => {
    setPricing((prev) => ({
      ...prev,
      addons: prev.addons.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  };

  const updateKeychainItem = (id: string, updates: Partial<VariantPricing>) => {
    setPricing((prev) => ({
      ...prev,
      keychains: prev.keychains.map((k) => (k.id === id ? { ...k, ...updates } : k)),
    }));
  };

  const updateIdCardItem = (id: string, updates: Partial<VariantPricing>) => {
    setPricing((prev) => ({
      ...prev,
      idCards: prev.idCards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-8">
        {/* ── Page Header (Minimal Editorial) ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              PENGATURAN STUDIO & BILLING
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.04em] text-[#202020] leading-[1.25] mt-1.5">
              Harga & Paket Sesi
            </h1>
            <p className="text-[13px] text-[#777] leading-[1.8] mt-1 max-w-2xl">
              Atur tarif paket dasar sesi foto, kuota pengunjung, biaya cetak lembaran, serta ketersediaan katalog add-ons untuk Kiosk.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenResetModal}
              disabled={saving}
              className="px-4 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              Reset Bawaan
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[13px] font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saveSuccess ? "Tersimpan!" : saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>

        {/* ── Minimal Tabs (No Icons, No Loud Badges) ── */}
        <div className="flex border-b border-[#e8e8e8] gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("session")}
            className={`pb-3 text-[13px] tracking-[-0.01em] transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "session"
                ? "border-[#171717] font-semibold text-[#171717]"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Sesi Foto Dasar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prints")}
            className={`pb-3 text-[13px] tracking-[-0.01em] transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "prints"
                ? "border-[#171717] font-semibold text-[#171717]"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Cetak Tambahan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("addons")}
            className={`pb-3 text-[13px] tracking-[-0.01em] transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "addons"
                ? "border-[#171717] font-semibold text-[#171717]"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Katalog Add-Ons
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("variants")}
            className={`pb-3 text-[13px] tracking-[-0.01em] transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "variants"
                ? "border-[#171717] font-semibold text-[#171717]"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Varian Produk
          </button>
        </div>

        {/* ── TAB 1: SESI FOTO DASAR (Linear / Stripe Spacious Setting Rows) ── */}
        {activeTab === "session" && (
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-8">
            <div className="pb-4 border-b border-[#f0f0f0]">
              <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                Tarif & Ketentuan Sesi Dasar
              </h2>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                Kombinasi tarif ini digunakan mesin Kiosk untuk menghitung total belanja pengunjung secara otomatis.
              </p>
            </div>

            <div className="divide-y divide-[#f2f2f2]">
              {/* Row 1: Base Price */}
              <div className="py-6 first:pt-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7">
                  <label className="text-[13px] font-medium text-[#202020] block">
                    Harga Paket Dasar
                  </label>
                  <p className="text-[12px] text-[#888] mt-0.5 leading-[1.6]">
                    Biaya awal sesi foto sebelum tambahan orang atau cetak ekstra.
                  </p>
                </div>
                <div className="md:col-span-5">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[12px] text-[#999] font-medium">Rp</span>
                    <input
                      type="number"
                      step={5000}
                      value={pricing.session.basePrice}
                      onChange={(e) => updateSessionPricing("basePrice", Number(e.target.value))}
                      className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] pl-10 pr-3.5 py-2 text-[13px] font-mono text-[#202020] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Included People */}
              <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7">
                  <label className="text-[13px] font-medium text-[#202020] block">
                    Kuota Pengunjung Termasuk
                  </label>
                  <p className="text-[12px] text-[#888] mt-0.5 leading-[1.6]">
                    Batas jumlah orang yang tercakup dalam harga paket dasar tanpa biaya tambahan.
                  </p>
                </div>
                <div className="md:col-span-5">
                  <select
                    value={pricing.session.includedPeople}
                    onChange={(e) => updateSessionPricing("includedPeople", Number(e.target.value))}
                    className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] px-3.5 py-2 text-[13px] text-[#202020] outline-none transition-colors bg-white cursor-pointer"
                  >
                    <option value={1}>1 Orang (Paket Solo)</option>
                    <option value={2}>2 Orang (Paket Standar / Couple)</option>
                    <option value={3}>3 Orang</option>
                    <option value={4}>4 Orang (Paket Grup)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Extra Person Price */}
              <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7">
                  <label className="text-[13px] font-medium text-[#202020] block">
                    Biaya Tambahan per Orang
                  </label>
                  <p className="text-[12px] text-[#888] mt-0.5 leading-[1.6]">
                    Tarif yang dikenakan untuk setiap orang tambahan di atas kuota paket dasar.
                  </p>
                </div>
                <div className="md:col-span-5">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[12px] text-[#999] font-medium">Rp</span>
                    <input
                      type="number"
                      step={5000}
                      value={pricing.session.extraPersonPrice}
                      onChange={(e) => updateSessionPricing("extraPersonPrice", Number(e.target.value))}
                      className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] pl-10 pr-3.5 py-2 text-[13px] font-mono text-[#202020] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Softcopy Fee */}
              <div className="py-6 last:pb-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7">
                  <label className="text-[13px] font-medium text-[#202020] block">
                    Biaya Softcopy Google Drive (Tanpa Story IG)
                  </label>
                  <p className="text-[12px] text-[#888] mt-0.5 leading-[1.6]">
                    Dikenakan kepada customer yang memilih tidak mengunggah Story Instagram saat mengklaim link foto.
                  </p>
                </div>
                <div className="md:col-span-5">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[12px] text-[#999] font-medium">Rp</span>
                    <input
                      type="number"
                      step={5000}
                      value={pricing.session.softcopyCharge}
                      onChange={(e) => updateSessionPricing("softcopyCharge", Number(e.target.value))}
                      className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] pl-10 pr-3.5 py-2 text-[13px] font-mono text-[#202020] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CETAK TAMBAHAN ── */}
        {activeTab === "prints" && (
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-8">
            <div className="pb-4 border-b border-[#f0f0f0]">
              <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                Tarif Cetak Foto Tambahan
              </h2>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                Tarif per lembar untuk setiap cetakan foto tambahan yang dipilih customer di Kiosk.
              </p>
            </div>

            <div className="divide-y divide-[#f2f2f2]">
              {/* Cetak 4R */}
              <div className="py-6 first:pt-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7">
                  <label className="text-[13px] font-medium text-[#202020] block">
                    Cetak Foto 4R Tambahan
                  </label>
                  <p className="text-[12px] text-[#888] mt-0.5 leading-[1.6]">
                    Ukuran standar 4R (10 × 15 cm) untuk cetak foto atau photo strip ekstra.
                  </p>
                </div>
                <div className="md:col-span-5">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[12px] text-[#999] font-medium">Rp</span>
                    <input
                      type="number"
                      step={2500}
                      value={pricing.prints.print4rPrice}
                      onChange={(e) => updatePrintsPricing("print4rPrice", Number(e.target.value))}
                      className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] pl-10 pr-3.5 py-2 text-[13px] font-mono text-[#202020] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Cetak A4 / 10R */}
              <div className="py-6 last:pb-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7">
                  <label className="text-[13px] font-medium text-[#202020] block">
                    Cetak Foto A4 (10R)
                  </label>
                  <p className="text-[12px] text-[#888] mt-0.5 leading-[1.6]">
                    Ukuran format besar A4 (21 × 29.7 cm) berkualitas tinggi.
                  </p>
                </div>
                <div className="md:col-span-5">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[12px] text-[#999] font-medium">Rp</span>
                    <input
                      type="number"
                      step={5000}
                      value={pricing.prints.printA4Price}
                      onChange={(e) => updatePrintsPricing("printA4Price", Number(e.target.value))}
                      className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] pl-10 pr-3.5 py-2 text-[13px] font-mono text-[#202020] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: KATALOG ADD-ONS ── */}
        {activeTab === "addons" && (
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-6">
            <div className="pb-4 border-b border-[#f0f0f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Katalog Add-Ons & Merchandise
                </h2>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                  Atur harga jual per item dan matikan produk yang tidak tersedia di studio Anda.
                </p>
              </div>
              <span className="text-[12px] text-[#888] shrink-0 font-normal">
                {pricing.addons.filter((a) => a.enabled).length} dari {pricing.addons.length} item aktif
              </span>
            </div>

            <div className="divide-y divide-[#f2f2f2]">
              {pricing.addons.map((addon) => (
                <div
                  key={addon.id}
                  className={`py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity ${
                    addon.enabled ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[#202020]">
                      {addon.title}
                    </div>
                    <div className="text-[12px] text-[#888] mt-0.5 leading-[1.6]">
                      {addon.description || addon.id}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 self-end sm:self-auto">
                    <div className="relative w-36">
                      <span className="absolute left-3 top-2 text-[12px] text-[#999] font-medium">Rp</span>
                      <input
                        type="number"
                        step={5000}
                        value={addon.price}
                        disabled={!addon.enabled}
                        onChange={(e) => updateAddonItem(addon.id, { price: Number(e.target.value) })}
                        className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] pl-9 pr-3 py-1.5 text-[13px] font-mono text-[#202020] outline-none transition-colors disabled:bg-[#f6f6f6] disabled:text-[#aaa]"
                      />
                    </div>

                    {/* Minimalist Switch Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={addon.enabled}
                        onChange={(e) => updateAddonItem(addon.id, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-[#e0e0e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#171717] relative" />
                      <span className="text-[12px] text-[#666] w-14">
                        {addon.enabled ? "Aktif" : "Nonaktif"}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: VARIAN GANTUNGAN KUNCI & ID CARD ── */}
        {activeTab === "variants" && (
          <div className="space-y-8">
            {/* Varian Gantungan Kunci */}
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-6">
              <div className="pb-4 border-b border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                    Varian Gantungan Kunci
                  </h3>
                  <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                    Atur harga dan tipe frame gantungan kunci yang dapat dipilih pengunjung.
                  </p>
                </div>
                <span className="text-[12px] text-[#888] font-normal">
                  {pricing.keychains.filter((k) => k.enabled).length} aktif
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricing.keychains.map((k) => (
                  <div
                    key={k.id}
                    className={`border rounded-[10px] p-4 space-y-3 transition-all ${
                      k.enabled
                        ? "border-[#e0e0e0] bg-white"
                        : "border-[#ececec] bg-[#fafafa] opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[#202020] truncate">{k.name}</span>
                      <label className="cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={k.enabled}
                          onChange={(e) => updateKeychainItem(k.id, { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-[#e0e0e0] rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#171717] relative" />
                      </label>
                    </div>

                    <p className="text-[11px] text-[#888]">{k.subtitle || "Full Foto"}</p>

                    <div>
                      <span className="text-[10px] tracking-[0.06em] text-[#999] uppercase font-medium block mb-1">
                        Harga Satuan
                      </span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-[11px] text-[#999] font-medium">Rp</span>
                        <input
                          type="number"
                          step={5000}
                          value={k.price}
                          disabled={!k.enabled}
                          onChange={(e) => updateKeychainItem(k.id, { price: Number(e.target.value) })}
                          className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[6px] pl-8 pr-2.5 py-1 text-[12px] font-mono text-[#202020] outline-none transition-colors disabled:bg-[#f6f6f6]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Varian ID Card */}
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-6">
              <div className="pb-4 border-b border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                    Varian ID Card Custom
                  </h3>
                  <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                    Atur harga dan layout orientasi kartu ID custom.
                  </p>
                </div>
                <span className="text-[12px] text-[#888] font-normal">
                  {pricing.idCards.filter((c) => c.enabled).length} aktif
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricing.idCards.map((c) => (
                  <div
                    key={c.id}
                    className={`border rounded-[10px] p-4 space-y-3 transition-all ${
                      c.enabled
                        ? "border-[#e0e0e0] bg-white"
                        : "border-[#ececec] bg-[#fafafa] opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[#202020] truncate">{c.name}</span>
                      <label className="cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={c.enabled}
                          onChange={(e) => updateIdCardItem(c.id, { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-[#e0e0e0] rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#171717] relative" />
                      </label>
                    </div>

                    <p className="text-[11px] text-[#888]">{c.subtitle || "Custom ID Card"}</p>

                    <div>
                      <span className="text-[10px] tracking-[0.06em] text-[#999] uppercase font-medium block mb-1">
                        Harga Satuan
                      </span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-[11px] text-[#999] font-medium">Rp</span>
                        <input
                          type="number"
                          step={5000}
                          value={c.price}
                          disabled={!c.enabled}
                          onChange={(e) => updateIdCardItem(c.id, { price: Number(e.target.value) })}
                          className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[6px] pl-8 pr-2.5 py-1 text-[12px] font-mono text-[#202020] outline-none transition-colors disabled:bg-[#f6f6f6]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Standard Admin Confirmation Modal ── */}
        <AdminConfirmModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={modalConfig.onConfirm}
          title={modalConfig.title}
          category={modalConfig.category}
          description={modalConfig.description}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          isDangerous={modalConfig.isDangerous}
          variant={modalConfig.variant}
          singleButton={modalConfig.singleButton}
        />
      </div>
    </AdminLayout>
  );
}
