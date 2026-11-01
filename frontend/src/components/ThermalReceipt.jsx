import React, { useState, useEffect } from 'react';
import { 
  printViaWebBluetooth, 
  formatCurrency, 
  formatNumber,
  wrapEscposText,
  getConnectedBluetoothDevice,
  isBluetoothConnected,
  disconnectBluetooth
} from '../utils/bluetoothPrinter';
import { 
  IoBluetoothOutline, 
  IoPrintOutline, 
  IoCloseCircleOutline, 
  IoCheckmarkCircleOutline,
  IoSyncOutline
} from 'react-icons/io5';

export const ThermalReceipt = ({ transaction, store, onClose }) => {
  const [printingBt, setPrintingBt] = useState(false);
  const [btStatus, setBtStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [connectedDeviceName, setConnectedDeviceName] = useState(null);

  useEffect(() => {
    const dev = getConnectedBluetoothDevice();
    if (dev && dev.name) {
      setConnectedDeviceName(dev.name);
    }
  }, []);

  if (!transaction) return null;

  const isDraft = Boolean(transaction.is_draft);

  const handlePrintBluetooth = async (forceSelect = false) => {
    try {
      setPrintingBt(true);
      setErrorMsg(null);
      
      const dev = getConnectedBluetoothDevice();
      if (!forceSelect && dev && isBluetoothConnected()) {
        setBtStatus(`Mengirim ke ${dev.name || 'printer bluetooth'}...`);
      } else {
        setBtStatus('Menghubungkan printer bluetooth...');
      }

      await printViaWebBluetooth(transaction, store, { 
        includeLogo: true, 
        forceSelect,
        isDraft
      });

      const currentDev = getConnectedBluetoothDevice();
      if (currentDev && currentDev.name) {
        setConnectedDeviceName(currentDev.name);
      }

      setBtStatus('✓ Struk berhasil dicetak!');
      setTimeout(() => setBtStatus(null), 3500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mencetak via Bluetooth. Pastikan bluetooth aktif atau gunakan Cetak Standar.');
    } finally {
      setPrintingBt(false);
    }
  };

  const handleDisconnect = () => {
    disconnectBluetooth();
    setConnectedDeviceName(null);
    setBtStatus('Koneksi printer telah diputus.');
    setTimeout(() => setBtStatus(null), 3000);
  };

  const handleStandardPrint = () => {
    window.print();
  };

  const items = transaction.items || [];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px', padding: '1.25rem' }}>
        <div className="modal-header" style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: isDraft ? '#fbbf24' : '#38bdf8' }}>
            <IoPrintOutline color={isDraft ? '#fbbf24' : '#38bdf8'} />
            {isDraft ? 'Tanda Terima Motor Ditinggal (Draft)' : 'Struk Pembayaran'}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <IoCloseCircleOutline size={24} />
          </button>
        </div>

        {btStatus && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <IoCheckmarkCircleOutline size={18} /> {btStatus}
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            padding: '0.75rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            marginBottom: '0.85rem',
            lineHeight: '1.45',
            whiteSpace: 'pre-line'
          }}>
            <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
              ⚠️ Kendala Koneksi Printer:
            </div>
            {errorMsg}
            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <button
                onClick={handleStandardPrint}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <IoPrintOutline size={16} /> Gunakan Cetak Standar (Bypass Bluetooth)
              </button>
            </div>
          </div>
        )}

        {/* PREVIEW STRUK 58mm */}
        <div className="thermal-receipt-preview printable-receipt" id="printable-receipt">
          <div className="receipt-center" style={{ marginBottom: '8px' }}>
            <img 
              src="/logo-thermal.png" 
              alt="Monesca Motor" 
              style={{ 
                maxWidth: '190px', 
                width: '85%', 
                height: 'auto', 
                display: 'block', 
                margin: '0 auto 4px auto' 
              }} 
            />
          </div>
          <div className="receipt-center" style={{ fontSize: '11px', color: '#555', whiteSpace: 'pre-line' }}>
            {wrapEscposText(store?.tagline || 'Pusat Sparepart & Servis Motor', 32)}
          </div>
          <div className="receipt-center" style={{ fontSize: '10px', color: '#555', whiteSpace: 'pre-line' }}>
            {wrapEscposText(store?.address || 'Jl. Raya Motor No. 123', 32)}
          </div>
          {store?.phone && (
            <div className="receipt-center" style={{ fontSize: '10px', color: '#555' }}>
              Telp: {store.phone}
            </div>
          )}

          <div className="receipt-divider"></div>

          {isDraft && (
            <div style={{ textAlign: 'center', margin: '4px 0 6px 0', borderBottom: '1px dashed #333', paddingBottom: '4px' }}>
              <div className="receipt-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                *** TANDA TERIMA SERVIS ***
              </div>
              <div style={{ fontSize: '9px', color: '#555' }}>
                (MOTOR DITINGGAL / ESTIMASI BIAYA)
              </div>
            </div>
          )}

          <div className="receipt-row">
            <span>{isDraft ? 'No. Draft' : 'No'}: {transaction.invoice_number || transaction.draft_id}</span>
          </div>
          <div className="receipt-row">
            <span>Tgl: {new Date(transaction.created_at || Date.now()).toLocaleDateString('id-ID')}</span>
            <span>{new Date(transaction.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="receipt-row">
            <span>Kasir: {transaction.cashier_name || 'Kasir'}</span>
          </div>
          {transaction.vehicle_plate && (
            <div className="receipt-row receipt-bold">
              <span>Plat Motor: {transaction.vehicle_plate.toUpperCase()}</span>
            </div>
          )}
          {transaction.vehicle_model && (
            <div className="receipt-row">
              <span>Motor: {transaction.vehicle_model}</span>
            </div>
          )}
          {transaction.customer_name && transaction.customer_name !== 'Pelanggan Umum' && (
            <div className="receipt-row">
              <span>Pelanggan: {transaction.customer_name}</span>
            </div>
          )}

          <div className="receipt-divider"></div>

          {/* ITEM LIST */}
          {items.map((it, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>
              <div className="receipt-bold" style={{ fontSize: '11px' }}>
                {it.is_manual ? `[LUAR] ${it.product_name}` : (it.is_service ? `[JASA] ${it.product_name}` : it.product_name)}
              </div>
              <div className="receipt-row" style={{ fontSize: '11px' }}>
                <span>  {it.quantity} x {formatNumber(it.unit_price)}</span>
                <span>{formatNumber(it.subtotal)}</span>
              </div>
            </div>
          ))}

          <div className="receipt-divider"></div>

          <div className="receipt-row">
            <span>Subtotal</span>
            <span>{formatNumber(transaction.subtotal)}</span>
          </div>
          {Number(transaction.discount) > 0 && (
            <div className="receipt-row">
              <span>Diskon</span>
              <span>-{formatNumber(transaction.discount)}</span>
            </div>
          )}
          <div className="receipt-row receipt-bold" style={{ fontSize: '13px', margin: '4px 0' }}>
            <span>{isDraft ? 'ESTIMASI TOTAL' : 'TOTAL'}</span>
            <span>{formatCurrency(transaction.total_amount)}</span>
          </div>

          {!isDraft ? (
            <>
              <div className="receipt-row">
                <span>Bayar ({transaction.payment_method})</span>
                <span>{formatNumber(transaction.cash_given || transaction.total_amount)}</span>
              </div>
              {Number(transaction.change_due) > 0 && (
                <div className="receipt-row">
                  <span>Kembalian</span>
                  <span>{formatNumber(transaction.change_due)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="receipt-row" style={{ fontSize: '10px', fontStyle: 'italic', color: '#555' }}>
              <span>Status: DALAM PENGERJAAN</span>
            </div>
          )}

          <div className="receipt-divider"></div>
          <div className="receipt-center" style={{ fontSize: '10px', marginTop: '6px', whiteSpace: 'pre-line' }}>
            {isDraft ? (
              wrapEscposText('* Simpan tanda terima ini sebagai bukti pengambilan motor Anda.\n* Estimasi biaya dapat berubah jika ada tambahan pengerjaan.', 32)
            ) : (
              wrapEscposText(store?.receipt_footer || 'Terima kasih atas kunjungan Anda\nGaransi servis 3 hari.', 32)
            )}
          </div>
        </div>

        {/* STATUS KONEKSI PRINTER */}
        {connectedDeviceName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '4px 8px',
            borderRadius: '6px',
            marginBottom: '0.65rem'
          }}>
            <span>✓ Terhubung: <strong>{connectedDeviceName}</strong></span>
            <button
              onClick={() => handlePrintBluetooth(true)}
              style={{
                background: 'transparent',
                color: '#60a5fa',
                fontSize: '0.72rem',
                textDecoration: 'underline',
                padding: '2px 4px'
              }}
              title="Ganti printer bluetooth lain"
            >
              Ganti Printer
            </button>
          </div>
        )}

        {/* TOMBOL AKSI CETAK */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <button
            onClick={() => handlePrintBluetooth(false)}
            disabled={printingBt}
            style={{
              padding: '0.75rem 0.5rem',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <IoBluetoothOutline size={18} />
              <span>{printingBt ? 'Mencetak...' : (connectedDeviceName ? 'Cetak (Instan)' : 'Bluetooth')}</span>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.85 }}>HP Android / BLE</span>
          </button>

          <button
            onClick={handleStandardPrint}
            style={{
              padding: '0.75rem 0.5rem',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <IoPrintOutline size={18} />
              <span>Cetak Standar</span>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.75 }}>PC / Driver Printer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
