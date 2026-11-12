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


# Master metadata lengkap 120 gudang: id, nama, cabang, code_area, actual_area, lokasi_wh, type_wh
WAREHOUSE_MASTER_DATA: Dict[str, Dict[str, str]] = {
    "5": {"id": "5", "pad_id": "005", "nama": "MAKASSAR", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "005": {"id": "5", "pad_id": "005", "nama": "MAKASSAR", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "36": {"id": "36", "pad_id": "036", "nama": "KONSINYASI PT. SEMEN TONASA", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "036": {"id": "36", "pad_id": "036", "nama": "KONSINYASI PT. SEMEN TONASA", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "45": {"id": "45", "pad_id": "045", "nama": "MAKASSAR-DAMAGE", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "045": {"id": "45", "pad_id": "045", "nama": "MAKASSAR-DAMAGE", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "47": {"id": "47", "pad_id": "047", "nama": "BITUNG - CPA 02", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "047": {"id": "47", "pad_id": "047", "nama": "BITUNG - CPA 02", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "50": {"id": "50", "pad_id": "050", "nama": "BPN - CPA02", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "050": {"id": "50", "pad_id": "050", "nama": "BPN - CPA02", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "53": {"id": "53", "pad_id": "053", "nama": "WORKSHOP - MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "HO", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "053": {"id": "53", "pad_id": "053", "nama": "WORKSHOP - MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "HO", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "54": {"id": "54", "pad_id": "054", "nama": "PINJAMAN SHELL - MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "054": {"id": "54", "pad_id": "054", "nama": "PINJAMAN SHELL - MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "81": {"id": "81", "pad_id": "081", "nama": "KONSINYASI PANCA BINA PERSADA - MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "081": {"id": "81", "pad_id": "081", "nama": "KONSINYASI PANCA BINA PERSADA - MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "100": {"id": "100", "pad_id": "100", "nama": "KENDARI - CPA MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "100": {"id": "100", "pad_id": "100", "nama": "KENDARI - CPA MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "101": {"id": "101", "pad_id": "101", "nama": "PALU - CPA MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "101": {"id": "101", "pad_id": "101", "nama": "PALU - CPA MKS", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "126": {"id": "126", "pad_id": "126", "nama": "KONSINYASI MAKKURAGA - MOROWALI", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "126": {"id": "126", "pad_id": "126", "nama": "KONSINYASI MAKKURAGA - MOROWALI", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "127": {"id": "127", "pad_id": "127", "nama": "KONSINYASI MAKKURAGA - PATTENE", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "127": {"id": "127", "pad_id": "127", "nama": "KONSINYASI MAKKURAGA - PATTENE", "cabang": "Makasar", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "9": {"id": "9", "pad_id": "009", "nama": "PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "009": {"id": "9", "pad_id": "009", "nama": "PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "59": {"id": "59", "pad_id": "059", "nama": "WORKSHOP - PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "HO", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "059": {"id": "59", "pad_id": "059", "nama": "WORKSHOP - PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "HO", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "60": {"id": "60", "pad_id": "060", "nama": "PINJAMAN SHELL - PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "060": {"id": "60", "pad_id": "060", "nama": "PINJAMAN SHELL - PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "75": {"id": "75", "pad_id": "075", "nama": "KONSINYASI TSINGSHAN KENDARI", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "075": {"id": "75", "pad_id": "075", "nama": "KONSINYASI TSINGSHAN KENDARI", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "82": {"id": "82", "pad_id": "082", "nama": "KENDARI - CPA PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "082": {"id": "82", "pad_id": "082", "nama": "KENDARI - CPA PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "98": {"id": "98", "pad_id": "098", "nama": "JAKARTA - CPA02", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Jakarta", "type_wh": "CPA WH"},
    "098": {"id": "98", "pad_id": "098", "nama": "JAKARTA - CPA02", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Jakarta", "type_wh": "CPA WH"},
    "105": {"id": "105", "pad_id": "105", "nama": "KONSINYASI TEMPOPRESS SITE BUNTA", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "105": {"id": "105", "pad_id": "105", "nama": "KONSINYASI TEMPOPRESS SITE BUNTA", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "107": {"id": "107", "pad_id": "107", "nama": "KONSINYASI TEMPOPRESS SITE SUBAIM", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "107": {"id": "107", "pad_id": "107", "nama": "KONSINYASI TEMPOPRESS SITE SUBAIM", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "108": {"id": "108", "pad_id": "108", "nama": "KONSINYASI TEMPOPRESS SITE SAGEA", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "108": {"id": "108", "pad_id": "108", "nama": "KONSINYASI TEMPOPRESS SITE SAGEA", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "117": {"id": "117", "pad_id": "117", "nama": "KENDARI - PALU RETAIL", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "117": {"id": "117", "pad_id": "117", "nama": "KENDARI - PALU RETAIL", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "122": {"id": "122", "pad_id": "122", "nama": "PALU - LABUHA INTERNUSA", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "122": {"id": "122", "pad_id": "122", "nama": "PALU - LABUHA INTERNUSA", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "123": {"id": "123", "pad_id": "123", "nama": "PALU - TEMPOPRESS GROUP", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "123": {"id": "123", "pad_id": "123", "nama": "PALU - TEMPOPRESS GROUP", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "124": {"id": "124", "pad_id": "124", "nama": "MAKASSAR - PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "124": {"id": "124", "pad_id": "124", "nama": "MAKASSAR - PALU", "cabang": "Palu", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "7": {"id": "7", "pad_id": "007", "nama": "KENDARI", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "007": {"id": "7", "pad_id": "007", "nama": "KENDARI", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "24": {"id": "24", "pad_id": "024", "nama": "MKSR KONSINYASI PT. ANTAM", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "024": {"id": "24", "pad_id": "024", "nama": "MKSR KONSINYASI PT. ANTAM", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "55": {"id": "55", "pad_id": "055", "nama": "WORKSHOP - KENDARI", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "HO", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "055": {"id": "55", "pad_id": "055", "nama": "WORKSHOP - KENDARI", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "HO", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "56": {"id": "56", "pad_id": "056", "nama": "PINJAMAN SHELL - KENDARI", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "056": {"id": "56", "pad_id": "056", "nama": "PINJAMAN SHELL - KENDARI", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "103": {"id": "103", "pad_id": "103", "nama": "HORIZON CONSTRUCTION INDONESIA - KENDARI", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "103": {"id": "103", "pad_id": "103", "nama": "HORIZON CONSTRUCTION INDONESIA - KENDARI", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "113": {"id": "113", "pad_id": "113", "nama": "KENDARI-DAMAGE", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "113": {"id": "113", "pad_id": "113", "nama": "KENDARI-DAMAGE", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "118": {"id": "118", "pad_id": "118", "nama": "KENDARI - SMELTER", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "118": {"id": "118", "pad_id": "118", "nama": "KENDARI - SMELTER", "cabang": "Kendari", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "129": {"id": "129", "pad_id": "129", "nama": "SOFIFI - CPA02", "cabang": "Palu", "code_area": "01", "cpa_code": "CPA01", "actual_area": "02", "lokasi_wh": "Sofifi", "type_wh": "CPA WH"},
    "129": {"id": "129", "pad_id": "129", "nama": "SOFIFI - CPA02", "cabang": "Palu", "code_area": "01", "cpa_code": "CPA01", "actual_area": "02", "lokasi_wh": "Sofifi", "type_wh": "CPA WH"},
    "13": {"id": "13", "pad_id": "013", "nama": "BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "013": {"id": "13", "pad_id": "013", "nama": "BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "25": {"id": "25", "pad_id": "025", "nama": "KONSINYASI NHM", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "025": {"id": "25", "pad_id": "025", "nama": "KONSINYASI NHM", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "26": {"id": "26", "pad_id": "026", "nama": "KONSINYASI PARAMA MURTI SITE OBI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "026": {"id": "26", "pad_id": "026", "nama": "KONSINYASI PARAMA MURTI SITE OBI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "27": {"id": "27", "pad_id": "027", "nama": "KONSINYASI GETSEMANI SITE SEPO", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "027": {"id": "27", "pad_id": "027", "nama": "KONSINYASI GETSEMANI SITE SEPO", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "28": {"id": "28", "pad_id": "028", "nama": "KONSINYASI GETSEMANI SITE SMINGIT", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "028": {"id": "28", "pad_id": "028", "nama": "KONSINYASI GETSEMANI SITE SMINGIT", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "29": {"id": "29", "pad_id": "029", "nama": "KONSINYASI PARAMA MURTI SITE WAWONI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "029": {"id": "29", "pad_id": "029", "nama": "KONSINYASI PARAMA MURTI SITE WAWONI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "30": {"id": "30", "pad_id": "030", "nama": "KONSINYASI TJAKRINDO", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "030": {"id": "30", "pad_id": "030", "nama": "KONSINYASI TJAKRINDO", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "31": {"id": "31", "pad_id": "031", "nama": "KONSINYASI ONE HOSE GORONTALO", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "031": {"id": "31", "pad_id": "031", "nama": "KONSINYASI ONE HOSE GORONTALO", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "32": {"id": "32", "pad_id": "032", "nama": "KONSINYASI PT.HARMONIS", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "032": {"id": "32", "pad_id": "032", "nama": "KONSINYASI PT.HARMONIS", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "33": {"id": "33", "pad_id": "033", "nama": "KONSINYASI SMA GAG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "033": {"id": "33", "pad_id": "033", "nama": "KONSINYASI SMA GAG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "34": {"id": "34", "pad_id": "034", "nama": "KONSINYASI BCI WAIPIRIT", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "034": {"id": "34", "pad_id": "034", "nama": "KONSINYASI BCI WAIPIRIT", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "35": {"id": "35", "pad_id": "035", "nama": "KONSINYASI GETSEMANI SITE LANGKIKIMAN", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "035": {"id": "35", "pad_id": "035", "nama": "KONSINYASI GETSEMANI SITE LANGKIKIMAN", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "37": {"id": "37", "pad_id": "037", "nama": "KONSINYASI PARAMA GRUP SITE KETAPANG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "037": {"id": "37", "pad_id": "037", "nama": "KONSINYASI PARAMA GRUP SITE KETAPANG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "38": {"id": "38", "pad_id": "038", "nama": "KONSINYASI SMA WEDA", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "038": {"id": "38", "pad_id": "038", "nama": "KONSINYASI SMA WEDA", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "40": {"id": "40", "pad_id": "040", "nama": "BITUNG-DAMAGE", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "040": {"id": "40", "pad_id": "040", "nama": "BITUNG-DAMAGE", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "41": {"id": "41", "pad_id": "041", "nama": "KENDARI-CPA01", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "041": {"id": "41", "pad_id": "041", "nama": "KENDARI-CPA01", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "42": {"id": "42", "pad_id": "042", "nama": "KONSINYASI STM MOROWALI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "042": {"id": "42", "pad_id": "042", "nama": "KONSINYASI STM MOROWALI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "43": {"id": "43", "pad_id": "043", "nama": "KONSINYASI STM WEDA", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "043": {"id": "43", "pad_id": "043", "nama": "KONSINYASI STM WEDA", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "44": {"id": "44", "pad_id": "044", "nama": "KONSINYASI SKM GEBE", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "044": {"id": "44", "pad_id": "044", "nama": "KONSINYASI SKM GEBE", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "49": {"id": "49", "pad_id": "049", "nama": "SAMPIT - CPA 01", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "049": {"id": "49", "pad_id": "049", "nama": "SAMPIT - CPA 01", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "57": {"id": "57", "pad_id": "057", "nama": "WORKSHOP - BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "HO", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "057": {"id": "57", "pad_id": "057", "nama": "WORKSHOP - BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "HO", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "58": {"id": "58", "pad_id": "058", "nama": "PINJAMAN SHELL - BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "058": {"id": "58", "pad_id": "058", "nama": "PINJAMAN SHELL - BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "67": {"id": "67", "pad_id": "067", "nama": "KIMU JKT", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Jakarta", "type_wh": "CPA WH"},
    "067": {"id": "67", "pad_id": "067", "nama": "KIMU JKT", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Jakarta", "type_wh": "CPA WH"},
    "70": {"id": "70", "pad_id": "070", "nama": "GUDANG KONSINYASI TRACON INDUSTRY", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "070": {"id": "70", "pad_id": "070", "nama": "GUDANG KONSINYASI TRACON INDUSTRY", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "71": {"id": "71", "pad_id": "071", "nama": "KONSINYASI PT. SMA BAKAN", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "071": {"id": "71", "pad_id": "071", "nama": "KONSINYASI PT. SMA BAKAN", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "73": {"id": "73", "pad_id": "073", "nama": "PALU - CPA 01", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "073": {"id": "73", "pad_id": "073", "nama": "PALU - CPA 01", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "74": {"id": "74", "pad_id": "074", "nama": "PINJAMAN CRA - BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "074": {"id": "74", "pad_id": "074", "nama": "PINJAMAN CRA - BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "78": {"id": "78", "pad_id": "078", "nama": "KONSINYASI AIN PUTERI TERATAI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "078": {"id": "78", "pad_id": "078", "nama": "KONSINYASI AIN PUTERI TERATAI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "79": {"id": "79", "pad_id": "079", "nama": "KONSINYASI PANCA BINA PERSADA - BTG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "079": {"id": "79", "pad_id": "079", "nama": "KONSINYASI PANCA BINA PERSADA - BTG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "80": {"id": "80", "pad_id": "080", "nama": "KONSINYASI BULAWAN DAYA LESTARI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "080": {"id": "80", "pad_id": "080", "nama": "KONSINYASI BULAWAN DAYA LESTARI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "83": {"id": "83", "pad_id": "083", "nama": "MAKASSAR - CPA 01", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "083": {"id": "83", "pad_id": "083", "nama": "MAKASSAR - CPA 01", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "87": {"id": "87", "pad_id": "087", "nama": "KONSINYASI HARITA-OBI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "087": {"id": "87", "pad_id": "087", "nama": "KONSINYASI HARITA-OBI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "102": {"id": "102", "pad_id": "102", "nama": "KONSINYASI STM MBMA", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "102": {"id": "102", "pad_id": "102", "nama": "KONSINYASI STM MBMA", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "109": {"id": "109", "pad_id": "109", "nama": "PROMO - BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "109": {"id": "109", "pad_id": "109", "nama": "PROMO - BITUNG", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "110": {"id": "110", "pad_id": "110", "nama": "PROMO-AMBON", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Ambon", "type_wh": "CPA WH"},
    "110": {"id": "110", "pad_id": "110", "nama": "PROMO-AMBON", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Ambon", "type_wh": "CPA WH"},
    "111": {"id": "111", "pad_id": "111", "nama": "VHS HTE Site HSM", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "111": {"id": "111", "pad_id": "111", "nama": "VHS HTE Site HSM", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "115": {"id": "115", "pad_id": "115", "nama": "SOFIFI - HALMAHERA", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Sofifi", "type_wh": "CPA WH"},
    "115": {"id": "115", "pad_id": "115", "nama": "SOFIFI - HALMAHERA", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Sofifi", "type_wh": "CPA WH"},
    "116": {"id": "116", "pad_id": "116", "nama": "KONSINYASI PT. MMI - SITE PANI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "116": {"id": "116", "pad_id": "116", "nama": "KONSINYASI PT. MMI - SITE PANI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "128": {"id": "128", "pad_id": "128", "nama": "PROMO - SOFIFI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Sofifi", "type_wh": "CPA WH"},
    "128": {"id": "128", "pad_id": "128", "nama": "PROMO - SOFIFI", "cabang": "Manado", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Sofifi", "type_wh": "CPA WH"},
    "10": {"id": "10", "pad_id": "010", "nama": "SAMPIT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "010": {"id": "10", "pad_id": "010", "nama": "SAMPIT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "39": {"id": "39", "pad_id": "039", "nama": "BPN - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "039": {"id": "39", "pad_id": "039", "nama": "BPN - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "48": {"id": "48", "pad_id": "048", "nama": "BITUNG - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "048": {"id": "48", "pad_id": "048", "nama": "BITUNG - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "61": {"id": "61", "pad_id": "061", "nama": "WORKSHOP - SAMPIT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "HO", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "061": {"id": "61", "pad_id": "061", "nama": "WORKSHOP - SAMPIT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "HO", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "62": {"id": "62", "pad_id": "062", "nama": "PINJAMAN SHELL - SAMPIT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "062": {"id": "62", "pad_id": "062", "nama": "PINJAMAN SHELL - SAMPIT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "68": {"id": "68", "pad_id": "068", "nama": "KONSINYASI PT BORNEO PRIMA - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "068": {"id": "68", "pad_id": "068", "nama": "KONSINYASI PT BORNEO PRIMA - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "69": {"id": "69", "pad_id": "069", "nama": "SAMPIT-DAMAGE", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "069": {"id": "69", "pad_id": "069", "nama": "SAMPIT-DAMAGE", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "76": {"id": "76", "pad_id": "076", "nama": "KENDARI-CPA03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "076": {"id": "76", "pad_id": "076", "nama": "KENDARI-CPA03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Kendari", "type_wh": "CPA WH"},
    "84": {"id": "84", "pad_id": "084", "nama": "KONSINYASI TSH GROUP - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "084": {"id": "84", "pad_id": "084", "nama": "KONSINYASI TSH GROUP - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "85": {"id": "85", "pad_id": "085", "nama": "KONSINYASI PT MARUWAI COAL - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "085": {"id": "85", "pad_id": "085", "nama": "KONSINYASI PT MARUWAI COAL - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "86": {"id": "86", "pad_id": "086", "nama": "SURABAYA – CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Surabaya", "type_wh": "CPA WH"},
    "086": {"id": "86", "pad_id": "086", "nama": "SURABAYA – CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Surabaya", "type_wh": "CPA WH"},
    "89": {"id": "89", "pad_id": "089", "nama": "KONSINYASI PSM - WAHAU", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "089": {"id": "89", "pad_id": "089", "nama": "KONSINYASI PSM - WAHAU", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "90": {"id": "90", "pad_id": "090", "nama": "KONSINYASI PSM - DMP", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "090": {"id": "90", "pad_id": "090", "nama": "KONSINYASI PSM - DMP", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "91": {"id": "91", "pad_id": "091", "nama": "KONSINYASI PSM - BUHUT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "091": {"id": "91", "pad_id": "091", "nama": "KONSINYASI PSM - BUHUT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "92": {"id": "92", "pad_id": "092", "nama": "KONSINYASI PSM - JAKARTA", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "092": {"id": "92", "pad_id": "092", "nama": "KONSINYASI PSM - JAKARTA", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "93": {"id": "93", "pad_id": "093", "nama": "KONSINYASI PSM - TERNATE", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "093": {"id": "93", "pad_id": "093", "nama": "KONSINYASI PSM - TERNATE", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "94": {"id": "94", "pad_id": "094", "nama": "KONSINYASI PSM - MMP", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "094": {"id": "94", "pad_id": "094", "nama": "KONSINYASI PSM - MMP", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "95": {"id": "95", "pad_id": "095", "nama": "KONSINYASI PSM - KALBAR", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "095": {"id": "95", "pad_id": "095", "nama": "KONSINYASI PSM - KALBAR", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "96": {"id": "96", "pad_id": "096", "nama": "HORIZON CONSTRUCTION INDONESIA - BPN", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "096": {"id": "96", "pad_id": "096", "nama": "HORIZON CONSTRUCTION INDONESIA - BPN", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "97": {"id": "97", "pad_id": "097", "nama": "HORIZON CONSTRUCTION INDONESIA - BERAU", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Berau", "type_wh": "CPA WH"},
    "097": {"id": "97", "pad_id": "097", "nama": "HORIZON CONSTRUCTION INDONESIA - BERAU", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Berau", "type_wh": "CPA WH"},
    "99": {"id": "99", "pad_id": "099", "nama": "BERAU - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Berau", "type_wh": "CPA WH"},
    "099": {"id": "99", "pad_id": "099", "nama": "BERAU - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Berau", "type_wh": "CPA WH"},
    "104": {"id": "104", "pad_id": "104", "nama": "HORIZON CONSTRUCTION INDONESIA - SAMPIT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "104": {"id": "104", "pad_id": "104", "nama": "HORIZON CONSTRUCTION INDONESIA - SAMPIT", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Sampit", "type_wh": "CPA WH"},
    "114": {"id": "114", "pad_id": "114", "nama": "JAKARTA - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Jakarta", "type_wh": "CPA WH"},
    "114": {"id": "114", "pad_id": "114", "nama": "JAKARTA - CPA 03", "cabang": "Sampit", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Jakarta", "type_wh": "CPA WH"},
    "11": {"id": "11", "pad_id": "011", "nama": "BANJARMASIN", "cabang": "Banjarmasin", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Banjarmasin", "type_wh": "CPA WH"},
    "011": {"id": "11", "pad_id": "011", "nama": "BANJARMASIN", "cabang": "Banjarmasin", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Banjarmasin", "type_wh": "CPA WH"},
    "63": {"id": "63", "pad_id": "063", "nama": "WORKSHOP - BANJARMASIN", "cabang": "Banjarmasin", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Banjarmasin", "type_wh": "CPA WH"},
    "063": {"id": "63", "pad_id": "063", "nama": "WORKSHOP - BANJARMASIN", "cabang": "Banjarmasin", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Banjarmasin", "type_wh": "CPA WH"},
    "64": {"id": "64", "pad_id": "064", "nama": "PINJAMAN SHELL - BANJARMASIN", "cabang": "Banjarmasin", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Banjarmasin", "type_wh": "CPA WH"},
    "064": {"id": "64", "pad_id": "064", "nama": "PINJAMAN SHELL - BANJARMASIN", "cabang": "Banjarmasin", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Banjarmasin", "type_wh": "CPA WH"},
    "112": {"id": "112", "pad_id": "112", "nama": "BANJARMASIN-DAMAGE", "cabang": "Banjarmasin", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Banjarmasin", "type_wh": "CPA WH"},
    "112": {"id": "112", "pad_id": "112", "nama": "BANJARMASIN-DAMAGE", "cabang": "Banjarmasin", "code_area": "03", "cpa_code": "CPA03", "actual_area": "03", "lokasi_wh": "Banjarmasin", "type_wh": "CPA WH"},
    "12": {"id": "12", "pad_id": "012", "nama": "AMBON, MALUKU & PAPUA", "cabang": "Mapa", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Ambon", "type_wh": "CPA WH"},
    "012": {"id": "12", "pad_id": "012", "nama": "AMBON, MALUKU & PAPUA", "cabang": "Mapa", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Ambon", "type_wh": "CPA WH"},
    "65": {"id": "65", "pad_id": "065", "nama": "WORKSHOP - AMBON", "cabang": "Mapa", "code_area": "01", "cpa_code": "CPA01", "actual_area": "HO", "lokasi_wh": "Ambon", "type_wh": "CPA WH"},
    "065": {"id": "65", "pad_id": "065", "nama": "WORKSHOP - AMBON", "cabang": "Mapa", "code_area": "01", "cpa_code": "CPA01", "actual_area": "HO", "lokasi_wh": "Ambon", "type_wh": "CPA WH"},
    "66": {"id": "66", "pad_id": "066", "nama": "PINJAMAN SHELL - AMBON", "cabang": "Mapa", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Ambon", "type_wh": "CPA WH"},
    "066": {"id": "66", "pad_id": "066", "nama": "PINJAMAN SHELL - AMBON", "cabang": "Mapa", "code_area": "01", "cpa_code": "CPA01", "actual_area": "01", "lokasi_wh": "Ambon", "type_wh": "CPA WH"},
    "0": {"id": "0", "pad_id": "000", "nama": "DAMAGE", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "000": {"id": "0", "pad_id": "000", "nama": "DAMAGE", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "1": {"id": "1", "pad_id": "001", "nama": "BALIKPAPAN", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "001": {"id": "1", "pad_id": "001", "nama": "BALIKPAPAN", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "2": {"id": "2", "pad_id": "002", "nama": "BPN - REGULER", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "002": {"id": "2", "pad_id": "002", "nama": "BPN - REGULER", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "3": {"id": "3", "pad_id": "003", "nama": "BPN - TCI", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "003": {"id": "3", "pad_id": "003", "nama": "BPN - TCI", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "4": {"id": "4", "pad_id": "004", "nama": "BPN - BUMA", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "004": {"id": "4", "pad_id": "004", "nama": "BPN - BUMA", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "14": {"id": "14", "pad_id": "014", "nama": "SURABAYA", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Surabaya", "type_wh": "CPA WH"},
    "014": {"id": "14", "pad_id": "014", "nama": "SURABAYA", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Surabaya", "type_wh": "CPA WH"},
    "16": {"id": "16", "pad_id": "016", "nama": "BPN – KONSINYASI MMS MARTABE", "cabang": "HO - Balikpapan", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "016": {"id": "16", "pad_id": "016", "nama": "BPN – KONSINYASI MMS MARTABE", "cabang": "HO - Balikpapan", "code_area": "02", "cpa_code": "CPA02", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "46": {"id": "46", "pad_id": "046", "nama": "BPN – KONSINYASI MMS DOMPU (STM)", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "046": {"id": "46", "pad_id": "046", "nama": "BPN – KONSINYASI MMS DOMPU (STM)", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "51": {"id": "51", "pad_id": "051", "nama": "WORKSHOP - BPN", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "051": {"id": "51", "pad_id": "051", "nama": "WORKSHOP - BPN", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "52": {"id": "52", "pad_id": "052", "nama": "PINJAMAN SHELL - BPN", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "052": {"id": "52", "pad_id": "052", "nama": "PINJAMAN SHELL - BPN", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "72": {"id": "72", "pad_id": "072", "nama": "KONSINYASI ANAGA JAYA SARANA - TUHUP", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "072": {"id": "72", "pad_id": "072", "nama": "KONSINYASI ANAGA JAYA SARANA - TUHUP", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "HO", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "77": {"id": "77", "pad_id": "077", "nama": "KONSINYASI MACMAHON - PALU", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "077": {"id": "77", "pad_id": "077", "nama": "KONSINYASI MACMAHON - PALU", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "88": {"id": "88", "pad_id": "088", "nama": "KONSINYASI MACMAHON - TOKA", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "088": {"id": "88", "pad_id": "088", "nama": "KONSINYASI MACMAHON - TOKA", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "01", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "106": {"id": "106", "pad_id": "106", "nama": "KONSINYASI MACMAHON - LUWU", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "106": {"id": "106", "pad_id": "106", "nama": "KONSINYASI MACMAHON - LUWU", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Konsinyasi", "type_wh": "Konsinyasi"},
    "119": {"id": "119", "pad_id": "119", "nama": "MACMAHON - PALU", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "119": {"id": "119", "pad_id": "119", "nama": "MACMAHON - PALU", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Palu", "type_wh": "CPA WH"},
    "120": {"id": "120", "pad_id": "120", "nama": "MACMAHON - BITUNG", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "120": {"id": "120", "pad_id": "120", "nama": "MACMAHON - BITUNG", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "01", "lokasi_wh": "Bitung", "type_wh": "CPA WH"},
    "121": {"id": "121", "pad_id": "121", "nama": "MACMAHON - MAKASSAR", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "121": {"id": "121", "pad_id": "121", "nama": "MACMAHON - MAKASSAR", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Makassar", "type_wh": "CPA WH"},
    "125": {"id": "125", "pad_id": "125", "nama": "MACMAHON - BALIKPAPAN", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
    "125": {"id": "125", "pad_id": "125", "nama": "MACMAHON - BALIKPAPAN", "cabang": "HO - Balikpapan", "code_area": "HO", "cpa_code": "HO", "actual_area": "02", "lokasi_wh": "Balikpapan", "type_wh": "CPA WH"},
}

WAREHOUSE_MASTER_BY_NAME: Dict[str, Dict[str, str]] = {}
for _v in WAREHOUSE_MASTER_DATA.values():
    if _v.get("nama"):
        WAREHOUSE_MASTER_BY_NAME[_v["nama"].strip().upper()] = _v


def get_warehouse_master(id_gudang: Optional[str] = None, nama_gudang: Optional[str] = None) -> Dict[str, str]:
    """Mengembalikan dictionary metadata gudang (code_area, actual_area, type_wh, lokasi_wh, cabang, dll)."""
    if id_gudang is not None:
        raw = str(id_gudang).strip()
        if raw in WAREHOUSE_MASTER_DATA:
            return WAREHOUSE_MASTER_DATA[raw]
        padded = raw.zfill(3)
        if padded in WAREHOUSE_MASTER_DATA:
            return WAREHOUSE_MASTER_DATA[padded]
        try:
            unpadded = str(int(raw))
            if unpadded in WAREHOUSE_MASTER_DATA:
                return WAREHOUSE_MASTER_DATA[unpadded]
        except (ValueError, TypeError):
            pass

    if nama_gudang:
        ng = str(nama_gudang).strip().upper()
        if ng in WAREHOUSE_MASTER_BY_NAME:
            return WAREHOUSE_MASTER_BY_NAME[ng]
        for k, v in WAREHOUSE_MASTER_BY_NAME.items():
            if k in ng or ng in k:
                return v

    fallback_cpa = get_warehouse_code_area(id_gudang=id_gudang, nama_gudang=nama_gudang)
    fallback_code = fallback_cpa.replace("CPA", "") if fallback_cpa.startswith("CPA") else fallback_cpa
    fallback_type = "Konsinyasi" if "KONSINYASI" in str(nama_gudang or "").upper() else "CPA WH"
    return {
        "id": str(id_gudang or ""),
        "pad_id": str(id_gudang or "").zfill(3),
        "nama": str(nama_gudang or ""),
        "cabang": "",
        "code_area": fallback_code,
        "cpa_code": fallback_cpa,
        "actual_area": fallback_code,
        "lokasi_wh": "",
        "type_wh": fallback_type,
    }


def get_warehouse_actual_area(id_gudang: Optional[str] = None, nama_gudang: Optional[str] = None) -> str:
    """Mengembalikan Actual Area Penjualan (01, 02, 03, atau HO)."""
    return get_warehouse_master(id_gudang, nama_gudang).get("actual_area", "HO")


def get_warehouse_type(id_gudang: Optional[str] = None, nama_gudang: Optional[str] = None) -> str:
    """Mengembalikan Type WH ('CPA WH' atau 'Konsinyasi')."""
    return get_warehouse_master(id_gudang, nama_gudang).get("type_wh", "CPA WH")
