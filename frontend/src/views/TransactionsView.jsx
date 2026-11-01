import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/bluetoothPrinter';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { 
  IoPrintOutline, 
  IoReceiptOutline, 
  IoSearchOutline, 
  IoCalendarOutline, 
  IoTodayOutline, 
  IoStatsChartOutline,
  IoFilterOutline,
  IoRefreshOutline,
  IoWalletOutline
} from 'react-icons/io5';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const getLocalDateParts = (dateInput) => {
  const d = new Date(dateInput);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    date: d.getDate(),
    dateString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    monthString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
  };
};

export const TransactionsView = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [search, setSearch] = useState('');

  const now = new Date();
  const currentParts = getLocalDateParts(now);

  // Filter periode: 'all', 'today', 'month', 'year', 'custom_date', 'custom_month'
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customDate, setCustomDate] = useState(currentParts.dateString);
  const [customMonth, setCustomMonth] = useState(currentParts.monthString);

  useEffect(() => {
    fetchTransactions();
    fetchStoreSettings();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      const res = await api.get('/settings');
      setStoreSettings(res.data?.data || null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/transactions?limit=500');
      setTransactions(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Ringkasan Cepat Omzet (Hari Ini, Bulan Ini, Tahun Ini)
  const todayTx = transactions.filter((t) => {
    const p = getLocalDateParts(t.created_at);
    return p.year === currentParts.year && p.month === currentParts.month && p.date === currentParts.date;
  });
  const todayOmzet = todayTx.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  const monthTx = transactions.filter((t) => {
    const p = getLocalDateParts(t.created_at);
    return p.year === currentParts.year && p.month === currentParts.month;
  });
  const monthOmzet = monthTx.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  const yearTx = transactions.filter((t) => {
    const p = getLocalDateParts(t.created_at);
    return p.year === currentParts.year;
  });
  const yearOmzet = yearTx.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  // Filter berdasarkan Periode yang dipilih
  const periodFilteredTx = transactions.filter((t) => {
    const p = getLocalDateParts(t.created_at);
    if (periodFilter === 'today') {
      return p.year === currentParts.year && p.month === currentParts.month && p.date === currentParts.date;
    }
    if (periodFilter === 'month') {
      return p.year === currentParts.year && p.month === currentParts.month;
    }
    if (periodFilter === 'year') {
      return p.year === currentParts.year;
    }
    if (periodFilter === 'custom_date') {
      return p.dateString === customDate;
    }
    if (periodFilter === 'custom_month') {
      return p.monthString === customMonth;
    }
    return true; // 'all'
  });

  // Filter lanjutan berdasarkan Pencarian Teks
  const finalFilteredTx = periodFilteredTx.filter((t) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      t.invoice_number?.toLowerCase().includes(query) ||
      t.customer_name?.toLowerCase().includes(query) ||
      t.vehicle_plate?.toLowerCase().includes(query) ||
      t.vehicle_model?.toLowerCase().includes(query)
    );
  });

  const currentPeriodOmzet = periodFilteredTx.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  const getPeriodLabel = () => {
    if (periodFilter === 'today') return `Hari Ini (${currentParts.date} ${MONTH_NAMES[currentParts.month]} ${currentParts.year})`;
    if (periodFilter === 'month') return `Bulan Ini (${MONTH_NAMES[currentParts.month]} ${currentParts.year})`;
    if (periodFilter === 'year') return `Tahun Ini (${currentParts.year})`;
    if (periodFilter === 'custom_date') {
      const [y, m, d] = customDate.split('-');
      return `Tgl ${Number(d)} ${MONTH_NAMES[Number(m) - 1]} ${y}`;
    }
    if (periodFilter === 'custom_month') {
      const [y, m] = customMonth.split('-');
      return `Bulan ${MONTH_NAMES[Number(m) - 1]} ${y}`;
    }
    return 'Semua Waktu';
  };

  return (
    <div>
      {/* 3 KARTU RINGKASAN OMZET (Harian, Bulanan, Tahunan) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* KARTU HARIAN */}
        <div 
          onClick={() => setPeriodFilter('today')}
          style={{
            background: periodFilter === 'today' 
              ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(30, 41, 59, 0.9))' 
              : 'var(--bg-card)',
            border: periodFilter === 'today' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            boxShadow: periodFilter === 'today' ? '0 4px 14px rgba(59, 130, 246, 0.3)' : 'none',
          }}
          title="Klik untuk filter transaksi Hari Ini"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Omzet Hari Ini
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              <IoTodayOutline />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
            {formatCurrency(todayOmzet)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{currentParts.date} {MONTH_NAMES[currentParts.month]}</span>
            <span style={{ color: '#93c5fd', fontWeight: 600 }}>{todayTx.length} Transaksi</span>
          </div>
        </div>

        {/* KARTU BULANAN */}
        <div 
          onClick={() => setPeriodFilter('month')}
          style={{
            background: periodFilter === 'month' 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(30, 41, 59, 0.9))' 
              : 'var(--bg-card)',
            border: periodFilter === 'month' ? '2px solid #10b981' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            boxShadow: periodFilter === 'month' ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
          }}
          title="Klik untuk filter transaksi Bulan Ini"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Omzet Bulan Ini
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              <IoCalendarOutline />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
            {formatCurrency(monthOmzet)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{MONTH_NAMES[currentParts.month]} {currentParts.year}</span>
            <span style={{ color: '#6ee7b7', fontWeight: 600 }}>{monthTx.length} Transaksi</span>
          </div>
        </div>

        {/* KARTU TAHUNAN */}
        <div 
          onClick={() => setPeriodFilter('year')}
          style={{
            background: periodFilter === 'year' 
              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(30, 41, 59, 0.9))' 
              : 'var(--bg-card)',
            border: periodFilter === 'year' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            boxShadow: periodFilter === 'year' ? '0 4px 14px rgba(139, 92, 246, 0.3)' : 'none',
          }}
          title="Klik untuk filter transaksi Tahun Ini"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Omzet Tahun Ini
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              <IoStatsChartOutline />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
            {formatCurrency(yearOmzet)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Tahun {currentParts.year}</span>
            <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{yearTx.length} Transaksi</span>
          </div>
        </div>
      </div>

      {/* HEADER UTAMA & OMZET TERPILIH */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.15rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
          }}>
            <IoReceiptOutline />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Riwayat Transaksi Penjualan
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Menampilkan {finalFilteredTx.length} dari {transactions.length} transaksi ({getPeriodLabel()})
            </p>
          </div>
        </div>

        {/* KOTAK TOTAL OMZET DINAMIS */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          padding: '0.65rem 1.25rem',
          borderRadius: '10px',
          textAlign: 'right',
          minWidth: '220px'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            OMZET: {getPeriodLabel().toUpperCase()}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(currentPeriodOmzet)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {periodFilteredTx.length} transaksi berhasil
          </div>
        </div>
      </div>

      {/* FILTER BAR PERIODE & PENCARIAN */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.85rem',
      }}>
        {/* TOMBOL-TOMBOL FILTER CEPAT */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
            <IoFilterOutline /> Filter:
          </span>

          <button
            onClick={() => setPeriodFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: periodFilter === 'all' ? '#2563eb' : 'var(--bg-input)',
              color: periodFilter === 'all' ? '#fff' : 'var(--text-muted)',
              border: periodFilter === 'all' ? '1px solid #3b82f6' : '1px solid var(--border-color)',
              transition: 'all 0.15s'
            }}
          >
            Semua
          </button>

          <button
            onClick={() => setPeriodFilter('today')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: periodFilter === 'today' ? '#2563eb' : 'var(--bg-input)',
              color: periodFilter === 'today' ? '#fff' : 'var(--text-muted)',
              border: periodFilter === 'today' ? '1px solid #3b82f6' : '1px solid var(--border-color)',
              transition: 'all 0.15s'
            }}
          >
            Hari Ini
          </button>

          <button
            onClick={() => setPeriodFilter('month')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: periodFilter === 'month' ? '#10b981' : 'var(--bg-input)',
              color: periodFilter === 'month' ? '#fff' : 'var(--text-muted)',
              border: periodFilter === 'month' ? '1px solid #10b981' : '1px solid var(--border-color)',
              transition: 'all 0.15s'
            }}
          >
            Bulan Ini
          </button>

          <button
            onClick={() => setPeriodFilter('year')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: periodFilter === 'year' ? '#8b5cf6' : 'var(--bg-input)',
              color: periodFilter === 'year' ? '#fff' : 'var(--text-muted)',
              border: periodFilter === 'year' ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
              transition: 'all 0.15s'
            }}
          >
            Tahun Ini
          </button>

          <button
            onClick={() => setPeriodFilter('custom_date')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: periodFilter === 'custom_date' ? '#f59e0b' : 'var(--bg-input)',
              color: periodFilter === 'custom_date' ? '#fff' : 'var(--text-muted)',
              border: periodFilter === 'custom_date' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
              transition: 'all 0.15s'
            }}
          >
            Pilih Tanggal
          </button>

          <button
            onClick={() => setPeriodFilter('custom_month')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: periodFilter === 'custom_month' ? '#06b6d4' : 'var(--bg-input)',
              color: periodFilter === 'custom_month' ? '#fff' : 'var(--text-muted)',
              border: periodFilter === 'custom_month' ? '1px solid #06b6d4' : '1px solid var(--border-color)',
              transition: 'all 0.15s'
            }}
          >
            Pilih Bulan
          </button>

          {/* DATE PICKER (Jika pilih tanggal) */}
          {periodFilter === 'custom_date' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'var(--bg-card)',
                border: '1px solid #f59e0b',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            />
          )}

          {/* MONTH PICKER (Jika pilih bulan) */}
          {periodFilter === 'custom_month' && (
            <input
              type="month"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'var(--bg-card)',
                border: '1px solid #06b6d4',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            />
          )}

          {/* REFRESH DATA */}
          <button
            onClick={fetchTransactions}
            title="Muat ulang data transaksi"
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '4px'
            }}
          >
            <IoRefreshOutline size={16} />
          </button>
        </div>

        {/* INPUT PENCARIAN TEKS */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '400px' }}>
          <IoSearchOutline style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Cari no faktur, pelanggan, plat motor..."
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.1rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              outline: 'none',
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABEL RIWAYAT TRANSAKSI */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>No. Faktur</th>
              <th style={{ padding: '0.85rem 1rem' }}>Waktu</th>
              <th style={{ padding: '0.85rem 1rem' }}>Kasir</th>
              <th style={{ padding: '0.85rem 1rem' }}>Pelanggan / Motor</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Metode</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Bayar</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Memuat riwayat transaksi...
                </td>
              </tr>
            ) : finalFilteredTx.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📂</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                    Tidak ada transaksi ditemukan
                  </div>
                  <div style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {search ? `Tidak ada transaksi yang cocok dengan kata kunci "${search}"` : `Belum ada transaksi pada periode ${getPeriodLabel()}`}
                  </div>
                  {periodFilter !== 'all' && (
                    <button
                      onClick={() => { setPeriodFilter('all'); setSearch(''); }}
                      style={{
                        padding: '6px 14px',
                        background: '#2563eb',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      Lihat Semua Transaksi
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              finalFilteredTx.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>
                    {tx.invoice_number}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {new Date(tx.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {tx.cashier_name || 'Kasir'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{tx.customer_name}</div>
                    {(tx.vehicle_plate || tx.vehicle_model) && (
                      <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                        {tx.vehicle_plate ? `[${tx.vehicle_plate.toUpperCase()}]` : ''} {tx.vehicle_model || ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: tx.payment_method === 'QRIS' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                      color: tx.payment_method === 'QRIS' ? '#c084fc' : 'inherit',
                      border: tx.payment_method === 'QRIS' ? '1px solid rgba(168, 85, 247, 0.3)' : 'none'
                    }}>
                      {tx.payment_method}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399' }}>
                    {formatCurrency(tx.total_amount)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedTx(tx)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#60a5fa',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <IoPrintOutline /> Cetak Struk
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CETAK ULANG STRUK THERMAL */}
      {selectedTx && (
        <ThermalReceipt
          transaction={selectedTx}
          store={storeSettings}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
};
