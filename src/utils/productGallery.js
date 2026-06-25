function norm(s) {
  return String(s || "").trim().toLowerCase();
}

export function getProductGallery(product) {
  const main = String(product?.imageUrl || product?.image || "").trim();
  const raw = Array.isArray(product?.gallery) ? product.gallery : [];

  const items = raw
    .map((it, idx) => ({
      id: String(it?.id || `img_${idx}`),
      url: String(it?.url || it?.imageUrl || it?.image || "").trim(),
      colorName: String(it?.colorName || it?.color || "").trim(),
      order: Number.isFinite(it?.order) ? it.order : idx,
    }))
    .filter((it) => it.url.length > 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const deduped = [];
  const seen = new Set();
  if (main) {
    deduped.push({ id: "main", url: main, colorName: "", order: -1 });
    seen.add(main);
  }
  for (const it of items) {
    if (seen.has(it.url)) continue;
    deduped.push(it);
    seen.add(it.url);
  }
  return deduped;
}

export function getProductPrimaryImageUrl(product) {
  const raw = Array.isArray(product?.gallery) ? product.gallery : [];
  const firstGalleryUrl = raw
    .map((it, idx) => ({
      url: String(it?.url || it?.imageUrl || it?.image || "").trim(),
      order: Number.isFinite(it?.order) ? it.order : idx,
    }))
    .filter((it) => it.url.length > 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]?.url;

  return String(firstGalleryUrl || product?.imageUrl || product?.image || "").trim();
}

export function findGalleryIndexForColor(gallery, colorName) {
  const target = norm(colorName);
  if (!target) return 0;
  const idx = (Array.isArray(gallery) ? gallery : []).findIndex((g) => norm(g?.colorName) === target);
  return idx >= 0 ? idx : 0;
}

export function getProductImageUrlForColor(product, colorName) {
  const gallery = getProductGallery(product);
  const idx = findGalleryIndexForColor(gallery, colorName);
  return String(gallery[idx]?.url || gallery[0]?.url || "").trim();
}
