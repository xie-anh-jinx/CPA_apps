"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import "@/app/ga-logbook.css";

const STORE = "cpa_ga_logbook_v1";
const weekdays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const rupiah = (n: any) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const num = (n: any) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(n || 0));

const today = () => {
  const d = new Date(),
    z = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - z).toISOString().slice(0, 10);
};

const nowTime = () => new Date().toTimeString().slice(0, 5);

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

const xmlEsc = (s: any) =>
  String(s ?? "").replace(
    /[<>&'"]/g,
    (c) =>
    ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    }[c] || c)
  );

const monthLabel = (ym?: string) => {
  if (!ym) return "-";
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1)
  );
};

// ─── Real GA & Asset Personnel (From Official Master User List) ─────────────
export interface GaPerson {
  name: string;
  username: string;
  cabang: string;
  role: string;
}

export const GA_PERSONNEL: GaPerson[] = [
  { name: "Gabriel Hengky", username: "hengky", cabang: "all", role: "all" },
  { name: "Abdulrahman Sangge", username: "rahman", cabang: "Manado, Gorontalo, Ambon, Bitung, Sofifi, Obi, Weda", role: "GA" },
  { name: "James Pelealu", username: "james", cabang: "Manado, Gorontalo, Ambon, Bitung, Sofifi, Obi, Weda", role: "GA" },
  { name: "Susanty Gladies M Santi", username: "gladys", cabang: "Manado, Gorontalo, Ambon, Bitung, Sofifi, Obi, Weda", role: "admin" },
  { name: "Daniel Victor Lamboro", username: "daniel", cabang: "Palu, Morowali", role: "GA" },
  { name: "Sri Yuyun", username: "yuyun", cabang: "Palu, Morowali", role: "admin" },
  { name: "Abdul Hamid", username: "hamid", cabang: "Makassar", role: "GA" },
  { name: "Marius Efradus Yulius Nggala", username: "marius", cabang: "Makassar", role: "GA" },
  { name: "Grace Putri Mangaruk", username: "grace", cabang: "Makassar", role: "admin" },
  { name: "Eko Wahyudi", username: "eko", cabang: "makassar, palu, kendari", role: "IT" },
  { name: "Putri Mutiah", username: "putri", cabang: "kendari", role: "admin" },
  { name: "La Ode Achmad As'Ad Hatu", username: "aat", cabang: "kendari", role: "GA" },
  { name: "Arisandi", username: "arisandi", cabang: "sampit, palangkaraya, banjarmasin", role: "GA" },
  { name: "Kades Battung", username: "kades", cabang: "all", role: "GA" },
  { name: "Yusenda D. Sitompul", username: "yusenda", cabang: "all", role: "admin" },
  { name: "Wahyudin", username: "wahyudin", cabang: "Balikpapan", role: "GA" },
  { name: "Mahpudi Alfa Rubbi", username: "pudi", cabang: "Balikpapan", role: "GA" },
  { name: "Jamhari", username: "jamhari", cabang: "Balikpapan", role: "GA" },
  { name: "Roni Sandra", username: "roni", cabang: "Balikpapan", role: "GA" },
  { name: "Gideon lae belo", username: "gideon", cabang: "Balikpapan", role: "GA" },
  { name: "Richard", username: "richard", cabang: "Balikpapan, Manado, Bitung, Sofifi, Gorontalo, Sampit, Banjarmasin, Palangkaraya, Ambon, Weda", role: "IT" },
  { name: "Yoga Ganesha", username: "yoga", cabang: "all", role: "All" },
];

// ─── Location-based access helpers ───────────────────────────────────────────
const normLoc = (s: string) => (s || "").toLowerCase().trim();

