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
  IoAlertCircleOutline,
  IoTimeOutline
} from 'react-icons/io5';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const getLocalDateParts = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth(),
      date: fallback.getDate(),
      dateString: `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`,
      monthString: `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`,
    };
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    date: d.getDate(),
    dateString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    monthString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
  };
};

const formatTxDate = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const TransactionsView = ({ onNavigateToPos }) => {
  const { isSuperAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [search, setSearch] = useState('');

  // Antrean Draft Motor Ditinggal (dari localStorage)
  const [drafts, setDrafts] = useState(() => {
    try {
      const s = localStorage.getItem('monesca_pos_drafts');
      if (!s) return [];
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    } catch (e) {
      return [];
    }
  });

  const loadDrafts = () => {
    try {
      const s = localStorage.getItem('monesca_pos_drafts');
      if (!s) {
        setDrafts([]);
        return;
      }
      const parsed = JSON.parse(s);
      setDrafts(Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []));
    } catch (e) {
      setDrafts([]);
    }
  };

  const now = new Date();
  const currentParts = getLocalDateParts(now);

  // Filter periode: 'all', 'drafts', 'today', 'month', 'year', 'custom_date', 'custom_month'
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
    loadDrafts();
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
      loadDrafts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Buka draft kembali ke kasir POS untuk dilengkapi & dicetak lunas
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

  // Hapus satu antrean draft
  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Hapus antrean draft motor ini?')) {
      const remaining = drafts.filter((d) => (d.draft_id || d.id) !== draftId);
      setDrafts(remaining);
      try {
        localStorage.setItem('monesca_pos_drafts', JSON.stringify(remaining));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Hapus satu transaksi selesai (Khusus Owner)
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

  // HANYA transaksi selesai (bukan draft) yang dihitung ke omzet keuangan riil
  const completedTransactions = transactions.filter((t) => !t.is_draft && t.status !== 'DRAFT');

  const todayTx = completedTransactions.filter((t) => {
    const p = getLocalDateParts(t.created_at);
    return p.year === currentParts.year && p.month === currentParts.month && p.date === currentParts.date;
  });
  const todayOmzet = todayTx.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  const monthTx = completedTransactions.filter((t) => {
    const p = getLocalDateParts(t.created_at);
    return p.year === currentParts.year && p.month === currentParts.month;
  });
  const monthOmzet = monthTx.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  const yearTx = completedTransactions.filter((t) => {
    const p = getLocalDateParts(t.created_at);
    return p.year === currentParts.year;
  });
  const yearOmzet = yearTx.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  // Normalisasi Draft Antrean Motor Ditinggal
  const safeDrafts = (Array.isArray(drafts) ? drafts : []).map((d) => ({
    id: d.draft_id || d.id || ('DRAFT-' + Math.random().toString(36).slice(2, 6)),
    invoice_number: d.draft_id || d.invoice_number || 'DRAFT',
    created_at: d.created_at || new Date().toISOString(),
    cashier_name: d.cashier_name || 'Kasir',
    customer_name: d.customer_name || 'Pelanggan Umum',
    vehicle_plate: d.vehicle_plate || null,
    vehicle_model: d.vehicle_model || null,
    payment_method: 'DRAFT',
    total_amount: Number(d.total_amount || d.subtotal || 0),
    status: 'DRAFT',
    is_draft: true,
    items: Array.isArray(d.items) ? d.items : [],
    rawDraft: d,
  }));

  // Normalisasi Transaksi Selesai
  const safeTransactions = (Array.isArray(transactions) ? transactions : []).map((t) => ({
    ...t,
    status: t.status || 'COMPLETED',
    is_draft: false,
  }));

  // Gabungkan seluruh data: Draft motor ditinggal + Transaksi selesai
  const combinedList = [...safeDrafts, ...safeTransactions].sort((a, b) => {
    // Jika draft, utamakan di atas agar kasir langsung melihat motor yang sedang diservis
    if (a.is_draft && !b.is_draft) return -1;
    if (!a.is_draft && b.is_draft) return 1;
    const timeA = new Date(a.created_at).getTime() || 0;
    const timeB = new Date(b.created_at).getTime() || 0;
    return timeB - timeA;
  });

  // Filter berdasarkan Periode / Mode
  const periodFilteredTx = combinedList.filter((t) => {
    if (periodFilter === 'drafts') {
      return Boolean(t.is_draft);
    }
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
    return true; // 'all' (semua transaksi selesai + draft)
  });

  // Filter pencarian teks
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

  // Omzet terpilih (hanya transaksi selesai)
  const currentPeriodOmzet = periodFilteredTx
    .filter((t) => !t.is_draft)
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  const getPeriodLabel = () => {
    if (periodFilter === 'drafts') return `Khusus Draft Antrean Motor (${safeDrafts.length})`;
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
    return 'Semua Data & Draft';
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
              Riwayat Transaksi & Antrean
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Menampilkan {finalFilteredTx.length} catatan ({getPeriodLabel()})
              {safeDrafts.length > 0 && <span style={{ color: '#fbbf24', marginLeft: '6px', fontWeight: 700 }}>• {safeDrafts.length} motor dalam pengerjaan (Draft)</span>}
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
            {isSuperAdmin ? `OMZET LUNAS: ${getPeriodLabel().toUpperCase()}` : 'STATUS DATA'}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {isSuperAdmin ? formatCurrency(currentPeriodOmzet) : `${completedTransactions.length} Transaksi Lunas`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {safeDrafts.length > 0 ? `${safeDrafts.length} antrean draft motor aktif` : 'Semua transaksi selesai'}
          </div>
        </div>
      </div>

      {/* FILTER BAR PERIODE, DRAFT & PENCARIAN */}
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
            type="button"
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
            Semua ({combinedList.length})
          </button>

          {/* TOMBOL FILTER KHUSUS DRAFT MOTOR DITINGGAL */}
          <button
            type="button"
            onClick={() => setPeriodFilter('drafts')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: periodFilter === 'drafts' ? '#f59e0b' : safeDrafts.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
              color: periodFilter === 'drafts' ? '#000' : safeDrafts.length > 0 ? '#fbbf24' : 'var(--text-muted)',
              border: periodFilter === 'drafts' ? '1px solid #f59e0b' : safeDrafts.length > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
          >
            <IoTimeOutline size={15} />
            <span>Draft Motor ({safeDrafts.length})</span>
          </button>

          <button
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
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

          {/* DATE PICKER */}
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

          {/* MONTH PICKER */}
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
            type="button"
            onClick={fetchTransactions}
            title="Muat ulang data transaksi dan draft"
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '4px',
              cursor: 'pointer'
            }}
          >
            <IoRefreshOutline size={16} />
          </button>

          {/* RESET OMZET (KHUSUS OWNER) */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: 'auto'
              }}
              title="Khusus Owner: Hapus seluruh riwayat dan reset total omzet ke Rp 0"
            >
              <IoTrashBinOutline size={15} /> Reset Omzet
            </button>
          )}
        </div>

        {/* SEARCH BOX */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '340px' }}>
          <IoSearchOutline style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '1rem' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Cari no faktur, draft, plat motor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '0.82rem', width: '100%' }}
          />
        </div>
      </div>

      {/* TABEL TERPADU TRANSAKSI & DRAFT MOTOR */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>No. Faktur / Draft</th>
              <th style={{ padding: '0.85rem 1rem' }}>Waktu</th>
              <th style={{ padding: '0.85rem 1rem' }}>Kasir</th>
              <th style={{ padding: '0.85rem 1rem' }}>Pelanggan / Motor</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status / Metode</th>
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
                    Tidak ada catatan ditemukan
                  </div>
                  <div style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {search ? `Tidak ada catatan yang cocok dengan kata kunci "${search}"` : `Belum ada data pada filter ${getPeriodLabel()}`}
                  </div>
                  {periodFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => { setPeriodFilter('all'); setSearch(''); }}
                      style={{
                        padding: '6px 14px',
                        background: '#2563eb',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Lihat Semua Catatan
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              finalFilteredTx.map((tx) => {
                const isDraft = Boolean(tx.is_draft || tx.status === 'DRAFT');
                return (
                  <tr 
                    key={tx.id || tx.invoice_number} 
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
                      background: isDraft ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                      transition: 'background 0.15s' 
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isDraft ? '#fbbf24' : '#60a5fa' }}>
                      {tx.invoice_number}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {formatTxDate(tx.created_at)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {tx.cashier_name || 'Kasir'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{tx.customer_name || 'Pelanggan Umum'}</div>
                      {(tx.vehicle_plate || tx.vehicle_model) && (
                        <div style={{ fontSize: '0.75rem', color: isDraft ? '#fbbf24' : '#38bdf8', fontWeight: isDraft ? 700 : 400 }}>
                          {tx.vehicle_plate ? `[${tx.vehicle_plate.toUpperCase()}]` : ''} {tx.vehicle_model || ''}
                        </div>
                      )}
                      {isDraft && tx.items && tx.items.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {tx.items.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {isDraft ? (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.4)'
                        }}>
                          🛵 DRAFT (MOTOR DITINGGAL)
                        </span>
                      ) : (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: tx.payment_method === 'QRIS' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: tx.payment_method === 'QRIS' ? '#c084fc' : 'inherit',
                          border: tx.payment_method === 'QRIS' ? '1px solid rgba(168, 85, 247, 0.3)' : 'none'
                        }}>
                          {tx.payment_method || 'CASH'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: isDraft ? '#38bdf8' : '#34d399' }}>
                      {formatCurrency(tx.total_amount)}
                      {isDraft && <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 400 }}>Estimasi</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {isDraft ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenDraftInPos(tx.rawDraft || tx)}
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
                              type="button"
                              onClick={() => handleDeleteDraft(tx.id || tx.invoice_number)}
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
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
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
                                type="button"
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
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
                    className="btn-secondary"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetConfirmText('');
                    }}
                    disabled={actionLoading}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      padding: '0.65rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Mereset...' : 'Ya, Reset Sekarang'}
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
