"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, X, Loader2, Truck, Clock, ArrowRight, Building, MapPin, Calendar, Filter, RotateCcw } from 'lucide-react';
import { api, apiWarehouses } from '@/lib/api';
import MultiSelectFilter, { MultiSelectOption } from '@/components/inventory/MultiSelectFilter';

const AGING_BUCKETS = [
  { key: '0-30', label: '0 - 30 Hari', subLabel: 'Stok baru / fast-moving', min: 0, max: 30, color: '#22c55e', badge: '🌱' },
  { key: '31-60', label: '31 - 60 Hari', subLabel: '1 - 2 bulan', min: 31, max: 60, color: '#4ade80', badge: '⚡' },
  { key: '61-90', label: '61 - 90 Hari', subLabel: '2 - 3 bulan', min: 61, max: 90, color: '#38bdf8', badge: '📦' },
  { key: '91-149', label: '91 - 149 Hari', subLabel: '3 - 5 bulan (Acceptable)', min: 91, max: 149, color: '#a3e635', badge: '⏱️' },
  { key: '150-239', label: '150 - 239 Hari', subLabel: '5 - 8 bulan (Over-stock)', min: 150, max: 239, color: '#eab308', badge: '⚠️' },
  { key: '>=240', label: '≥ 240 Hari', subLabel: '> 8 bulan (Deadstock)', min: 240, max: Infinity, color: '#ef4444', badge: '🛑' },
];