const parseCabang = (cabang: string): string[] =>
  (cabang || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

const EXPAND_ALIASES: Record<string, string[]> = {
  makassar: ["makassar", "makasar", "mkz"],
  balikpapan: ["balikpapan", "bpn"],
  banjarmasin: ["banjarmasin", "bjm"],
  manado: ["manado", "mdo"],
  kendari: ["kendari", "kdi"],
  sampit: ["sampit", "spt"],
  samarinda: ["samarinda", "smd"],
  palu: ["palu"],
  ambon: ["ambon"],
  weda: ["weda"],
  obi: ["obi"],
  morowali: ["morowali"],
  bitung: ["bitung"],
  sofifi: ["sofifi"],
  gorontalo: ["gorontalo"],
  palangkaraya: ["palangkaraya"],
};

const isLocationAllowed = (
  recordLocation: string,
  userCabangs: string[],
  isAll: boolean
): boolean => {
  if (isAll) return true;
  const loc = normLoc(recordLocation);
  if (!loc) return false;

  return userCabangs.some((cb) => {
    if (loc.includes(cb) || cb.includes(loc)) return true;

    const aliases = EXPAND_ALIASES[cb] || [];
    if (aliases.some((a) => loc.includes(a))) return true;

    for (const [key, aliasList] of Object.entries(EXPAND_ALIASES)) {
      if (aliasList.some((a) => loc.includes(a)) && (cb.includes(key) || key.includes(cb))) {
        return true;
      }
    }
    return false;
  });
};

const getPersonnelForLocation = (location: string) => {
  const loc = normLoc(location);
  if (!loc) return GA_PERSONNEL;
  return GA_PERSONNEL.filter((p) => {
    if (p.cabang === "all") return true;
    const pCabangs = parseCabang(p.cabang);
    return isLocationAllowed(loc, pCabangs, false);
  });
};

const statusCls = (s: string) =>
  /DAMAGE|KURANG|PERLU/.test(s)
    ? "bad"
    : /GOOD|BAIK$|^BERSIH$/.test(s)
      ? "ok"
      : /LENGKAP/.test(s)
        ? "empty"
        : "warn";

// ─── Configurations ──────────────────────────────────────────────────────────
const configs: Record<string, any> = {
  genset: {
    label: "Checklist Genset Inspection",
    short: "Genset",
    description: "Pemeriksaan kondisi genset operasional kantor dan gudang cabang.",
    fields: [
      ["date", "Tanggal", "date", 1],
      ["time", "Jam", "time", 1],
      ["location", "Lokasi Cabang", "text", 1],
      ["brand", "Brand", "text", 1],
      ["model", "Model", "text", 1],
      ["power", "Power / KW", "text"],
      ["engineNo", "Engine No.", "text"],
      ["hpSpecNo", "HP Spec No.", "text"],
      ["fuelPercent", "Level Bahan Bakar (%)", "number"],
      ["inspector", "Inspect By (Petugas GA)", "text", 1],
      ["remarks", "Remarks / Keterangan", "textarea", "full"],
      ["acknowledged", "Diketahui / Diperiksa Oleh", "text"],
    ],
    checklist: [
      ["fuel_level", "Fuel Level"],
      ["radiator", "Liquid Radiator"],
      ["accu", "Accu"],
      ["gauge", "Electric / Starter Gauge"],
      ["panel", "Electric / Starter Panel"],
      ["switch", "Electric / Starter Switch"],
      ["fuel_hose", "Fuel Hose"],
      ["fuel_box", "Fuel Box"],
      ["engine_main", "Engine Main"],
      ["engine_oil", "Engine Oil"],
      ["air_filter", "Air Filter"],
      ["fuel_filter", "Fuel Filter"],
      ["oil_filter", "Oil Filter"],
      ["air_exhaust", "Air Exhaust"],
      ["cover_body", "Cover / Body"],
    ],
    statusOptions: [
      ["good", "Good"],
      ["bad", "Damage"],
      ["na", "N/A"],
    ],
    photos: true,
    columns: [
      ["date", "Tanggal"],
      ["location", "Lokasi"],
      ["brand", "Brand"],
      ["model", "Model"],
      ["fuelPercent", "Fuel"],
      ["_status", "Status"],
      ["_issues", "Damage"],
      ["inspector", "Inspect By"],
    ],
    summary: (r: any) => `${r.brand || "-"} ${r.model || ""} · ${r.location || ""}`.trim(),
    officer: (r: any) => r.inspector || "-",
  },
  cleaning: {
    label: "Checklist Kebersihan",
    short: "Kebersihan",
    description: "Pemeriksaan kebersihan harian per area kerja, kantor, atau gudang cabang.",
    fields: [
      ["date", "Tanggal", "date", 1],
      ["time", "Jam", "time", 1],
      ["location", "Lokasi Cabang", "text", 1],
      ["area", "Area / Ruangan", "text", 1],
      ["officer", "Petugas Kebersihan / GA", "text", 1],
      ["checker", "Diperiksa Oleh (Admin/PIC)", "text"],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    checklist: [
      ["exhaust", "Exhaust"],
      ["sink", "Wastafel"],
      ["floor", "Lantai"],
      ["toilet", "Toilet"],
      ["water_condition", "Kondisi Air Baik / Tidak"],
      ["light", "Lampu Nyala / Tidak"],
      ["aroma", "Aroma"],
      ["trash_bin", "Tempat Sampah"],
      ["mirror", "Cermin"],
      ["mat", "Keset"],
    ],
    statusOptions: [
      ["good", "Bersih/Baik"],
      ["bad", "Kurang Bersih"],
      ["na", "N/A"],
    ],
    photos: true,
    columns: [
      ["date", "Tanggal"],
      ["location", "Lokasi"],
      ["area", "Area"],
      ["_status", "Status"],
      ["_score", "Skor"],
      ["_issues", "Temuan"],
      ["officer", "Petugas"],
      ["checker", "Pemeriksa"],
    ],
    summary: (r: any) => `${r.area || "-"} (${r.location || "-"})`,
    officer: (r: any) => r.officer || r.checker || "-",
  },
  water: {
    label: "Rekapitulasi Pembelian Air Minum",
    short: "Air Minum",
    description: "Pencatatan jumlah galon dan biaya pembelian air minum operasional cabang.",
    fields: [
      ["date", "Tanggal", "date", 1],
      ["day", "Hari", "text"],
      ["location", "Lokasi Cabang", "text", 1],
      ["gallons", "Jumlah Galon", "number", 1],
      ["unitPrice", "Harga per Galon (Rp)", "number", 1],
      ["total", "Total Harga (Rp)", "number"],
      ["supplier", "Supplier / Toko", "text"],
      ["officer", "Petugas GA", "text"],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["day", "Hari"],
      ["date", "Tanggal"],
      ["location", "Lokasi"],
      ["gallons", "Jumlah Galon"],
      ["_unitPrice", "Harga/Galon"],
      ["_total", "Total"],
      ["supplier", "Supplier"],
      ["officer", "Petugas"],
    ],
    summary: (r: any) => `${r.gallons || 0} galon · ${rupiah(r.total)}`,
    officer: (r: any) => r.officer || "-",
  },
  delivery: {
    label: "Log Pengiriman Dokumen & Paket",
    short: "Pengiriman",
    description: "Pencatatan dokumen kantor, paket logistik, penerima, kurir, dan nomor resi.",
    fields: [
      ["date", "Tanggal Kirim", "date", 1],
      ["time", "Waktu", "time", 1],
      ["location", "Cabang Asal", "text", 1],
      ["itemType", "Jenis Barang", "select", 1, ["Dokumen", "Paket", "Barang", "Surat", "Lain-lain"]],
      ["contents", "Isi Barang / Paket", "textarea", "wide", 1],
      ["shipping", "Pengiriman / Tujuan", "text", 1],
      ["recipient", "Penerima", "text", 1],
      ["courier", "Courier", "text", 1],
      ["trackingNo", "Nomor Resi", "text"],
      ["officer", "Petugas Pengirim (GA)", "text"],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["date", "Tanggal"],
      ["time", "Waktu"],
      ["location", "Asal"],
      ["itemType", "Jenis"],
      ["contents", "Isi Paket"],
      ["shipping", "Tujuan"],
      ["recipient", "Penerima"],
      ["courier", "Courier"],
      ["trackingNo", "No. Resi"],
      ["officer", "Petugas"],
    ],
    summary: (r: any) => `${r.itemType || "Paket"} · ${r.recipient || "-"}`,
    officer: (r: any) => r.officer || "-",
  },
  pdam: {
    label: "Record Pemakaian PDAM",
    short: "PDAM",
    description: "Pembacaan meter air kantor dan gudang dalam satuan meter kubik (m³).",
    fields: [
      ["date", "Tanggal", "date", 1],
      ["time", "Jam", "time", 1],
      ["location", "Lokasi Cabang", "text", 1],
      ["meter", "Meter PDAM (m³)", "number", 1],
      ["officer", "Petugas Pencatat", "text", 1],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["date", "Tanggal"],
      ["time", "Jam"],
      ["location", "Lokasi"],
      ["_meter", "Meter (m³)"],
      ["_usage", "Pemakaian (m³)"],
      ["officer", "Petugas"],
      ["notes", "Keterangan"],
    ],
    summary: (r: any) => `${num(r.meter)} m³ (${r.location || "-"})`,
    officer: (r: any) => r.officer || "-",
  },
  electricity: {
    label: "Record Pemakaian Listrik",
    short: "Listrik",
    description: "Pembacaan meter listrik PLN dan selisih pemakaian kWh gedung operasional cabang.",
    fields: [
      ["date", "Tanggal", "date", 1],
      ["time", "Jam", "time", 1],
      ["location", "Lokasi Cabang", "text", 1],
      ["meter", "Meter Listrik (kWh)", "number", 1],
      ["officer", "Petugas Pencatat", "text", 1],
      ["notes", "Keterangan", "textarea", "full"],
    ],
    columns: [
      ["date", "Tanggal"],
      ["time", "Jam"],
      ["location", "Lokasi"],
      ["_meter", "Meter (kWh)"],
      ["_usage", "Pemakaian (kWh)"],
      ["officer", "Petugas"],
      ["notes", "Keterangan"],
    ],
    summary: (r: any) => `${num(r.meter)} kWh (${r.location || "-"})`,
    officer: (r: any) => r.officer || "-",
  },
};

// ─── Helpers for Readings Delta ──────────────────────────────────────────────
function enrichReadings(arr: any[]) {
  const sorted = [...arr].sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
  return sorted.map((r, i) => ({
    ...r,
    _usage: i ? Math.max(0, Number(r.meter || 0) - Number(sorted[i - 1].meter || 0)) : 0,
  }));
}

function assessChecklist(c: any, checks: Record<string, string>) {
  const vals = c.checklist.map((x: any) => [x[0], checks[x[0]] || ""]);
  const filled = vals.filter((x: any) => x[1]).length;
  const good = vals.filter((x: any) => x[1] === "good").length;
  const bad = vals.filter((x: any) => x[1] === "bad");
  const na = vals.filter((x: any) => x[1] === "na").length;
  const score = vals.length ? Math.round((filled / vals.length) * 100) : 0;
  let status = "BELUM LENGKAP";
  if (filled === vals.length) {
    status = bad.length
      ? c.short === "Kebersihan"
        ? "KURANG BERSIH"
        : "DAMAGE / PERLU PERBAIKAN"
      : c.short === "Kebersihan"
        ? "BERSIH"
        : "GOOD / BAIK";
  }
  return { filled, good, bad, na, blank: vals.length - filled, score, status, total: vals.length };
}

interface GaLogbookAppProps {
  initialView?: "dashboard" | "genset" | "cleaning" | "water" | "delivery" | "pdam" | "electricity";
}

export default function GaLogbookApp({ initialView = "dashboard" }: GaLogbookAppProps) {
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
  const [currentUser, setCurrentUser] = useState<{ username: string; cabang?: string; name?: string; full_name?: string; role?: string } | null>(null);

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

  const isAdmin =
    currentUser?.role === "admin" ||
    currentUser?.role === "superadmin" ||
    currentUser?.role === "all" ||
    currentUser?.role === "owner";
  const userCabangRaw = currentUser?.cabang || (isAdmin ? "all" : "");
  const isAll = isAdmin || normLoc(userCabangRaw) === "all";
  const userCabangs = useMemo(() => parseCabang(userCabangRaw), [userCabangRaw]);
  const currentFullName = currentUser?.full_name || currentUser?.name || "";
  // ────────────────────────────────────────────────────────────────────────

  const [db, setDb] = useState<Record<string, any[]>>({
    genset: [],
    cleaning: [],
    water: [],
    delivery: [],
    pdam: [],
    electricity: [],
  });

  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({
    genset: {},
    cleaning: {},
    water: {},
    delivery: {},
    pdam: {},
    electricity: {},
  });

  const [checks, setChecks] = useState<Record<string, Record<string, string>>>({
    genset: {},
    cleaning: {},
  });

  const [photos, setPhotos] = useState<Record<string, Array<{ name: string; data: string }>>>({
    genset: [],
    cleaning: [],
  });

  const [editId, setEditId] = useState<Record<string, string | null>>({
    genset: null,
    cleaning: null,
    water: null,
    delivery: null,
    pdam: null,
    electricity: null,
  });

  const [selected, setSelected] = useState<Record<string, Set<string>>>({
    genset: new Set(),
    cleaning: new Set(),
    water: new Set(),
    delivery: new Set(),
    pdam: new Set(),
    electricity: new Set(),
  });

  const [filters, setFilters] = useState<
    Record<string, { search: string; month: string; from: string; to: string }>
  >({
    genset: { search: "", month: "", from: "", to: "" },
    cleaning: { search: "", month: "", from: "", to: "" },
    water: { search: "", month: "", from: "", to: "" },
    delivery: { search: "", month: "", from: "", to: "" },
    pdam: { search: "", month: "", from: "", to: "" },
    electricity: { search: "", month: "", from: "", to: "" },
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

  const loadDB = () => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        // Sanitize any previous dummy/mockup data (e.g. Siti Rahma, Pak Joko)
        if (raw.includes("Siti Rahma") || raw.includes("Pak Joko") || raw.includes("Perkins")) {
          localStorage.removeItem(STORE);
          const emptyDb: Record<string, any[]> = {
            genset: [],
            cleaning: [],
            water: [],
            delivery: [],
            pdam: [],
            electricity: [],
          };
          localStorage.setItem(STORE, JSON.stringify(emptyDb));
          setDb(emptyDb);
          return;
        }

        const parsed = JSON.parse(raw);
        const loaded: Record<string, any[]> = {};
        Object.keys(configs).forEach((k) => {
          loaded[k] = Array.isArray(parsed[k]) ? parsed[k] : [];
        });
        setDb(loaded);
      } else {
        const emptyDb: Record<string, any[]> = {
          genset: [],
          cleaning: [],
          water: [],
          delivery: [],
          pdam: [],
          electricity: [],
        };
        localStorage.setItem(STORE, JSON.stringify(emptyDb));
        setDb(emptyDb);
      }
    } catch (e) {
      console.error("Gagal load GA DB:", e);
    }
  };

  const setAndSaveDB = (newDb: Record<string, any[]>) => {
    setDb(newDb);
    try {
      localStorage.setItem(STORE, JSON.stringify(newDb));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("ga_db_updated", { detail: newDb }));
    } catch (e) {
      console.error("Gagal simpan GA DB:", e);
    }
  };

  useEffect(() => {
    loadDB();
    const handleSync = () => loadDB();
    window.addEventListener("storage", handleSync);
    window.addEventListener("ga_db_updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("ga_db_updated", handleSync);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view") || params.get("tab");
      if (v && Object.keys(configs).concat(["dashboard"]).includes(v)) {
        setActiveView(v);
      }
    }
  }, []);



  const handleFieldChange = (mod: string, fieldId: string, val: any) => {
    setFormData((prev) => {
      const updated = {
        ...prev[mod],
        [fieldId]: val,
      };

      if (mod === "water") {
        if (fieldId === "date" && val) {
          updated.day = weekdays[new Date(val + "T12:00:00").getDay()] || "";
        }
        if (fieldId === "gallons" || fieldId === "unitPrice") {
          const g = Number(fieldId === "gallons" ? val : updated.gallons || 0);
          const p = Number(fieldId === "unitPrice" ? val : updated.unitPrice || 0);
          updated.total = g * p;
        }
      }

      return {
        ...prev,
        [mod]: updated,
      };
    });
  };

  const handleCheckChange = (mod: string, checkId: string, val: string) => {
    setChecks((prev) => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [checkId]: val,
      },
    }));
  };

  const handleMarkAllGood = (mod: string) => {
    const c = configs[mod];
    if (!c?.checklist) return;
    const allGood: Record<string, string> = {};
    c.checklist.forEach(([id]: any) => {
      allGood[id] = "good";
    });
    setChecks((prev) => ({
      ...prev,
      [mod]: allGood,
    }));
  };

  const handleResetForm = (mod: string) => {
    const defaultLoc = !isAll && userCabangs.length > 0 ? userCabangs[0]?.toUpperCase() : "";
    setFormData((prev) => ({
      ...prev,
      [mod]: {
        location: defaultLoc,
        date: today(),
        time: nowTime(),
        officer: currentFullName,
        inspector: currentFullName,
      },
    }));
    if (configs[mod]?.checklist) {
      setChecks((prev) => ({ ...prev, [mod]: {} }));
    }
    if (configs[mod]?.photos) {
      setPhotos((prev) => ({ ...prev, [mod]: [] }));
    }
    setEditId((prev) => ({ ...prev, [mod]: null }));
  };

  // Compress photo via HTML Canvas
  const compressPhoto = (file: File): Promise<{ name: string; data: string }> => {
    return new Promise((resolve, reject) => {
      const rd = new FileReader();
      rd.onerror = reject;
      rd.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 1100,
            s = Math.min(1, max / Math.max(img.width, img.height)),
            c = document.createElement("canvas");
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
          resolve({ name: file.name, data: c.toDataURL("image/jpeg", 0.72) });
        };
        img.src = rd.result as string;
      };
      rd.readAsDataURL(file);
    });
  };

  const handleAddPhotos = async (mod: string, fileList: FileList | null) => {
    if (!fileList) return;
    const cur = photos[mod] || [];
    const room = Math.max(0, 3 - cur.length);
    if (!room) {
      showToast("Maksimal 3 foto per record");
      return;
    }
    const files = Array.from(fileList).slice(0, room);
    const added: Array<{ name: string; data: string }> = [];
    for (const f of files) {
      if (f.type.startsWith("image/")) {
        try {
          const comp = await compressPhoto(f);
          added.push(comp);
        } catch (e) {
          console.error("Gagal compress foto:", e);
        }
      }
    }
    setPhotos((prev) => ({ ...prev, [mod]: [...cur, ...added] }));
  };

  const handleRemovePhoto = (mod: string, idx: number) => {
    setPhotos((prev) => {
      const list = [...(prev[mod] || [])];
      list.splice(idx, 1);
      return { ...prev, [mod]: list };
    });
  };

  const handleSaveRecord = (mod: string, e: React.FormEvent) => {
    e.preventDefault();
    const rawForm = formData[mod] || {};
    const defaultLoc = !isAll && userCabangs.length === 1 ? userCabangs[0]?.toUpperCase() : "";
    const curForm: Record<string, any> = {
      date: rawForm.date || today(),
      time: rawForm.time || nowTime(),
      location: rawForm.location || defaultLoc,
      officer: rawForm.officer || currentFullName,
      inspector: rawForm.inspector || currentFullName,
      ...rawForm,
    };
    const currentId = editId[mod];
    const isEdit = Boolean(currentId);

    // ── Location guard ──────────────────────────────────────────────────────
    const recLoc = curForm.location || "";
    if (!isLocationAllowed(recLoc, userCabangs, isAll)) {
      showToast("❌ Tidak diizinkan: Cabang penugasan Anda adalah " + userCabangRaw);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    let derived: Record<string, any> = {};
    if (configs[mod]?.checklist) {
      const curChecks = checks[mod] || {};
      const a = assessChecklist(configs[mod], curChecks);
      if (a.filled < a.total && !window.confirm(`Masih ada ${a.blank} item checklist belum diisi. Simpan sebagai BELUM LENGKAP?`)) {
        return;
      }
      derived = {
        checks: curChecks,
        status: a.status,
        score: a.score,
        issueCount: a.bad.length,
      };
    }

    if (configs[mod]?.photos) {
      derived.photos = photos[mod] || [];
    }

    if (mod === "water") {
      derived.day = curForm.date ? weekdays[new Date(curForm.date + "T12:00:00").getDay()] : "";
      derived.total = Number(curForm.gallons || 0) * Number(curForm.unitPrice || 0);
    }

    const id = currentId || String(Date.now());
    const list = db[mod] || [];
    const idx = isEdit ? list.findIndex((x) => String(x.id) === String(id)) : -1;
    const old = idx >= 0 ? list[idx] : null;

    const newRec = {
      ...old,
      ...curForm,
      ...derived,
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
    showToast(isEdit ? "Record GA diperbarui" : "Record GA disimpan");
    handleResetForm(mod);
  };

  const handleEditRecord = (mod: string, id: string) => {
    const r = db[mod]?.find((x) => String(x.id) === String(id));
    if (!r) return;

    if (!isLocationAllowed(r.location || "", userCabangs, isAll)) {
      showToast("❌ Akses ditolak: Record ini di luar cabang penugasan Anda.");
      return;
    }

    setFormData((prev) => ({ ...prev, [mod]: { ...r } }));
    if (configs[mod]?.checklist) {
      setChecks((prev) => ({ ...prev, [mod]: r.checks || {} }));
    }
    if (configs[mod]?.photos) {
      setPhotos((prev) => ({ ...prev, [mod]: r.photos || [] }));
    }
    setEditId((prev) => ({ ...prev, [mod]: id }));
    setActiveView(mod);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteRecord = (mod: string, id: string) => {
    const r = db[mod]?.find((x) => String(x.id) === String(id));
    if (!r) return;

    if (!isLocationAllowed(r.location || "", userCabangs, isAll)) {
      showToast("❌ Akses ditolak: Anda tidak dapat menghapus record di luar cabang penugasan.");
      return;
    }

    if (!window.confirm(`Hapus record ${configs[mod]?.short || mod} tanggal ${r.date || "-"}?`)) return;
    const updated = db[mod]?.filter((x) => String(x.id) !== String(id)) || [];
    const newDb = { ...db, [mod]: updated };
    setAndSaveDB(newDb);
    setSelected((prev) => {
      const nextSet = new Set(prev[mod]);
      nextSet.delete(id);
      return { ...prev, [mod]: nextSet };
    });
    showToast("Record GA dihapus");
  };

  // ── Location & User Access Filtering ─────────────────────────────────────
  const getFiltered = (mod: string) => {
    const f = filters[mod] || { search: "", month: "", from: "", to: "" };
    const q = (f.search || "").toLowerCase();
    const month = f.month || "";
    const from = f.from || "";
    const to = f.to || "";

    let records = (db[mod] || []).filter((r) => isLocationAllowed(r.location || "", userCabangs, isAll));

    if (mod === "pdam" || mod === "electricity") {
      const usageMap = new Map(enrichReadings(records).map((x) => [String(x.id), x._usage]));
      records = records.map((x) => ({ ...x, _usage: usageMap.get(String(x.id)) || 0 }));
    }

    return records
      .filter((r) => {
        if (q) {
          const vals = Object.values(r)
            .filter((v) => typeof v !== "object")
            .join(" ")
            .toLowerCase();
          if (!vals.includes(q)) return false;
        }
        if (month && !(r.date || "").startsWith(month)) return false;
        if (from && (r.date || "") < from) return false;
        if (to && (r.date || "") > to) return false;
        return true;
      })
      .sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  };

  const getDisplayValue = (mod: string, r: any, key: string) => {
    if (key === "_status") {
      return `<span class="badge ${statusCls(r.status || "")}">${esc(r.status || "BELUM LENGKAP")}</span>`;
    }
    if (key === "_issues") return r.issueCount || 0;
    if (key === "_score") return `${r.score ?? 0}%`;
    if (key === "_unitPrice") return rupiah(r.unitPrice);
    if (key === "_total") return `<b>${rupiah(r.total)}</b>`;
    if (key === "_meter") return num(r.meter);
    if (key === "_usage") return num(r._usage);
    return esc(r[key] ?? "-");
  };

  // ── Print Templates ──────────────────────────────────────────────────────
  const commonPrintHead = (title: string, sub = "") => {
    return `<div class="printHead"><div class="printBrand"><div class="printLogo">CPA</div><div><h1>${esc(
      title
    )}</h1><p>PT. Cahaya Pengajaran Abadi${sub ? " · " + esc(sub) : ""}</p></div></div><div class="printMeta">Logbook General Affairs<br>Dokumen digital · Revisi 01<br>Dicetak: ${new Date().toLocaleString(
      "id-ID"
    )}</div></div>`;
  };

  const printRecordHtml = (mod: string, r: any) => {
    const c = configs[mod];
    const fields = c.fields.filter((x: any) => !["remarks", "notes", "contents"].includes(x[0]));
    const a = c.checklist ? assessChecklist(c, r.checks || {}) : null;

    return `<article class="printSheet">${commonPrintHead(c.label, `${r.location || ""} · ${r.date || ""}`)}
<div class="printBody">
  <div class="pGrid">
    ${fields
        .map(
          ([id, label]: [string, string]) =>
            `<div class="pKv"><b>${esc(label)}</b><span>${id === "total" || id === "unitPrice" ? rupiah(r[id]) : esc(r[id] ?? "-")
            }</span></div>`
        )
        .join("")}
  </div>
  ${a
        ? `<div class="pDecision">
    <div><b>${a.score}%</b><small>Kelengkapan</small></div>
    <div><b>${a.good}</b><small>Good / Bersih</small></div>
    <div><b>${a.bad.length}</b><small>Temuan</small></div>
    <div><b>${esc(a.status)}</b><small>Status</small></div>
  </div>
  <div class="pSection">
    <h3>Item Pemeriksaan</h3>
    <div class="pItems">
      ${c.checklist
          .map(
            ([id, label]: [string, string]) =>
              `<div class="pItem ${r.checks?.[id] === "bad" ? "issue" : ""}">
              <span>${esc(label)}</span>
              <b>${esc(c.statusOptions.find((x: any) => x[0] === r.checks?.[id])?.[1] || "Belum diisi")}</b>
            </div>`
          )
          .join("")}
    </div>
  </div>`
        : ""
      }
  <div class="pSection">
    <h3>Keterangan</h3>
    <div class="pNotes">${esc(r.remarks || r.notes || r.contents || "-")}</div>
    ${r.photos?.length
        ? `<div class="pPhotos">${r.photos.map((p: any) => `<img src="${p.data}" alt="Lampiran">`).join("")}</div>`
        : ""
      }
  </div>
  ${c.checklist
        ? `<div class="pSign">
    <div>${mod === "genset" ? "Inspect By" : "Petugas"}<div class="signLine">${esc(c.officer(r))}</div></div>
    <div>Diperiksa / Diketahui Oleh<div class="signLine">${esc(r.acknowledged || r.checker || "-")}</div></div>
  </div>`
        : ""
      }
  <div class="printFoot">Record ID: ${esc(r.id)} · Data disimpan secara digital pada Logbook GA.</div>
</div></article>`;
  };

  const printTableHtml = (mod: string, rows: any[]) => {
    const c = configs[mod];
    if (!rows.length) return null;
    return `<article class="printSheet">${commonPrintHead(`REKAP ${c.label.toUpperCase()}`, `${rows.length} record`)}
<div class="printBody">
  <table class="printTable">
    <thead>
      <tr>${c.columns.map((x: any) => `<th>${esc(x[1])}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r: any) =>
            `<tr>${c.columns
              .map(([k]: [string, string]) => `<td>${getDisplayValue(mod, r, k).replace(/<[^>]*>/g, "")}</td>`)
              .join("")}</tr>`
        )
        .join("")}
    </tbody>
  </table>
  <div class="printFoot">Rekap dicetak dari Logbook General Affairs.</div>
</div></article>`;
  };

  const printDashHtml = () => {
    const filteredDb: Record<string, any[]> = {};
    Object.keys(configs).forEach((k) => {
      filteredDb[k] = (db[k] || []).filter((r) => isLocationAllowed(r.location || "", userCabangs, isAll));
    });

    return `<article class="printSheet">${commonPrintHead("DASHBOARD GENERAL AFFAIRS", today())}
<div class="printBody">
  <div class="pGrid">
    ${[
        ["Inspeksi Genset", filteredDb.genset.length],
        ["Checklist Kebersihan", filteredDb.cleaning.length],
        ["Pembelian Air Minum", filteredDb.water.length],
        ["Pengiriman", filteredDb.delivery.length],
        ["Pembacaan PDAM", filteredDb.pdam.length],
        ["Pembacaan Listrik", filteredDb.electricity.length],
        ["Total Galon", filteredDb.water.reduce((n, r) => n + Number(r.gallons || 0), 0)],
        ["Biaya Air Minum", rupiah(filteredDb.water.reduce((n, r) => n + Number(r.total || 0), 0))],
      ]
        .map((x: any) => `<div class="pKv"><b>${x[0]}</b><span>${x[1]}</span></div>`)
        .join("")}
  </div>
  <div class="pSection">
    <h3>Ringkasan Aktivitas</h3>
    <div class="pNotes">
      Total seluruh record: ${Object.values(filteredDb).reduce((n, a) => n + a.length, 0)}. 
      Pemakaian PDAM tercatat: ${num(enrichReadings(filteredDb.pdam).reduce((n, r) => n + r._usage, 0))} m³. 
      Pemakaian listrik tercatat: ${num(enrichReadings(filteredDb.electricity).reduce((n, r) => n + r._usage, 0))} kWh.
    </div>
  </div>
</div></article>`;
  };

  const triggerPrint = (html: string) => {
    setPrintHtml(html);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // ── Excel Export (SpreadsheetML XML format) ──────────────────────────────
  const exportExcel = (modules = Object.keys(configs), filterMonth = "") => {
    const sheets: string[] = [];

    const excelColumns = (mod: string) => {
      const C = (k: string, l: string, t = "text", w = 90) => ({ k, l, t, w });
      const base = [
        C("_no", "No.", "number", 38),
        C("_month", "Bulan", "text", 95),
        C("date", "Tanggal", "date", 78),
        C("time", "Jam", "text", 55),
        C("location", "Lokasi", "text", 90),
      ];

      if (mod === "genset") {
        return [
          ...base,
          C("brand", "Brand", "text", 80),
          C("model", "Model", "text", 80),
          C("power", "Power / KW", "text", 72),
          C("engineNo", "Engine No.", "text", 88),
          C("hpSpecNo", "HP Spec No.", "text", 88),
          C("fuelPercent", "Fuel Level (%)", "number", 72),
          ...configs.genset.checklist.map(([id, l]: any) => C("check:" + id, l, "status", 85)),
          C("_status", "Status Inspeksi", "status", 125),
          C("_score", "Kelengkapan (%)", "percent", 85),
          C("_issues", "Jumlah Damage", "number", 78),
          C("remarks", "Remarks / Keterangan", "text", 170),
          C("inspector", "Inspect By", "text", 100),
          C("acknowledged", "Diketahui Oleh", "text", 105),
        ];
      }
      if (mod === "cleaning") {
        return [
          ...base,
          C("area", "Area / Ruangan", "text", 115),
          ...configs.cleaning.checklist.map(([id, l]: any) => C("check:" + id, l, "status", 90)),
          C("_status", "Status Kebersihan", "status", 115),
          C("_score", "Kelengkapan (%)", "percent", 85),
          C("_issues", "Jumlah Temuan", "number", 78),
          C("notes", "Keterangan", "text", 170),
          C("officer", "Petugas Kebersihan", "text", 110),
          C("checker", "Diperiksa Oleh", "text", 105),
        ];
      }
      if (mod === "water") {
        return [
          C("_no", "No.", "number", 38),
          C("_month", "Bulan", "text", 95),
          C("day", "Hari", "text", 65),
          C("date", "Tanggal", "date", 78),
          C("location", "Lokasi", "text", 90),
          C("gallons", "Jumlah Galon", "number", 78),
          C("unitPrice", "Harga per Galon", "currency", 95),
          C("total", "Total Harga", "currency", 100),
          C("supplier", "Supplier / Toko", "text", 120),
          C("officer", "Petugas", "text", 100),
          C("notes", "Keterangan", "text", 170),
        ];
      }
      if (mod === "delivery") {
        return [
          ...base,
          C("itemType", "Jenis Barang", "text", 90),
          C("contents", "Isi Barang / Paket", "text", 180),
          C("shipping", "Pengiriman / Tujuan", "text", 135),
          C("recipient", "Penerima", "text", 105),
          C("courier", "Courier", "text", 90),
          C("trackingNo", "Nomor Resi", "text", 125),
          C("officer", "Petugas Pengirim", "text", 110),
          C("notes", "Keterangan", "text", 160),
        ];
      }
      if (mod === "pdam") {
        return [
          ...base,
          C("meter", "Meter PDAM (m³)", "number", 95),
          C("_usage", "Pemakaian (m³)", "number", 95),
          C("officer", "Petugas", "text", 105),
          C("notes", "Keterangan", "text", 180),
        ];
      }
      return [
        ...base,
        C("meter", "Meter Listrik (kWh)", "number", 105),
        C("_usage", "Pemakaian (kWh)", "number", 105),
        C("officer", "Petugas", "text", 105),
        C("notes", "Keterangan", "text", 180),
      ];
    };

    const excelValue = (mod: string, r: any, col: any, index: number) => {
      const k = col.k;
      if (k === "_no") return index + 1;
      if (k === "_month") return monthLabel((r.date || "").slice(0, 7));
      if (k.startsWith("check:")) {
        const id = k.slice(6),
          v = r.checks?.[id] || "";
        return configs[mod].statusOptions.find((x: any) => x[0] === v)?.[1] || "Belum diisi";
      }
      if (k === "_status") return r.status || "BELUM LENGKAP";
      if (k === "_score") return Number(r.score || 0) / 100;
      if (k === "_issues") return Number(r.issueCount || 0);
      if (k === "_usage") return Number(r._usage || 0);
      return r[k] ?? "";
    };

    const excelStyle = (col: any, value: any) => {
      if (col.t === "currency") return "Currency";
      if (col.t === "number") return "Number";
      if (col.t === "percent") return "Percent";
      if (col.t === "date") return "Date";
      if (col.t === "status") {
        const s = String(value);
        if (/Damage|Kurang|DAMAGE|PERLU/.test(s)) return "StatusBad";
        if (/Good|Bersih|Baik|GOOD|^BERSIH$/.test(s)) return "StatusGood";
        if (/N\/A/.test(s)) return "StatusNA";
        return "StatusEmpty";
      }
      return "Text";
    };

    const excelCell = (value: any, col: any) => {
      const numeric = ["currency", "number", "percent"].includes(col.t) && value !== "" && !Number.isNaN(Number(value));
      const type = numeric ? "Number" : "String";
      return `<Cell ss:StyleID="${excelStyle(col, value)}"><Data ss:Type="${type}">${xmlEsc(
        numeric ? Number(value) : value
      )}</Data></Cell>`;
    };

    const sheetXml = (name: string, title: string, subtitle: string, columns: any[], records: any[], mod: any) => {
      const widths = columns.map((c) => `<Column ss:AutoFitWidth="0" ss:Width="${c.w || 90}"/>`).join("");
      const head = columns.map((c) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEsc(c.l)}</Data></Cell>`).join("");
      const body = records.map((r, i) => `<Row>${columns.map((c) => excelCell(excelValue(mod, r, c, i), c)).join("")}</Row>`).join("");
      const last = Math.max(4, records.length + 4);
      return `<Worksheet ss:Name="${xmlEsc(name.slice(0, 31))}"><Table>${widths}<Row ss:Height="27"><Cell ss:MergeAcross="${columns.length - 1
        }" ss:StyleID="Title"><Data ss:Type="String">${xmlEsc(title)}</Data></Cell></Row><Row ss:Height="20"><Cell ss:MergeAcross="${columns.length - 1
        }" ss:StyleID="Subtitle"><Data ss:Type="String">${xmlEsc(
          subtitle
        )}</Data></Cell></Row><Row ss:Height="8"></Row><Row ss:Height="32">${head}</Row>${body}</Table><AutoFilter x:Range="R4C1:R${last}C${columns.length
        }" xmlns="urn:schemas-microsoft-com:office:excel"/><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Landscape"/></PageSetup><FreezePanes/><FrozenNoSplit/><SplitHorizontal>4</SplitHorizontal><TopRowBottomPane>4</TopRowBottomPane><ActivePane>2</ActivePane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions></Worksheet>`;
    };

    modules.forEach((mod) => {
      let records = (db[mod] || []).filter((r) => isLocationAllowed(r.location || "", userCabangs, isAll));
      if (mod === "pdam" || mod === "electricity") {
        const usageMap = new Map(enrichReadings(records).map((x) => [String(x.id), x._usage]));
        records = records.map((x) => ({ ...x, _usage: usageMap.get(String(x.id)) || 0 }));
      }
      records = [...records].sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
      const period = filterMonth ? monthLabel(filterMonth) : "Seluruh periode";
      sheets.push(
        sheetXml(
          configs[mod].short,
          configs[mod].label.toUpperCase(),
          `${period} · ${records.length} record · Diekspor ${new Date().toLocaleString("id-ID")}`,
          excelColumns(mod),
          records,
          mod
        )
      );
    });

    const excelStyles = `<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="10"/><Interior/><NumberFormat/><Protection/></Style>
<Style ss:ID="Title"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#102638" ss:Pattern="Solid"/></Style>
<Style ss:ID="Subtitle"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#5B6872"/><Interior ss:Color="#FFF4DC" ss:Pattern="Solid"/></Style>
<Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2E7"/></Borders><Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#173D57" ss:Pattern="Solid"/></Style>
<Style ss:ID="Text"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E3E9EC"/></Borders></Style>
<Style ss:ID="Date"><Alignment ss:Horizontal="Center" ss:Vertical="Top"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E3E9EC"/></Borders></Style>
<Style ss:ID="Number"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E3E9EC"/></Borders><NumberFormat ss:Format="#,##0.00"/></Style>
<Style ss:ID="Currency"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E3E9EC"/></Borders><NumberFormat ss:Format="&quot;Rp&quot; #,##0"/></Style>
<Style ss:ID="Percent"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E3E9EC"/></Borders><NumberFormat ss:Format="0\%"/></Style>
<Style ss:ID="StatusGood"><Alignment ss:Horizontal="Center" ss:Vertical="Top" ss:WrapText="1"/><Font ss:Color="#087348" ss:Bold="1"/><Interior ss:Color="#DCF4E8" ss:Pattern="Solid"/></Style>
<Style ss:ID="StatusBad"><Alignment ss:Horizontal="Center" ss:Vertical="Top" ss:WrapText="1"/><Font ss:Color="#A32E29" ss:Bold="1"/><Interior ss:Color="#FFE9E7" ss:Pattern="Solid"/></Style>
<Style ss:ID="StatusNA"><Alignment ss:Horizontal="Center" ss:Vertical="Top"/><Font ss:Color="#53626E"/><Interior ss:Color="#E9EEF1" ss:Pattern="Solid"/></Style>
<Style ss:ID="StatusEmpty"><Alignment ss:Horizontal="Center" ss:Vertical="Top" ss:WrapText="1"/><Font ss:Color="#8A5A00"/><Interior ss:Color="#FFF0D5" ss:Pattern="Solid"/></Style>
</Styles>`;

    const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>PT. Cahaya Pengajaran Abadi</Author><Company>PT. Cahaya Pengajaran Abadi</Company><Title>Logbook General Affairs</Title><Created>${new Date().toISOString()}</Created></DocumentProperties>${excelStyles}${sheets.join(
      ""
    )}</Workbook>`;

    download(`Logbook_GA_${modules.length === 1 ? modules[0] : "Semua"}_${today()}.xls`, "application/vnd.ms-excel", xml);
  };

  const backup = () => {
    download(
      `Backup_Logbook_GA_${today()}.json`,
      "application/json",
      JSON.stringify(
        {
          app: "CPA GA Logbook",
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
        showToast("Backup GA berhasil diimpor");
      } catch (e) {
        alert("File backup tidak valid.");
      }
    };
    rd.readAsText(file);
  };

  // ── Dashboard Calculations ───────────────────────────────────────────────
  const filteredDb = useMemo(() => {
    const out: Record<string, any[]> = {};
    Object.keys(configs).forEach((k) => {
      out[k] = (db[k] || []).filter((r) => isLocationAllowed(r.location || "", userCabangs, isAll));
    });
    return out;
  }, [db, userCabangs, isAll]);

  const pEnriched = useMemo(() => enrichReadings(filteredDb.pdam || []), [filteredDb.pdam]);
  const eEnriched = useMemo(() => enrichReadings(filteredDb.electricity || []), [filteredDb.electricity]);

  const { gBad, cAvg, wG, wC, pUse, eUse, totalRecords, lastDate } = useMemo(() => {
    const gBad = (filteredDb.genset || []).reduce((n, r) => n + Number(r.issueCount || 0), 0);
    const cAvg = filteredDb.cleaning?.length
      ? Math.round(filteredDb.cleaning.reduce((n, r) => n + Number(r.score || 0), 0) / filteredDb.cleaning.length)
      : 0;
    const wG = (filteredDb.water || []).reduce((n, r) => n + Number(r.gallons || 0), 0);
    const wC = (filteredDb.water || []).reduce((n, r) => n + Number(r.total || 0), 0);
    const pUse = pEnriched.reduce((n, r) => n + r._usage, 0);
    const eUse = eEnriched.reduce((n, r) => n + r._usage, 0);
    const totalRecords = Object.values(filteredDb).reduce((n, a) => n + a.length, 0);

    const dates = Object.values(filteredDb)
      .flat()
      .map((x) => x.date)
      .filter(Boolean)
      .sort();
    const lastDate = dates.at(-1) || "-";

    return { gBad, cAvg, wG, wC, pUse, eUse, totalRecords, lastDate };
  }, [filteredDb, pEnriched, eEnriched]);

  // Status bars
  const sts = [
    ["Genset Baik", (filteredDb.genset || []).filter((x) => x.status === "GOOD / BAIK").length, "ok"],
    ["Genset Damage", (filteredDb.genset || []).filter((x) => /DAMAGE/.test(x.status || "")).length, "bad"],
    ["Area Bersih", (filteredDb.cleaning || []).filter((x) => x.status === "BERSIH").length, "ok"],
    ["Kurang Bersih", (filteredDb.cleaning || []).filter((x) => /KURANG/.test(x.status || "")).length, "bad"],
  ];
  const maxSts = Math.max(1, ...sts.map((x) => Number(x[1])));

  const currentMonth = today().slice(0, 7);

  // Monthly summary
  const months = useMemo(() => {
    return [
      ...new Set(
        Object.values(filteredDb)
          .flat()
          .map((r) => (r.date || "").slice(0, 7))
          .filter(Boolean)
      ),
    ]
      .sort()
      .reverse();
  }, [filteredDb]);

  const monthlySummaryRows = useMemo(() => {
    return months.map((month) => {
      const inMonth = (a: any[]) => a.filter((r) => (r.date || "").startsWith(month));
      const water = inMonth(filteredDb.water || []);
      const pdamIn = inMonth(pEnriched);
      const elecIn = inMonth(eEnriched);
      return {
        month,
        genset: inMonth(filteredDb.genset || []).length,
        cleaning: inMonth(filteredDb.cleaning || []).length,
        gallons: water.reduce((n, r) => n + Number(r.gallons || 0), 0),
        waterCost: water.reduce((n, r) => n + Number(r.total || 0), 0),
        delivery: inMonth(filteredDb.delivery || []).length,
        pdam: pdamIn.reduce((n, r) => n + Number(r._usage || 0), 0),
        electricity: elecIn.reduce((n, r) => n + Number(r._usage || 0), 0),
      };
    });
  }, [months, filteredDb, pEnriched, eEnriched]);

  // Recent activity
  const recentRows = useMemo(() => {
    return Object.entries(filteredDb)
      .flatMap(([m, a]) => a.map((r) => ({ ...r, _module: m })))
      .sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")))
      .slice(0, 10);
  }, [filteredDb]);

  if (!isMounted || !currentUser) {
    return (
      <div className="ga-logbook-root" style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔒</div>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Memeriksa Hak Akses General Affairs...
        </div>
        <div style={{ fontSize: "0.85rem" }}>Memverifikasi sesi login Anda...</div>
      </div>
    );
  }

  return (
    <div className="ga-logbook-root">
      {/* HEADER IDENTIK */}
      <header className="header">
        <div className="headInner">
          <div className="logo">CPA</div>
          <div>
            <h1>Logbook General Affairs</h1>
            <p>Genset · Kebersihan · Air Minum · Pengiriman · PDAM · Listrik</p>
          </div>
          <div className="doc">
            <b>PT. CAHAYA PENGAJARAN ABADI</b>
            <br />
            GA Operational Record System
            <br />
            Dokumen digital · Revisi 01
          </div>
        </div>
      </header>

      {/* APP CONTAINER IDENTIK */}
      <div className="app">
        {/* SIDEBAR IDENTIK */}
        <aside className="sidebar ga-static-sidebar" style={{ position: "static", top: "auto" }}>
          <div className="navTitle">Navigasi</div>
          <button
            className={`navBtn ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            <span className="navIcon">⌂</span>Dashboard GA
          </button>
          <button
            className={`navBtn ${activeView === "genset" ? "active" : ""}`}
            onClick={() => setActiveView("genset")}
          >
            <span className="navIcon">G</span>Genset
          </button>
          <button
            className={`navBtn ${activeView === "cleaning" ? "active" : ""}`}
            onClick={() => setActiveView("cleaning")}
          >
            <span className="navIcon">K</span>Kebersihan
          </button>
          <button
            className={`navBtn ${activeView === "water" ? "active" : ""}`}
            onClick={() => setActiveView("water")}
          >
            <span className="navIcon">A</span>Air Minum
          </button>
          <button
            className={`navBtn ${activeView === "delivery" ? "active" : ""}`}
            onClick={() => setActiveView("delivery")}
          >
            <span className="navIcon">D</span>Pengiriman
          </button>
          <button
            className={`navBtn ${activeView === "pdam" ? "active" : ""}`}
            onClick={() => setActiveView("pdam")}
          >
            <span className="navIcon">P</span>PDAM
          </button>
          <button
            className={`navBtn ${activeView === "electricity" ? "active" : ""}`}
            onClick={() => setActiveView("electricity")}
          >
            <span className="navIcon">L</span>Listrik
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
                <h2>Dashboard General Affairs</h2>
                <p>Ringkasan operasional dan pemakaian utilitas berdasarkan seluruh data tersimpan.</p>
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
            <div
              style={{
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
              }}
            >
              <span style={{ fontSize: "1rem" }}>{isAll ? "🌐" : "📍"}</span>
              {isAll
                ? "Anda melihat data seluruh lokasi (akses penuh GA)."
                : `Menampilkan data General Affairs sesuai lokasi penugasan: ${userCabangRaw}`}
            </div>

            <div className="kpis">
              <div className="kpi">
                <span>Inspeksi Genset</span>
                <b>{filteredDb.genset?.length || 0}</b>
                <small>{gBad} temuan damage</small>
              </div>
              <div className="kpi">
                <span>Checklist Kebersihan</span>
                <b>{filteredDb.cleaning?.length || 0}</b>
                <small>{cAvg}% skor rata-rata</small>
              </div>
              <div className="kpi">
                <span>Pembelian Air Minum</span>
                <b>{num(wG)} galon</b>
                <small>{rupiah(wC)}</small>
              </div>
              <div className="kpi">
                <span>Pengiriman Dokumen</span>
                <b>{filteredDb.delivery?.length || 0}</b>
                <small>paket / dokumen tercatat</small>
              </div>
              <div className="kpi">
                <span>Pemakaian PDAM</span>
                <b>{num(pUse)} m³</b>
                <small>{filteredDb.pdam?.length || 0} pembacaan meter</small>
              </div>
              <div className="kpi">
                <span>Pemakaian Listrik</span>
                <b>{num(eUse)} kWh</b>
                <small>{filteredDb.electricity?.length || 0} pembacaan meter</small>
              </div>
              <div className="kpi">
                <span>Total Record GA</span>
                <b>{totalRecords}</b>
                <small>seluruh modul</small>
              </div>
              <div className="kpi">
                <span>Update Terakhir</span>
                <b style={{ fontSize: "17px" }}>{lastDate}</b>
                <small>tanggal record terbaru</small>
              </div>
            </div>

            <div className="dashGrid">
              <article className="card">
                <h3>Status Inspeksi</h3>
                <div className="sub">Distribusi hasil checklist genset dan kebersihan.</div>
                <div className="bars">
                  {sts.map(([label, val, cls]) => (
                    <div className="bar" key={String(label)}>
                      <span>{label}</span>
                      <div className="track">
                        <div
                          className={`fill ${cls}`}
                          style={{
                            width: `${maxSts ? Math.max(Number(val) ? 4 : 0, (Number(val) / maxSts) * 100) : 0}%`,
                          }}
                        ></div>
                      </div>
                      <b>{val}</b>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card">
                <h3>Rekap Bulan Berjalan</h3>
                <div className="sub">Aktivitas pada bulan kalender saat ini ({monthLabel(currentMonth)}).</div>
                <div>
                  {Object.entries(configs).map(([k, c]) => {
                    const cnt = (filteredDb[k] || []).filter((x) => (x.date || "").startsWith(currentMonth)).length;
                    return (
                      <div className="metricRow" key={k}>
                        <span>{c.short}</span>
                        <b>{cnt} record</b>
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>

            <article className="card">
              <h3>History Log Bulanan</h3>
              <div className="sub">Rekap aktivitas, transaksi, dan pemakaian utilitas per bulan.</div>
              <div className="tableWrap" style={{ maxHeight: "390px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th>Genset</th>
                      <th>Kebersihan</th>
                      <th>Air Minum</th>
                      <th>Biaya Air</th>
                      <th>Pengiriman</th>
                      <th>PDAM</th>
                      <th>Listrik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummaryRows.length ? (
                      monthlySummaryRows.map((r) => (
                        <tr key={r.month}>
                          <td>
                            <b>{monthLabel(r.month)}</b>
                          </td>
                          <td>{r.genset}</td>
                          <td>{r.cleaning}</td>
                          <td>{num(r.gallons)} galon</td>
                          <td>{rupiah(r.waterCost)}</td>
                          <td>{r.delivery}</td>
                          <td>{num(r.pdam)} m³</td>
                          <td>{num(r.electricity)} kWh</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="empty">
                          Belum ada data history log. Silakan input record melalui formulir GA.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card">
              <h3>Aktivitas Terbaru</h3>
              <div className="tableWrap" style={{ maxHeight: "340px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Modul</th>
                      <th>Tanggal</th>
                      <th>Lokasi</th>
                      <th>Ringkasan</th>
                      <th>Petugas</th>
                      <th>Status/Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.length ? (
                      recentRows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td>
                            <b>{configs[r._module]?.short}</b>
                          </td>
                          <td>
                            {r.date || "-"} {r.time || ""}
                          </td>
                          <td>{r.location || "-"}</td>
                          <td>{configs[r._module]?.summary(r)}</td>
                          <td>{configs[r._module]?.officer(r)}</td>
                          <td>
                            {r.status ? (
                              <span className={`badge ${statusCls(r.status)}`}>{r.status}</span>
                            ) : r.total ? (
                              rupiah(r.total)
                            ) : r.meter != null ? (
                              `${num(r.meter)} ${r._module === "pdam" ? "m³" : "kWh"}`
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="empty">
                          Belum ada aktivitas. Silakan input record baru melalui formulir GA di bawah.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          {/* VIEWS UNTUK 6 MODUL GA */}
          {Object.entries(configs).map(([mod, c]) => {
            const rows = getFiltered(mod);
            const curForm = formData[mod] || {};
            const isEditing = Boolean(editId[mod]);
            const modSelected = selected[mod] || new Set();

            // Checklist assessment for live summary
            const a = c.checklist ? assessChecklist(c, checks[mod] || {}) : null;

            // Filter real personnel options matching current form location
            const locForPersonnel = curForm.location || (!isAll && userCabangs[0]?.toUpperCase()) || "";
            const realPersonnel = getPersonnelForLocation(locForPersonnel);

            return (
              <section key={mod} className={`view ${activeView === mod ? "active" : ""}`}>
                {/* PAGE HEAD */}
                <div className="pageHead">
                  <div>
                    <h2>{c.label}</h2>
                    <p>{c.description}</p>
                  </div>
                  <div className="headActions">
                    <button className="btn soft" onClick={() => exportExcel([mod])}>
                      Export Excel Sesuai Filter
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
                  <div
                    style={{
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
                    }}
                  >
                    <span>📍</span>
                    <span>
                      Data ditampilkan sesuai lokasi penugasan: <b>{userCabangRaw}</b>
                    </span>
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

                          // Special handling for location input when restricted by user cabang
                          if (id === "location" && !isAll) {
                            return (
                              <label key={id} className={`field ${cl}`}>
                                <span>
                                  {label} {req && "*"}{" "}
                                  <small style={{ color: "#f59e0b", fontSize: "0.75rem" }}>
                                    (Penugasan: {userCabangRaw})
                                  </small>
                                </span>
                                {userCabangs.length > 1 ? (
                                  <select
                                    required={req}
                                    value={curForm[id] || ""}
                                    onChange={(e) => handleFieldChange(mod, id, e.target.value)}
                                  >
                                    <option value="">Pilih Cabang</option>
                                    {userCabangs.map((cb) => (
                                      <option key={cb} value={cb.toUpperCase()}>
                                        {cb.toUpperCase()}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    required={req}
                                    placeholder={userCabangs[0]?.toUpperCase() || "Lokasi"}
                                    value={curForm[id] ?? userCabangs[0]?.toUpperCase() ?? ""}
                                    onChange={(e) => handleFieldChange(mod, id, e.target.value)}
                                  />
                                )}
                              </label>
                            );
                          }

                          // Real personnel picker for Inspector / Officer / Checker / Acknowledged
                          if (["inspector", "officer", "checker", "acknowledged"].includes(id)) {
                            return (
                              <label key={id} className={`field ${cl}`}>
                                <span>
                                  {label} {req && "*"}
                                </span>
                                <input
                                  type="text"
                                  required={req}
                                  list={`personnel-list-${mod}-${id}`}
                                  placeholder="Pilih atau ketik nama petugas..."
                                  value={curForm[id] ?? currentFullName}
                                  onChange={(e) => handleFieldChange(mod, id, e.target.value)}
                                />
                                <datalist id={`personnel-list-${mod}-${id}`}>
                                  {realPersonnel.map((p) => (
                                    <option key={p.username + id} value={p.name}>
                                      {p.name} ({p.role.toUpperCase()} - {p.cabang})
                                    </option>
                                  ))}
                                </datalist>
                              </label>
                            );
                          }

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
                                readOnly={id === "day" || id === "total"}
                                value={
                                  curForm[id] !== undefined
                                    ? curForm[id]
                                    : id === "date"
                                      ? today()
                                      : id === "time"
                                        ? nowTime()
                                        : ""
                                }
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

                      {/* CHECKLIST ITEMS JIKA ADA */}
                      {c.checklist && (
                        <div className="checkWrap">
                          <div className="checkHead">
                            <span>Item Pemeriksaan</span>
                            <span>{c.checklist.length} item</span>
                          </div>
                          <div className="checkRows">
                            {c.checklist.map(([id, label]: any) => (
                              <div className="checkRow" key={id}>
                                <div className="itemName">{label}</div>
                                <div className="statusSet">
                                  {c.statusOptions.map(([val, optLabel]: any) => {
                                    const isSel = (checks[mod] || {})[id] === val;
                                    return (
                                      <button
                                        type="button"
                                        key={val}
                                        className={`statusBtn ${val} ${isSel ? "selected" : ""}`}
                                        onClick={() => handleCheckChange(mod, id, val)}
                                      >
                                        {optLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* LAMPIRAN FOTO JIKA ADA */}
                      {c.photos && (
                        <div className="photoBox">
                          <b style={{ fontSize: "11px" }}>Lampiran Foto</b>
                          <div className="sub">Maksimal 3 foto, otomatis diperkecil via browser canvas.</div>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              handleAddPhotos(mod, e.target.files);
                              e.target.value = "";
                            }}
                          />
                          <div className="photoGrid">
                            {(photos[mod] || []).map((p, pIdx) => (
                              <div className="photo" key={pIdx}>
                                <img src={p.data} alt="Lampiran" />
                                <button type="button" onClick={() => handleRemovePhoto(mod, pIdx)}>
                                  ×
                                </button>
                                <small>{p.name}</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="actions">
                        <button className="btn primary" type="submit">
                          {isEditing ? "Perbarui Record" : "Simpan Record"}
                        </button>
                        <button className="btn soft" type="button" onClick={() => handleResetForm(mod)}>
                          Reset Form
                        </button>
                        {c.checklist && (
                          <button className="btn soft" type="button" onClick={() => handleMarkAllGood(mod)}>
                            Tandai Semua Baik
                          </button>
                        )}
                      </div>
                    </form>
                  </article>

                  {/* SUMMARY CARD / ASIDE */}
                  {c.checklist && a ? (
                    <aside className="card summaryCard">
                      <h3>Ringkasan Pemeriksaan</h3>
                      <div
                        className="scoreCircle"
                        style={{ "--score": `${a.score}%` } as React.CSSProperties}
                      >
                        <b>{a.score}%</b>
                        <small>Kelengkapan</small>
                      </div>
                      <div className={`decision ${statusCls(a.status)}`}>{a.status}</div>
                      <div className="miniStats">
                        <div className="miniStat">
                          <b>{a.good}</b>
                          <span>Baik</span>
                        </div>
                        <div className="miniStat">
                          <b>{a.bad.length}</b>
                          <span>Temuan</span>
                        </div>
                        <div className="miniStat">
                          <b>{a.blank}</b>
                          <span>Kosong</span>
                        </div>
                      </div>
                      <h4 style={{ color: "var(--amber2)", fontSize: "11px", marginBottom: "4px" }}>
                        Daftar Temuan
                      </h4>
                      <ul className="issues">
                        {a.bad.length ? (
                          a.bad.map(([id]: any) => (
                            <li key={id}>{c.checklist.find((x: any) => x[0] === id)?.[1] || id}</li>
                          ))
                        ) : (
                          <li>Tidak ada temuan.</li>
                        )}
                      </ul>
                    </aside>
                  ) : (
                    <aside className="card">
                      <h3>Informasi Rekap</h3>
                      <div className="sub">
                        {mod === "water"
                          ? `Total pembelian saat ini: ${rupiah(curForm.total || 0)}`
                          : "Isi formulir untuk menambahkan record operasional baru."}
                      </div>
                      <div style={{ marginTop: "12px" }}>
                        {mod === "water" && (
                          <>
                            <div className="metricRow">
                              <span>Total Galon</span>
                              <b>{num((filteredDb.water || []).reduce((n, r) => n + Number(r.gallons || 0), 0))}</b>
                            </div>
                            <div className="metricRow">
                              <span>Total Biaya</span>
                              <b>{rupiah((filteredDb.water || []).reduce((n, r) => n + Number(r.total || 0), 0))}</b>
                            </div>
                          </>
                        )}
                        {mod === "delivery" && (
                          <>
                            <div className="metricRow">
                              <span>Total Pengiriman</span>
                              <b>{filteredDb.delivery?.length || 0}</b>
                            </div>
                            <div className="metricRow">
                              <span>Dengan No. Resi</span>
                              <b>{(filteredDb.delivery || []).filter((x) => x.trackingNo && x.trackingNo !== "-").length}</b>
                            </div>
                          </>
                        )}
                        {mod === "pdam" && (
                          <>
                            <div className="metricRow">
                              <span>Pemakaian Tercatat</span>
                              <b>{num(pUse)} m³</b>
                            </div>
                            <div className="metricRow">
                              <span>Meter Terakhir</span>
                              <b>{pEnriched.at(-1) ? num(pEnriched.at(-1)?.meter) : 0} m³</b>
                            </div>
                          </>
                        )}
                        {mod === "electricity" && (
                          <>
                            <div className="metricRow">
                              <span>Pemakaian Tercatat</span>
                              <b>{num(eUse)} kWh</b>
                            </div>
                            <div className="metricRow">
                              <span>Meter Terakhir</span>
                              <b>{eEnriched.at(-1) ? num(eEnriched.at(-1)?.meter) : 0} kWh</b>
                            </div>
                          </>
                        )}
                      </div>
                    </aside>
                  )}
                </div>

                {/* CARD 02 DAFTAR RECORD & HISTORY */}
                <article className="card">
                  <div className="cardHead">
                    <span className="num">02</span>
                    <div>
                      <h3>History Log Bulanan</h3>
                      <div className="sub">
                        {db[mod]?.length || 0} record tersimpan · {rows.length} ditampilkan ·{" "}
                        {modSelected.size} dipilih
                      </div>
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
                      <span>Bulan</span>
                      <input
                        type="month"
                        value={filters[mod]?.month || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            [mod]: { ...prev[mod], month: e.target.value },
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Dari Tanggal</span>
                      <input
                        type="date"
                        value={filters[mod]?.from || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            [mod]: { ...prev[mod], from: e.target.value },
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Sampai Tanggal</span>
                      <input
                        type="date"
                        value={filters[mod]?.to || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            [mod]: { ...prev[mod], to: e.target.value },
                          }))
                        }
                      />
                    </label>

                    <button
                      className="btn soft"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          [mod]: { search: "", month: "", from: "", to: "" },
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
                      Pilih Semua Hasil
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
                              Belum ada data untuk cabang ini. Silakan input record melalui form di atas.
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
      <div id="printRoot" dangerouslySetInnerHTML={{ __html: printHtml || "" }} />
    </div>
  );
}
