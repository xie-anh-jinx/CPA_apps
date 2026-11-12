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


export interface WarehouseMasterRecord {
  id: string;
  padId: string;
  nama: string;
  cabang: string;
  codeArea: string;    // "01", "02", "03", "HO"
  cpaCode: string;     // "CPA01", "CPA02", "CPA03", "HO"
  actualArea: string;  // "01", "02", "03", "HO"
  lokasiWh: string;
  typeWh: string;      // "CPA WH" | "Konsinyasi"
}

export const WAREHOUSE_MASTER_METADATA: Record<string, WarehouseMasterRecord> = {
  "5": { id: "5", padId: "005", nama: "MAKASSAR", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "005": { id: "5", padId: "005", nama: "MAKASSAR", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "36": { id: "36", padId: "036", nama: "KONSINYASI PT. SEMEN TONASA", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "036": { id: "36", padId: "036", nama: "KONSINYASI PT. SEMEN TONASA", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "45": { id: "45", padId: "045", nama: "MAKASSAR-DAMAGE", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "045": { id: "45", padId: "045", nama: "MAKASSAR-DAMAGE", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "47": { id: "47", padId: "047", nama: "BITUNG - CPA 02", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "047": { id: "47", padId: "047", nama: "BITUNG - CPA 02", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "50": { id: "50", padId: "050", nama: "BPN - CPA02", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "050": { id: "50", padId: "050", nama: "BPN - CPA02", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "53": { id: "53", padId: "053", nama: "WORKSHOP - MKS", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "HO", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "053": { id: "53", padId: "053", nama: "WORKSHOP - MKS", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "HO", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "54": { id: "54", padId: "054", nama: "PINJAMAN SHELL - MKS", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "054": { id: "54", padId: "054", nama: "PINJAMAN SHELL - MKS", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "81": { id: "81", padId: "081", nama: "KONSINYASI PANCA BINA PERSADA - MKS", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "081": { id: "81", padId: "081", nama: "KONSINYASI PANCA BINA PERSADA - MKS", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "100": { id: "100", padId: "100", nama: "KENDARI - CPA MKS", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "101": { id: "101", padId: "101", nama: "PALU - CPA MKS", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Palu", typeWh: "CPA WH" },
  "126": { id: "126", padId: "126", nama: "KONSINYASI MAKKURAGA - MOROWALI", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "127": { id: "127", padId: "127", nama: "KONSINYASI MAKKURAGA - PATTENE", cabang: "Makasar", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "9": { id: "9", padId: "009", nama: "PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Palu", typeWh: "CPA WH" },
  "009": { id: "9", padId: "009", nama: "PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Palu", typeWh: "CPA WH" },
  "59": { id: "59", padId: "059", nama: "WORKSHOP - PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "HO", lokasiWh: "Palu", typeWh: "CPA WH" },
  "059": { id: "59", padId: "059", nama: "WORKSHOP - PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "HO", lokasiWh: "Palu", typeWh: "CPA WH" },
  "60": { id: "60", padId: "060", nama: "PINJAMAN SHELL - PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Palu", typeWh: "CPA WH" },
  "060": { id: "60", padId: "060", nama: "PINJAMAN SHELL - PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Palu", typeWh: "CPA WH" },
  "75": { id: "75", padId: "075", nama: "KONSINYASI TSINGSHAN KENDARI", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "075": { id: "75", padId: "075", nama: "KONSINYASI TSINGSHAN KENDARI", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "82": { id: "82", padId: "082", nama: "KENDARI - CPA PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "082": { id: "82", padId: "082", nama: "KENDARI - CPA PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "98": { id: "98", padId: "098", nama: "JAKARTA - CPA02", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Jakarta", typeWh: "CPA WH" },
  "098": { id: "98", padId: "098", nama: "JAKARTA - CPA02", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Jakarta", typeWh: "CPA WH" },
  "105": { id: "105", padId: "105", nama: "KONSINYASI TEMPOPRESS SITE BUNTA", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "107": { id: "107", padId: "107", nama: "KONSINYASI TEMPOPRESS SITE SUBAIM", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "108": { id: "108", padId: "108", nama: "KONSINYASI TEMPOPRESS SITE SAGEA", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "117": { id: "117", padId: "117", nama: "KENDARI - PALU RETAIL", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "122": { id: "122", padId: "122", nama: "PALU - LABUHA INTERNUSA", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Palu", typeWh: "CPA WH" },
  "123": { id: "123", padId: "123", nama: "PALU - TEMPOPRESS GROUP", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Palu", typeWh: "CPA WH" },
  "124": { id: "124", padId: "124", nama: "MAKASSAR - PALU", cabang: "Palu", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "7": { id: "7", padId: "007", nama: "KENDARI", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "007": { id: "7", padId: "007", nama: "KENDARI", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "24": { id: "24", padId: "024", nama: "MKSR KONSINYASI PT. ANTAM", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "024": { id: "24", padId: "024", nama: "MKSR KONSINYASI PT. ANTAM", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "55": { id: "55", padId: "055", nama: "WORKSHOP - KENDARI", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "HO", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "055": { id: "55", padId: "055", nama: "WORKSHOP - KENDARI", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "HO", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "56": { id: "56", padId: "056", nama: "PINJAMAN SHELL - KENDARI", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "056": { id: "56", padId: "056", nama: "PINJAMAN SHELL - KENDARI", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "103": { id: "103", padId: "103", nama: "HORIZON CONSTRUCTION INDONESIA - KENDARI", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "113": { id: "113", padId: "113", nama: "KENDARI-DAMAGE", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "118": { id: "118", padId: "118", nama: "KENDARI - SMELTER", cabang: "Kendari", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "129": { id: "129", padId: "129", nama: "SOFIFI - CPA02", cabang: "Palu", codeArea: "01", cpaCode: "CPA01", actualArea: "02", lokasiWh: "Sofifi", typeWh: "CPA WH" },
  "13": { id: "13", padId: "013", nama: "BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "013": { id: "13", padId: "013", nama: "BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "25": { id: "25", padId: "025", nama: "KONSINYASI NHM", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "025": { id: "25", padId: "025", nama: "KONSINYASI NHM", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "26": { id: "26", padId: "026", nama: "KONSINYASI PARAMA MURTI SITE OBI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "026": { id: "26", padId: "026", nama: "KONSINYASI PARAMA MURTI SITE OBI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "27": { id: "27", padId: "027", nama: "KONSINYASI GETSEMANI SITE SEPO", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "027": { id: "27", padId: "027", nama: "KONSINYASI GETSEMANI SITE SEPO", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "28": { id: "28", padId: "028", nama: "KONSINYASI GETSEMANI SITE SMINGIT", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "028": { id: "28", padId: "028", nama: "KONSINYASI GETSEMANI SITE SMINGIT", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "29": { id: "29", padId: "029", nama: "KONSINYASI PARAMA MURTI SITE WAWONI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "029": { id: "29", padId: "029", nama: "KONSINYASI PARAMA MURTI SITE WAWONI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "30": { id: "30", padId: "030", nama: "KONSINYASI TJAKRINDO", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "030": { id: "30", padId: "030", nama: "KONSINYASI TJAKRINDO", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "31": { id: "31", padId: "031", nama: "KONSINYASI ONE HOSE GORONTALO", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "031": { id: "31", padId: "031", nama: "KONSINYASI ONE HOSE GORONTALO", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "32": { id: "32", padId: "032", nama: "KONSINYASI PT.HARMONIS", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "032": { id: "32", padId: "032", nama: "KONSINYASI PT.HARMONIS", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "33": { id: "33", padId: "033", nama: "KONSINYASI SMA GAG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "033": { id: "33", padId: "033", nama: "KONSINYASI SMA GAG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "34": { id: "34", padId: "034", nama: "KONSINYASI BCI WAIPIRIT", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "034": { id: "34", padId: "034", nama: "KONSINYASI BCI WAIPIRIT", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "35": { id: "35", padId: "035", nama: "KONSINYASI GETSEMANI SITE LANGKIKIMAN", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "035": { id: "35", padId: "035", nama: "KONSINYASI GETSEMANI SITE LANGKIKIMAN", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "37": { id: "37", padId: "037", nama: "KONSINYASI PARAMA GRUP SITE KETAPANG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "037": { id: "37", padId: "037", nama: "KONSINYASI PARAMA GRUP SITE KETAPANG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "38": { id: "38", padId: "038", nama: "KONSINYASI SMA WEDA", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "038": { id: "38", padId: "038", nama: "KONSINYASI SMA WEDA", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "40": { id: "40", padId: "040", nama: "BITUNG-DAMAGE", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "040": { id: "40", padId: "040", nama: "BITUNG-DAMAGE", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "41": { id: "41", padId: "041", nama: "KENDARI-CPA01", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "041": { id: "41", padId: "041", nama: "KENDARI-CPA01", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "42": { id: "42", padId: "042", nama: "KONSINYASI STM MOROWALI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "042": { id: "42", padId: "042", nama: "KONSINYASI STM MOROWALI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "43": { id: "43", padId: "043", nama: "KONSINYASI STM WEDA", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "043": { id: "43", padId: "043", nama: "KONSINYASI STM WEDA", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "44": { id: "44", padId: "044", nama: "KONSINYASI SKM GEBE", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "044": { id: "44", padId: "044", nama: "KONSINYASI SKM GEBE", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "49": { id: "49", padId: "049", nama: "SAMPIT - CPA 01", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "049": { id: "49", padId: "049", nama: "SAMPIT - CPA 01", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "57": { id: "57", padId: "057", nama: "WORKSHOP - BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "HO", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "057": { id: "57", padId: "057", nama: "WORKSHOP - BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "HO", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "58": { id: "58", padId: "058", nama: "PINJAMAN SHELL - BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "058": { id: "58", padId: "058", nama: "PINJAMAN SHELL - BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "67": { id: "67", padId: "067", nama: "KIMU JKT", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Jakarta", typeWh: "CPA WH" },
  "067": { id: "67", padId: "067", nama: "KIMU JKT", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Jakarta", typeWh: "CPA WH" },
  "70": { id: "70", padId: "070", nama: "GUDANG KONSINYASI TRACON INDUSTRY", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "070": { id: "70", padId: "070", nama: "GUDANG KONSINYASI TRACON INDUSTRY", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "71": { id: "71", padId: "071", nama: "KONSINYASI PT. SMA BAKAN", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "071": { id: "71", padId: "071", nama: "KONSINYASI PT. SMA BAKAN", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "73": { id: "73", padId: "073", nama: "PALU - CPA 01", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Palu", typeWh: "CPA WH" },
  "073": { id: "73", padId: "073", nama: "PALU - CPA 01", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Palu", typeWh: "CPA WH" },
  "74": { id: "74", padId: "074", nama: "PINJAMAN CRA - BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "074": { id: "74", padId: "074", nama: "PINJAMAN CRA - BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "78": { id: "78", padId: "078", nama: "KONSINYASI AIN PUTERI TERATAI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "078": { id: "78", padId: "078", nama: "KONSINYASI AIN PUTERI TERATAI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "79": { id: "79", padId: "079", nama: "KONSINYASI PANCA BINA PERSADA - BTG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "079": { id: "79", padId: "079", nama: "KONSINYASI PANCA BINA PERSADA - BTG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "80": { id: "80", padId: "080", nama: "KONSINYASI BULAWAN DAYA LESTARI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "080": { id: "80", padId: "080", nama: "KONSINYASI BULAWAN DAYA LESTARI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "83": { id: "83", padId: "083", nama: "MAKASSAR - CPA 01", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "083": { id: "83", padId: "083", nama: "MAKASSAR - CPA 01", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "87": { id: "87", padId: "087", nama: "KONSINYASI HARITA-OBI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "087": { id: "87", padId: "087", nama: "KONSINYASI HARITA-OBI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "102": { id: "102", padId: "102", nama: "KONSINYASI STM MBMA", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "109": { id: "109", padId: "109", nama: "PROMO - BITUNG", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "110": { id: "110", padId: "110", nama: "PROMO-AMBON", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Ambon", typeWh: "CPA WH" },
  "111": { id: "111", padId: "111", nama: "VHS HTE Site HSM", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "115": { id: "115", padId: "115", nama: "SOFIFI - HALMAHERA", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Sofifi", typeWh: "CPA WH" },
  "116": { id: "116", padId: "116", nama: "KONSINYASI PT. MMI - SITE PANI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "128": { id: "128", padId: "128", nama: "PROMO - SOFIFI", cabang: "Manado", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Sofifi", typeWh: "CPA WH" },
  "10": { id: "10", padId: "010", nama: "SAMPIT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "010": { id: "10", padId: "010", nama: "SAMPIT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "39": { id: "39", padId: "039", nama: "BPN - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "039": { id: "39", padId: "039", nama: "BPN - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "48": { id: "48", padId: "048", nama: "BITUNG - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "048": { id: "48", padId: "048", nama: "BITUNG - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "61": { id: "61", padId: "061", nama: "WORKSHOP - SAMPIT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "HO", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "061": { id: "61", padId: "061", nama: "WORKSHOP - SAMPIT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "HO", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "62": { id: "62", padId: "062", nama: "PINJAMAN SHELL - SAMPIT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "062": { id: "62", padId: "062", nama: "PINJAMAN SHELL - SAMPIT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "68": { id: "68", padId: "068", nama: "KONSINYASI PT BORNEO PRIMA - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "068": { id: "68", padId: "068", nama: "KONSINYASI PT BORNEO PRIMA - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "69": { id: "69", padId: "069", nama: "SAMPIT-DAMAGE", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "069": { id: "69", padId: "069", nama: "SAMPIT-DAMAGE", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "76": { id: "76", padId: "076", nama: "KENDARI-CPA03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "076": { id: "76", padId: "076", nama: "KENDARI-CPA03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Kendari", typeWh: "CPA WH" },
  "84": { id: "84", padId: "084", nama: "KONSINYASI TSH GROUP - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "084": { id: "84", padId: "084", nama: "KONSINYASI TSH GROUP - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "85": { id: "85", padId: "085", nama: "KONSINYASI PT MARUWAI COAL - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "085": { id: "85", padId: "085", nama: "KONSINYASI PT MARUWAI COAL - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "86": { id: "86", padId: "086", nama: "SURABAYA – CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Surabaya", typeWh: "CPA WH" },
  "086": { id: "86", padId: "086", nama: "SURABAYA – CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Surabaya", typeWh: "CPA WH" },
  "89": { id: "89", padId: "089", nama: "KONSINYASI PSM - WAHAU", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "089": { id: "89", padId: "089", nama: "KONSINYASI PSM - WAHAU", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "90": { id: "90", padId: "090", nama: "KONSINYASI PSM - DMP", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "090": { id: "90", padId: "090", nama: "KONSINYASI PSM - DMP", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "91": { id: "91", padId: "091", nama: "KONSINYASI PSM - BUHUT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "091": { id: "91", padId: "091", nama: "KONSINYASI PSM - BUHUT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "92": { id: "92", padId: "092", nama: "KONSINYASI PSM - JAKARTA", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "092": { id: "92", padId: "092", nama: "KONSINYASI PSM - JAKARTA", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "93": { id: "93", padId: "093", nama: "KONSINYASI PSM - TERNATE", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "093": { id: "93", padId: "093", nama: "KONSINYASI PSM - TERNATE", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "94": { id: "94", padId: "094", nama: "KONSINYASI PSM - MMP", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "094": { id: "94", padId: "094", nama: "KONSINYASI PSM - MMP", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "95": { id: "95", padId: "095", nama: "KONSINYASI PSM - KALBAR", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "095": { id: "95", padId: "095", nama: "KONSINYASI PSM - KALBAR", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "96": { id: "96", padId: "096", nama: "HORIZON CONSTRUCTION INDONESIA - BPN", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "096": { id: "96", padId: "096", nama: "HORIZON CONSTRUCTION INDONESIA - BPN", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "97": { id: "97", padId: "097", nama: "HORIZON CONSTRUCTION INDONESIA - BERAU", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Berau", typeWh: "CPA WH" },
  "097": { id: "97", padId: "097", nama: "HORIZON CONSTRUCTION INDONESIA - BERAU", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Berau", typeWh: "CPA WH" },
  "99": { id: "99", padId: "099", nama: "BERAU - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Berau", typeWh: "CPA WH" },
  "099": { id: "99", padId: "099", nama: "BERAU - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Berau", typeWh: "CPA WH" },
  "104": { id: "104", padId: "104", nama: "HORIZON CONSTRUCTION INDONESIA - SAMPIT", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Sampit", typeWh: "CPA WH" },
  "114": { id: "114", padId: "114", nama: "JAKARTA - CPA 03", cabang: "Sampit", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Jakarta", typeWh: "CPA WH" },
  "11": { id: "11", padId: "011", nama: "BANJARMASIN", cabang: "Banjarmasin", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Banjarmasin", typeWh: "CPA WH" },
  "011": { id: "11", padId: "011", nama: "BANJARMASIN", cabang: "Banjarmasin", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Banjarmasin", typeWh: "CPA WH" },
  "63": { id: "63", padId: "063", nama: "WORKSHOP - BANJARMASIN", cabang: "Banjarmasin", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Banjarmasin", typeWh: "CPA WH" },
  "063": { id: "63", padId: "063", nama: "WORKSHOP - BANJARMASIN", cabang: "Banjarmasin", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Banjarmasin", typeWh: "CPA WH" },
  "64": { id: "64", padId: "064", nama: "PINJAMAN SHELL - BANJARMASIN", cabang: "Banjarmasin", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Banjarmasin", typeWh: "CPA WH" },
  "064": { id: "64", padId: "064", nama: "PINJAMAN SHELL - BANJARMASIN", cabang: "Banjarmasin", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Banjarmasin", typeWh: "CPA WH" },
  "112": { id: "112", padId: "112", nama: "BANJARMASIN-DAMAGE", cabang: "Banjarmasin", codeArea: "03", cpaCode: "CPA03", actualArea: "03", lokasiWh: "Banjarmasin", typeWh: "CPA WH" },
  "12": { id: "12", padId: "012", nama: "AMBON, MALUKU & PAPUA", cabang: "Mapa", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Ambon", typeWh: "CPA WH" },
  "012": { id: "12", padId: "012", nama: "AMBON, MALUKU & PAPUA", cabang: "Mapa", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Ambon", typeWh: "CPA WH" },
  "65": { id: "65", padId: "065", nama: "WORKSHOP - AMBON", cabang: "Mapa", codeArea: "01", cpaCode: "CPA01", actualArea: "HO", lokasiWh: "Ambon", typeWh: "CPA WH" },
  "065": { id: "65", padId: "065", nama: "WORKSHOP - AMBON", cabang: "Mapa", codeArea: "01", cpaCode: "CPA01", actualArea: "HO", lokasiWh: "Ambon", typeWh: "CPA WH" },
  "66": { id: "66", padId: "066", nama: "PINJAMAN SHELL - AMBON", cabang: "Mapa", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Ambon", typeWh: "CPA WH" },
  "066": { id: "66", padId: "066", nama: "PINJAMAN SHELL - AMBON", cabang: "Mapa", codeArea: "01", cpaCode: "CPA01", actualArea: "01", lokasiWh: "Ambon", typeWh: "CPA WH" },
  "0": { id: "0", padId: "000", nama: "DAMAGE", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "000": { id: "0", padId: "000", nama: "DAMAGE", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "1": { id: "1", padId: "001", nama: "BALIKPAPAN", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "001": { id: "1", padId: "001", nama: "BALIKPAPAN", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "2": { id: "2", padId: "002", nama: "BPN - REGULER", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "002": { id: "2", padId: "002", nama: "BPN - REGULER", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "3": { id: "3", padId: "003", nama: "BPN - TCI", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "003": { id: "3", padId: "003", nama: "BPN - TCI", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "4": { id: "4", padId: "004", nama: "BPN - BUMA", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "004": { id: "4", padId: "004", nama: "BPN - BUMA", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "14": { id: "14", padId: "014", nama: "SURABAYA", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Surabaya", typeWh: "CPA WH" },
  "014": { id: "14", padId: "014", nama: "SURABAYA", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Surabaya", typeWh: "CPA WH" },
  "16": { id: "16", padId: "016", nama: "BPN – KONSINYASI MMS MARTABE", cabang: "HO - Balikpapan", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "016": { id: "16", padId: "016", nama: "BPN – KONSINYASI MMS MARTABE", cabang: "HO - Balikpapan", codeArea: "02", cpaCode: "CPA02", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "46": { id: "46", padId: "046", nama: "BPN – KONSINYASI MMS DOMPU (STM)", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "046": { id: "46", padId: "046", nama: "BPN – KONSINYASI MMS DOMPU (STM)", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "51": { id: "51", padId: "051", nama: "WORKSHOP - BPN", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "051": { id: "51", padId: "051", nama: "WORKSHOP - BPN", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "52": { id: "52", padId: "052", nama: "PINJAMAN SHELL - BPN", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "052": { id: "52", padId: "052", nama: "PINJAMAN SHELL - BPN", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
  "72": { id: "72", padId: "072", nama: "KONSINYASI ANAGA JAYA SARANA - TUHUP", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "072": { id: "72", padId: "072", nama: "KONSINYASI ANAGA JAYA SARANA - TUHUP", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "HO", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "77": { id: "77", padId: "077", nama: "KONSINYASI MACMAHON - PALU", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "077": { id: "77", padId: "077", nama: "KONSINYASI MACMAHON - PALU", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "88": { id: "88", padId: "088", nama: "KONSINYASI MACMAHON - TOKA", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "088": { id: "88", padId: "088", nama: "KONSINYASI MACMAHON - TOKA", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "01", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "106": { id: "106", padId: "106", nama: "KONSINYASI MACMAHON - LUWU", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "02", lokasiWh: "Konsinyasi", typeWh: "Konsinyasi" },
  "119": { id: "119", padId: "119", nama: "MACMAHON - PALU", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "02", lokasiWh: "Palu", typeWh: "CPA WH" },
  "120": { id: "120", padId: "120", nama: "MACMAHON - BITUNG", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "01", lokasiWh: "Bitung", typeWh: "CPA WH" },
  "121": { id: "121", padId: "121", nama: "MACMAHON - MAKASSAR", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "02", lokasiWh: "Makassar", typeWh: "CPA WH" },
  "125": { id: "125", padId: "125", nama: "MACMAHON - BALIKPAPAN", cabang: "HO - Balikpapan", codeArea: "HO", cpaCode: "HO", actualArea: "02", lokasiWh: "Balikpapan", typeWh: "CPA WH" },
};

export function getWarehouseMaster(
  id_gudang?: string | number | null,
  nama_gudang?: string | null
): WarehouseMasterRecord {
  if (id_gudang !== undefined && id_gudang !== null && String(id_gudang).trim() !== "") {
    const raw = String(id_gudang).trim();
    if (WAREHOUSE_MASTER_METADATA[raw]) return WAREHOUSE_MASTER_METADATA[raw];
    const pad = raw.padStart(3, "0");
    if (WAREHOUSE_MASTER_METADATA[pad]) return WAREHOUSE_MASTER_METADATA[pad];
    const num = parseInt(raw, 10);
    if (!isNaN(num) && WAREHOUSE_MASTER_METADATA[String(num)]) {
      return WAREHOUSE_MASTER_METADATA[String(num)];
    }
  }

  if (nama_gudang) {
    const ng = nama_gudang.trim().toUpperCase();
    for (const v of Object.values(WAREHOUSE_MASTER_METADATA)) {
      if (v.nama.toUpperCase() === ng) return v;
    }
    for (const v of Object.values(WAREHOUSE_MASTER_METADATA)) {
      if (ng.includes(v.nama.toUpperCase()) || v.nama.toUpperCase().includes(ng)) {
        return v;
      }
    }
  }

  const fallbackCpa = getWarehouseCodeArea(id_gudang, nama_gudang);
  const fallbackCode = fallbackCpa.replace("CPA", "") || "HO";
  const fallbackType = (nama_gudang || "").toUpperCase().includes("KONSINYASI") ? "Konsinyasi" : "CPA WH";

  return {
    id: String(id_gudang || ""),
    padId: String(id_gudang || "").padStart(3, "0"),
    nama: nama_gudang || "",
    cabang: "",
    codeArea: fallbackCode,
    cpaCode: fallbackCpa,
    actualArea: fallbackCode,
    lokasiWh: "",
    typeWh: fallbackType,
  };
}

export function getAreaBadgeStyle(area?: string) {
  const norm = (area || "").toUpperCase().replace("CPA", "");
  switch (norm) {
    case "01":
    case "1":
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        color: "#10b981",
        border: "1px solid rgba(16, 185, 129, 0.35)",
      };
    case "02":
    case "2":
      return {
        bg: "rgba(59, 130, 246, 0.12)",
        color: "#3b82f6",
        border: "1px solid rgba(59, 130, 246, 0.35)",
      };
    case "03":
    case "3":
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

export function getTypeWhBadgeStyle(typeWh?: string) {
  if ((typeWh || "").toLowerCase().includes("konsinyasi")) {
    return {
      bg: "rgba(245, 158, 11, 0.12)",
      color: "#f59e0b",
      border: "1px solid rgba(245, 158, 11, 0.35)",
    };
  }
  return {
    bg: "rgba(56, 189, 248, 0.12)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.35)",
  };
}
