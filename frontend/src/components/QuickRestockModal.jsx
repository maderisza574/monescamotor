import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { IoCloseCircleOutline, IoAddCircleOutline, IoCheckmarkCircleOutline, IoCreateOutline } from 'react-icons/io5';

export const QuickRestockModal = ({ product, onClose, onSuccess }) => {
  const { isSuperAdmin } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState('IN');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quantity === undefined || quantity === null || Number(quantity) < 0 || (type !== 'SET' && Number(quantity) <= 0)) {
      setError('Jumlah stok harus angka yang valid (lebih dari 0)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post(`/products/${product.id}/adjust-stock`, {
        type,
        quantity: Number(quantity),
        notes: notes || (type === 'IN' ? 'Restock / Barang Masuk' : type === 'SET' ? 'Koreksi stok langsung oleh Admin' : 'Koreksi Stok Manual (Keluar)'),
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal memperbarui stok barang');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <IoAddCircleOutline color="#10b981" /> Tambah / Sesuaikan Stok
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {product.name}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <IoCloseCircleOutline size={24} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.65rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            padding: '0.85rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stok Saat Ini:</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {product.stock} {product.unit || 'pcs'}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Jenis Aksi Stok</span>
              {isSuperAdmin && (
                <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700 }}>
                  👑 Mode Admin Aktif
                </span>
              )}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isSuperAdmin ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.45rem' }}>
              <button
                type="button"
                onClick={() => setType('IN')}
                style={{
                  padding: '0.65rem 0.4rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  background: type === 'IN' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-input)',
                  border: `1px solid ${type === 'IN' ? '#10b981' : 'var(--border-color)'}`,
                  color: type === 'IN' ? '#34d399' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                + Masuk (Kulakan)
              </button>
              <button
                type="button"
                onClick={() => setType('OUT')}
                style={{
                  padding: '0.65rem 0.4rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  background: type === 'OUT' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-input)',
                  border: `1px solid ${type === 'OUT' ? '#ef4444' : 'var(--border-color)'}`,
                  color: type === 'OUT' ? '#f87171' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                - Kurang (Rusak)
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setType('SET');
                    setQuantity(product.stock);
                  }}
                  style={{
                    padding: '0.65rem 0.4rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    background: type === 'SET' ? 'rgba(59, 130, 246, 0.25)' : 'var(--bg-input)',
                    border: `1px solid ${type === 'SET' ? '#3b82f6' : 'var(--border-color)'}`,
                    color: type === 'SET' ? '#60a5fa' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  title="Khusus Admin: Atur langsung angka stok persis di gudang"
                >
                  ✏️ Edit Jumlah
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {type === 'SET' ? `Jumlah Stok Fisik Baru (${product.unit || 'pcs'})` : `Jumlah Mutasi (${product.unit || 'pcs'})`}
            </label>
            <input
              type="number"
              min={type === 'SET' ? '0' : '1'}
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              autoFocus
              style={type === 'SET' ? { borderColor: '#3b82f6', background: 'rgba(59, 130, 246, 0.08)' } : {}}
            />
            {type === 'SET' && (
              <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '3px' }}>
                ✓ Angka ini akan menjadi jumlah stok fisik akhir yang baru di gudang.
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Catatan / Keterangan</label>
            <input
              type="text"
              className="form-input"
              placeholder={type === 'SET' ? 'Contoh: Koreksi stok opname oleh Admin' : 'Contoh: Kulakan dari Toko Utama, Retur, dll'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{
            background: type === 'SET' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
            border: `1px solid ${type === 'SET' ? '#3b82f6' : 'rgba(59, 130, 246, 0.25)'}`,
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
          }}>
            <span>Estimasi Stok Akhir:</span>
            <strong style={{ color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
              {type === 'SET'
                ? Math.max(0, Number(quantity) || 0)
                : type === 'IN' 
                ? Number(product.stock) + (Number(quantity) || 0)
                : Math.max(0, Number(product.stock) - (Number(quantity) || 0))
              } {product.unit || 'pcs'}
            </strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem',
                background: type === 'IN' ? '#10b981' : '#ef4444',
                color: '#fff',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <IoCheckmarkCircleOutline size={18} />
              {loading ? 'Menyimpan...' : 'Simpan Stok'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
