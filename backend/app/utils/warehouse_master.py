"""
Master Warehouse & Code Area Mapping Utility
Sesuai ketetapan resmi master 120 gudang PT. Cahaya Pengajaran Abadi:
- CPA01: Manado (04), Mapa / Ambon (08)
- CPA02: Makasar (02), Palu (05), Kendari (03)
- CPA03: Sampit (06), Banjarmasin (07)
- HO: HO - Balikpapan (01)
"""
from typing import Optional, Dict

# Mapping lengkap 120 Id Gudang (padded 3 digit dan integer) -> Code Area
WAREHOUSE_CODE_AREA_MAP: Dict[str, str] = {
    # CPA02 - Makasar
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
    # CPA02 - Palu
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
    # CPA02 - Kendari
    "7": "CPA02", "007": "CPA02",
    "24": "CPA02", "024": "CPA02",
    "55": "CPA02", "055": "CPA02",
    "56": "CPA02", "056": "CPA02",
    "103": "CPA02",
    "113": "CPA02",
    "118": "CPA02",

    # CPA01 - Manado
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
    # CPA01 - Mapa
    "12": "CPA01", "012": "CPA01",
    "65": "CPA01", "065": "CPA01",
    "66": "CPA01", "066": "CPA01",

    # CPA03 - Sampit
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
    # CPA03 - Banjarmasin
    "11": "CPA03", "011": "CPA03",
    "63": "CPA03", "063": "CPA03",
    "64": "CPA03", "064": "CPA03",
    "112": "CPA03",

    # HO - Balikpapan
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
}

# Mapping Kantor/Cabang -> Code Area
KANTOR_CODE_AREA_MAP: Dict[str, str] = {
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
}

# Mapping id_kantor (2 digit) -> Code Area
ID_KANTOR_CODE_AREA_MAP: Dict[str, str] = {
    "01": "HO",
    "02": "CPA02",
    "03": "CPA02",
    "04": "CPA01",
    "05": "CPA02",
    "06": "CPA03",
    "07": "CPA03",
    "08": "CPA01",
}


def get_warehouse_code_area(
    id_gudang: Optional[str] = None,
    nama_gudang: Optional[str] = None,
    nama_kantor: Optional[str] = None,
    id_kantor: Optional[str] = None,
) -> str:
    """Mendapatkan Code Area (CPA01, CPA02, CPA03, HO) dengan prioritas ID, Kantor, atau Nama Gudang."""
    if id_gudang is not None:
        key = str(id_gudang).strip()
        if key in WAREHOUSE_CODE_AREA_MAP:
            return WAREHOUSE_CODE_AREA_MAP[key]
        padded = key.zfill(3)
        if padded in WAREHOUSE_CODE_AREA_MAP:
            return WAREHOUSE_CODE_AREA_MAP[padded]
        try:
            unpadded = str(int(key))
            if unpadded in WAREHOUSE_CODE_AREA_MAP:
                return WAREHOUSE_CODE_AREA_MAP[unpadded]
        except (ValueError, TypeError):
            pass

    if id_kantor is not None:
        ik = str(id_kantor).strip().zfill(2)
        if ik in ID_KANTOR_CODE_AREA_MAP:
            return ID_KANTOR_CODE_AREA_MAP[ik]

    if nama_kantor is not None:
        nk = str(nama_kantor).strip()
        if nk in KANTOR_CODE_AREA_MAP:
            return KANTOR_CODE_AREA_MAP[nk]
        for k, v in KANTOR_CODE_AREA_MAP.items():
            if k.lower() in nk.lower():
                return v

    if nama_gudang is not None:
        ng = str(nama_gudang).upper()
        if "CPA 01" in ng or "CPA01" in ng:
            return "CPA01"
        if "CPA 02" in ng or "CPA02" in ng:
            return "CPA02"
        if "CPA 03" in ng or "CPA03" in ng:
            return "CPA03"

    return "HO"