export default function StockAgingPage() {
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Multi-select warehouse state for Top Bar
  const [selectedGudangs, setSelectedGudangs] = useState<string[]>(['005']); // Default Makassar

  // Period filter states
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Table column multi-select states
  const [search, setSearch] = useState('');
  const [selectedFilterProduk, setSelectedFilterProduk] = useState<string[]>([]);
  const [selectedFilterAsal, setSelectedFilterAsal] = useState<string[]>([]);
  const [selectedFilterSellIn, setSelectedFilterSellIn] = useState<string[]>([]);
  const [selectedFilterStatusAging, setSelectedFilterStatusAging] = useState<string[]>([]);
  const [selectedFilterGudang, setSelectedFilterGudang] = useState<string[]>([]);
  const [selectedFilterLifetime, setSelectedFilterLifetime] = useState<string[]>([]);
  const [selectedFilterCurrentLoc, setSelectedFilterCurrentLoc] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [agingStats, setAgingStats] = useState<Record<string, { label?: string; skuCount: number; unitCount: number }>>({
    '0-149': { label: 'Acceptable', skuCount: 0, unitCount: 0 },
    '150-239': { label: 'Over-stock', skuCount: 0, unitCount: 0 },
    '>=240': { label: 'Deadstock', skuCount: 0, unitCount: 0 }
  });
  const [data, setData] = useState<any[]>([]);
  const [traceData, setTraceData] = useState<any | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  useEffect(() => {
    apiWarehouses.list().then((res) => {
      setWarehouses(res.data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const activeWh = selectedGudangs.filter(g => g && g !== 'ALL');
    const params = new URLSearchParams();
    if (activeWh.length > 0) {
      params.append('id_gudang', activeWh.join(','));
    } else {
      params.append('id_gudang', 'ALL');
    }
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    api.get(`/api/inventory/aging-fifo?${params.toString()}`)
      .then((res: any) => {
        if (res.data) {
          setAgingStats(res.data.summary);
          setData(res.data.data);
        }
        setLoading(false);
      })
      .catch((err: any) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedGudangs, dateFrom, dateTo]);

  // Preset helpers for Period Filter
  const isAllPeriod = !dateFrom && !dateTo;
  const isThisMonth = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return dateFrom === `${y}-${m}-01` && dateTo === `${y}-${m}-${d}`;
  }, [dateFrom, dateTo]);

  const isLast30Days = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    const now = new Date();
    const past = new Date();
    past.setDate(past.getDate() - 30);
    return dateFrom === past.toISOString().slice(0, 10) && dateTo === now.toISOString().slice(0, 10);
  }, [dateFrom, dateTo]);

  const isThisYear = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return dateFrom === `${y}-01-01` && dateTo === `${y}-${m}-${d}`;
  }, [dateFrom, dateTo]);

  const handlePreset = (type: 'all' | 'this_month' | '30_days' | 'this_year') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    if (type === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (type === 'this_month') {
      setDateFrom(`${y}-${m}-01`);
      setDateTo(todayStr);
    } else if (type === '30_days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setDateFrom(past.toISOString().slice(0, 10));
      setDateTo(todayStr);
    } else if (type === 'this_year') {
      setDateFrom(`${y}-01-01`);
      setDateTo(todayStr);
    }
  };

  // Options for Top Bar Warehouse picker
  const warehouseOptions: MultiSelectOption[] = useMemo(() => {
    return warehouses.map(w => ({
      label: w.nama_gudang,
      value: w.id_gudang,
      subLabel: `Kode: ${w.id_gudang}`
    }));
  }, [warehouses]);

  // Options for Table Header: Nama Barang
  const productOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(r => {
      if (r.nama_barang) {
        counts[r.nama_barang] = (counts[r.nama_barang] || 0) + 1;
      }
    });
    return Object.keys(counts).sort().map(name => ({
      label: name,
      value: name,
      count: counts[name]
    }));
  }, [data]);

  // Options for Table Header: Asal
  const asalOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(r => {
      if (r.asal) {
        counts[r.asal] = (counts[r.asal] || 0) + 1;
      }
    });
    return Object.keys(counts).sort().map(asal => ({
      label: asal,
      value: asal,
      count: counts[asal]
    }));
  }, [data]);

  // Options for Table Header: Sell In
  const sellInOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(r => {
      const po = r.sell_in_po && r.sell_in_po !== '-' ? r.sell_in_po : 'Tanpa PO';
      counts[po] = (counts[po] || 0) + 1;
    });
    return Object.keys(counts).sort().map(po => ({
      label: po,
      value: po,
      count: counts[po]
    }));
  }, [data]);

  // Options for Table Header: Status Aging
  const statusAgingOptions: MultiSelectOption[] = [
    { label: 'Acceptable (0-149 hari)', value: 'Acceptable', badge: '✅', color: '#22c55e' },
    { label: 'Over-stock (150-239 hari)', value: 'Over-stock', badge: '⚠️', color: '#eab308' },
    { label: 'Deadstock (>= 240 hari)', value: 'Deadstock', badge: '🛑', color: '#ef4444' }
  ];

  // Options for Table Header: Lifetime Aging
  const lifetimeAgingOptions: MultiSelectOption[] = useMemo(() => {
    return AGING_BUCKETS.map(b => {
      const count = data.filter(r => {
        const d = Number(r.aging_hari || 0);
        return d >= b.min && d <= b.max;
      }).length;
      return {
        label: b.label,
        value: b.key,
        subLabel: b.subLabel,
        badge: b.badge,
        count,
        color: b.color,
      };
    });
  }, [data]);

  // Options for Table Header: Aging of Current Location
  const currentLocAgingOptions: MultiSelectOption[] = useMemo(() => {
    return AGING_BUCKETS.map(b => {
      const count = data.filter(r => {
        const d = r.umur_gudang_hari !== undefined && r.umur_gudang_hari !== null
          ? Number(r.umur_gudang_hari)
          : Number(r.aging_hari || 0);
        return d >= b.min && d <= b.max;
      }).length;
      return {
        label: b.label,
        value: b.key,
        subLabel: b.subLabel,
        badge: b.badge,
        count,
        color: b.color,
      };
    });
  }, [data]);

  // Options for Table Header: Gudang
  const gudangColumnOptions: MultiSelectOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(r => {
      const g = r.gudang || 'Gudang';
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.keys(counts).sort().map(g => ({
      label: g,
      value: g,
      count: counts[g]
    }));
  }, [data]);

  // Fetch trace history saat baris diklik untuk dilacak
  useEffect(() => {
    if (!selectedStock) {
      setTraceData(null);
      return;
    }
    setTraceLoading(true);
    const activeWh = selectedGudangs.filter(g => g && g !== 'ALL');
    api.get('/api/inventory/stock-trace', {
      params: {
        id_stok: selectedStock.id_stok,
        id_barang: selectedStock.material_code || selectedStock.id_barang,
        dokumen: selectedStock.dokumen,
        id_gudang: selectedStock.id_gudang || (activeWh.length === 1 ? activeWh[0] : undefined),
      }
    }).then((res: any) => {
      setTraceData(res.data);
      setTraceLoading(false);
    }).catch((err: any) => {
      console.error(err);
      setTraceData(null);
      setTraceLoading(false);
    });
  }, [selectedStock, selectedGudangs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFilterProduk, selectedFilterAsal, selectedFilterSellIn, selectedFilterStatusAging, selectedFilterGudang, selectedFilterLifetime, selectedFilterCurrentLoc, dateFrom, dateTo]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const s = search.toLowerCase();
      const matchSearch = 
        !s ||
        (row.material_code && row.material_code.toLowerCase().includes(s)) ||
        (row.nama_barang && row.nama_barang.toLowerCase().includes(s)) ||
        (row.produk && row.produk.toLowerCase().includes(s)) ||
        (row.asal && row.asal.toLowerCase().includes(s)) ||
        (row.sell_in_po && row.sell_in_po.toLowerCase().includes(s)) ||
        (row.dokumen && row.dokumen.toLowerCase().includes(s)) ||
        (row.kategori && row.kategori.toLowerCase().includes(s)) ||
        (row.gudang && row.gudang.toLowerCase().includes(s));

      const matchProduk = selectedFilterProduk.length === 0 || 
        selectedFilterProduk.includes(row.nama_barang) ||
        selectedFilterProduk.includes(row.material_code);

      const matchAsal = selectedFilterAsal.length === 0 || 
        selectedFilterAsal.includes(row.asal);

      const rowSellIn = row.sell_in_po && row.sell_in_po !== '-' ? row.sell_in_po : 'Tanpa PO';
      const matchSellIn = selectedFilterSellIn.length === 0 || 
        selectedFilterSellIn.includes(rowSellIn);

      const matchGudang = selectedFilterGudang.length === 0 || 
        selectedFilterGudang.includes(row.gudang) ||
        selectedFilterGudang.includes(row.id_gudang);

      const matchStatusAging = selectedFilterStatusAging.length === 0 || 
        selectedFilterStatusAging.includes(row.status_aging);

      const matchLifetime = selectedFilterLifetime.length === 0 ||
        selectedFilterLifetime.some(key => {
          const b = AGING_BUCKETS.find(x => x.key === key);
          const d = Number(row.aging_hari || 0);
          return b ? d >= b.min && d <= b.max : false;
        });

      const locDays = row.umur_gudang_hari !== undefined && row.umur_gudang_hari !== null
        ? Number(row.umur_gudang_hari)
        : Number(row.aging_hari || 0);

      const matchCurrentLoc = selectedFilterCurrentLoc.length === 0 ||
        selectedFilterCurrentLoc.some(key => {
          const b = AGING_BUCKETS.find(x => x.key === key);
          return b ? locDays >= b.min && locDays <= b.max : false;
        });

      return matchSearch && matchProduk && matchAsal && matchSellIn && matchGudang && matchStatusAging && matchLifetime && matchCurrentLoc;
    });
  }, [data, search, selectedFilterProduk, selectedFilterAsal, selectedFilterSellIn, selectedFilterGudang, selectedFilterStatusAging, selectedFilterLifetime, selectedFilterCurrentLoc]);

  const hasAnyActiveFilter = 
    search.trim() !== '' ||
    selectedFilterProduk.length > 0 ||
    selectedFilterAsal.length > 0 ||
    selectedFilterSellIn.length > 0 ||
    selectedFilterStatusAging.length > 0 ||
    selectedFilterGudang.length > 0 ||
    selectedFilterLifetime.length > 0 ||
    selectedFilterCurrentLoc.length > 0 ||
    dateFrom !== '' ||
    dateTo !== '' ||
    (selectedGudangs.length > 0 && !selectedGudangs.includes('ALL'));

  const handleResetAllFilters = () => {
    setSearch('');
    setSelectedFilterProduk([]);
    setSelectedFilterAsal([]);
    setSelectedFilterSellIn([]);
    setSelectedFilterStatusAging([]);
    setSelectedFilterGudang([]);
    setSelectedFilterLifetime([]);
    setSelectedFilterCurrentLoc([]);
    setSelectedGudangs(['ALL']);
    setDateFrom('');
    setDateTo('');
  };

  const totalPages = Math.max(Math.ceil(filteredData.length / itemsPerPage), 1);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getAgingBadgeColor = (days: number) => {
    if (days <= 149) return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', status: 'Acceptable' };
    if (days <= 239) return { bg: '#fef9c3', text: '#a16207', border: '#fef08a', status: 'Over-stock' };
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', status: 'Deadstock' };
  };

  const activeChipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '14px',
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    fontSize: '0.75rem',
    fontWeight: 600,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
          Stock Aging
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #828690)' }}>
          Laporan umur persediaan barang, nomor Sell In principal, dan jejak dokumen penerimaan
        </p>
      </div>

      {/* Toolbar: Periode Filter, Warehouse Multi-Filter, Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "var(--bg-surface, #242424)",
          border: "1px solid var(--bg-border, #444444)",
          borderRadius: "10px",
          padding: "10px 16px",
          marginBottom: "20px",
        }}
      >
        {/* Sisi Kiri: Filter Periode Transaksi / Stok */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary, #b6b6b6)",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            <span>📅</span>
            <span>Periode:</span>
          </span>

          <button
            type="button"
            onClick={() => handlePreset('all')}
            style={{
              fontSize: "0.75rem",
              padding: "4px 10px",
              borderRadius: "6px",
              border: isAllPeriod ? "1px solid #38bdf8" : "1px solid var(--bg-border, #444444)",
              background: isAllPeriod ? "rgba(56, 189, 248, 0.15)" : "var(--bg-card, #1e1e1e)",
              color: isAllPeriod ? "#38bdf8" : "var(--text-secondary, #b6b6b6)",
              fontWeight: isAllPeriod ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Tampilkan semua periode stok (lifetime akumulasi)"
          >
            Semua
          </button>

          <button
            type="button"
            onClick={() => handlePreset('this_month')}
            style={{
              fontSize: "0.75rem",
              padding: "4px 10px",
              borderRadius: "6px",
              border: isThisMonth ? "1px solid #38bdf8" : "1px solid var(--bg-border, #444444)",
              background: isThisMonth ? "rgba(56, 189, 248, 0.15)" : "var(--bg-card, #1e1e1e)",
              color: isThisMonth ? "#38bdf8" : "var(--text-secondary, #b6b6b6)",
              fontWeight: isThisMonth ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Tampilkan stok masuk Bulan Ini"
          >
            Bulan Ini
          </button>

          <button
            type="button"
            onClick={() => handlePreset('30_days')}
            style={{
              fontSize: "0.75rem",
              padding: "4px 10px",
              borderRadius: "6px",
              border: isLast30Days ? "1px solid #38bdf8" : "1px solid var(--bg-border, #444444)",
              background: isLast30Days ? "rgba(56, 189, 248, 0.15)" : "var(--bg-card, #1e1e1e)",
              color: isLast30Days ? "#38bdf8" : "var(--text-secondary, #b6b6b6)",
              fontWeight: isLast30Days ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="30 Hari Terakhir"
          >
            30 Hari
          </button>

          <button
            type="button"
            onClick={() => handlePreset('this_year')}
            style={{
              fontSize: "0.75rem",
              padding: "4px 10px",
              borderRadius: "6px",
              border: isThisYear ? "1px solid #38bdf8" : "1px solid var(--bg-border, #444444)",
              background: isThisYear ? "rgba(56, 189, 248, 0.15)" : "var(--bg-card, #1e1e1e)",
              color: isThisYear ? "#38bdf8" : "var(--text-secondary, #b6b6b6)",
              fontWeight: isThisYear ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Tahun Berjalan (1 Jan s/d hari ini)"
          >
            Tahun Ini
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--bg-card, #1e1e1e)",
              border: "1px solid var(--bg-border, #444444)",
              borderRadius: "6px",
              padding: "3px 8px",
            }}
          >
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary, #ffffff)",
                fontSize: "0.78rem",
                outline: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            />
            <span style={{ color: "var(--text-muted, #828690)", fontSize: "0.75rem" }}>s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary, #ffffff)",
                fontSize: "0.78rem",
                outline: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Sisi Kanan: Warehouse Multi-Select & Search */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '220px' }}>
            <MultiSelectFilter
              title="Warehouse"
              placeholder={`🌐 Semua Warehouse (${warehouses.length > 0 ? `${warehouses.length} Gudang` : 'Nasional'})`}
              searchPlaceholder="Cari gudang..."
              options={warehouseOptions}
              selectedValues={selectedGudangs.filter(g => g !== 'ALL')}
              onChange={(vals) => {
                if (vals.length === 0) {
                  setSelectedGudangs(['ALL']);
                } else {
                  setSelectedGudangs(vals);
                }
              }}
              popoverWidth={280}
              icon={<Building size={15} color="#38bdf8" />}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #828690)' }} />
            <input 
              type="text" 
              placeholder="Cari SKU, nama barang, dokumen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ 
                padding: '7px 12px 7px 32px', 
                borderRadius: '6px', 
                border: '1px solid var(--bg-border, #444444)', 
                background: 'var(--bg-card, #1e1e1e)', 
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.8rem',
                minWidth: '220px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Cards - Support Multi-selection Toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {(() => {
          const totalVolAll = Object.values(agingStats).reduce((sum, s: any) => sum + (Number(s.unitCount) || 0), 0);

          return Object.entries(agingStats).map(([key, stat]: [string, any]) => {
            const configMap: Record<string, { color: string; label: string; badgeBg: string; badgeBorder: string; icon: string }> = {
              '0-149': { color: '#22c55e', label: 'Acceptable', badgeBg: 'rgba(34, 197, 94, 0.15)', badgeBorder: 'rgba(34, 197, 94, 0.3)', icon: '✅' },
              '150-239': { color: '#eab308', label: 'Over-stock', badgeBg: 'rgba(234, 179, 8, 0.15)', badgeBorder: 'rgba(234, 179, 8, 0.3)', icon: '⚠️' },
              '>=240': { color: '#ef4444', label: 'Deadstock', badgeBg: 'rgba(239, 68, 68, 0.15)', badgeBorder: 'rgba(239, 68, 68, 0.3)', icon: '🛑' },
              '240+': { color: '#ef4444', label: 'Deadstock', badgeBg: 'rgba(239, 68, 68, 0.15)', badgeBorder: 'rgba(239, 68, 68, 0.3)', icon: '🛑' },
              '150-249': { color: '#eab308', label: 'Over-stock', badgeBg: 'rgba(234, 179, 8, 0.15)', badgeBorder: 'rgba(234, 179, 8, 0.3)', icon: '⚠️' },
              '>=250': { color: '#ef4444', label: 'Deadstock', badgeBg: 'rgba(239, 68, 68, 0.15)', badgeBorder: 'rgba(239, 68, 68, 0.3)', icon: '🛑' },
              '250+': { color: '#ef4444', label: 'Deadstock', badgeBg: 'rgba(239, 68, 68, 0.15)', badgeBorder: 'rgba(239, 68, 68, 0.3)', icon: '🛑' },
            };
            const cfg = configMap[key] || { color: '#38bdf8', label: stat.label || key, badgeBg: 'rgba(56, 189, 248, 0.15)', badgeBorder: 'rgba(56, 189, 248, 0.3)', icon: '📦' };
            const isActive = selectedFilterStatusAging.includes(cfg.label);
            const volNumber = Number(stat.unitCount || 0);
            const volPct = totalVolAll > 0 ? ((volNumber / totalVolAll) * 100).toFixed(1) : '0.0';

            return (
              <div 
                key={key} 
                onClick={() => {
                  if (isActive) {
                    setSelectedFilterStatusAging(prev => prev.filter(s => s !== cfg.label));
                  } else {
                    setSelectedFilterStatusAging(prev => [...prev, cfg.label]);
                  }
                }}
                style={{ 
                  background: 'var(--bg-surface, #242424)', 
                  padding: '18px 20px', 
                  borderRadius: '12px', 
                  border: isActive ? `2px solid ${cfg.color}` : '1px solid var(--bg-border, #444444)', 
                  borderTop: `4px solid ${cfg.color}`,
                  boxShadow: isActive ? `0 0 16px ${cfg.color}40` : '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title={`Klik untuk toggle filter stok ${cfg.label} (${key} hari)`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-secondary, #b6b6b6)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {key} Hari
                  </span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    padding: '3px 9px', 
                    borderRadius: '10px', 
                    background: cfg.badgeBg, 
                    color: cfg.color, 
                    border: `1px solid ${cfg.badgeBorder}` 
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary, #ffffff)' }}>
                      {stat.skuCount}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #828690)', marginTop: '4px' }}>SKU</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: cfg.color, fontVariantNumeric: 'tabular-nums' }}>
                        {volNumber.toLocaleString()}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: cfg.badgeBg,
                        color: cfg.color,
                        border: `1px solid ${cfg.badgeBorder}`,
                        lineHeight: 1.2
                      }}>
                        {volPct}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #828690)', marginTop: '4px' }}>
                      Total Liter ({volPct}% vol)
                    </div>
                  </div>
                </div>

                {/* Progress bar visualisasi porsi volume */}
                <div style={{
                  marginTop: '12px',
                  height: '4px',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(Math.max(Number(volPct), 0), 100)}%`,
                    background: cfg.color,
                    borderRadius: '2px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                {isActive && (
                  <div style={{ marginTop: '10px', fontSize: '0.72rem', color: cfg.color, fontWeight: 600, textAlign: 'center' }}>
                    ● Filter aktif (klik untuk lepas)
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* Active Filters Summary Bar */}
      {hasAnyActiveFilter && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Filter Aktif:
            </span>

            {/* Periode chip */}
            {(dateFrom || dateTo) && (
              <span style={activeChipStyle}>
                <span>📅 Periode: {dateFrom ? dateFrom : 'Awal'} s/d {dateTo ? dateTo : 'Hari ini'}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setDateFrom(''); setDateTo(''); }} />
              </span>
            )}

            {/* Warehouse chip */}
            {selectedGudangs.length > 0 && !selectedGudangs.includes('ALL') && (
              <span style={activeChipStyle}>
                <span>🏢 Gudang: {selectedGudangs.length} dipilih</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedGudangs(['ALL'])} />
              </span>
            )}

            {/* Nama Barang chip */}
            {selectedFilterProduk.length > 0 && (
              <span style={activeChipStyle}>
                <span>📦 Barang: {selectedFilterProduk.length} dipilih</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedFilterProduk([])} />
              </span>
            )}

            {/* Asal chip */}
            {selectedFilterAsal.length > 0 && (
              <span style={activeChipStyle}>
                <span>🏭 Asal: {selectedFilterAsal.length > 2 ? `${selectedFilterAsal.length} dipilih` : selectedFilterAsal.join(', ')}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedFilterAsal([])} />
              </span>
            )}

            {/* Sell In chip */}
            {selectedFilterSellIn.length > 0 && (
              <span style={activeChipStyle}>
                <span>📄 Sell In: {selectedFilterSellIn.length} PO</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedFilterSellIn([])} />
              </span>
            )}

            {/* Status Aging chip */}
            {selectedFilterStatusAging.length > 0 && (
              <span style={activeChipStyle}>
                <span>⏱️ Status: {selectedFilterStatusAging.join(', ')}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedFilterStatusAging([])} />
              </span>
            )}

            {/* Column Gudang chip */}
            {selectedFilterGudang.length > 0 && (
              <span style={activeChipStyle}>
                <span>🏢 Filter Kolom Gudang: {selectedFilterGudang.length} dipilih</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedFilterGudang([])} />
              </span>
            )}

            {/* Lifetime Aging chip */}
            {selectedFilterLifetime.length > 0 && (
              <span style={activeChipStyle}>
                <span>⏱️ Lifetime: {selectedFilterLifetime.map(k => AGING_BUCKETS.find(b => b.key === k)?.label || k).join(', ')}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedFilterLifetime([])} />
              </span>
            )}

            {/* Current Location Aging chip */}
            {selectedFilterCurrentLoc.length > 0 && (
              <span style={activeChipStyle}>
                <span>📍 Aging Lokasi: {selectedFilterCurrentLoc.map(k => AGING_BUCKETS.find(b => b.key === k)?.label || k).join(', ')}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedFilterCurrentLoc([])} />
              </span>
            )}

            {/* Search chip */}
            {search && (
              <span style={activeChipStyle}>
                <span>🔍 "{search}"</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #b6b6b6)' }}>
              Menampilkan <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{filteredData.length}</strong> dari {data.length} stok
            </span>
            <button
              onClick={handleResetAllFilters}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Reset semua filter"
            >
              <RotateCcw size={12} />
              Reset Semua
            </button>
          </div>
        </div>
      )}

      {/* Main Table: Stock Aging Ultima Style */}
      <div style={{ 
        background: 'var(--bg-surface, #242424)', 
        borderRadius: '12px', 
        border: '1px solid var(--bg-border, #444444)', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        overflow: 'visible' 
      }}>
        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1250px' }}>
            <thead style={{ background: 'var(--bg-card, #1e1e1e)', borderBottom: '1px solid var(--bg-border, #444444)' }}>
              <tr>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', width: '50px', textAlign: 'center' }}>
                  No
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', width: '130px' }}>
                  Material Code
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', minWidth: '260px' }}>
                  <div style={{ marginBottom: '6px' }}>Nama Barang</div>
                  <MultiSelectFilter
                    title="Nama Barang"
                    placeholder="Semua Barang"
                    searchPlaceholder="Cari barang..."
                    options={productOptions}
                    selectedValues={selectedFilterProduk}
                    onChange={setSelectedFilterProduk}
                    popoverWidth={340}
                    compact={true}
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'right', width: '100px' }}>
                  Volume
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center', width: '100px' }}>
                  Stock
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', minWidth: '180px' }}>
                  <div style={{ marginBottom: '6px' }}>Asal (Supplier / Gudang)</div>
                  <MultiSelectFilter
                    title="Asal"
                    placeholder="Semua Asal"
                    searchPlaceholder="Cari asal..."
                    options={asalOptions}
                    selectedValues={selectedFilterAsal}
                    onChange={setSelectedFilterAsal}
                    popoverWidth={260}
                    compact={true}
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center', minWidth: '160px' }}>
                  <div style={{ marginBottom: '6px' }}>Lifetime Aging</div>
                  <MultiSelectFilter
                    title="Lifetime"
                    placeholder="Semua Umur"
                    searchable={false}
                    options={lifetimeAgingOptions}
                    selectedValues={selectedFilterLifetime}
                    onChange={setSelectedFilterLifetime}
                    popoverWidth={240}
                    compact={true}
                    align="left"
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center', minWidth: '185px' }}>
                  <div style={{ marginBottom: '6px' }}>Aging of Current Location</div>
                  <MultiSelectFilter
                    title="Aging Gudang"
                    placeholder="Semua Lokasi"
                    searchable={false}
                    options={currentLocAgingOptions}
                    selectedValues={selectedFilterCurrentLoc}
                    onChange={setSelectedFilterCurrentLoc}
                    popoverWidth={250}
                    compact={true}
                    align="right"
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', minWidth: '180px' }}>
                  <div style={{ marginBottom: '6px' }}>Sell In</div>
                  <MultiSelectFilter
                    title="Sell In"
                    placeholder="Semua PO"
                    searchPlaceholder="Cari nomor PO..."
                    options={sellInOptions}
                    selectedValues={selectedFilterSellIn}
                    onChange={setSelectedFilterSellIn}
                    popoverWidth={260}
                    compact={true}
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center', minWidth: '175px' }}>
                  <div style={{ marginBottom: '6px' }}>Status Aging</div>
                  <MultiSelectFilter
                    title="Status Aging"
                    placeholder="Semua Status"
                    searchable={false}
                    options={statusAgingOptions}
                    selectedValues={selectedFilterStatusAging}
                    onChange={setSelectedFilterStatusAging}
                    popoverWidth={240}
                    compact={true}
                    align="right"
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center', minWidth: '165px' }}>
                  <div style={{ marginBottom: '6px' }}>Gudang</div>
                  <MultiSelectFilter
                    title="Gudang"
                    placeholder="Semua Gudang"
                    searchPlaceholder="Cari gudang..."
                    options={gudangColumnOptions}
                    selectedValues={selectedFilterGudang}
                    onChange={setSelectedFilterGudang}
                    popoverWidth={250}
                    compact={true}
                    align="right"
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center', width: '80px' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted, #828690)' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    Memuat data Stock Aging...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #828690)' }}>
                    Tidak ada data stok barang yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const agingStyle = getAgingBadgeColor(row.aging_hari);
                  const isSelected = selectedStock?.id === row.id;

                  return (
                    <tr 
                      key={row.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-table-row, rgba(255, 255, 255, 0.08))', 
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        transition: 'background 0.15s' 
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--text-muted, #828690)', textAlign: 'center' }}>
                        {rowNumber}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                        {row.material_code}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.875rem', color: 'var(--text-primary, #ffffff)' }}>
                        {row.nama_barang}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.875rem', textAlign: 'right', color: 'var(--text-primary, #ffffff)', fontVariantNumeric: 'tabular-nums' }}>
                        {row.volume_label}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.875rem', fontWeight: 600, textAlign: 'center', color: 'var(--color-primary-light, #38bdf8)' }}>
                        {row.stok_kemasan_label}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: row.asal === 'Shell' ? '#fef3c7' : row.asal === 'CRA' ? '#e0f2fe' : row.asal === 'Cancel IT' ? '#fee2e2' : 'var(--bg-card, #2e2e2e)',
                          color: row.asal === 'Shell' ? '#b45309' : row.asal === 'CRA' ? '#0369a1' : row.asal === 'Cancel IT' ? '#b91c1c' : 'var(--text-primary, #ffffff)',
                          border: `1px solid ${row.asal === 'Shell' ? '#fde68a' : row.asal === 'CRA' ? '#bae6fd' : row.asal === 'Cancel IT' ? '#fecaca' : 'var(--bg-border, #444444)'}`
                        }}>
                          {row.asal}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 12px', 
                          borderRadius: '12px', 
                          fontSize: '0.825rem', 
                          fontWeight: 700, 
                          background: agingStyle.bg, 
                          color: agingStyle.text,
                          border: `1px solid ${agingStyle.border}`,
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {row.aging_hari} hari
                        </span>
                        {row.tgl_diterima && row.tgl_diterima !== '-' && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #828690)', marginTop: '3px' }} title={`Tanggal Penerimaan/Stok: ${row.tgl_diterima}`}>
                            {row.tgl_diterima}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          color: 'var(--color-primary-light, #38bdf8)',
                          fontWeight: 700,
                          fontSize: '0.825rem'
                        }}>
                          <span>Gudang Ini:</span>
                          <span style={{ color: 'var(--text-primary, #ffffff)' }}>
                            {row.umur_gudang_hari ?? row.umurGudang ?? '-'} hr
                          </span>
                        </div>
                        {row.umur_gudang_asal_hari > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '3px', fontWeight: 600 }}>
                            Asal: {row.umur_gudang_asal_hari} hr
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {row.sell_in_po && row.sell_in_po !== '-' ? (
                          <span style={{ color: 'var(--color-primary-light, #38bdf8)' }}>{row.sell_in_po}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted, #828690)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: agingStyle.bg,
                          color: agingStyle.text,
                          border: `1px solid ${agingStyle.border}`,
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{agingStyle.status === 'Acceptable' ? '✅' : agingStyle.status === 'Over-stock' ? '⚠️' : '🛑'}</span>
                          <span>{agingStyle.status}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-primary, #ffffff)' }}>
                        {row.gudang}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedStock(row)}
                          title="Lacak Perjalanan Barang"
                          style={{ 
                            background: '#0284c7', 
                            border: 'none', 
                            borderRadius: '50%', 
                            width: '32px', 
                            height: '32px', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer', 
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)',
                            transition: 'transform 0.15s, background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '14px 20px', 
          borderTop: '1px solid var(--bg-border, #444444)', 
          background: 'var(--bg-surface, #242424)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #b6b6b6)' }}>
            Menampilkan {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '6px', 
                border: '1px solid var(--bg-border, #444444)', 
                background: 'var(--bg-card, #2e2e2e)', 
                color: 'var(--text-primary, #ffffff)', 
                fontSize: '0.85rem',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', 
                opacity: currentPage === 1 ? 0.4 : 1 
              }}
            >
              Sebelumnya
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.85rem', color: 'var(--text-primary, #ffffff)', fontWeight: 600 }}>
              Halaman {currentPage} / {totalPages}
            </div>
            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '6px', 
                border: '1px solid var(--bg-border, #444444)', 
                background: 'var(--bg-card, #2e2e2e)', 
                color: 'var(--text-primary, #ffffff)', 
                fontSize: '0.85rem',
                cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', 
                opacity: (currentPage === totalPages || totalPages === 0) ? 0.4 : 1 
              }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog: Detail Barang (Persis Screenshot Ultima) */}
      {selectedStock && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setSelectedStock(null)}
        >
          <div 
            style={{
              background: 'var(--bg-surface, #242424)',
              color: 'var(--text-primary, #ffffff)',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '860px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              border: '1px solid var(--bg-border, #444444)',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid var(--bg-border, #444444)',
              background: 'var(--bg-card, #1e1e1e)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary-light, #38bdf8)'
                }}>
                  <Truck size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                    Detail Riwayat & Aging
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: 'var(--text-secondary, #b6b6b6)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'background 0.15s'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Dialog Content */}
            <div style={{ padding: '24px 28px' }}>
              {/* Info Detail Grid Modern */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {/* Card Info Produk */}
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-card, #1e1e1e)',
                  border: '1px solid var(--bg-border, #444444)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #828690)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Informasi Produk
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)', marginBottom: '4px' }}>
                    {traceData?.nama_barang || selectedStock.nama_barang}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-primary-light, #38bdf8)', fontWeight: 600, marginBottom: '8px' }}>
                    Code: {traceData?.material_code || selectedStock.material_code || selectedStock.id_barang}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #b6b6b6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Volume: <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{traceData?.qty || selectedStock.qty_kemasan_detail || `${selectedStock.stok} Ltr`}</strong></span>
                  </div>
                </div>

                {/* Card Ringkasan Aging Gudang Asal vs Saat Ini */}
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-card, #1e1e1e)',
                  border: '1px solid var(--bg-border, #444444)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #828690)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Breakdown Umur / Aging Barang
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                    {/* Gudang Saat Ini */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary, #b6b6b6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="#38bdf8" />
                        Gudang Saat Ini ({traceData?.gudang_saat_ini || selectedStock.gudang}):
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: 'var(--color-primary-light, #38bdf8)',
                        border: '1px solid rgba(56, 189, 248, 0.3)'
                      }}>
                        {traceData?.lama_gudang_saat_ini_label || `${selectedStock.umur_gudang_hari ?? selectedStock.umurGudang ?? 0} hari`}
                      </span>
                    </div>

                    {/* Asal */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary, #b6b6b6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={14} color="#f59e0b" />
                        Asal ({traceData?.gudang_asal || selectedStock.asal}):
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: (traceData?.lama_gudang_asal_hari || selectedStock.umur_gudang_asal_hari) > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: (traceData?.lama_gudang_asal_hari || selectedStock.umur_gudang_asal_hari) > 0 ? '#f59e0b' : 'var(--text-muted, #828690)',
                        border: `1px solid ${(traceData?.lama_gudang_asal_hari || selectedStock.umur_gudang_asal_hari) > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                      }}>
                        {traceData?.lama_gudang_asal_label || `${selectedStock.umur_gudang_asal_hari ?? 0} hari`}
                      </span>
                    </div>

                    {/* Total Aging */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '6px',
                      borderTop: '1px dashed var(--bg-border, #444444)',
                      marginTop: '2px'
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary, #ffffff)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#10b981" />
                        Total Umur (Aging Sell In):
                      </span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {traceData?.aging || `${selectedStock.aging_hari} hari`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Card Tracking Alur Perpindahan & Aging Antar Gudang */}
              {traceData?.rute_gudang && traceData.rute_gudang.length > 0 ? (
                <div style={{
                  marginBottom: '22px',
                  padding: '16px 20px',
                  background: 'rgba(56, 189, 248, 0.06)',
                  borderRadius: '8px',
                  border: '1px solid rgba(56, 189, 248, 0.25)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary-light, #38bdf8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={16} /> Alur Perpindahan & Durasi di Tiap Gudang
                    </div>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--color-primary-light, #38bdf8)',
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                      Total Umur (Aging Sell In): {traceData.aging}
                    </span>
                  </div>

                  {/* Stepper / Timeline Nodes */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    {traceData.rute_gudang.map((node: any, idx: number) => {
                      const isLast = idx === traceData.rute_gudang.length - 1;
                      const badgeStyle = getAgingBadgeColor(node.lama_hari || 0);

                      return (
                        <React.Fragment key={idx}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '10px 14px',
                            background: node.is_current ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-card, #1e1e1e)',
                            border: `1px solid ${node.is_current ? 'rgba(56, 189, 248, 0.4)' : 'var(--bg-border, #444444)'}`,
                            borderRadius: '8px',
                            minWidth: '160px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: node.is_current ? 'var(--color-primary-light, #38bdf8)' : '#f59e0b'
                              }}>
                                {node.is_current ? 'Gudang Saat Ini' : `Gudang Ke-${node.step}`}
                              </span>
                              {node.tanggal_terima && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #828690)' }}>
                                  {node.tanggal_terima}
                                </span>
                              )}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #ffffff)' }}>
                              {node.gudang}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #b6b6b6)' }}>
                                Lama menetap:
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: badgeStyle.bg,
                                color: badgeStyle.text,
                                border: `1px solid ${badgeStyle.border}`
                              }}>
                                {node.lama_label || `${node.lama_hari} hari`}
                              </span>
                            </div>
                          </div>

                          {!isLast && (
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary-light, #38bdf8)', padding: '0 4px' }}>
                              <ArrowRight size={20} strokeWidth={2.5} />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Tabel Riwayat Perjalanan & Histori Perpindahan Lengkap */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋</span> Histori Transaksi & Perpindahan Barang
                </div>
              </div>

              <div style={{ border: '1px solid var(--bg-border, #444444)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card, #1e1e1e)', borderBottom: '1px solid var(--bg-border, #444444)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', textAlign: 'center', width: '60px' }}>
                        Tahap
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', width: '28%' }}>
                        No Transaksi / Dokumen
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', textAlign: 'center', width: '16%' }}>
                        Tanggal
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', width: '18%' }}>
                        Asal
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', width: '18%' }}>
                        Tujuan
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', textAlign: 'center', width: '20%' }}>
                        Aging
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {traceLoading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #828690)' }}>
                          <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--color-primary-light, #38bdf8)' }} />
                          Menelusuri jejak transaksi dan perpindahan gudang...
                        </td>
                      </tr>
                    ) : traceData?.history && traceData.history.length > 0 ? (
                      traceData.history.map((h: any, idx: number) => {
                        const hAgingStyle = getAgingBadgeColor(h.lama_hari || 0);
                        const isFinalStep = idx === traceData.history.length - 1;

                        return (
                          <tr 
                            key={idx} 
                            style={{ 
                              borderBottom: idx < traceData.history.length - 1 ? '1px solid var(--border-table-row, rgba(255, 255, 255, 0.05))' : 'none',
                              background: isFinalStep ? 'rgba(56, 189, 248, 0.04)' : 'var(--bg-surface, #242424)'
                            }}
                          >
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted, #828690)', fontWeight: 600 }}>
                              #{h.step}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-primary, #ffffff)' }}>
                              <div style={{ fontWeight: 600 }}>{h.no_transaksi}</div>
                              {h.nomor_po && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-light, #38bdf8)' }}>
                                  PO: {h.nomor_po}
                                </div>
                              )}
                              {h.tipe && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #828690)', marginTop: '2px' }}>
                                  {h.tipe}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-secondary, #b6b6b6)', fontSize: '0.8rem' }}>
                              <div>{h.tanggal_terima}</div>
                              {h.tanggal_kirim && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #828690)' }}>
                                  Kirim: {h.tanggal_kirim}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #b6b6b6)' }}>
                              {h.gudang_asal}
                            </td>
                            <td style={{ padding: '10px 14px', color: isFinalStep ? 'var(--color-primary-light, #38bdf8)' : 'var(--text-secondary, #b6b6b6)', fontWeight: isFinalStep ? 700 : 400 }}>
                              {h.gudang_tujuan}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                background: hAgingStyle.bg,
                                color: hAgingStyle.text,
                                border: `1px solid ${hAgingStyle.border}`,
                                fontVariantNumeric: 'tabular-nums'
                              }}>
                                {h.lama_label || `${h.lama_hari} hari`}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted, #828690)' }}>
                          Tidak ada riwayat transfer sebelumnya untuk stok ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
