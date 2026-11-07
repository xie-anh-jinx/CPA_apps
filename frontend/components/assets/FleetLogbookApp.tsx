"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import "@/app/fleet-logbook.css";

const STORE = "cpa_fleet_logbook_v1";

const rupiah = (n: any) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const num = (n: any) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(n || 0));

const today = () => {
  const d = new Date(),
    z = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - z).toISOString().slice(0, 10);
};

const daysUntil = (d: any) => {
  if (!d) return null;
  const t = new Date(today()),
    x = new Date(d);
  if (isNaN(x.getTime())) return null;
  return Math.round((x.getTime() - t.getTime()) / 86400000);
};

const esc = (s: any) =>
  String(s ?? "").replace(
    /[&<>'"]/g,
    (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[c] || c)
  );

const configs: Record<string, any> = {
  vehicle: {
    label: "Data Kendaraan",
    short: "Kendaraan",
    description: "Master data seluruh kendaraan PT CPA & PT CRA.",
    fields: [
      ["location", "Lokasi", "text", 1],
      ["plate", "No Polisi", "text", 1],
      ["oldPlate", "No. Pol Lama", "text"],
      ["owner", "Nama Pemilik", "text", 1],
      ["address", "Alamat", "textarea", "full"],
      ["brand", "Merk", "text", 1],
      ["type", "Type Kendaraan", "text", 1],
      ["tonage", "Tonase", "text"],
      ["vehicleType", "Tipe", "text"],
      ["jenis", "Jenis", "text"],
      ["model", "Model", "text"],
      ["year", "Tahun Pembuatan", "number"],
      ["cylinder", "Isi Silinder", "text"],
      ["chassisNo", "No Rangka", "text"],
      ["engineNo", "No Mesin", "text"],
      ["color", "Warna", "text"],
      ["fuel", "BBM", "text"],
      ["plateColor", "Warna TNKB", "text"],
      ["bpkbNo", "No BPKB", "text"],
      ["keyNo", "No Kunci", "text"],
      ["testNo", "No Uji", "text"],
      ["personInCharge", "Penanggung Jawab", "text"],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["plate", "No Polisi"],
      ["brand", "Merk"],
      ["type", "Type"],
      ["year", "Tahun"],
      ["location", "Lokasi"],
      ["owner", "Pemilik"],
      ["personInCharge", "Penanggung"],
      ["jenis", "Jenis"],
    ],
    summary: (r: any) => `${r.brand || ""} ${r.type || ""}`.trim(),
    officer: (r: any) => r.personInCharge || "-",
  },
  tax: {
    label: "Pajak & STNK",
    short: "Pajak",
    description: "Monitoring masa berlaku STNK dan pajak kendaraan.",
    fields: [
      ["plate", "No Polisi", "text", 1],
      ["owner", "Nama Pemilik", "text"],
      ["stnkDate", "Tanggal STNK", "date", 1],
      ["taxDate", "Tanggal Pajak", "date", 1],
      ["taxAmount", "Jumlah Pajak (Rp)", "number"],
      ["renewedDate", "Diperpanjang Pada Tanggal", "date"],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["plate", "No Polisi"],
      ["owner", "Pemilik"],
      ["stnkDate", "STNK"],
      ["taxDate", "Pajak"],
      ["_days", "Sisa Hari"],
      ["taxAmount", "Jumlah Pajak"],
      ["renewedDate", "Diperpanjang"],
      ["notes", "Keterangan"],
    ],
    summary: (r: any) => r.plate || "-",
    officer: (r: any) => r.owner || "-",
  },
  kir: {
    label: "KIR (Uji Kendaraan)",
    short: "KIR",
    description: "Monitoring masa berlaku KIR / uji kendaraan.",
    fields: [
      ["plate", "No Polisi", "text", 1],
      ["owner", "Nama Pemilik", "text"],
      ["testNo", "No Uji", "text"],
      ["kirDate", "Tanggal KIR", "date", 1],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["plate", "No Polisi"],
      ["owner", "Pemilik"],
      ["testNo", "No Uji"],
      ["kirDate", "Tanggal KIR"],
      ["_days", "Sisa Hari"],
      ["notes", "Keterangan"],
    ],
    summary: (r: any) => r.plate || "-",
    officer: (r: any) => r.owner || "-",
  },
  insurance: {
    label: "Asuransi Kendaraan",
    short: "Asuransi",
    description: "Data polis asuransi kendaraan.",
    fields: [
      ["plate", "No Polisi", "text", 1],
      ["owner", "Nama Pemilik", "text"],
      ["vendor", "Nama Vendor", "text", 1],
      ["policyNo", "No. Polis", "text", 1],
      ["coverageName", "Nama Pertanggungan", "text"],
      ["premium", "Nilai Premi (Rp)", "number"],
      ["coverageValue", "Nilai Pertanggungan (Rp)", "number"],
      ["tjh", "Nilai TJH Pihak ke-3 (Rp)", "number"],
      ["validFrom", "Masa Berlaku Dari", "date"],
      ["validTo", "Masa Berlaku Sampai", "date", 1],
      ["renewalDate", "Tanggal Perpanjangan", "date"],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["plate", "No Polisi"],
      ["owner", "Pemilik"],
      ["vendor", "Vendor"],
      ["policyNo", "No. Polis"],
      ["premium", "Premi"],
      ["coverageValue", "Pertanggungan"],
      ["validTo", "Masa Berlaku"],
      ["_days", "Sisa Hari"],
    ],
    summary: (r: any) => r.plate || "-",
    officer: (r: any) => r.owner || "-",
  },
  forklift: {
    label: "Data Forklift",
    short: "Forklift",
    description: "Master data forklift per cabang.",
    fields: [
      ["location", "Lokasi Cabang", "text", 1],
      ["brand", "Brand", "text", 1],
      ["serialNo", "Serial No", "text", 1],
      ["model", "Model", "text"],
      ["truckWeight", "Truck Weight", "text"],
      ["capacity", "Capacity", "text"],
      ["prodYear", "Tahun Produksi", "number"],
      ["owner", "Pemilik", "text"],
      [
        "insuranceStatus",
        "Status Asuransi",
        "select",
        1,
        ["ASURANSI OK", "Leasing", "Proses", "Tidak Ada"],
      ],
      ["capacityTon", "Kapasitas (Ton)", "text"],
      ["engineNo", "No Mesin", "text"],
      ["policyNo", "No. Polis", "text"],
      ["premium", "Nilai Premi (Rp)", "number"],
      ["coverageValue", "Nilai Pertanggungan (Rp)", "number"],
      ["validTo", "Masa Berlaku", "date"],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["location", "Lokasi"],
      ["brand", "Brand"],
      ["serialNo", "Serial No"],
      ["model", "Model"],
      ["capacity", "Capacity"],
      ["prodYear", "Tahun"],
      ["insuranceStatus", "Asuransi"],
      ["validTo", "Masa Berlaku"],
      ["_days", "Sisa Hari"],
    ],
    summary: (r: any) => `${r.brand || ""} ${r.model || ""}`.trim(),
    officer: (r: any) => r.owner || "-",
  },
};

const VEHICLE_DATA: any[] = [
  { location: 'Banjarmasin', plate: 'KT 1648 KY', owner: 'PT.CPA', brand: 'TOYOTA', type: 'AVANZA 1300 G (F601RM GMMFJJ)', tonage: '', vehicleType: 'LV', jenis: '', model: '', year: 2011, cylinder: '', chassisNo: 'MHFM1BA3JBK377052', engineNo: 'DJ58595', color: 'SILVER METALIK', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'YOVIE', notes: '', address: '' },
  { location: '', plate: 'KT 8392 AA', owner: 'SAMUEL C.H', brand: 'ISUZU', type: 'PRLC TBR 54/2499', tonage: '2.100 Kg', vehicleType: 'PANTHER', jenis: 'MB. BARANG', model: 'PICK UP', year: 2006, cylinder: '', chassisNo: 'MHCTBR54B6K130519', engineNo: 'E130519', color: 'KUNING', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'CD 021017784', personInCharge: 'OP w/h - YOVIE', notes: '003/CRA/PP/X/2026', address: '' },
  { location: 'Palu', plate: 'DD 8815 RB', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'TRITON 2.5L DC HDX-H (4X4) M/T', tonage: '2.850 Kg', vehicleType: 'TRITON', jenis: 'MB.BARANG', model: 'DOUBLE CABIN', year: 2018, cylinder: '', chassisNo: 'MMBJNKL30JH069424', engineNo: '4D56UAV6265', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'ESRA', notes: '', address: '' },
  { location: '', plate: 'DN 5804 IM', owner: 'LANNY CHOWINDRA', brand: 'HONDA', type: 'D1802N26L2 A/T', tonage: '', vehicleType: 'SEPEDA MOTOR', jenis: '', model: '', year: 2019, cylinder: '', chassisNo: 'MH1JFZ213KK670852', engineNo: 'JFZ2E-1669765', color: 'HITAM', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: 'P-06702759', keyNo: '', testNo: '', personInCharge: '', notes: 'PP 055/CPA/PP/I/2025 PO CPA NO.008/CPA-PO/I/2025', address: '' },
  { location: '', plate: 'DD 1909 QF', owner: 'PT.CPA', brand: 'TOYOTA', type: 'AVANZA 1.3 G M/T', tonage: '', vehicleType: 'AVANZA', jenis: 'MOPEN', model: 'MINIBUS', year: 2018, cylinder: '', chassisNo: 'MHKM5EA3JJK094257', engineNo: '1NRF370860', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: '', notes: '', address: '' },
  { location: '', plate: 'DN 8386 AD', owner: 'PT.CRA', brand: 'MITSUBISHI', type: 'COLT L300 PU FB-R (4X2) M/T', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB.BARANG', model: 'PICK UP', year: 2014, cylinder: '', chassisNo: 'MHMLOPU39EK151502', engineNo: '4D56C-K52290', color: 'HITAM KANZAI', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'DC 011014532', personInCharge: 'OP w/h', notes: '', address: '' },
  { location: '', plate: 'DN 8859 NF', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'L300 PU FB-R (4X2) MT', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB.BARANG', model: 'PICK UP', year: 2022, cylinder: '', chassisNo: 'PAEL67MKNNB006053', engineNo: '4N14UAM2140', color: 'HITAM', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'T03677021S1', keyNo: '', testNo: '', personInCharge: '', notes: 'PP 055/CPA/PP/I/2025 PO CPA NO.008/CPA-PO/I/2025', address: '' },
  { location: 'Samarinda', plate: 'KT 243 EM', owner: 'PT.CPA', brand: 'TOYOTA', type: 'KIJANG INNOVA 2.0 G A/T LUX', tonage: '', vehicleType: 'KIJANG INNOVA', jenis: 'MOPEN', model: 'MINIBUS', year: 2019, cylinder: '', chassisNo: 'MHFJW8EM5K2365217', engineNo: '1TRA577875', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OMA', notes: '', address: 'Komp Balikpapan Baru Blok AA-1B No. 02 & 03 RT.009, Kel Damai Baru' },
  { location: '', plate: 'KT 1702 LN', owner: 'PT.CPA', brand: 'TOYOTA', type: 'NEW AVANZA 1,3G AT', tonage: '', vehicleType: 'AVANZA', jenis: 'MOPEN', model: 'MINIBUS', year: 2012, cylinder: '', chassisNo: 'MHKM1BB3JCK007933', engineNo: 'DL63408', color: 'SILVER METALIK', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'IBU DESI', notes: 'ASURANSI MANDIRI OLEH IBU DESSY', address: '' },
  { location: 'Ambon', plate: 'DD 8755 RD', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'COLT L300 PU FB-R (4X2)', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB.BARANG', model: 'PICK UP', year: 2013, cylinder: '', chassisNo: 'MHML0PU39DK138416', engineNo: '4D56CJX8386', color: 'HITAM', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Yan', notes: '', address: '' },
  { location: '', plate: 'KT 1289 MP', owner: 'PT.CPA', brand: 'TOYOTA', type: 'NEW AVANZA 1,3G MT', tonage: '', vehicleType: 'AVANZA', jenis: 'MOPEN', model: 'MINIBUS', year: 2012, cylinder: '', chassisNo: 'MHKM1BA3JCK061003', engineNo: 'DL05228', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: 'J 00160258 N', keyNo: '', testNo: '', personInCharge: 'Yan', notes: '', address: '' },
  { location: 'Kendari', plate: 'DD 8115 XX', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'MITSUBISHI-TRITON-DC HDX 4X4 M/T', tonage: '', vehicleType: 'LV', jenis: 'DoubleCab', model: '', year: 2024, cylinder: '', chassisNo: 'MMBJNLC10RH030208', engineNo: '4N16UAR9665', color: 'PUTIH SOLID', fuel: '', plateColor: '', bpkbNo: '', keyNo: '', testNo: '', personInCharge: '', notes: '', address: '' },
  { location: '', plate: 'DD 8186 UF', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'FIGHTER FM65FSL HI GEAR 4X2 M/T', tonage: '16.100 Kg', vehicleType: 'FIGHTER', jenis: 'MB.BARANG', model: 'TRUCK BAK BESI', year: 2024, cylinder: '7545', chassisNo: 'MHMFM65GGRK000263', engineNo: '6M60311681', color: 'KUNING TAXI', fuel: 'SOLAR', plateColor: 'PUTIH', bpkbNo: 'U07583690R', keyNo: '', testNo: '', personInCharge: 'WH', notes: '', address: '' },
  { location: '', plate: 'DT 8573 IE', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'FIGHTER FM65FSL HI GEAR 4X2 M/T', tonage: '16.100 Kg', vehicleType: 'FIGHTER', jenis: 'MB.BARANG', model: 'TRUCK BAK BESI', year: 2023, cylinder: '7545', chassisNo: 'MHMFM65GGPK000160', engineNo: '6M60-300957', color: 'KUNING TAXI', fuel: 'SOLAR', plateColor: 'PUTIH', bpkbNo: 'T04077945', keyNo: '', testNo: '', personInCharge: 'WH', notes: '', address: '' },
  { location: '', plate: 'KT 8966 WC', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'L300 PU FB-R (4X2) MT', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB.BARANG', model: 'PICK UP', year: 2012, cylinder: '', chassisNo: 'MHMLOPU39CK108268', engineNo: 'D456C-H07586', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'PUTIH', bpkbNo: '', keyNo: '', testNo: 'CD.72C12003314', personInCharge: 'Ops WH', notes: '', address: '' },
  { location: '', plate: 'KT 8380 LG', owner: 'PT.CPA', brand: 'TOYOTA', type: 'HILUX 2.5G DC (4X4) MT', tonage: '2.730 Kg', vehicleType: 'HILUX', jenis: 'MB.BARANG', model: 'DOUBLE CABIN', year: 2012, cylinder: '', chassisNo: 'MROFR22G0C0751983', engineNo: '2KD-S162228', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'PUTIH', bpkbNo: 'J06072357N', keyNo: '', testNo: '', personInCharge: 'Akram', notes: 'PO CPA NO.034/CPA-PO/I/2025', address: '' },
  { location: '', plate: 'DD 8684 SZ', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'COLT DIESEL FE 74', tonage: '5.200 Kg', vehicleType: 'COLT DIESEL', jenis: 'MB.BARANG', model: 'LIGHT TRUCK', year: 2019, cylinder: '', chassisNo: 'MHMFE74PSKK207276', engineNo: '4D34TT66169', color: 'KUNING', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Heriadi', notes: '', address: '' },
  { location: '', plate: 'DD 8684 SK', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'TRITON', tonage: '2.730 Kg', vehicleType: 'TRITON', jenis: 'MB.BARANG', model: 'DOUBLE CABIN', year: 2019, cylinder: '', chassisNo: 'MMBKNL30KH047112', engineNo: '4D56UAY5161', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OPS. SALES', notes: '', address: '' },
  { location: '', plate: 'DD 1707 VG', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'XPANDER 1.5L EXCEED-K (4X4) M/T', tonage: '', vehicleType: 'XPANDER', jenis: 'MOPEN', model: 'MINIBUS', year: 2019, cylinder: '', chassisNo: 'MK2NCWHANKJ003602', engineNo: '4A91GX3123', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'HATTA', notes: '', address: '' },
  { location: '', plate: 'DT 4203 OF', owner: 'PT.CPA', brand: 'HONDA', type: 'Y1G02NO2L0 A/T', tonage: '', vehicleType: 'SEPEDA MOTOR', jenis: '', model: '', year: 2019, cylinder: '', chassisNo: 'MH1JFS114KK434168', engineNo: 'JFS1E-1427090', color: 'HITAM', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OPS. OFFICE', notes: '', address: '' },
  { location: 'Sampit', plate: 'KH 8858 LE', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'COLT / FE 84 GSN', tonage: '', vehicleType: '', jenis: 'MB.BARANG', model: '', year: 2024, cylinder: '', chassisNo: 'MHMFE84EPRK001118', engineNo: 'JFZ1E3036772', color: 'KUNING', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'CC051015711', personInCharge: 'Muadi', notes: '', address: '' },
  { location: '', plate: 'KT 8294 ZI', owner: 'PT.CRA', brand: 'MITSUBISHI', type: 'L300 PU FB-R (4X2) MT', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB.BARANG', model: 'PICK UP', year: 2023, cylinder: '', chassisNo: 'MK2L0PUMZPJ004443', engineNo: '4N14UAR1277', color: 'HITAM', fuel: 'SOLAR', plateColor: 'PUTIH', bpkbNo: 'V04506058N', keyNo: 'A6864', testNo: '', personInCharge: 'OPS WH', notes: '', address: '' },
  { location: '', plate: 'KT 1483 LW', owner: 'PT.CPA', brand: 'TOYOTA', type: 'KIJANG INNOVA G(TGN40R-GKMDKD', tonage: '', vehicleType: 'KIJANG', jenis: 'MB.PENUMPANG', model: 'MINIBUS', year: 2013, cylinder: '', chassisNo: 'MHFXW42G28D2270196', engineNo: '1TR7648060', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Ops Office', notes: '', address: '' },
  { location: '', plate: 'KH 1794 FY', owner: 'PT.CPA', brand: 'TOYOTA', type: 'FORTUNER 2.4 G 4X2 M/T', tonage: '', vehicleType: 'FORTUNER', jenis: 'MB.PENUMPANG', model: 'MINIBUS', year: 2018, cylinder: '', chassisNo: 'MHFJB8GS6J1551229', engineNo: '2GDC331721', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'YUDHI', notes: '', address: '' },
  { location: '', plate: 'KH 8337 FV', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'TRITON 2.5L DC HDX-L (4X4) M/T', tonage: '2.850 Kg', vehicleType: 'TRITON', jenis: 'MB.BARANG', model: 'DOUBLE CABIN', year: 2021, cylinder: '', chassisNo: 'MMBJNKL30MH039428', engineNo: '4D56BE4226', color: 'SILVER METALIK', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'CC 051013774', personInCharge: 'Markrting wil Barat', notes: '', address: '' },
  { location: '', plate: 'KH 8339 FV', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'TRITON 2.5L DC HDX-L (4X4) M/T', tonage: '2.850 Kg', vehicleType: 'TRITON', jenis: 'MB.BARANG', model: 'DOUBLE CABIN', year: 2021, cylinder: '', chassisNo: 'MMBJNKL30MH039426', engineNo: '4D56UBE4548', color: 'SILVER METALIK', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'CC 051013773', personInCharge: 'Markrting wil Timur', notes: '', address: '' },
  { location: '', plate: 'KH 8296 LN', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'COLD DIESEL FE SHD-X K HI GEAR', tonage: '5.200 Kg', vehicleType: 'COLT DIESEL', jenis: 'MB.BARANG', model: 'LIGHT TRUCK', year: 2020, cylinder: '', chassisNo: 'MHMFE75PRMK030789', engineNo: '4D34TX26286', color: 'KUNING', fuel: 'SOLAR', plateColor: 'KUNING', bpkbNo: 'R02912710M', keyNo: '', testNo: '', personInCharge: 'WH (Maman)', notes: '', address: '' },
  { location: '', plate: 'KH 8145 FS', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'L300 PU FB-R (4X2) MT', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB.BARANG', model: 'PICK UP', year: 2018, cylinder: '', chassisNo: 'MK2LOPU39JJ003129', engineNo: '4D56CS75914', color: 'HITAM', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'CC 051011071', personInCharge: 'WH (Muadi)', notes: '', address: '' },
  { location: '', plate: 'KH 8279 LN', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'COLT DIESEL FE 84G (4X2) MT', tonage: '5.200 Kg', vehicleType: 'COLT DIESEL', jenis: 'MB BARANG', model: 'LIGHT TRUCK', year: 2019, cylinder: '', chassisNo: 'MHMFE84P8KK015790', engineNo: '4D34TT25818', color: 'KUNING', fuel: 'SOLAR', plateColor: 'KUNING', bpkbNo: 'P02943366M', keyNo: '', testNo: 'CC 051012552', personInCharge: 'WH ( Agus )', notes: '', address: '' },
  { location: '', plate: 'KH 5006 QC', owner: 'PT.CPA', brand: 'HONDA', type: 'D1B02N26L2 A/T', tonage: '', vehicleType: 'SEPEDA MOTOR', jenis: '', model: '', year: 2019, cylinder: '', chassisNo: 'MH1JFZ138KK034849', engineNo: 'JFZ1E3036772', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Ops Office', notes: '', address: '' },
  { location: 'Manado', plate: 'DB 8210 LP', owner: 'PT. CPA', brand: 'TOYOTA', type: 'HILUX PICK UP 2.4 DSL 4X4', tonage: '2.910 Kg', vehicleType: 'HILUX', jenis: 'MOBIL BARANG', model: 'PICK UP', year: 2023, cylinder: '', chassisNo: 'MR0DBBCE1P6004171', engineNo: '2GD1392293', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'PUTIH', bpkbNo: 'T05266965', keyNo: '', testNo: '', personInCharge: 'OPS W/H BITUNG', notes: '', address: 'Jalan Ring Road Kl IV Kel. Paal IV. VI Kec. Tikala - Manado' },
  { location: '', plate: 'DB 1237 RP', owner: 'PT. CPA', brand: 'TOYOTA', type: 'W100RE-LBDFJ 1,3 E CVT', tonage: '', vehicleType: 'AVANZA', jenis: 'MOPEN', model: 'MINIBUS', year: 2023, cylinder: '1329', chassisNo: 'MHKAA1BY9PK032623', engineNo: '1NRG240668', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'PUTIH', bpkbNo: 'U01184768', keyNo: '', testNo: '', personInCharge: 'TOAR', notes: 'PO.712/CPA-PO/X/2024', address: 'Jalan Ring Road Kl IV Kel. Paal IV. VI Kec. Tikala - Manado' },
  { location: '', plate: 'DB 8509 LP', owner: 'PT.CPA', brand: 'DAIHATSU', type: 'Grand Max PU AC PS 1.5 MC', tonage: '2.540 Kg', vehicleType: 'GRAND MAX', jenis: 'MOBIL BARANG', model: 'PICK UP', year: 2023, cylinder: '1500CC', chassisNo: 'MHKP3FA1JPK032367', engineNo: '2NR4A77911', color: 'WHITE DSO', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OP W/H', notes: 'REVISI PO CPA No.804/CPA-PO/XII/2024', address: 'Jalan Ring Road Kl IV Kel. Paal IV. VI Kec. Tikala - Manado' },
  { location: '', plate: 'DB 8501 LK', owner: 'PT.CPA', brand: 'HINO', type: 'FG 260 JS PLUS BAK BESI', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB.BARANG', model: 'TRUCK', year: 2023, cylinder: '', chassisNo: 'MJEFG8JS2PJP10993', engineNo: 'J08EWEJ17761', color: 'HIJAU', fuel: 'SOLAR', plateColor: '', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OP W/H', notes: 'REVISI PO CPA No.804/CPA-PO/XII/2024', address: 'Jalan Ring Road Kl IV Kel. Paal IV. VI Kec. Tikala - Manado' },
  { location: '', plate: 'DB 1516 RO', owner: 'PT.CPA', brand: 'TOYOTA', type: 'W100RE-LBDFJ 1,3 E CVT', tonage: '', vehicleType: '', jenis: 'MOPEN', model: 'MINIBUS', year: 2023, cylinder: '1329 CC', chassisNo: 'MHKAA1BY3PK022573', engineNo: '1NRG224111', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'PUTIH', bpkbNo: 'T04083717', keyNo: '', testNo: '', personInCharge: 'OPS OFFICE', notes: '', address: 'Jalan Ring Road Kel. Paal IV LK. VI Kec. Tikala - Manado' },
  { location: '', plate: 'DB 8595 LO', owner: 'PT.CPA', brand: 'ISUZU', type: 'D-MAX DC', tonage: '2.850 Kg', vehicleType: 'HILUX', jenis: 'MB.BARANG', model: 'DOUBLE CABIN', year: 2022, cylinder: '', chassisNo: 'MPATFS87JNT003682', engineNo: 'R24E-X58094', color: 'PUTIH', fuel: 'SOLAR', plateColor: '', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'DTECH', notes: '', address: '' },
  { location: '', plate: 'DB 1570 RN', owner: 'PT.CPA', brand: 'TOYOTA', type: 'MAGH10R-BRXLBD 2.0 G HV CVT', tonage: '', vehicleType: '', jenis: 'MOPEN', model: 'MINIBUS', year: 2022, cylinder: '', chassisNo: 'MHFABAAA0N0002323', engineNo: 'M20ANA15582', color: 'PUTIH METALIK', fuel: 'BENSIN', plateColor: 'PUTIH', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'ERU', notes: '', address: '' },
  { location: '', plate: 'DB 1773 LV', owner: 'PT.CPA', brand: 'TOYOTA', type: 'AVANZA 1.3 6 M/T ( F653RM', tonage: '', vehicleType: 'AVANZA', jenis: 'MOPEN', model: 'MINIBUS', year: 2019, cylinder: '', chassisNo: 'MHKM5EA3JKK129811', engineNo: '1NRF479526', color: 'PUTIH', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Nasrullah', notes: '', address: '' },
  { location: '', plate: 'DD 1693 XDP', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'XPANDER 1.5L EXCEED-K (4X4) M/T', tonage: '', vehicleType: 'XPANDER', jenis: 'MOPEN', model: 'MINIBUS', year: 2019, cylinder: '', chassisNo: 'MK2NCWHANKJ004941', engineNo: '4A91HC1948', color: 'PUTIH MUTIARA', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: 'Q-00454865R', keyNo: '', testNo: '', personInCharge: 'David', notes: '', address: '' },
  { location: '', plate: 'DB 8643 LJ', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'TRITON 2.5L DC HDX-L (4X4) M/T', tonage: '2.850 Kg', vehicleType: 'TRITON', jenis: 'MB.BARANG', model: 'DOUBLE CABIN', year: 2019, cylinder: '', chassisNo: 'MMBJNKL30KH058782', engineNo: '4D56UBA2136', color: 'PUTIH SOLID', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Storeman Site Weda', notes: '', address: '' },
  { location: '', plate: 'DB 8821 LK', owner: 'PT.CPA', brand: 'HINO', type: 'WU342R-HKMTJD3 M/T', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB.BARANG', model: 'TRUCK', year: 2020, cylinder: '', chassisNo: 'MJEC1JG43L5191497', engineNo: 'W04DTRR81843', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'KUNING', bpkbNo: '', keyNo: '', testNo: 'DA 71C21003407', personInCharge: 'OP w/h', notes: '', address: '' },
  { location: '', plate: 'DB 8643 QL', owner: 'PT.CRA', brand: 'SUZUKI', type: 'ST150 PICK UP', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB.BARANG', model: 'PICK UP', year: 2012, cylinder: '', chassisNo: 'MHYESL415CJ233592', engineNo: 'G15AID849585', color: 'HITAM', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'DC 12100514', personInCharge: 'OP w/h', notes: 'TLO Aswata Bpn', address: '' },
  { location: '', plate: 'DB 8021 LK', owner: 'SAMUEL C.H', brand: 'HINO', type: 'WU34R2 HKMTJD/130 HD', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB.BARANG', model: 'TRUCK', year: 2011, cylinder: '', chassisNo: 'MJEC1JG43B5034339', engineNo: 'W04DTRJ38510', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'KUNING', bpkbNo: '', keyNo: '', testNo: 'MO 47704', personInCharge: 'OP w/h', notes: '', address: '' },
  { location: '', plate: 'DD 8727 ME', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'COLT DIESEL FE 71 (4X2)', tonage: '5.200 Kg', vehicleType: 'COLT DIESEL', jenis: 'MB.BARANG', model: 'LIGHT TRUCK', year: 2008, cylinder: '', chassisNo: 'MHMFE71P1P18K008325', engineNo: '4D34TD83097', color: 'HITAM', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OP w/h', notes: '', address: '' },
  { location: '', plate: 'DB 5331 MF', owner: 'SAMUEL C.H', brand: 'HONDA', type: 'NF11C1C M/T', tonage: '', vehicleType: 'SEPEDA MOTOR', jenis: '', model: '', year: 2012, cylinder: '', chassisNo: 'MH1JBH11XCK197508', engineNo: 'JBH1E1190962', color: 'HITAM SILVER', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OP W/H', notes: '', address: '' },
  { location: '', plate: 'KT 3828 ZO', owner: 'SAMUEL C.H', brand: 'YAMAHA', type: '1 KP AT', tonage: '', vehicleType: 'SEPEDA MOTOR', jenis: '', model: '', year: 2012, cylinder: '', chassisNo: 'MH31KP00ACJ183327', engineNo: '1KP-183801', color: 'MERAH', fuel: 'BENSIN', plateColor: 'PUTIH', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OP office', notes: '', address: '' },
  { location: 'Makassar', plate: 'DD 1240 XBC', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'XPANDER 1.5L EXCEED-K (4X4) M/T', tonage: '', vehicleType: 'XPANDER', jenis: 'MOPEN', model: 'MINIBUS', year: 2024, cylinder: '', chassisNo: 'MK2NCLHATRJ000825', engineNo: '4A91KCG7409', color: 'PUTIH MUTIARA', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'MURSIDIN', notes: '', address: '' },
  { location: '', plate: 'DD 1113 XBG', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'Xpander 1.5L Exceed-L 4x2 A/T', tonage: '', vehicleType: 'XPANDER', jenis: 'MOPEN', model: 'MINIBUS', year: 2023, cylinder: '1499 cc', chassisNo: 'MK2NCLHATPJ004156', engineNo: '4A91KBX9283', color: '', fuel: '', plateColor: '', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Op Office', notes: '', address: 'JL. Perintis Kemerdekan KM 16 Komp, RT 001 RW 006 Kel/Desa PAI, Kec Biringkanaya Kota' },
  { location: '', plate: 'DB 8810 LC', owner: 'SAMUEL C.H', brand: 'HINO', type: 'WU302R-HKMLHD3L/110SDL', tonage: '5.200 Kg', vehicleType: 'COLT DIESEL', jenis: 'MB.BARANG', model: 'LIGHT TRUCK', year: 2015, cylinder: '', chassisNo: 'MJEC1JGX1F5026362', engineNo: 'W04DTPJ62496', color: 'HIJAU', fuel: 'SOLAR', plateColor: '', bpkbNo: '', keyNo: '', testNo: 'DA 011004119', personInCharge: 'OP w/h', notes: '', address: '' },
  { location: '', plate: 'DD 8904 RM', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'L300 PU FB-R (4X2) MT', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB.BARANG', model: 'PICK UP', year: 2019, cylinder: '', chassisNo: 'MK2L0PU39KJ016202', engineNo: '4D56CT75470', color: 'HITAM', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'DE 041025040', personInCharge: 'OP w/h', notes: '', address: '' },
  { location: '', plate: 'DD 8814 RB', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'TRITON 2.5L DC HDX-H (4X4) M/T', tonage: '2.850 Kg', vehicleType: 'TRITON', jenis: 'MB.BARANG', model: 'DOUBLE CABIN', year: 2018, cylinder: '', chassisNo: 'MMBJNKL30JH071763', engineNo: '4D56UAW1728', color: 'PUTIH SOLID', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'DE 011042973', personInCharge: 'D-tech', notes: '', address: '' },
  { location: '', plate: 'DD 1918 QG', owner: 'PT.CPA', brand: 'TOYOTA', type: 'FORTUNER 2.4 G 4X2 M/T', tonage: '', vehicleType: 'FORTUNER', jenis: 'MOPEN', model: 'MINIBUS', year: 2018, cylinder: '', chassisNo: 'MHFJB8GS7J1551532', engineNo: '2GDC336084', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'SAKTI', notes: '', address: '' },
  { location: '', plate: 'DD 1733 MI', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'XPANDER 1.5L EXCEED-K (4X4) M/T', tonage: '', vehicleType: 'XPANDER', jenis: 'MOPEN', model: 'MINIBUS', year: 2019, cylinder: '', chassisNo: 'MK2NCWHANKJ002853', engineNo: '4A91GP7960', color: 'PUTUH MUTIRA', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OPS KANTOR', notes: '', address: '' },
  { location: '', plate: 'DD 1841 VI', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'XPANDER 1.5L EXCEED-K (4X4) M/T', tonage: '', vehicleType: 'XPANDER', jenis: 'MOPEN', model: 'MINIBUS', year: 2019, cylinder: '', chassisNo: 'MK2NCWHANKJ003615', engineNo: '4A91GX2406', color: 'PUTIH MUTIARA', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'ABU BAKAR', notes: '', address: '' },
  { location: '', plate: 'DD 1937 XGI', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'XPANDER 1.5L EXCEED-K (4X4) M/T', tonage: '', vehicleType: 'XPANDER', jenis: 'MOPEN', model: 'MINIBUS', year: 2019, cylinder: '', chassisNo: 'MK2NCWHANKJ004937', engineNo: '4A91HC2199', color: 'PUTIH MUTIARA', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'JOKO SANTOSO', notes: '', address: '' },
  { location: 'Balikpapan', plate: 'KT 6071 HE', owner: 'PT.CRA', brand: 'HONDA', type: 'L1F02N36L1 A/T', tonage: '', vehicleType: 'SEPEDA MOTOR', jenis: '', model: '', year: 2024, cylinder: '', chassisNo: 'MH1JMC117RK466070', engineNo: 'JMC1E1465176', color: 'HITAM', fuel: 'BENSIN', plateColor: 'PUTIH', bpkbNo: 'V04509275N', keyNo: '', testNo: '', personInCharge: 'RAGIL', notes: '', address: '' },
  { location: '', plate: 'KT 4767 LK', owner: 'SAMUEL C.H', brand: 'HONDA', type: 'NF 100 SLD', tonage: '', vehicleType: 'SEPEDA MOTOR', jenis: '', model: '', year: 2006, cylinder: '', chassisNo: 'MH1HB411X6K277175', engineNo: 'HB41E-1271459', color: 'HITAM', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'OP w/h', notes: '', address: '' },
  { location: '', plate: 'KT 8548 LV', owner: 'PT.CPA', brand: 'ISUZU', type: 'TBR 54 TURBO', tonage: '2.100 Kg', vehicleType: 'PANTHER', jenis: 'MB. BARANG', model: 'PICK UP', year: 2009, cylinder: '', chassisNo: 'MHCTBR54B9K146435', engineNo: 'E146435', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Yovie BJM', notes: '', address: '' },
  { location: '', plate: 'KT 8571 LQ', owner: 'PT.CPA', brand: 'MITSUBISHI', type: 'L300 PU FB-R (4X2) MT', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB. BARANG', model: 'PICK UP', year: 2014, cylinder: '', chassisNo: 'MHMLOPU39EK143164', engineNo: '4D56CK13452', color: 'HITAM', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: 'CD 021045079', personInCharge: 'OP w/h', notes: '', address: '' },
  { location: '', plate: 'DB 8161 AP', owner: 'SAMUEL C.H', brand: 'HINO', type: 'FG8JJKB-GGJ / FG235JJ', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2010, cylinder: '', chassisNo: 'MJEFG8JLKAJG16311', engineNo: 'J08EUGJ19153', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'I-10762215S', keyNo: '', testNo: 'MO 48460', personInCharge: 'KARSING/YULIADI', notes: '', address: '' },
  { location: '', plate: 'DB 8951 LE', owner: 'PT.CPA', brand: 'HINO', type: 'FG8JK1A-JGJ', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2015, cylinder: '', chassisNo: 'MJEFG8JK1FJJ10022', engineNo: 'J08EWMJ10112', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'N-01768125', keyNo: '', testNo: 'DA 71C17000220', personInCharge: 'RICHO', notes: '', address: '' },
  { location: '', plate: 'DB 8952 LE', owner: 'PT.CPA', brand: 'HINO', type: 'FG8JK1A-JGJ', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2015, cylinder: '', chassisNo: 'MJEFG8JK1FJJ10021', engineNo: 'J08EWMJ10111', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'N-01768126', keyNo: '', testNo: 'DA 71C17000221', personInCharge: 'RIFAN', notes: '', address: '' },
  { location: '', plate: 'DB 8277 LE', owner: 'PT.CPA', brand: 'HINO', type: 'FG8JL1A-JGJ', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2015, cylinder: '', chassisNo: 'MJEFG8JL1FJJ10153', engineNo: 'J08EWMJ10123', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'M-12915276', keyNo: '', testNo: 'DA 011005492', personInCharge: 'LAONI/KIKI', notes: '', address: '' },
  { location: '', plate: 'DB 8278 LE', owner: 'PT.CPA', brand: 'HINO', type: 'FG8JL1A-JGJ', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2015, cylinder: '', chassisNo: 'MJEFG8JL1FJJ10152', engineNo: 'J08EWMJ10122', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'M-12915275', keyNo: '', testNo: 'DA 011005493', personInCharge: 'KARVI', notes: '', address: '' },
  { location: '', plate: 'DB 8219 LG', owner: 'PT.CPA', brand: 'HINO', type: 'FG8JP1A-BGJ', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2018, cylinder: '', chassisNo: 'MJEFG8JP1JJB12658', engineNo: 'J08EUGJ62413', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'N-01769486', keyNo: '', testNo: 'DA 71C18001432', personInCharge: 'ARIA', notes: '', address: '' },
  { location: '', plate: 'DB 8220 LG', owner: 'PT.CPA', brand: 'HINO', type: 'FG8JP1A-BGJ', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2018, cylinder: '', chassisNo: 'MJEFG8JP1JJB12667', engineNo: 'J08EUGJ62478', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'N-01769489', keyNo: '', testNo: 'DA 71C18001433', personInCharge: 'USMAN', notes: '', address: '' },
  { location: '', plate: 'DB 8221 LG', owner: 'PT.CPA', brand: 'HINO', type: 'FG8JP1A-BGJ', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2018, cylinder: '', chassisNo: 'MJEFG8JP1JJB12666', engineNo: 'J08EUGJ62444', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'N-01769488', keyNo: '', testNo: 'DA 71C18001430', personInCharge: 'NUR ALAN', notes: '', address: '' },
  { location: '', plate: 'KT 8824 LU', owner: 'PT.CPA', brand: 'HINO', type: 'FG8JS1A-BGJ (4X2)', tonage: '15.100 Kg', vehicleType: 'LONG BED', jenis: 'MB. BARANG', model: 'TRUCK', year: 2021, cylinder: '', chassisNo: 'MJEFG8JS1MJB12959', engineNo: 'J08EUGJ79175', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'KUNING', bpkbNo: 'Q 04745036 N', keyNo: '', testNo: 'CD 71C21007114', personInCharge: 'Maicel', notes: '', address: '' },
  { location: 'Site MSJ', plate: 'KT 8652 YV', owner: 'PT.CRA', brand: 'TOYOTA', type: 'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL-M', tonage: '2.910 Kg', vehicleType: 'HILUX', jenis: 'MB. BARANG', model: 'DOUBLE CABIN', year: 2022, cylinder: '', chassisNo: 'MR0DB8CDXN0124259', engineNo: '2GD1168136', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'Q 09893366 N', keyNo: '', testNo: 'CD 71 C 22008723', personInCharge: 'Shena/MSJ', notes: '', address: '' },
  { location: 'Balikpapan', plate: 'KT 8653 YV', owner: 'PT.CRA', brand: 'TOYOTA', type: 'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL-M', tonage: '2.910 Kg', vehicleType: 'HILUX', jenis: 'MB. BARANG', model: 'DOUBLE CABIN', year: 2022, cylinder: '', chassisNo: 'MR0DB8CD2N0124272', engineNo: '2GD1169112', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'Q 09893416 N', keyNo: '', testNo: 'CD 71 C 22008722', personInCharge: 'Dani / Bpn', notes: '', address: '' },
  { location: 'Site Melak', plate: 'KT 8655 YV', owner: 'PT.CRA', brand: 'TOYOTA', type: 'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL-M', tonage: '2.910 Kg', vehicleType: 'HILUX', jenis: 'MB. BARANG', model: 'DOUBLE CABIN', year: 2022, cylinder: '', chassisNo: 'MR0DB8CD4N0124340', engineNo: '2GD1173692', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'Q 09893422 N', keyNo: '', testNo: 'CD 71 C 22008724', personInCharge: 'Irvan Ginting/Melak', notes: '', address: '' },
  { location: 'Site Weda', plate: 'KT 8657 YV', owner: 'PT.CRA', brand: 'TOYOTA', type: 'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL-M', tonage: '2.910 Kg', vehicleType: 'HILUX', jenis: 'MB. BARANG', model: 'DOUBLE CABIN', year: 2022, cylinder: '', chassisNo: 'MR0DB8CD9N0124317', engineNo: '2GD 1173746', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'Q 09894181 N', keyNo: '', testNo: 'CD 71 C 22009066', personInCharge: 'Johanes', notes: '', address: '' },
  { location: 'Site Satui', plate: 'KT 8658 YV', owner: 'PT.CRA', brand: 'TOYOTA', type: 'HILUX DOUBLE CABIN 2.4 E-RTS (4X4) DSL M', tonage: '2.910 Kg', vehicleType: 'HILUX', jenis: 'MB. BARANG', model: 'DOUBLE CABIN', year: 2022, cylinder: '', chassisNo: 'MR0DB8CD5N0184286', engineNo: '2GD1174367', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'Q 09893415 N', keyNo: '', testNo: 'CD 71 C 22008725', personInCharge: 'Rudi/Wahana', notes: '', address: '' },
  { location: 'Site Obi', plate: 'KT 8352 ZA', owner: 'PT.CRA', brand: 'MITSUBISHI', type: 'TRITON 2.5 DC HDX-L (4X4) M/T', tonage: '2.910 Kg', vehicleType: 'TRITON', jenis: 'MB. BARANG', model: 'DOUBLE CABIN', year: 2022, cylinder: '', chassisNo: 'MMBJNKL30NH083583', engineNo: '4D56UBH5509', color: 'PUTIH', fuel: 'SOLAR', plateColor: 'HITAM', bpkbNo: 'S 07106659 N', keyNo: '', testNo: 'CD 71 C 23010704', personInCharge: 'Zaid / OBI', notes: '', address: '' },
  { location: 'Balikpapan', plate: 'KT 8177 ZU', owner: 'PT.CPA', brand: 'HINO', type: 'FM8JW2A-XGJ', tonage: '26.000 Kg', vehicleType: 'TRONTON', jenis: 'MB. BARANG', model: 'TRUCK BAK BESI', year: 2022, cylinder: '', chassisNo: 'MJEFM8JW2NJX10065', engineNo: 'J08EWDJ11085', color: 'HIJAU', fuel: 'SOLAR', plateColor: 'KUNING', bpkbNo: 'Q 09895036N - Ada', keyNo: '', testNo: 'CD 71 C 22009101', personInCharge: '', notes: '', address: '' },
  { location: 'Berau', plate: 'KT 8469 ZI', owner: 'PT.CRA', brand: 'MITSUBISHI', type: 'L300 PU FB-R (4X2) MT', tonage: '2.540 Kg', vehicleType: 'L300', jenis: 'MB. BARANG', model: 'PICK UP', year: 2023, cylinder: '', chassisNo: 'MK2L0PUMZPJ004436', engineNo: '4N14UAR1236', color: 'HITAM', fuel: 'SOLAR', plateColor: 'PUTIH', bpkbNo: 'V00647471N', keyNo: '', testNo: '', personInCharge: 'OPS WH', notes: '', address: '' },
  { location: '', plate: 'KT 1484 LB', owner: 'PT.CPA', brand: 'TOYOTA', type: 'NEW AVANZA 1.3G MT', tonage: '', vehicleType: 'AVANZA', jenis: 'MOPEN', model: 'MINBUS', year: 2012, cylinder: '', chassisNo: 'MHKM1BA3JCK032226', engineNo: 'DK41792', color: 'PUTIH MUTIARA', fuel: 'BENSIN', plateColor: 'HITAM', bpkbNo: '', keyNo: '', testNo: '', personInCharge: 'Ops WH Berau', notes: '', address: '' }
];

const FORKLIFT_DATA: any[] = [
  { location: 'Balikpapan', brand: 'TCM', serialNo: 'FORKLIFT - 30G02141', model: 'FD100Z8', truckWeight: '12750 Kg', capacity: '10000 KG', prodYear: 2012, owner: 'PT.CPA BPN', insuranceStatus: 'ASURANSI OK', capacityTon: '10 TON', engineNo: '6BG1298445', policyNo: '029.4050.302.2025.000001.00', premium: 16384182, coverageValue: 983188800, validTo: '2026-01-10', notes: 'PO CPA NO.833/CPA-PO/XII/2024' },
  { location: 'Balikpapan', brand: 'CATERPILLAR', serialNo: 'CT14E-15945', model: 'DP30ND', truckWeight: '4650 Kg', capacity: '3000 KG', prodYear: 2014, owner: 'PT.CPA BPN', insuranceStatus: 'ASURANSI OK', capacityTon: '3 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 145000000, validTo: '2026-01-10', notes: 'PO CPA NO.833/CPA-PO/XII/2024' },
  { location: 'Palu', brand: 'MITSUBISHI TRUCK', serialNo: 'FORKLIFT - CF 18C-30022', model: 'FD20ND', truckWeight: '3450 Kg', capacity: '2000 KG', prodYear: 2015, owner: 'PT.CPA PALU', insuranceStatus: 'ASURANSI OK', capacityTon: '2 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 258500000, validTo: '2026-01-10', notes: 'PO CPA NO.833/CPA-PO/XII/2024' },
  { location: 'Makassar', brand: 'MITSUBISHI TRUCK', serialNo: 'FORKLIFT - CF14E-85152', model: 'FD35ND', truckWeight: '5050 Kg', capacity: '3500 KG', prodYear: 2015, owner: 'PT.CPA MKZ', insuranceStatus: 'ASURANSI OK', capacityTon: '3,5 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 314074200, validTo: '2026-01-10', notes: 'PO CPA NO.833/CPA-PO/XII/2024' },
  { location: 'Manado', brand: 'MITSUBISHI TRUCK', serialNo: 'FORKLIFT - CF14E-85175', model: 'FD35ND', truckWeight: '4780 Kg', capacity: '3500 KG', prodYear: 2015, owner: 'PT.CPA MDO', insuranceStatus: 'ASURANSI OK', capacityTon: '3,5 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 314074200, validTo: '2026-01-10', notes: 'PO CPA NO.833/CPA-PO/XII/2024' },
  { location: 'Sampit', brand: 'DOOSAN', serialNo: 'FDA0D-1230-04925', model: 'D 30G', truckWeight: '4460 Kg', capacity: '3000 KG', prodYear: 2011, owner: 'PT.CPA SPT', insuranceStatus: '', capacityTon: '3 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 0, validTo: '', notes: '' },
  { location: 'Balikpapan', brand: 'MITSUBISHI TRUCK', serialNo: 'FORKLIFT - CF14J-15114', model: 'FD 30PT', truckWeight: '4600 Kg', capacity: '3000 KG', prodYear: 2024, owner: 'PT.CPA BPN', insuranceStatus: 'Leasing', capacityTon: '3 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 0, validTo: '', notes: 'Leasing' },
  { location: 'Balikpapan', brand: 'TOYOTA TRUCK', serialNo: '608FDJ35-86457', model: '62-8FD30', truckWeight: '4450 Kg', capacity: '2600 KG', prodYear: 2022, owner: 'PT. CPA BPN', insuranceStatus: 'ASURANSI OK', capacityTon: '2,5 TON', engineNo: '', policyNo: '029.4050.302.2024.000016.00', premium: 6068530, coverageValue: 366300000, validTo: '2026-02-01', notes: 'PO CPA NO.034/CPA-PO/I/2025' },
  { location: 'Kendari', brand: 'TOYOTA TRUCK', serialNo: 'FN : 608FDJ35-84624 5000 MM', model: '62-8FD30', truckWeight: '4450 Kg', capacity: '2600 KG', prodYear: 2022, owner: 'PT.CPA KDI', insuranceStatus: 'ASURANSI OK', capacityTon: '2,5 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 375000000, validTo: '2026-02-01', notes: 'PO CPA NO.034/CPA-PO/I/2025' },
  { location: 'Kendari', brand: 'TOYOTA TRUCK', serialNo: 'FN : 608FDJ35-88522 3000 MM', model: '62-8FD30', truckWeight: '4080 Kg', capacity: '3000 KG', prodYear: 2023, owner: 'PT.CPA KDI', insuranceStatus: 'ASURANSI OK', capacityTon: '3 TON', engineNo: '', policyNo: '029.1050.302.2025.000001.00', premium: 3120940, coverageValue: 377400000, validTo: '2025-12-27', notes: '' },
  { location: 'Banjarmasin', brand: 'MITSUBISHI TRUCK', serialNo: 'F14E-10450', model: 'FD30ND', truckWeight: '4390 Kg', capacity: '-', prodYear: 2008, owner: 'PT.CPA BJM', insuranceStatus: 'Proses', capacityTon: '2,5 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 0, validTo: '', notes: 'PP 057/CRA/PP/I/2025 PO. 022 Aswata' },
  { location: 'Balikpapan', brand: 'TCM', serialNo: 'FORKLIFT - 2U907522', model: 'FD30T3Z', truckWeight: '4510 Kg', capacity: '2900 KG', prodYear: 2018, owner: 'PT.CPA BPN', insuranceStatus: '', capacityTon: '3 TON', engineNo: '', policyNo: '', premium: 0, coverageValue: 0, validTo: '', notes: '' }
];

const INITIAL_TAX_SEED = [
  { id: "t_1", plate: "KT 1648 KY", owner: "PT.CPA", stnkDate: "2026-11-15", taxDate: "2026-11-15", taxAmount: 2450000, notes: "Masa pajak segera berakhir" },
  { id: "t_2", plate: "DD 8815 RB", owner: "PT.CPA", stnkDate: "2028-10-10", taxDate: "2026-10-10", taxAmount: 4800000, notes: "Pajak Expired / Perlu Perpanjangan Segera" },
  { id: "t_3", plate: "KT 243 EM", owner: "PT.CPA", stnkDate: "2029-04-20", taxDate: "2027-04-20", taxAmount: 3650000, notes: "Kondisi Aman" },
  { id: "t_4", plate: "DD 8186 UF", owner: "PT.CPA", stnkDate: "2029-11-05", taxDate: "2026-11-05", taxAmount: 8900000, notes: "Truk Fighter - Urus Perpanjangan" },
  { id: "t_5", plate: "KT 8652 YV", owner: "PT.CRA", stnkDate: "2027-12-25", taxDate: "2026-12-25", taxAmount: 4200000, notes: "Site MSJ" },
  { id: "t_6", plate: "KT 8177 ZU", owner: "PT.CPA", stnkDate: "2027-10-25", taxDate: "2026-10-25", taxAmount: 9500000, notes: "Tronton Balikpapan" },
];

const INITIAL_KIR_SEED = [
  { id: "k_1", plate: "DD 8186 UF", owner: "PT.CPA", testNo: "DA 71C21003407", kirDate: "2026-11-12", notes: "Uji berkala truk" },
  { id: "k_2", plate: "KT 8966 WC", owner: "PT.CPA", testNo: "CD.72C12003314", kirDate: "2026-10-15", notes: "Uji KIR Expired" },
  { id: "k_3", plate: "KT 8824 LU", owner: "PT.CPA", testNo: "CD 71C21007114", kirDate: "2026-11-20", notes: "Jatuh tempo 3 minggu" },
  { id: "k_4", plate: "KT 8177 ZU", owner: "PT.CPA", testNo: "CD 71 C 22009101", kirDate: "2026-12-10", notes: "KIR aman" },
];

const INITIAL_INSURANCE_SEED = [
  { id: "i_1", plate: "KT 1648 KY", owner: "PT.CPA", vendor: "PT Asuransi Wahana Tata (Aswata)", policyNo: "029.4050.302.2025.000101.00", premium: 3850000, coverageValue: 150000000, validTo: "2026-11-20", notes: "All Risk" },
  { id: "i_2", plate: "DD 8815 RB", owner: "PT.CPA", vendor: "PT Asuransi Sinar Mas", policyNo: "029.4050.302.2025.000102.00", premium: 5200000, coverageValue: 320000000, validTo: "2026-10-18", notes: "Polis Expired" },
  { id: "i_3", plate: "KT 243 EM", owner: "PT.CPA", vendor: "PT Asuransi Jasindo", policyNo: "029.4050.302.2025.000103.00", premium: 4500000, coverageValue: 280000000, validTo: "2027-05-10", notes: "Kondisi Aktif" },
  { id: "i_4", plate: "KT 8177 ZU", owner: "PT.CPA", vendor: "PT Asuransi Wahana Tata", policyNo: "029.4050.302.2025.000105.00", premium: 12500000, coverageValue: 850000000, validTo: "2026-11-08", notes: "Heavy Truck" },
];

// ─── Location normalization & access helpers ─────────────────────────────────

/** Official standardized locations list */
export const CANONICAL_LOCATIONS = [
  "Makassar",
  "Balikpapan",
  "Banjarmasin",
  "Samarinda",
  "Manado",
  "Kendari",
  "Palu",
  "Morowali",
  "Sampit",
  "Ambon",
  "Berau",
  "Bitung",
  "Gorontalo",
  "Palangkaraya",
  "Site MSJ",
  "Site Melak",
  "Site Weda",
  "Site Satui",
  "Site Obi",
  "Sofifi",
] as const;

/**
 * Standardize any location string (variations, typos, abbreviations, site names)
 * into its canonical uniform name.
 */
export const canonicalLocation = (rawLoc?: string | null): string => {
  if (!rawLoc || !rawLoc.trim()) return "Belum diisi";
  const s = rawLoc.trim().toLowerCase();

  // Makassar variations: MAKASAR, Makasar, makassar, MKZ
  if (s.includes("makasar") || s.includes("makassar") || s === "mkz") return "Makassar";

  // Balikpapan variations: BPN, BPN WAREHOUSE, Balikpapan HO, balikpapan
  if (s.includes("balikpapan") || s.includes("bpn")) return "Balikpapan";

  // Banjarmasin variations: BJM, BANJARMASIN, banjarmasin
  if (s.includes("banjarmasin") || s === "bjm") return "Banjarmasin";

  // Samarinda variations: SMD, samarinda
  if (s.includes("samarinda") || s === "smd") return "Samarinda";

  // Manado variations: MANADO, MDO, manado
  if (s.includes("manado") || s === "mdo") return "Manado";

  // Kendari variations: KENDARI, KDI, kendari
  if (s.includes("kendari") || s === "kdi") return "Kendari";

  // Palu variations
  if (s.includes("palu")) return "Palu";

  // Morowali variations
  if (s.includes("morowali")) return "Morowali";

  // Sampit variations: SAMPIT, SPT, sampit
  if (s.includes("sampit") || s === "spt") return "Sampit";

  // Ambon variations
  if (s.includes("ambon")) return "Ambon";

  // Berau variations
  if (s.includes("berau")) return "Berau";

  // Bitung variations
  if (s.includes("bitung")) return "Bitung";

  // Gorontalo variations
  if (s.includes("gorontalo")) return "Gorontalo";

  // Palangkaraya variations
  if (s.includes("palangkaraya") || s.includes("palangka raya")) return "Palangkaraya";

  // Site branches
  if (s.includes("msj")) return "Site MSJ";
  if (s.includes("melak")) return "Site Melak";
  if (s.includes("weda")) return "Site Weda";
  if (s.includes("satui")) return "Site Satui";
  if (s.includes("obi")) return "Site Obi";
  if (s.includes("sofifi")) return "Sofifi";

  // Fallback: title-cased words
  return rawLoc
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

/** Normalise a location string for comparison */
const normLoc = (s: string) => (s || "").toLowerCase().trim();

/** Parse user's cabang string (comma-separated) into array of lower-cased tokens */
const parseCabang = (cabang: string): string[] =>
  (cabang || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

/** Location abbreviation & alias mapping */
const EXPAND_ALIASES: Record<string, string[]> = {
  makassar: ["makassar", "makasar", "mkz"],
  balikpapan: ["balikpapan", "bpn"],
  banjarmasin: ["banjarmasin", "bjm"],
  manado: ["manado", "mdo"],
  kendari: ["kendari", "kdi"],
  sampit: ["sampit", "spt"],
  samarinda: ["samarinda", "smd"],
};

/**
 * Return true if the record's location is accessible by this user's cabang list.
 * - If userCabang is "all" or user is admin → always accessible.
 * - If record has no location (empty/null) → only accessible to "all" users.
 * - Otherwise → record.location must match at least one token in userCabangs (including aliases).
 */
const isLocationAllowed = (
  recordLocation: string,
  userCabangs: string[],
  isAll: boolean
): boolean => {
  if (isAll) return true;
  const canonical = canonicalLocation(recordLocation);
  if (canonical === "Belum diisi") return false; // empty location → only "all" users
  const loc = canonical.toLowerCase();
  const rawLoc = normLoc(recordLocation);

  return userCabangs.some((cb) => {
    const cbCanon = canonicalLocation(cb).toLowerCase();
    if (loc === cbCanon || loc.includes(cb) || cb.includes(loc)) return true;
    if (rawLoc.includes(cb) || cb.includes(rawLoc)) return true;

    // Check alias expansions for user's cabang token
    const aliases = EXPAND_ALIASES[cb] || [];
    if (aliases.some((a) => loc.includes(a) || rawLoc.includes(a))) return true;

    // Check alias expansions if loc itself is an abbreviation (e.g. 'bpn', 'bjm')
    for (const [key, aliasList] of Object.entries(EXPAND_ALIASES)) {
      if (
        (aliasList.some((a) => loc.includes(a)) || aliasList.some((a) => rawLoc.includes(a))) &&
        (cb.includes(key) || key.includes(cb))
      ) {
        return true;
      }
    }

    return false;
  });
};

// ─────────────────────────────────────────────────────────────────────────────

interface FleetLogbookAppProps {
  initialView?: "dashboard" | "vehicle" | "tax" | "kir" | "insurance" | "forklift";
}

export default function FleetLogbookApp({ initialView = "dashboard" }: FleetLogbookAppProps) {
  const [activeView, setActiveView] = useState<string>(initialView);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);

  // ── Current user & location access ──────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<{ username: string; cabang?: string; name?: string; role?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cpa_user");
      const token = localStorage.getItem("cpa_token");
      if (!raw || !token) {
        window.location.href = "/login";
        return;
      }
      setCurrentUser(JSON.parse(raw));
    } catch {
      window.location.href = "/login";
    }
  }, []);

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin" || currentUser?.role === "owner";
  const userCabangRaw = currentUser?.cabang || (isAdmin ? "all" : "");
  const isAll = isAdmin || normLoc(userCabangRaw) === "all";
  const userCabangs = useMemo(() => parseCabang(userCabangRaw), [userCabangRaw]);
  // ────────────────────────────────────────────────────────────────────────
  const [db, setDb] = useState<Record<string, any[]>>({
    vehicle: [],
    tax: [],
    kir: [],
    insurance: [],
    forklift: [],
  });

  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({
    vehicle: {},
    tax: {},
    kir: {},
    insurance: {},
    forklift: {},
  });

  const [editId, setEditId] = useState<Record<string, string | null>>({
    vehicle: null,
    tax: null,
    kir: null,
    insurance: null,
    forklift: null,
  });

  const [selected, setSelected] = useState<Record<string, Set<string>>>({
    vehicle: new Set(),
    tax: new Set(),
    kir: new Set(),
    insurance: new Set(),
    forklift: new Set(),
  });

  const [filters, setFilters] = useState<Record<string, { search: string; location: string; status: string }>>({
    vehicle: { search: "", location: "", status: "" },
    tax: { search: "", location: "", status: "" },
    kir: { search: "", location: "", status: "" },
    insurance: { search: "", location: "", status: "" },
    forklift: { search: "", location: "", status: "" },
  });

  const [toastText, setToastText] = useState<string | null>(null);
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => {
    setToastText(m);
    setTimeout(() => setToastText(null), 2200);
  };

  const download = (name: string, type: string, content: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  };

  const normalizeRecordLoc = (r: any) => {
    if (!r) return r;
    if (r.location !== undefined && r.location !== null) {
      const trimmed = String(r.location).trim();
      return { ...r, location: trimmed ? canonicalLocation(trimmed) : "" };
    }
    return r;
  };

  const loadDB = () => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDb({
          vehicle: (Array.isArray(parsed.vehicle) ? parsed.vehicle : []).map(normalizeRecordLoc),
          tax: Array.isArray(parsed.tax) ? parsed.tax : [],
          kir: Array.isArray(parsed.kir) ? parsed.kir : [],
          insurance: Array.isArray(parsed.insurance) ? parsed.insurance : [],
          forklift: (Array.isArray(parsed.forklift) ? parsed.forklift : []).map(normalizeRecordLoc),
        });
      } else {
        const vList = VEHICLE_DATA.map((v, i) => ({
          ...v,
          location: v.location ? canonicalLocation(v.location) : "",
          id: `v_${i + 1}`,
          createdAt: new Date().toISOString(),
        }));
        const fList = FORKLIFT_DATA.map((f, i) => ({
          ...f,
          location: f.location ? canonicalLocation(f.location) : "",
          id: `f_${i + 1}`,
          createdAt: new Date().toISOString(),
        }));
        const seeded = {
          vehicle: vList,
          tax: INITIAL_TAX_SEED,
          kir: INITIAL_KIR_SEED,
          insurance: INITIAL_INSURANCE_SEED,
          forklift: fList,
        };
        localStorage.setItem(STORE, JSON.stringify(seeded));
        setDb(seeded);
      }
    } catch (e) {
      console.error("Gagal load database:", e);
    }
  };

  const setAndSaveDB = (newDb: Record<string, any[]>) => {
    setDb(newDb);
    try {
      localStorage.setItem(STORE, JSON.stringify(newDb));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("fleet_db_updated", { detail: newDb }));
    } catch (e) {
      console.error("Gagal simpan database:", e);
    }
  };

  useEffect(() => {
    loadDB();
    const handleSync = () => loadDB();
    window.addEventListener("storage", handleSync);
    window.addEventListener("fleet_db_updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("fleet_db_updated", handleSync);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view") || params.get("tab");
      if (v && ["dashboard", "vehicle", "tax", "kir", "insurance", "forklift"].includes(v)) {
        setActiveView(v);
      }
    }
  }, []);

  const handleFieldChange = (mod: string, fieldId: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [fieldId]: val,
      },
    }));
  };

  const handleResetForm = (mod: string) => {
    // If user has specific cabang, default the location field to their primary cabang
    const rawDefault = !isAll && userCabangs.length > 0 ? (currentUser?.cabang?.split(",")[0]?.trim() || "") : "";
    const defaultLoc = rawDefault ? canonicalLocation(rawDefault) : "";
    setFormData((prev) => ({
      ...prev,
      [mod]: defaultLoc && (mod === "vehicle" || mod === "forklift") ? { location: defaultLoc } : {},
    }));
    setEditId((prev) => ({ ...prev, [mod]: null }));
  };

  const handleSaveRecord = (mod: string, e: React.FormEvent) => {
    e.preventDefault();
    const curForm = formData[mod] || {};
    const currentId = editId[mod];
    const isEdit = Boolean(currentId);

    // Standardize location string on save
    if ((mod === "vehicle" || mod === "forklift") && curForm.location) {
      curForm.location = canonicalLocation(curForm.location);
    }

    // ── Location guard ──────────────────────────────────────────────────────
    if (!isAll && (mod === "vehicle" || mod === "forklift")) {
      const recLoc = curForm.location || "";
      if (!isLocationAllowed(recLoc, userCabangs, isAll)) {
        showToast("❌ Tidak diizinkan: Cabang penugasan Anda adalah " + userCabangRaw);
        return;
      }
    }

    if (!isAll && ["tax", "kir", "insurance"].includes(mod)) {
      const plate = curForm.plate;
      if (plate) {
        const vRec = (db.vehicle || []).find((x) => normLoc(x.plate) === normLoc(plate));
        if (vRec && !isLocationAllowed(vRec.location || "", userCabangs, isAll)) {
          showToast("❌ Tidak diizinkan: Kendaraan " + plate + " di luar cabang penugasan Anda (" + userCabangRaw + ")");
          return;
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const id = currentId || String(Date.now());
    const list = db[mod] || [];
    const idx = isEdit ? list.findIndex((x) => String(x.id) === String(id)) : -1;
    const old = idx >= 0 ? list[idx] : null;

    const newRec = {
      ...old,
      ...curForm,
      id,
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedList: any[];
    if (idx >= 0) {
      updatedList = [...list];
      updatedList[idx] = newRec;
    } else {
      updatedList = [newRec, ...list];
    }

    const newDb = { ...db, [mod]: updatedList };
    setAndSaveDB(newDb);
    showToast(isEdit ? "Record diperbarui" : "Record disimpan");
    handleResetForm(mod);
  };

  const handleEditRecord = (mod: string, id: string) => {
    const r = db[mod]?.find((x) => String(x.id) === String(id));
    if (!r) return;

    // Check location permission before editing
    if (!isAll && (mod === "vehicle" || mod === "forklift")) {
      if (!isLocationAllowed(r.location || "", userCabangs, isAll)) {
        showToast("❌ Akses ditolak: Kendaraan ini berada di luar cabang penugasan Anda.");
        return;
      }
    } else if (!isAll && ["tax", "kir", "insurance"].includes(mod)) {
      const vRec = (db.vehicle || []).find((x) => normLoc(x.plate) === normLoc(r.plate));
      if (vRec && !isLocationAllowed(vRec.location || "", userCabangs, isAll)) {
        showToast("❌ Akses ditolak: Data kendaraan ini berada di luar cabang penugasan Anda.");
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [mod]: { ...r } }));
    setEditId((prev) => ({ ...prev, [mod]: id }));
    setActiveView(mod);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteRecord = (mod: string, id: string) => {
    const r = db[mod]?.find((x) => String(x.id) === String(id));
    if (!r) return;

    // Check location permission before deleting
    if (!isAll && (mod === "vehicle" || mod === "forklift")) {
      if (!isLocationAllowed(r.location || "", userCabangs, isAll)) {
        showToast("❌ Akses ditolak: Anda tidak dapat menghapus record di luar cabang penugasan.");
        return;
      }
    } else if (!isAll && ["tax", "kir", "insurance"].includes(mod)) {
      const vRec = (db.vehicle || []).find((x) => normLoc(x.plate) === normLoc(r.plate));
      if (vRec && !isLocationAllowed(vRec.location || "", userCabangs, isAll)) {
        showToast("❌ Akses ditolak: Anda tidak dapat menghapus record di luar cabang penugasan.");
        return;
      }
    }

    if (!window.confirm(`Hapus record ${configs[mod]?.short || mod} ${r.plate || r.serialNo || ""}?`)) return;
    const updated = db[mod]?.filter((x) => String(x.id) !== String(id)) || [];
    const newDb = { ...db, [mod]: updated };
    setAndSaveDB(newDb);
    setSelected((prev) => {
      const nextSet = new Set(prev[mod]);
      nextSet.delete(id);
      return { ...prev, [mod]: nextSet };
    });
    showToast("Record dihapus");
  };

  /** Filter records by user's cabang (location-based access control) */
  const filterByUserAccess = (mod: string, records: any[]): any[] => {
    // Only apply location filter to vehicle and forklift; other modules (tax/kir/insurance)
    // are linked to vehicles by plate — still filter by location using vehicle lookup
    if (mod === "vehicle") {
      return records.filter((r) => isLocationAllowed(r.location || "", userCabangs, isAll));
    }
    if (mod === "forklift") {
      return records.filter((r) => isLocationAllowed(r.location || "", userCabangs, isAll));
    }
    if (mod === "tax" || mod === "kir" || mod === "insurance") {
      // Filter linked records by checking if the vehicle they reference is accessible
      const allowedPlates = new Set(
        (db.vehicle || [])
          .filter((v) => isLocationAllowed(v.location || "", userCabangs, isAll))
          .map((v) => v.plate)
      );
      return records.filter((r) => allowedPlates.has(r.plate));
    }
    return records;
  };

  const getFiltered = (mod: string) => {
    const f = filters[mod] || { search: "", location: "", status: "" };
    const q = (f.search || "").toLowerCase();
    const loc = (f.location || "").toLowerCase();
    const st = f.status || "";

    const baseRecords = filterByUserAccess(mod, db[mod] || []);

    return baseRecords.filter((r) => {
      if (q) {
        const vals = Object.values(r).filter((v) => typeof v !== "object").join(" ").toLowerCase();
        if (!vals.includes(q)) return false;
      }
      if (loc) {
        const canonicalL = canonicalLocation(r.location).toLowerCase();
        const rawL = (r.location || "").toLowerCase();
        const p = (r.plate || "").toLowerCase();
        if (!canonicalL.includes(loc) && !rawL.includes(loc) && !p.includes(loc)) return false;
      }
      if (st) {
        const d = daysUntil(r.validTo || r.taxDate || r.kirDate);
        if (st === "due" && !(d !== null && d <= 30 && d >= 0)) return false;
        if (st === "expired" && !(d !== null && d < 0)) return false;
        if (st === "ok" && !(d === null || d > 30)) return false;
      }
      return true;
    }).sort((a, b) => (a.plate || a.serialNo || "").localeCompare(b.plate || b.serialNo || ""));
  };

  const getDisplayValue = (mod: string, r: any, key: string) => {
    if (key === "_days") {
      const d = daysUntil(r.validTo || r.taxDate || r.kirDate);
      if (d === null) return "-";
      const cls = d < 0 ? "bad" : d <= 30 ? "warn" : "ok";
      return `<span class="badge ${cls}">${d < 0 ? "EXPIRED" : d + " hari"}</span>`;
    }
    if (key === "location") {
      return r.location ? esc(canonicalLocation(r.location)) : "-";
    }
    if (["taxAmount", "premium", "coverageValue", "tjh"].includes(key)) {
      return rupiah(r[key]);
    }
    return esc(r[key] ?? "-");
  };

  const getStatusBadgeHtml = (dateStr?: string | null) => {
    if (!dateStr) return '<span class="badge empty">Belum diisi</span>';
    const d = daysUntil(dateStr);
    if (d === null) return '<span class="badge empty">-</span>';
    if (d < 0) return '<span class="badge bad">EXPIRED</span>';
    if (d <= 30) return `<span class="badge warn">${d} hari</span>`;
    return '<span class="badge ok">Aman</span>';
  };

  const printRecordHtml = (mod: string, r: any) => {
    const c = configs[mod];
    return `<article class="printSheet"><div class="printHead"><div class="printBrand"><div class="printLogo">CPA</div><div><h1>${esc(c.label)}</h1><p>PT. Cahaya Pengajaran Abadi · ${esc(r.plate || r.serialNo || "")}</p></div></div><div class="printMeta">Logbook Armada<br>Dicetak: ${new Date().toLocaleString("id-ID")}</div></div><div class="printBody"><div class="pGrid">${c.fields
      .filter((x: any) => !["notes", "address"].includes(x[0]))
      .map(([id, label]: [string, string]) => `<div class="pKv"><b>${esc(label)}</b><span>${["taxAmount", "premium", "coverageValue", "tjh"].includes(id) ? rupiah(r[id]) : esc(r[id] ?? "-")}</span></div>`)
      .join("")}</div><div class="pSection"><h3>Keterangan</h3><div class="pNotes">${esc(r.notes || r.address || "-")}</div></div><div class="pSign"><div>Petugas<div class="signLine">${esc(r.personInCharge || r.owner || "-")}</div></div><div>Diperiksa Oleh<div class="signLine"></div></div></div><div class="printFoot">Record ID: ${esc(r.id)}</div></div></article>`;
  };

  const printTableHtml = (mod: string, rows: any[]) => {
    const c = configs[mod];
    if (!rows.length) return null;
    return `<article class="printSheet"><div class="printHead"><div class="printBrand"><div class="printLogo">CPA</div><div><h1>REKAP ${c.label.toUpperCase()}</h1><p>${rows.length} record</p></div></div><div class="printMeta">Dicetak: ${new Date().toLocaleString("id-ID")}</div></div><div class="printBody"><table class="printTable"><thead><tr>${c.columns
      .map((x: any) => `<th>${esc(x[1])}</th>`)
      .join("")}</tr></thead><tbody>${rows
        .map((r: any) => `<tr>${c.columns.map(([k]: [string, string]) => `<td>${getDisplayValue(mod, r, k).replace(/<[^>]*>/g, "")}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div></article>`;
  };

  const printDashHtml = () => {
    return `<article class="printSheet"><div class="printHead"><div class="printBrand"><div class="printLogo">CPA</div><div><h1>DASHBOARD ARMADA KENDARAAN</h1><p>PT. Cahaya Pengajaran Abadi</p></div></div><div class="printMeta">Dicetak: ${new Date().toLocaleString("id-ID")}</div></div><div class="printBody"><div class="pGrid">${[
      ["Total Kendaraan", db.vehicle?.length || 0],
      ["Data Pajak", db.tax?.length || 0],
      ["Data KIR", db.kir?.length || 0],
      ["Data Asuransi", db.insurance?.length || 0],
      ["Forklift", db.forklift?.length || 0],
    ]
      .map((x: any) => `<div class="pKv"><b>${x[0]}</b><span>${x[1]}</span></div>`)
      .join("")}</div></div></article>`;
  };

  const triggerPrint = (html: string) => {
    setPrintHtml(html);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const exportExcel = (modules = Object.keys(configs)) => {
    let csv = "";
    modules.forEach((mod) => {
      const c = configs[mod],
        rows = db[mod] || [];
      csv += `\n=== ${c.label} ===\n`;
      csv += c.columns.map((x: any) => x[1]).join(",") + "\n";
      rows.forEach((r: any) => {
        csv +=
          c.columns
            .map(([k]: [string, string]) => {
              const v = getDisplayValue(mod, r, k)
                .replace(/<[^>]*>/g, "")
                .replace(/,/g, ";");
              return `"${v}"`;
            })
            .join(",") + "\n";
      });
    });
    download(`Logbook_Armada_${today()}.csv`, "text/csv;charset=utf-8", csv);
  };

  const backup = () => {
    download(
      `Backup_Armada_${today()}.json`,
      "application/json",
      JSON.stringify(
        {
          app: "CPA Armada Logbook",
          version: 1,
          exportedAt: new Date().toISOString(),
          data: db,
        },
        null,
        2
      )
    );
  };

  const importBackup = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const p = JSON.parse(rd.result as string);
        const incoming = p.data || p;
        const newDb: Record<string, any[]> = { ...db };

        Object.keys(configs).forEach((k) => {
          if (Array.isArray(incoming[k])) {
            const map = new Map((newDb[k] || []).map((x: any) => [String(x.id), x]));
            incoming[k].forEach((x: any) => {
              if (x?.id) map.set(String(x.id), x);
            });
            newDb[k] = [...map.values()];
          }
        });

        setAndSaveDB(newDb);
        showToast("Backup diimpor");
      } catch (e) {
        alert("File tidak valid.");
      }
    };
    rd.readAsText(file);
  };

  const v = (db.vehicle || []).filter((r) => isLocationAllowed(r.location || "", userCabangs, isAll));
  const t = (db.tax || []).filter((r) => {
    const vehicle = (db.vehicle || []).find((vv) => vv.plate === r.plate);
    return !vehicle || isLocationAllowed(vehicle.location || "", userCabangs, isAll);
  });
  const k = (db.kir || []).filter((r) => {
    const vehicle = (db.vehicle || []).find((vv) => vv.plate === r.plate);
    return !vehicle || isLocationAllowed(vehicle.location || "", userCabangs, isAll);
  });
  const ins = (db.insurance || []).filter((r) => {
    const vehicle = (db.vehicle || []).find((vv) => vv.plate === r.plate);
    return !vehicle || isLocationAllowed(vehicle.location || "", userCabangs, isAll);
  });
  const f = (db.forklift || []).filter((r) => isLocationAllowed(r.location || "", userCabangs, isAll));

  let taxDue = 0,
    kirDue = 0,
    insDue = 0;
  t.forEach((x) => {
    const d = daysUntil(x.taxDate);
    if (d !== null && d <= 30 && d >= 0) taxDue++;
  });
  k.forEach((x) => {
    const d = daysUntil(x.kirDate);
    if (d !== null && d <= 30 && d >= 0) kirDue++;
  });
  ins.forEach((x) => {
    const d = daysUntil(x.validTo);
    if (d !== null && d <= 30 && d >= 0) insDue++;
  });

  const mobilCount = v.filter((x) =>
    /MINIBUS|MOPEN|SEDAN|MINBUS|MINIBUS/.test((x.model || "") + (x.jenis || ""))
  ).length;
  const barangCount = v.filter((x) =>
    /BARANG|PICK UP|PICKUP|TRUCK|LIGHT TRUCK|DOUBLE CABIN/.test((x.jenis || "") + (x.model || ""))
  ).length;
  const motorCount = v.filter((x) => /SEPEDA MOTOR/.test(x.vehicleType || "")).length;
  const forkliftCount = f.length;

  const locs: Record<string, number> = {};
  v.forEach((x) => {
    const l = canonicalLocation(x.location);
    locs[l] = (locs[l] || 0) + 1;
  });
  const maxLoc = Math.max(1, ...Object.values(locs));

  const alerts: any[] = [];
  t.forEach((x) => {
    const d = daysUntil(x.taxDate);
    if (d !== null && d <= 30) alerts.push({ plate: x.plate, type: "Pajak", date: x.taxDate, days: d });
  });
  k.forEach((x) => {
    const d = daysUntil(x.kirDate);
    if (d !== null && d <= 30) alerts.push({ plate: x.plate, type: "KIR", date: x.kirDate, days: d });
  });
  ins.forEach((x) => {
    const d = daysUntil(x.validTo);
    if (d !== null && d <= 30) alerts.push({ plate: x.plate, type: "Asuransi", date: x.validTo, days: d });
  });
  alerts.sort((a, b) => a.days - b.days);

  if (!isMounted || !currentUser) {
    return (
      <div className="fleet-logbook-root" style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔒</div>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Memeriksa Hak Akses Armada Kendaraan...
        </div>
      </div>
    );
  }

  return (
    <div className="fleet-logbook-root">
      {/* HEADER IDENTIK */}
      <header className="header">
        <div className="headInner">
          <div className="logo">CPA</div>
          <div>
            <h1>Logbook Armada Kendaraan</h1>
            <p>PT Cahaya Pengajaran Abadi · PT Cahaya Resources Abadi</p>
          </div>
          <div className="doc">
            <b>PT. CAHAYA PENGAJARAN ABADI</b>
            <br />
            Fleet Management Record System
            <br />
            Dokumen digital · Revisi 01
          </div>
        </div>
      </header>

      {/* APP CONTAINER IDENTIK */}
      <div className="app">
        {/* SIDEBAR IDENTIK */}
        <aside className="sidebar fleet-static-sidebar" style={{ position: "static", top: "auto" }}>
          <div className="navTitle">Navigasi</div>
          <button
            className={`navBtn ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            <span className="navIcon">⌂</span>Dashboard Armada
          </button>
          <button
            className={`navBtn ${activeView === "vehicle" ? "active" : ""}`}
            onClick={() => setActiveView("vehicle")}
          >
            <span className="navIcon">V</span>Data Kendaraan
          </button>
          <button
            className={`navBtn ${activeView === "tax" ? "active" : ""}`}
            onClick={() => setActiveView("tax")}
          >
            <span className="navIcon">T</span>Pajak &amp; STNK
          </button>
          <button
            className={`navBtn ${activeView === "kir" ? "active" : ""}`}
            onClick={() => setActiveView("kir")}
          >
            <span className="navIcon">K</span>KIR
          </button>
          <button
            className={`navBtn ${activeView === "insurance" ? "active" : ""}`}
            onClick={() => setActiveView("insurance")}
          >
            <span className="navIcon">A</span>Asuransi
          </button>
          <button
            className={`navBtn ${activeView === "forklift" ? "active" : ""}`}
            onClick={() => setActiveView("forklift")}
          >
            <span className="navIcon">F</span>Forklift
          </button>

          <div className="navDivider"></div>
          <div className="navTitle">Data</div>
          <button className="navBtn" onClick={backup}>
            <span className="navIcon">⇩</span>Backup JSON
          </button>
          <button className="navBtn" onClick={() => importFileRef.current?.click()}>
            <span className="navIcon">⇧</span>Import JSON
          </button>
          <button className="navBtn" onClick={() => exportExcel()}>
            <span className="navIcon">X</span>Excel Semua
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              if (e.target.files?.[0] && window.confirm("Import akan menggabungkan data. Lanjutkan?")) {
                importBackup(e.target.files[0]);
              }
              e.target.value = "";
            }}
          />
          <div className="storageNote">
            Data tersimpan pada browser ini. Lakukan backup JSON secara berkala.
          </div>
        </aside>

        {/* CONTENT AREA IDENTIK */}
        <main className="content">
          {/* VIEW DASHBOARD */}
          <section className={`view ${activeView === "dashboard" ? "active" : ""}`}>
            <div className="pageHead">
              <div>
                <h2>Dashboard Armada Kendaraan</h2>
                <p>Ringkasan status kendaraan, pajak, KIR, dan asuransi.</p>
              </div>
              <div className="headActions">
                <button className="btn soft" onClick={loadDB}>
                  Refresh
                </button>
                <button
                  className="btn dark"
                  onClick={() => {
                    const html = printDashHtml();
                    if (html) triggerPrint(html);
                  }}
                >
                  Cetak Dashboard
                </button>
              </div>
            </div>

            {/* Location access notice */}
            <div style={{
              background: isAll ? "rgba(2, 132, 199, 0.08)" : "rgba(245, 158, 11, 0.08)",
              border: `1px solid ${isAll ? "rgba(2,132,199,0.25)" : "rgba(245,158,11,0.3)"}`,
              borderRadius: "10px",
              padding: "0.65rem 1rem",
              marginBottom: "1rem",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <span style={{ fontSize: "1rem" }}>{isAll ? "🌐" : "📍"}</span>
              {isAll
                ? "Anda melihat data seluruh lokasi (akses penuh)."
                : `Menampilkan kendaraan sesuai lokasi penugasan: ${userCabangRaw}`}
            </div>

            <div className="kpis">
              <div className="kpi">
                <span>Total Kendaraan</span>
                <b>{v.length}</b>
                <small>unit terdaftar</small>
              </div>
              <div className="kpi">
                <span>Pajak Jatuh Tempo</span>
                <b className="bad" style={{ color: "var(--bad)" }}>
                  {taxDue}
                </b>
                <small>≤ 30 hari</small>
              </div>
              <div className="kpi">
                <span>KIR Jatuh Tempo</span>
                <b className="bad" style={{ color: "var(--bad)" }}>
                  {kirDue}
                </b>
                <small>≤ 30 hari</small>
              </div>
              <div className="kpi">
                <span>Asuransi Expired</span>
                <b className="bad" style={{ color: "var(--bad)" }}>
                  {insDue}
                </b>
                <small>≤ 30 hari</small>
              </div>
              <div className="kpi">
                <span>Mobil Penumpang</span>
                <b>{mobilCount}</b>
                <small>minibus/sedan</small>
              </div>
              <div className="kpi">
                <span>Mobil Barang</span>
                <b>{barangCount}</b>
                <small>pickup/truck</small>
              </div>
              <div className="kpi">
                <span>Sepeda Motor</span>
                <b>{motorCount}</b>
                <small>roda dua</small>
              </div>
              <div className="kpi">
                <span>Forklift</span>
                <b>{forkliftCount}</b>
                <small>unit</small>
              </div>
            </div>

            <div className="dashGrid">
              <article className="card">
                <h3>Status Per Lokasi</h3>
                <div className="sub">Distribusi kendaraan berdasarkan lokasi.</div>
                <div className="bars">
                  {Object.entries(locs)
                    .sort((a, b) => b[1] - a[1])
                    .map(([l, n]) => (
                      <div className="bar" key={l}>
                        <span>{l}</span>
                        <div className="track">
                          <div className="fill" style={{ width: `${(n / maxLoc) * 100}%` }}></div>
                        </div>
                        <b>{n}</b>
                      </div>
                    ))}
                </div>
              </article>

              <article className="card">
                <h3>Alert Jatuh Tempo</h3>
                <div className="sub">Kendaraan dengan pajak/KIR/asuransi mendekati expired.</div>
                <div>
                  {alerts.length ? (
                    alerts.slice(0, 10).map((a, idx) => (
                      <div className="metricRow" key={idx}>
                        <span>
                          <b>{a.plate}</b> · {a.type}
                        </span>
                        <b style={{ color: a.days < 0 ? "var(--bad)" : "var(--warn)" }}>
                          {a.days < 0 ? "EXPIRED" : `${a.days} hari`}
                        </b>
                      </div>
                    ))
                  ) : (
                    <div className="sub" style={{ padding: "10px" }}>
                      Tidak ada alert.
                    </div>
                  )}
                </div>
              </article>
            </div>

            <article className="card">
              <h3>Daftar Kendaraan</h3>
              <div className="sub">Ringkasan seluruh unit kendaraan terdaftar (Total: {v.length} unit).</div>
              <div className="tableWrap" style={{ maxHeight: "450px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>No Polisi</th>
                      <th>Merk/Type</th>
                      <th>Lokasi</th>
                      <th>Pemilik</th>
                      <th>Tahun</th>
                      <th>Pajak</th>
                      <th>KIR</th>
                      <th>Asuransi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.map((x, i) => (
                      <tr key={x.id || i}>
                        <td>{i + 1}</td>
                        <td>
                          <b>{x.plate}</b>
                        </td>
                        <td>
                          {x.brand} {x.type}
                        </td>
                        <td>{x.location ? canonicalLocation(x.location) : "-"}</td>
                        <td>{x.owner || "-"}</td>
                        <td>{x.year || "-"}</td>
                        <td
                          dangerouslySetInnerHTML={{
                            __html: getStatusBadgeHtml(t.find((tx) => tx.plate === x.plate)?.taxDate),
                          }}
                        />
                        <td
                          dangerouslySetInnerHTML={{
                            __html: getStatusBadgeHtml(k.find((kx) => kx.plate === x.plate)?.kirDate),
                          }}
                        />
                        <td
                          dangerouslySetInnerHTML={{
                            __html: getStatusBadgeHtml(ins.find((ix) => ix.plate === x.plate)?.validTo),
                          }}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          {/* VIEWS 5 MODUL (VEHICLE, TAX, KIR, INSURANCE, FORKLIFT) */}
          {Object.entries(configs).map(([mod, c]) => {
            const rows = getFiltered(mod);
            const curForm = formData[mod] || {};
            const isEditing = Boolean(editId[mod]);
            const modSelected = selected[mod] || new Set();

            const dueCount = (db[mod] || []).filter((x) => {
              const d = daysUntil(x.validTo || x.taxDate || x.kirDate);
              return d !== null && d <= 30 && d >= 0;
            }).length;

            return (
              <section
                key={mod}
                className={`view ${activeView === mod ? "active" : ""}`}
              >
                {/* PAGE HEAD */}
                <div className="pageHead">
                  <div>
                    <h2>{c.label}</h2>
                    <p>{c.description}</p>
                  </div>
                  <div className="headActions">
                    <button className="btn soft" onClick={() => exportExcel([mod])}>
                      Export Excel
                    </button>
                    <button
                      className="btn dark"
                      onClick={() => {
                        const html = printTableHtml(mod, rows);
                        if (html) triggerPrint(html);
                      }}
                    >
                      Cetak Rekap
                    </button>
                  </div>
                </div>

                {/* Location access notice */}
                {!isAll && (
                  <div style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: "10px",
                    padding: "0.55rem 0.9rem",
                    marginBottom: "0.75rem",
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}>
                    <span>📍</span>
                    <span>Data ditampilkan sesuai lokasi penugasan: <b>{userCabangRaw}</b></span>
                  </div>
                )}

                {/* FORM LAYOUT */}
                <div className="formLayout">
                  {/* CARD 01 INPUT DATA */}
                  <article className="card">
                    <div className="cardHead">
                      <span className="num">01</span>
                      <div>
                        <h3>Input Data</h3>
                        <div className="sub">Kolom bertanda * wajib diisi.</div>
                      </div>
                    </div>

                    <form onSubmit={(e) => handleSaveRecord(mod, e)}>
                      <div className="fieldGrid">
                        {c.fields.map(([id, label, type, flag, options]: any) => {
                          const req = flag === 1;
                          const cl = flag === "full" ? "full" : flag === "wide" ? "wide" : "";

                          if (type === "textarea") {
                            return (
                              <label key={id} className={`field ${cl}`}>
                                <span>
                                  {label} {req && "*"}
                                </span>
                                <textarea
                                  required={req}
                                  value={curForm[id] || ""}
                                  onChange={(e) => handleFieldChange(mod, id, e.target.value)}
                                />
                              </label>
                            );
                          }

                          if (id === "location") {
                            if (!isAll) {
                              const options = Array.from(new Set(userCabangs.map((cb) => canonicalLocation(cb))));
                              return (
                                <label key={id} className={`field ${cl}`}>
                                  <span>
                                    {label} {req && "*"} <small style={{ color: "#f59e0b", fontSize: "0.75rem" }}>(Penugasan: {userCabangRaw})</small>
                                  </span>
                                  {options.length > 1 ? (
                                    <select
                                      required={req}
                                      value={curForm[id] || ""}
                                      onChange={(e) => handleFieldChange(mod, id, e.target.value)}
                                    >
                                      <option value="">Pilih Cabang</option>
                                      {options.map((cb) => (
                                        <option key={cb} value={cb}>
                                          {cb}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      required={req}
                                      placeholder={options[0] || "Lokasi"}
                                      value={curForm[id] ?? options[0] ?? ""}
                                      onChange={(e) => handleFieldChange(mod, id, e.target.value)}
                                    />
                                  )}
                                </label>
                              );
                            }

                            return (
                              <label key={id} className={`field ${cl}`}>
                                <span>
                                  {label} {req && "*"}
                                </span>
                                <input
                                  type="text"
                                  list={`locations-list-${mod}`}
                                  required={req}
                                  placeholder="Pilih atau ketik lokasi (contoh: Makassar)"
                                  value={curForm[id] || ""}
                                  onChange={(e) => handleFieldChange(mod, id, e.target.value)}
                                />
                                <datalist id={`locations-list-${mod}`}>
                                  {CANONICAL_LOCATIONS.map((loc) => (
                                    <option key={loc} value={loc} />
                                  ))}
                                </datalist>
                              </label>
                            );
                          }

                          if (type === "select") {
                            return (
                              <label key={id} className={`field ${cl}`}>
                                <span>
                                  {label} {req && "*"}
                                </span>
                                <select
                                  required={req}
                                  value={curForm[id] || ""}
                                  onChange={(e) => handleFieldChange(mod, id, e.target.value)}
                                >
                                  <option value="">Pilih</option>
                                  {(options || []).map((opt: string) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            );
                          }

                          const isNum = type === "number";
                          return (
                            <label key={id} className={`field ${cl}`}>
                              <span>
                                {label} {req && "*"}
                              </span>
                              <input
                                type={type}
                                step={isNum ? "0.01" : undefined}
                                min={isNum ? "0" : undefined}
                                required={req}
                                value={curForm[id] ?? ""}
                                onChange={(e) =>
                                  handleFieldChange(
                                    mod,
                                    id,
                                    isNum ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
                                  )
                                }
                              />
                            </label>
                          );
                        })}
                      </div>

                      <div className="actions">
                        <button className="btn primary" type="submit">
                          {isEditing ? "Perbarui Record" : "Simpan Record"}
                        </button>
                        <button
                          className="btn soft"
                          type="button"
                          onClick={() => {
                            if (window.confirm("Reset form?")) handleResetForm(mod);
                          }}
                        >
                          Reset Form
                        </button>
                      </div>
                    </form>
                  </article>

                  {/* SUMMARY CARD (STICKY) */}
                  <aside className="card summaryCard">
                    <h3>Ringkasan</h3>
                    <div className="miniStats">
                      <div className="miniStat">
                        <b>{db[mod]?.length || 0}</b>
                        <span>Total</span>
                      </div>
                      <div className="miniStat">
                        <b>{dueCount}</b>
                        <span>Jatuh Tempo</span>
                      </div>
                    </div>

                    <div style={{ marginTop: "12px" }}>
                      {mod === "vehicle" && (
                        <>
                          <div className="metricRow">
                            <span>Total Unit</span>
                            <b>{v.length}</b>
                          </div>
                          <div className="metricRow">
                            <span>Dengan Asuransi</span>
                            <b>{ins.length}</b>
                          </div>
                        </>
                      )}

                      {mod === "tax" && (
                        <>
                          <div className="metricRow">
                            <span>Total Pajak</span>
                            <b>{rupiah(t.reduce((sum, x) => sum + Number(x.taxAmount || 0), 0))}</b>
                          </div>
                          <div className="metricRow">
                            <span>Segera Jatuh Tempo</span>
                            <b>{taxDue}</b>
                          </div>
                        </>
                      )}

                      {mod === "kir" && (
                        <>
                          <div className="metricRow">
                            <span>Total Record KIR</span>
                            <b>{k.length}</b>
                          </div>
                          <div className="metricRow">
                            <span>Segera Jatuh Tempo</span>
                            <b>{kirDue}</b>
                          </div>
                        </>
                      )}

                      {mod === "insurance" && (
                        <>
                          <div className="metricRow">
                            <span>Total Premi</span>
                            <b>{rupiah(ins.reduce((sum, x) => sum + Number(x.premium || 0), 0))}</b>
                          </div>
                          <div className="metricRow">
                            <span>Segera Jatuh Tempo</span>
                            <b>{insDue}</b>
                          </div>
                        </>
                      )}

                      {mod === "forklift" && (
                        <>
                          <div className="metricRow">
                            <span>Total Forklift</span>
                            <b>{f.length}</b>
                          </div>
                          <div className="metricRow">
                            <span>Dengan Asuransi</span>
                            <b>{f.filter((x) => x.insuranceStatus === "ASURANSI OK").length}</b>
                          </div>
                        </>
                      )}
                    </div>
                  </aside>
                </div>

                {/* CARD 02 DAFTAR MODUL */}
                <article className="card">
                  <div className="cardHead">
                    <span className="num">02</span>
                    <div>
                      <h3>Daftar {c.short}</h3>
                      <div className="sub">{rows.length} record</div>
                    </div>
                  </div>

                  <div className="historyTools">
                    <label className="field">
                      <span>Pencarian</span>
                      <input
                        placeholder="Cari data..."
                        value={filters[mod]?.search || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            [mod]: { ...prev[mod], search: e.target.value },
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Lokasi</span>
                      <input
                        list={`filter-locations-${mod}`}
                        placeholder="Filter lokasi..."
                        value={filters[mod]?.location || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            [mod]: { ...prev[mod], location: e.target.value },
                          }))
                        }
                      />
                      <datalist id={`filter-locations-${mod}`}>
                        {CANONICAL_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc} />
                        ))}
                      </datalist>
                    </label>

                    <label className="field">
                      <span>Status</span>
                      <select
                        value={filters[mod]?.status || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            [mod]: { ...prev[mod], status: e.target.value },
                          }))
                        }
                      >
                        <option value="">Semua</option>
                        <option value="due">Jatuh Tempo ≤30 hari</option>
                        <option value="expired">Expired</option>
                        <option value="ok">Aman</option>
                      </select>
                    </label>

                    <button
                      className="btn soft"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          [mod]: { search: "", location: "", status: "" },
                        }))
                      }
                    >
                      Reset Filter
                    </button>
                  </div>

                  <div className="actions">
                    <button
                      className="btn soft"
                      onClick={() => {
                        setSelected((prev) => ({
                          ...prev,
                          [mod]: new Set(rows.map((r) => String(r.id))),
                        }));
                      }}
                    >
                      Pilih Semua
                    </button>

                    <button
                      className="btn soft"
                      onClick={() => {
                        setSelected((prev) => ({
                          ...prev,
                          [mod]: new Set(),
                        }));
                      }}
                    >
                      Hapus Pilihan
                    </button>

                    <button
                      className="btn dark"
                      onClick={() => {
                        const sel = rows.filter((r) => modSelected.has(String(r.id)));
                        if (sel.length) {
                          const html = sel.map((r) => printRecordHtml(mod, r)).join("");
                          triggerPrint(html);
                        } else {
                          showToast("Pilih minimal satu record");
                        }
                      }}
                    >
                      Cetak Pilihan
                    </button>
                  </div>

                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th className="selectCell">
                            <input
                              type="checkbox"
                              checked={rows.length > 0 && rows.every((r) => modSelected.has(String(r.id)))}
                              onChange={(e) => {
                                setSelected((prev) => ({
                                  ...prev,
                                  [mod]: e.target.checked
                                    ? new Set(rows.map((r) => String(r.id)))
                                    : new Set(),
                                }));
                              }}
                            />
                          </th>
                          {c.columns.map((col: any) => (
                            <th key={col[0]}>{col[1]}</th>
                          ))}
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length ? (
                          rows.map((r: any) => (
                            <tr key={r.id}>
                              <td className="selectCell">
                                <input
                                  type="checkbox"
                                  checked={modSelected.has(String(r.id))}
                                  onChange={(e) => {
                                    setSelected((prev) => {
                                      const nextSet = new Set(prev[mod]);
                                      if (e.target.checked) nextSet.add(String(r.id));
                                      else nextSet.delete(String(r.id));
                                      return { ...prev, [mod]: nextSet };
                                    });
                                  }}
                                />
                              </td>
                              {c.columns.map(([k]: any) => (
                                <td
                                  key={k}
                                  dangerouslySetInnerHTML={{
                                    __html: getDisplayValue(mod, r, k),
                                  }}
                                />
                              ))}
                              <td>
                                <div className="rowActions">
                                  <button
                                    className="iconBtn"
                                    onClick={() => {
                                      const html = printRecordHtml(mod, r);
                                      triggerPrint(html);
                                    }}
                                  >
                                    Cetak
                                  </button>
                                  <button
                                    className="iconBtn"
                                    onClick={() => handleEditRecord(mod, r.id)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="iconBtn"
                                    onClick={() => handleDeleteRecord(mod, r.id)}
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="empty" colSpan={c.columns.length + 2}>
                              Belum ada data.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            );
          })}
        </main>
      </div>

      {/* TOAST IDENTIK */}
      <div className={`toast ${toastText ? "show" : ""}`}>{toastText}</div>

      {/* PRINT CONTAINER IDENTIK */}
      <div
        id="printRoot"
        dangerouslySetInnerHTML={{ __html: printHtml || "" }}
      />
    </div>
  );
}
