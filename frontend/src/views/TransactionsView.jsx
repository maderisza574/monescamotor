import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
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
  IoWalletOutline,
  IoTrashOutline,
  IoTrashBinOutline,
  IoAlertCircleOutline
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

export const TransactionsView = ({ onNavigateToPos }) => {
  const { isSuperAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [search, setSearch] = useState('');

  // Mode Tampilan: 'completed' (Transaksi Selesai) atau 'drafts' (Draft Motor Ditinggal)
  const [viewMode, setViewMode] = useState('completed');
  const [drafts, setDrafts] = useState(() => {
    try {
      const s = localStorage.getItem('monesca_pos_drafts');
      return s ? JSON.parse(s) : [];
    } catch (e) {
      return [];
    }
  });

  const loadDrafts = () => {
    try {
      const s = localStorage.getItem('monesca_pos_drafts');
      setDrafts(s ? JSON.parse(s) : []);
    } catch (e) {
      setDrafts([]);
    }
  };

  const handleOpenDraftInPos = (draft) => {
    try {
      localStorage.setItem('monesca_active_draft_to_load', JSON.stringify(draft));
    } catch (e) {
      console.error(e);
    }
    if (onNavigateToPos) {
      onNavigateToPos();
    } else {
      window.dispatchEvent(new CustomEvent('monesca_load_draft', { detail: draft }));
    }
  };

  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Hapus antrean draft motor ini?')) {
      const remaining = drafts.filter(d => d.draft_id !== draftId);
      setDrafts(remaining);
      try {
        localStorage.setItem('monesca_pos_drafts', JSON.stringify(remaining));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const now = new Date();
  const currentParts = getLocalDateParts(now);

  // Filter periode: 'all', 'today', 'month', 'year', 'custom_date', 'custom_month'
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customDate, setCustomDate] = useState(currentParts.dateString);
  const [customMonth, setCustomMonth] = useState(currentParts.monthString);

  // State Modal Reset Omzet (Khusus Owner)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetRestoreStock, setResetRestoreStock] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Hapus satu transaksi (Khusus Owner)
  const handleDeleteTx = async (tx) => {
    if (!window.confirm(`Yakin ingin menghapus transaksi "${tx.invoice_number}" sebesar ${formatCurrency(tx.total_amount)}?\n\nStok barang yang pernah terjual pada transaksi ini akan otomatis dikembalikan ke gudang.`)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/transactions/${tx.id}`);
      await fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal menghapus transaksi');
      setLoading(false);
    }
  };

  // Reset seluruh omzet dan transaksi (Khusus Owner)
  const handleResetAll = async (e) => {
    e.preventDefault();
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      alert('Silakan ketik "RESET" pada kolom konfirmasi sebelum melanjutkan.');
      return;
    }

    try {
      setActionLoading(true);
      await api.delete('/transactions/reset-all', {
        data: { restore_stock: resetRestoreStock }
      });
      setShowResetModal(false);
      setResetConfirmText('');
      await fetchTransactions();
      alert('Seluruh transaksi berhasil dihapus dan omzet telah di-reset menjadi Rp 0!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal mereset omzet');
    } finally {
      setActionLoading(false);
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
      {/* 3 KARTU RINGKASAN OMZET (Harian, Bulanan, Tahunan) - KHUSUS OWNER */}
      {isSuperAdmin && (
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
      )}

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

        {/* KOTAK TOTAL OMZET DINAMIS (Owner) / TOTAL TRANSAKSI (Kasir) */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          padding: '0.65rem 1.25rem',
          borderRadius: '10px',
          textAlign: 'right',
          minWidth: '220px'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            {isSuperAdmin ? `OMZET: ${getPeriodLabel().toUpperCase()}` : 'STATUS TRANSAKSI'}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {isSuperAdmin ? formatCurrency(currentPeriodOmzet) : `${periodFilteredTx.length} Transaksi`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {isSuperAdmin ? `${periodFilteredTx.length} transaksi berhasil` : `Periode: ${getPeriodLabel()}`}
          </div>
        </div>
      </div>

      {/* TAB SWITCHER: TRANSAKSI SELESAI vs DRAFT MOTOR DITINGGAL */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setViewMode('completed')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: viewMode === 'completed' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'var(--bg-card)',
            color: viewMode === 'completed' ? '#fff' : 'var(--text-muted)',
            border: viewMode === 'completed' ? '1px solid #3b82f6' : '1px solid var(--border-color)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <IoReceiptOutline size={17} />
          <span>Riwayat Transaksi Selesai</span>
          <span style={{
            background: viewMode === 'completed' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            padding: '1px 6px',
            borderRadius: '99px',
            fontSize: '0.72rem',
          }}>
            {transactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            loadDrafts();
            setViewMode('drafts');
          }}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: viewMode === 'drafts' ? 'linear-gradient(135deg, #d97706, #b45309)' : 'var(--bg-card)',
            color: viewMode === 'drafts' ? '#fff' : drafts.length > 0 ? '#fbbf24' : 'var(--text-muted)',
            border: viewMode === 'drafts' ? '1px solid #f59e0b' : drafts.length > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <IoTimeOutline size={17} />
          <span>Draft / Motor Ditinggal</span>
          <span style={{
            background: viewMode === 'drafts' ? 'rgba(255, 255, 255, 0.25)' : drafts.length > 0 ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
            color: viewMode === 'drafts' ? '#fff' : drafts.length > 0 ? '#000' : 'inherit',
            padding: '1px 6px',
            borderRadius: '99px',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}>
            {drafts.length}
          </span>
        </button>
      </div>

      {viewMode === 'completed' ? (
        <>
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

          {/* RESET OMZET (KHUSUS OWNER) */}
          {isSuperAdmin && (
            <button
              onClick={() => setShowResetModal(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                marginLeft: '6px'
              }}
              title="Hapus seluruh riwayat transaksi & reset omzet ke Rp 0 (Khusus Owner)"
            >
              <IoTrashBinOutline size={15} />
              <span>Reset Omzet</span>
            </button>
          )}
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
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
                          cursor: 'pointer'
                        }}
                      >
                        <IoPrintOutline /> Cetak Struk
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteTx(tx)}
                          style={{
                            padding: '0.4rem 0.6rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Hapus transaksi ini (Khusus Owner)"
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    /* TABEL DAFTAR DRAFT MOTOR DITINGGAL */
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      overflowX: 'auto',
    }}>
      <div style={{
        padding: '0.85rem 1.15rem',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(245, 158, 11, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>
          🛵 Daftar antrean motor yang sedang ditinggal / diservis. Anda dapat membuka dan melengkapi item di Kasir saat motor selesai.
        </div>
        <button
          onClick={loadDrafts}
          style={{
            padding: '4px 10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <IoRefreshOutline /> Refresh Antrean
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)' }}>
            <th style={{ padding: '0.85rem 1rem' }}>No. Draft</th>
            <th style={{ padding: '0.85rem 1rem' }}>Waktu Masuk</th>
            <th style={{ padding: '0.85rem 1rem' }}>Pelanggan / Motor</th>
            <th style={{ padding: '0.85rem 1rem' }}>Rincian Part & Servis</th>
            <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status</th>
            <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Estimasi Biaya</th>
            <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {drafts.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛵</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                  Tidak ada antrean motor yang sedang ditinggal saat ini
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Jika ada motor ditinggal, kasir dapat menyimpannya melalui tombol "Simpan sebagai Draft" di Kasir POS.
                </div>
              </td>
            </tr>
          ) : (
            drafts.map((d) => (
              <tr key={d.draft_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s' }}>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                  {d.draft_id}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {new Date(d.created_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ fontWeight: 600 }}>{d.customer_name || 'Pelanggan Umum'}</div>
                  {(d.vehicle_plate || d.vehicle_model) && (
                    <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>
                      {d.vehicle_plate ? `[${d.vehicle_plate.toUpperCase()}]` : ''} {d.vehicle_model || ''}
                    </div>
                  )}
                </td>
                <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-main)', maxWidth: '280px' }}>
                  {d.items && d.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {d.items.map((it, idx) => (
                        <div key={idx} style={{ color: it.is_manual ? '#fbbf24' : it.is_service ? '#c084fc' : 'inherit' }}>
                          • {it.quantity}x {it.product_name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>Belum ada part</span>
                  )}
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    MOTOR DITINGGAL
                  </span>
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#38bdf8' }}>
                  {formatCurrency(d.total_amount)}
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleOpenDraftInPos(d)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        background: '#2563eb',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)'
                      }}
                      title="Buka kembali antrean ini di kasir untuk melengkapi dan melakukan cetak struk"
                    >
                      ✏️ Buka & Lengkapi di Kasir
                    </button>

                    <button
                      onClick={() => handleDeleteDraft(d.draft_id)}
                      style={{
                        padding: '0.45rem 0.6rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Hapus antrean draft ini"
                    >
                      <IoTrashOutline size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )}

      {/* MODAL CETAK ULANG STRUK THERMAL */}
      {selectedTx && (
        <ThermalReceipt
          transaction={selectedTx}
          store={storeSettings}
          onClose={() => setSelectedTx(null)}
        />
      )}

      {/* MODAL RESET OMZET & HAPUS SEMUA TRANSAKSI (KHUSUS OWNER) */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
                <IoAlertCircleOutline size={22} /> Reset Seluruh Omzet
              </h3>
              <button className="modal-close-btn" onClick={() => setShowResetModal(false)}>
                &times;
              </button>
            </div>

            <div style={{ padding: '0.5rem 0' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#fca5a5',
                lineHeight: 1.5,
                marginBottom: '1rem'
              }}>
                <strong>Peringatan Khusus Owner:</strong> Tindakan ini akan menghapus <strong>seluruh {transactions.length} riwayat transaksi</strong> dan mereset nilai omzet menjadi <strong>Rp 0</strong>. Fitur ini cocok digunakan untuk membersihkan transaksi uji coba sebelum toko resmi berjalan.
              </div>

              <form onSubmit={handleResetAll}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                    <input 
                      type="checkbox" 
                      checked={resetRestoreStock} 
                      onChange={(e) => setResetRestoreStock(e.target.checked)} 
                    />
                    <span>Kembalikan stok fisik barang yang terjual ke gudang</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    Ketik kata <strong style={{ color: '#ef4444' }}>RESET</strong> di bawah untuk konfirmasi:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ketik RESET"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => { setShowResetModal(false); setResetConfirmText(''); }}
                    style={{
                      padding: '0.75rem',
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      borderRadius: '8px',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || resetConfirmText.trim().toUpperCase() !== 'RESET'}
                    style={{
                      padding: '0.75rem',
                      background: resetConfirmText.trim().toUpperCase() === 'RESET' ? '#ef4444' : '#64748b',
                      color: '#fff',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: resetConfirmText.trim().toUpperCase() === 'RESET' ? 'pointer' : 'not-allowed',
                      border: 'none',
                    }}
                  >
                    {actionLoading ? 'Mereset...' : 'Ya, Reset Semua'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
