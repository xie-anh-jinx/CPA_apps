/**
 * CPA Platform — Mobile Formatting Utilities
 */

export const formatRupiah = (val?: number | string | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(val));
};

export const formatNumber = (val?: number | string | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

export const formatDate = (val?: string | null): string => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return val;
  }
};
