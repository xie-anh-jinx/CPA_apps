/**
 * Master Warehouse & Code Area Mapping Utility
 * Sesuai ketetapan resmi master 120 gudang PT. Cahaya Pengajaran Abadi:
 * - CPA01: Manado (04), Mapa / Ambon (08)
 * - CPA02: Makasar (02), Palu (05), Kendari (03)
 * - CPA03: Sampit (06), Banjarmasin (07)
 * - HO: HO - Balikpapan (01)
 */

export const WAREHOUSE_CODE_AREA_MAP: Record<string, string> = {
  // CPA02 - Makasar
  "5": "CPA02", "005": "CPA02",
  "36": "CPA02", "036": "CPA02",
  "45": "CPA02", "045": "CPA02",
  "47": "CPA02", "047": "CPA02",
  "50": "CPA02", "050": "CPA02",
  "53": "CPA02", "053": "CPA02",
  "54": "CPA02", "054": "CPA02",
  "81": "CPA02", "081": "CPA02",
  "100": "CPA02",
  "101": "CPA02",
  "126": "CPA02",
  "127": "CPA02",
  // CPA02 - Palu
  "9": "CPA02", "009": "CPA02",
  "59": "CPA02", "059": "CPA02",
  "60": "CPA02", "060": "CPA02",
  "75": "CPA02", "075": "CPA02",
  "82": "CPA02", "082": "CPA02",
  "98": "CPA02", "098": "CPA02",
  "105": "CPA02",
  "107": "CPA02",
  "108": "CPA02",
  "117": "CPA02",
  "122": "CPA02",
  "123": "CPA02",
  "124": "CPA02",
  "129": "CPA02",
  // CPA02 - Kendari
  "7": "CPA02", "007": "CPA02",
  "24": "CPA02", "024": "CPA02",
  "55": "CPA02", "055": "CPA02",
  "56": "CPA02", "056": "CPA02",
  "103": "CPA02",
  "113": "CPA02",
  "118": "CPA02",

  // CPA01 - Manado
  "13": "CPA01", "013": "CPA01",
  "25": "CPA01", "025": "CPA01",
  "26": "CPA01", "026": "CPA01",
  "27": "CPA01", "027": "CPA01",
  "28": "CPA01", "028": "CPA01",
  "29": "CPA01", "029": "CPA01",
  "30": "CPA01", "030": "CPA01",
  "31": "CPA01", "031": "CPA01",
  "32": "CPA01", "032": "CPA01",
  "33": "CPA01", "033": "CPA01",
  "34": "CPA01", "034": "CPA01",
  "35": "CPA01", "035": "CPA01",
  "37": "CPA01", "037": "CPA01",
  "38": "CPA01", "038": "CPA01",
  "40": "CPA01", "040": "CPA01",
  "41": "CPA01", "041": "CPA01",
  "42": "CPA01", "042": "CPA01",
  "43": "CPA01", "043": "CPA01",
  "44": "CPA01", "044": "CPA01",
  "49": "CPA01", "049": "CPA01",
  "57": "CPA01", "057": "CPA01",
  "58": "CPA01", "058": "CPA01",
  "67": "CPA01", "067": "CPA01",
  "70": "CPA01", "070": "CPA01",
  "71": "CPA01", "071": "CPA01",
  "73": "CPA01", "073": "CPA01",
  "74": "CPA01", "074": "CPA01",
  "78": "CPA01", "078": "CPA01",
  "79": "CPA01", "079": "CPA01",
  "80": "CPA01", "080": "CPA01",
  "83": "CPA01", "083": "CPA01",
  "87": "CPA01", "087": "CPA01",
  "102": "CPA01",
  "109": "CPA01",
  "110": "CPA01",
  "111": "CPA01",
  "115": "CPA01",
  "116": "CPA01",
  "128": "CPA01",
  // CPA01 - Mapa
  "12": "CPA01", "012": "CPA01",
  "65": "CPA01", "065": "CPA01",
  "66": "CPA01", "066": "CPA01",

  // CPA03 - Sampit
  "10": "CPA03", "010": "CPA03",
  "39": "CPA03", "039": "CPA03",
  "48": "CPA03", "048": "CPA03",
  "61": "CPA03", "061": "CPA03",
  "62": "CPA03", "062": "CPA03",
  "68": "CPA03", "068": "CPA03",
  "69": "CPA03", "069": "CPA03",
  "76": "CPA03", "076": "CPA03",
  "84": "CPA03", "084": "CPA03",
  "85": "CPA03", "085": "CPA03",
  "86": "CPA03", "086": "CPA03",
  "89": "CPA03", "089": "CPA03",
  "90": "CPA03", "090": "CPA03",
  "91": "CPA03", "091": "CPA03",
  "92": "CPA03", "092": "CPA03",
  "93": "CPA03", "093": "CPA03",
  "94": "CPA03", "094": "CPA03",
  "95": "CPA03", "095": "CPA03",
  "96": "CPA03", "096": "CPA03",
  "97": "CPA03", "097": "CPA03",
  "99": "CPA03", "099": "CPA03",
  "104": "CPA03",
  "114": "CPA03",
  // CPA03 - Banjarmasin
  "11": "CPA03", "011": "CPA03",
  "63": "CPA03", "063": "CPA03",
  "64": "CPA03", "064": "CPA03",
  "112": "CPA03",

  // HO - Balikpapan
  "0": "HO", "000": "HO",
  "1": "HO", "001": "HO",
  "2": "HO", "002": "HO",
  "3": "HO", "003": "HO",
  "4": "HO", "004": "HO",
  "14": "HO", "014": "HO",
  "16": "HO", "016": "HO",
  "46": "HO", "046": "HO",
  "51": "HO", "051": "HO",
  "52": "HO", "052": "HO",
  "72": "HO", "072": "HO",
  "77": "HO", "077": "HO",
  "88": "HO", "088": "HO",
  "106": "HO",
  "119": "HO",
  "120": "HO",
  "121": "HO",
  "125": "HO",
};

