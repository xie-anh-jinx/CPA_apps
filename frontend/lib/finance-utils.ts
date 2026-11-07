/**
 * Financial number formatters and helpers for Indonesian Rupiah
 */

export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRupiahShort(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2)} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1)} Jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0)} Rb`;
  }
  return `${sign}Rp ${abs.toFixed(0)}`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined) return "-";
  return new Intl.NumberFormat("id-ID").format(val);
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined) return "-";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}
