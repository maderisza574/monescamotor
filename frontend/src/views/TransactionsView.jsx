import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/bluetoothPrinter';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { IoPrintOutline, IoTimeOutline, IoReceiptOutline, IoSearchOutline } from 'react-icons/io5';

export const TransactionsView = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [search, setSearch] = useState('');

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
      const res = await api.get('/transactions?limit=100');
      setTransactions(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTx = transactions.filter((t) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      t.invoice_number?.toLowerCase().includes(query) ||
      t.customer_name?.toLowerCase().includes(query) ||
      t.vehicle_plate?.toLowerCase().includes(query) ||
      t.vehicle_model?.toLowerCase().includes(query)
    );
  });

  const totalOmzet = transactions.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  return (
    <div>
      {/* Header Omzet */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.25rem',
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
            <h3 style={{ fontSize: '1.15rem' }}>Riwayat Transaksi Penjualan</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Total {transactions.length} transaksi tercatat di sistem
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          padding: '0.65rem 1.25rem',
          borderRadius: '10px',
          textAlign: 'right',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
            Total Omzet Penjualan
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(totalOmzet)}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <IoSearchOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan No Faktur, Nama Pelanggan, atau Plat Motor..."
          style={{
            width: '100%',
            padding: '0.75rem 1rem 0.75rem 2.4rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            color: 'var(--text-main)',
            fontSize: '0.9rem',
            outline: 'none',
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabel Riwayat */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
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
            ) : filteredTx.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Belum ada transaksi penjualan yang tercatat.
                </td>
              </tr>
            ) : (
              filteredTx.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>
                    {tx.invoice_number}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {new Date(tx.created_at).toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {tx.cashier_name || 'Kasir'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{tx.customer_name}</div>
                    {(tx.vehicle_plate || tx.vehicle_model) && (
                      <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                        {tx.vehicle_plate ? `[${tx.vehicle_plate}]` : ''} {tx.vehicle_model || ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'rgba(255, 255, 255, 0.08)',
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

      {/* Modal Cetak Ulang Struk Thermal */}
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