export const KANTOR_CODE_AREA_MAP: Record<string, string> = {
  "Makasar": "CPA02",
  "Makassar": "CPA02",
  "Palu": "CPA02",
  "Kendari": "CPA02",
  "Manado": "CPA01",
  "Mapa": "CPA01",
  "Sampit": "CPA03",
  "Banjarmasin": "CPA03",
  "HO - Balikpapan": "HO",
  "Balikpapan": "HO",
  "HO": "HO",
};

export function getWarehouseCodeArea(
  id_gudang?: string | number | null,
  nama_gudang?: string | null,
  nama_kantor?: string | null
): string {
  if (id_gudang !== undefined && id_gudang !== null && String(id_gudang).trim() !== "") {
    const raw = String(id_gudang).trim();
    if (WAREHOUSE_CODE_AREA_MAP[raw]) return WAREHOUSE_CODE_AREA_MAP[raw];
    const padded = raw.padStart(3, "0");
    if (WAREHOUSE_CODE_AREA_MAP[padded]) return WAREHOUSE_CODE_AREA_MAP[padded];
    const num = parseInt(raw, 10);
    if (!isNaN(num) && WAREHOUSE_CODE_AREA_MAP[String(num)]) {
      return WAREHOUSE_CODE_AREA_MAP[String(num)];
    }
  }

  if (nama_kantor) {
    const nk = nama_kantor.trim();
    if (KANTOR_CODE_AREA_MAP[nk]) return KANTOR_CODE_AREA_MAP[nk];
    for (const [k, v] of Object.entries(KANTOR_CODE_AREA_MAP)) {
      if (nk.toLowerCase().includes(k.toLowerCase())) return v;
    }
  }

  if (nama_gudang) {
    const ng = nama_gudang.toUpperCase();
    if (ng.includes("CPA 01") || ng.includes("CPA01")) return "CPA01";
    if (ng.includes("CPA 02") || ng.includes("CPA02")) return "CPA02";
    if (ng.includes("CPA 03") || ng.includes("CPA03")) return "CPA03";
    for (const [id, code] of Object.entries(WAREHOUSE_CODE_AREA_MAP)) {
      // Check if nama matches any known warehouse
    }
  }

  return "HO";
}

export function getCodeAreaBadgeStyle(codeArea?: string) {
  switch (codeArea) {
    case "CPA01":
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        color: "#10b981",
        border: "1px solid rgba(16, 185, 129, 0.35)",
      };
    case "CPA02":
      return {
        bg: "rgba(59, 130, 246, 0.12)",
        color: "#3b82f6",
        border: "1px solid rgba(59, 130, 246, 0.35)",
      };
    case "CPA03":
      return {
        bg: "rgba(245, 158, 11, 0.12)",
        color: "#f59e0b",
        border: "1px solid rgba(245, 158, 11, 0.35)",
      };
    case "HO":
    default:
      return {
        bg: "rgba(168, 85, 247, 0.12)",
        color: "#a855f7",
        border: "1px solid rgba(168, 85, 247, 0.35)",
      };
  }
}

