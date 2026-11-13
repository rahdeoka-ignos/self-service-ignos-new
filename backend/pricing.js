export function nonNegative(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("Harga/jumlah harus berupa angka non-negatif.");
  return n;
}

export function priceKioskSession(body, pricing, freeEvent = false) {
  const count = nonNegative(body.peopleCount, 1);
  if (!Number.isInteger(count) || count < 1) throw new Error("Jumlah orang tidak valid.");
  const a4Count = nonNegative(body.a4Count);
  if (!Number.isInteger(a4Count)) throw new Error("Jumlah cetak tidak valid.");
  const addons = body.miscAddons ?? [];
  if (!Array.isArray(addons)) throw new Error("Daftar add-on tidak valid.");
  const miscAddons = addons.map((item) => {
    const group = item.kind === "keychain" ? pricing.keychains : item.kind === "idcard" ? pricing.idCards : pricing.addons;
    let product = group?.find((p) => p.id === item.productId);
    // Compatibility for sessions already open before the update.
    if (!product && !item.productId) {
      product = [...(pricing.keychains ?? []), ...(pricing.idCards ?? []), ...(pricing.addons ?? [])]
        .find((p) => item.name === p.name || item.name === p.title || item.name === `${p.name} - ${p.subtitle}` || item.name?.startsWith(`${p.title} - `));
    }
    if (!product) throw new Error(`Produk tidak dikenal: ${item.name || item.productId}`);
    const qty = nonNegative(item.qty);
    if (!Number.isInteger(qty) || qty < 1) throw new Error("Jumlah add-on tidak valid.");
    const price = product.id === "4r-print" ? pricing.prints.print4rPrice : product.price;
    return { ...item, price: nonNegative(price), qty };
  });
  const basePrice = freeEvent ? 0 : nonNegative(pricing.session.basePrice, 50000)
    + Math.max(0, count - nonNegative(pricing.session.includedPeople, 2)) * nonNegative(pricing.session.extraPersonPrice, 15000);
  const addonsTotal = miscAddons.reduce((sum, a) => sum + a.qty * a.price, 0);
  const a4Total = a4Count * nonNegative(pricing.prints.printA4Price, 20000);
  const softcopyTotal = body.makeStory !== false || freeEvent ? 0 : nonNegative(pricing.session.softcopyCharge, 25000);
  return { miscAddons, basePrice, addonsTotal, a4Total, softcopyTotal, totalPrice: basePrice + addonsTotal + a4Total + softcopyTotal };
}

export function reportPrints(session) {
  const regular = nonNegative(session.prints?.regular);
  const bonus = nonNegative(session.prints?.bonus);
  const total = nonNegative(session.prints?.total, regular + bonus);
  return { regular: Math.max(regular, total - bonus), bonus };
}

export function reportSoftcopy(session) {
  const type = session.softcopyType ?? (session.makeStory ? "story_free" : "paid");
  return { free: type === "story_free", paid: type === "paid", revenue: type === "paid" ? nonNegative(session.softcopyCharge, 25000) : 0 };
}
