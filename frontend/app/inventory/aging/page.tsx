"use client";
import React, { useState, useEffect } from 'react';
import { Search, Eye, X, Loader2, Truck, Clock, ArrowRight, Building, MapPin, Calendar } from 'lucide-react';
import { api, apiWarehouses } from '@/lib/api';

export default function StockAgingPage() {
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedGudang, setSelectedGudang] = useState('005'); // Default Makassar
  const [search, setSearch] = useState('');
  const [filterProduk, setFilterProduk] = useState('');
  const [filterAsal, setFilterAsal] = useState('');
  const [filterSellIn, setFilterSellIn] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [agingStats, setAgingStats] = useState({
    '0-30': { skuCount: 0, unitCount: 0 },
    '31-60': { skuCount: 0, unitCount: 0 },
    '61-90': { skuCount: 0, unitCount: 0 },
    '>90': { skuCount: 0, unitCount: 0 }
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
    api.get(`/api/inventory/aging-fifo?id_gudang=${selectedGudang}`)
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
  }, [selectedGudang]);

  // Fetch trace history saat baris diklik untuk dilacak
  useEffect(() => {
    if (!selectedStock) {
      setTraceData(null);
      return;
    }
    setTraceLoading(true);
    api.get('/api/inventory/stock-trace', {
      params: {
        id_stok: selectedStock.id_stok,
        id_barang: selectedStock.material_code || selectedStock.id_barang,
        dokumen: selectedStock.dokumen,
        id_gudang: selectedGudang,
      }
    }).then((res: any) => {
      setTraceData(res.data);
      setTraceLoading(false);
    }).catch((err: any) => {
      console.error(err);
      setTraceData(null);
      setTraceLoading(false);
    });
  }, [selectedStock, selectedGudang]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterProduk, filterAsal, filterSellIn, filterKategori]);

  const filteredData = data.filter(row => {
    const s = search.toLowerCase();
    const matchSearch = 
      !s ||
      (row.material_code && row.material_code.toLowerCase().includes(s)) ||
      (row.nama_barang && row.nama_barang.toLowerCase().includes(s)) ||
      (row.produk && row.produk.toLowerCase().includes(s)) ||
      (row.asal && row.asal.toLowerCase().includes(s)) ||
      (row.sell_in_po && row.sell_in_po.toLowerCase().includes(s)) ||
      (row.dokumen && row.dokumen.toLowerCase().includes(s)) ||
      (row.kategori && row.kategori.toLowerCase().includes(s));

    const matchProduk = !filterProduk || 
      (row.nama_barang && row.nama_barang.toLowerCase().includes(filterProduk.toLowerCase())) ||
      (row.material_code && row.material_code.toLowerCase().includes(filterProduk.toLowerCase()));

    const matchAsal = !filterAsal || 
      (row.asal && row.asal.toLowerCase().includes(filterAsal.toLowerCase()));

    const matchSellIn = !filterSellIn || 
      (row.sell_in_po && row.sell_in_po.toLowerCase().includes(filterSellIn.toLowerCase()));

    const matchKategori = !filterKategori || 
      (row.kategori && row.kategori.toLowerCase().includes(filterKategori.toLowerCase()));

    return matchSearch && matchProduk && matchAsal && matchSellIn && matchKategori;
  });

  const totalPages = Math.max(Math.ceil(filteredData.length / itemsPerPage), 1);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getAgingBadgeColor = (days: number) => {
    if (days <= 30) return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    if (days <= 60) return { bg: '#fef9c3', text: '#a16207', border: '#fef08a' };
    if (days <= 90) return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' };
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Top Bar: Title, Warehouse Picker, Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
            Stock Aging
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #828690)' }}>
            Laporan umur persediaan barang, nomor Sell In principal, dan jejak dokumen penerimaan
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedGudang} 
            onChange={e => setSelectedGudang(e.target.value)}
            style={{ 
              padding: '9px 14px', 
              borderRadius: '8px', 
              border: '1px solid var(--bg-border, #444444)', 
              background: 'var(--bg-surface, #242424)', 
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {warehouses.map(w => (
              <option key={w.id_gudang} value={w.id_gudang}>{w.nama_gudang}</option>
            ))}
          </select>

          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #828690)' }} />
            <input 
              type="text" 
              placeholder="Cari SKU, Sell In, dokumen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ 
                padding: '9px 14px 9px 38px', 
                borderRadius: '8px', 
                border: '1px solid var(--bg-border, #444444)', 
                background: 'var(--bg-surface, #242424)', 
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.875rem',
                minWidth: '260px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(agingStats).map(([key, stat], idx) => {
          const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
          return (
            <div key={key} style={{ 
              background: 'var(--bg-surface, #242424)', 
              padding: '18px 20px', 
              borderRadius: '12px', 
              border: '1px solid var(--bg-border, #444444)', 
              borderTop: `4px solid ${colors[idx]}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }}>
              <div style={{ color: 'var(--text-secondary, #b6b6b6)', fontSize: '0.875rem', marginBottom: '10px', fontWeight: 600 }}>
                {key} Hari
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary, #ffffff)' }}>
                    {stat.skuCount}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #828690)', marginTop: '4px' }}>SKU</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: colors[idx] }}>
                    {stat.unitCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #828690)', marginTop: '4px' }}>Total Liter</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Table: Stock Aging Ultima Style */}
      <div style={{ 
        background: 'var(--bg-surface, #242424)', 
        borderRadius: '12px', 
        border: '1px solid var(--bg-border, #444444)', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        overflow: 'hidden' 
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px' }}>
            <thead style={{ background: 'var(--bg-card, #1e1e1e)', borderBottom: '1px solid var(--bg-border, #444444)' }}>
              <tr>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', width: '50px', textAlign: 'center' }}>
                  No
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)' }}>
                  Material Code
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', minWidth: '240px' }}>
                  Nama Barang
                  <input 
                    type="text" 
                    placeholder="Filter nama..." 
                    value={filterProduk} 
                    onChange={e => setFilterProduk(e.target.value)} 
                    style={{ width: '100%', marginTop: '6px', padding: '5px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--bg-border, #444444)', background: 'var(--bg-base, #1e1e1e)', color: 'var(--text-primary, #ffffff)', outline: 'none' }} 
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'right' }}>
                  Volume
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center' }}>
                  Stock
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)' }}>
                  Asal (Supplier / Gudang)
                  <input 
                    type="text" 
                    placeholder="Filter asal..." 
                    value={filterAsal} 
                    onChange={e => setFilterAsal(e.target.value)} 
                    style={{ width: '100%', marginTop: '6px', padding: '5px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--bg-border, #444444)', background: 'var(--bg-base, #1e1e1e)', color: 'var(--text-primary, #ffffff)', outline: 'none' }} 
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center' }}>
                  Aging
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)' }}>
                  Sell In
                  <input 
                    type="text" 
                    placeholder="Filter PO..." 
                    value={filterSellIn} 
                    onChange={e => setFilterSellIn(e.target.value)} 
                    style={{ width: '100%', marginTop: '6px', padding: '5px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--bg-border, #444444)', background: 'var(--bg-base, #1e1e1e)', color: 'var(--text-primary, #ffffff)', outline: 'none' }} 
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center' }}>
                  Segment
                  <input 
                    type="text" 
                    placeholder="Filter..." 
                    value={filterKategori} 
                    onChange={e => setFilterKategori(e.target.value)} 
                    style={{ width: '100%', marginTop: '6px', padding: '5px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--bg-border, #444444)', background: 'var(--bg-base, #1e1e1e)', color: 'var(--text-primary, #ffffff)', outline: 'none' }} 
                  />
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center' }}>
                  Gudang
                </th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #b6b6b6)', textAlign: 'center', width: '80px' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted, #828690)' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    Memuat data Stock Aging...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #828690)' }}>
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
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.8rem', 
                          fontWeight: 700, 
                          background: agingStyle.bg, 
                          color: agingStyle.text,
                          border: `1px solid ${agingStyle.border}`,
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {row.aging_hari} hari
                        </span>
                        {/* Breakdown Aging Gudang Saat Ini & Gudang Asal */}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #b6b6b6)', marginTop: '4px', lineHeight: 1.3 }}>
                          <div>Gudang Ini: <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{row.umur_gudang_hari ?? row.umurGudang ?? '-'} hr</strong></div>
                          {row.umur_gudang_asal_hari > 0 && (
                            <div style={{ color: '#f59e0b', fontWeight: 600 }}>
                              Asal: {row.umur_gudang_asal_hari} hr
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {row.sell_in_po && row.sell_in_po !== '-' ? (
                          <span style={{ color: 'var(--color-primary-light, #38bdf8)' }}>{row.sell_in_po}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted, #828690)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-primary, #ffffff)' }}>
                        {row.kategori}
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
