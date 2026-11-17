import React, { useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/bluetoothPrinter';
import { 
  IoCloseCircleOutline, 
  IoCheckmarkCircleOutline,
  IoWalletOutline,
  IoFastFoodOutline,
  IoConstructOutline,
  IoFlashOutline,
  IoReceiptOutline,
  IoCalendarOutline,
  IoCashOutline,
  IoCardOutline
} from 'react-icons/io5';

// Format angka menjadi ribuan Rupiah (contoh: 10000 -> "10.000")
const formatRupiahInput = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const cleanNumber = String(val).replace(/\D/g, '');
  if (!cleanNumber) return '';
  return new Intl.NumberFormat('id-ID').format(cleanNumber);
};

// Ambil angka murni dari input Rupiah (contoh: "10.000" -> 10000)
const parseRupiahInput = (val) => {
  const cleanNumber = String(val).replace(/\D/g, '');
  return cleanNumber ? Number(cleanNumber) : 0;
};

const EXPENSE_CATEGORIES = [
  {
    id: 'Makan & Minum',
    name: 'Makan & Minum',
    icon: <IoFastFoodOutline size={18} />,
    color: '#f97316',
    desc: 'Makan siang mekanik, kopi, air galon/mineral, camilan bengkel',
    defaultNote: 'Makan siang mekanik & minum',
  },
  {
    id: 'Belanja Khusus Bengkel',
    name: 'Belanja Bengkel',
    icon: <IoConstructOutline size={18} />,
    color: '#06b6d4',
    desc: 'Bensin cuci part, sabun colek, majun lap, amplas, baut, cairan cleaner',
    defaultNote: 'Beli bensin cuci & sabun pembersih part',
  },
  {
    id: 'Operasional & Utilitas',
    name: 'Operasional',
    icon: <IoFlashOutline size={18} />,
    color: '#eab308',
    desc: 'Token listrik, air, pulsa/internet kasir, iuran sampah/keamanan',
    defaultNote: 'Token listrik bengkel',
  },
  {
    id: 'Lain-lain',
    name: 'Lain-lain',
    icon: <IoReceiptOutline size={18} />,
    color: '#a855f7',
    desc: 'Keperluan mendadak atau belanja kebutuhan bengkel lainnya',
    defaultNote: 'Pengeluaran operasional',
  },
];

export const ExpenseModal = ({ onClose, onSuccess }) => {
  const [selectedCategory, setSelectedCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState(EXPENSE_CATEGORIES[0].defaultNote);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [expenseDate, setExpenseDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat.id);
    if (!description || EXPENSE_CATEGORIES.some(c => c.defaultNote === description)) {
      setDescription(cat.defaultNote);
    }
  };

  const handleQuickAmount = (val) => {
    setAmount(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseRupiahInput(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Nominal pengeluaran harus diisi dan lebih besar dari Rp 0');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        category: selectedCategory,
        amount: numAmount,
        description: description.trim() || selectedCategory,
        payment_method: paymentMethod,
        date: expenseDate ? new Date(expenseDate).toISOString() : undefined,
      };

      const res = await api.post('/transactions/expenses', payload);
      const savedExpense = res.data?.data;

      if (onSuccess) {
        onSuccess(savedExpense);
      }
      onClose();
    } catch (err) {
      console.error('Gagal mencatat pengeluaran:', err);
      setErrorMessage(err.response?.data?.message || 'Gagal menyimpan catatan pengeluaran ke database');
    } finally {
      setLoading(false);
    }
  };

  const activeCategoryObj = EXPENSE_CATEGORIES.find(c => c.id === selectedCategory) || EXPENSE_CATEGORIES[0];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px', padding: '1.25rem' }}>
        <div className="modal-header" style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
            <IoWalletOutline size={22} color="#f87171" />
            Catat Pengeluaran Bengkel
          </h3>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <IoCloseCircleOutline size={24} />
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '-0.35rem', marginBottom: '1rem' }}>
          Catat uang keluar untuk makan minum mekanik, bensin cuci, sabun, atau belanja kebutuhan operasional bengkel lainnya.
        </p>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            marginBottom: '0.85rem',
          }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* PILIHAN KATEGORI PENGELUARAN */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
              Pilih Kategori Pengeluaran:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 0.7rem',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(239, 68, 68, 0.16)' : 'var(--bg-input)',
                      border: `1px solid ${isSelected ? '#ef4444' : 'var(--border-color)'}`,
                      color: isSelected ? '#f87171' : 'var(--text-muted)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ color: cat.color }}>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.35rem', fontStyle: 'italic' }}>
              💡 {activeCategoryObj.desc}
            </div>
          </div>

          {/* NOMINAL PENGELUARAN */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Nominal Pengeluaran:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                }}
                value={amount ? formatRupiahInput(amount) : ''}
                onChange={(e) => setAmount(parseRupiahInput(e.target.value))}
              />
              <span style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.9rem',
                color: '#f87171',
                fontWeight: 800,
                pointerEvents: 'none'
              }}>
                Rp
              </span>
            </div>

            {/* Quick buttons */}
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.45rem' }}>
              {[10000, 20000, 35000, 50000, 100000, 200000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  style={{
                    flex: 1,
                    padding: '3px 4px',
                    fontSize: '0.7rem',
                    background: Number(amount) === val ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '5px',
                    color: Number(amount) === val ? '#fff' : '#f87171',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {val >= 1000 ? `${val / 1000}rb` : val}
                </button>
              ))}
            </div>
          </div>

          {/* KETERANGAN / DETAIL PENGELUARAN */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Keterangan / Rincian Belanja:
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontSize: '0.85rem' }}
              placeholder={activeCategoryObj.defaultNote}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* METODE PEMBAYARAN & TANGGAL */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Metode Uang Keluar:
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.35rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    background: paymentMethod === 'CASH' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-input)',
                    border: `1px solid ${paymentMethod === 'CASH' ? '#10b981' : 'var(--border-color)'}`,
                    color: paymentMethod === 'CASH' ? '#34d399' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <IoCashOutline /> Tunai (Kas)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.35rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    background: paymentMethod === 'TRANSFER' ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-input)',
                    border: `1px solid ${paymentMethod === 'TRANSFER' ? '#a855f7' : 'var(--border-color)'}`,
                    color: paymentMethod === 'TRANSFER' ? '#c084fc' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <IoCardOutline /> Transfer
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Tanggal:
              </label>
              <input
                type="date"
                className="form-input"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem 0.5rem' }}
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '0.55rem 1rem', fontSize: '0.82rem' }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.55rem 1.25rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)'
              }}
            >
              <IoCheckmarkCircleOutline size={18} />
              {loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
