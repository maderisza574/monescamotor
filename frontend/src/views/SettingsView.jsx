import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { IoSettingsOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';

export const SettingsView = () => {
  const [storeName, setStoreName] = useState('MONESCA MOTOR');
  const [tagline, setTagline] = useState('Pusat Sparepart & Servis Motor');
  const [address, setAddress] = useState('Jl. Raya Motor No. 123');
  const [phone, setPhone] = useState('0812-3456-7890');
  const [receiptFooter, setReceiptFooter] = useState('Terima kasih atas kunjungan Anda!\nGaransi servis 3 hari.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data?.data) {
        const d = res.data.data;
        setStoreName(d.store_name || 'MONESCA MOTOR');
        setTagline(d.tagline || '');
        setAddress(d.address || '');
        setPhone(d.phone || '');
        setReceiptFooter(d.receipt_footer || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch('/settings', {
        store_name: storeName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        receipt_footer: receiptFooter.replace(/\\n/g, '\n').trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan profil toko');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
          }}>
            <IoSettingsOutline />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>Pengaturan Profil Toko & Struk</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Data ini akan otomatis dicetak pada kepala (*header*) struk printer thermal bluetooth Anda
            </p>
          </div>
        </div>

        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}>
            <IoCheckmarkCircleOutline size={20} /> Pengaturan profil toko berhasil diperbarui!
          </div>
        )}

        {/* PREVIEW LOGO TOKO & LOGO STRUK THERMAL */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.25rem',
        }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.65rem', color: '#93c5fd' }}>
            Logo Resmi Monesca Motor
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{
              background: '#0b0f19',
              padding: '0.85rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #1e293b'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
                Logo Aplikasi (HD Transparan)
              </span>
              <img 
                src="/logo.png" 
                alt="Logo HD" 
                style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }} 
              />
            </div>

            <div style={{
              background: '#ffffff',
              padding: '0.85rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #cbd5e1'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Logo Struk Thermal (Monochrome 58mm)
              </span>
              <img 
                src="/logo-thermal.png" 
                alt="Logo Struk Thermal" 
                style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }} 
              />
            </div>
          </div>
          <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.65rem' }}>
            ✓ Logo otomatis dicetak di bagian paling atas struk saat menggunakan printer Bluetooth thermal maupun Cetak Standar.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Bengkel / Toko *</label>
            <input
              type="text"
              className="form-input"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Slogan / Tagline</label>
            <input
              type="text"
              className="form-input"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Alamat Lengkap</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Sunan Bonang, Tambak Sari Kidul"
            />
            <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
              Tips kertas 58mm: Pisahkan dengan koma atau baris baru agar rapi dan tidak terpotong.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Nomor Telepon / WhatsApp</label>
            <input
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Catatan Kaki Struk (Footer)</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Contoh: Terima kasih atas kunjungan Anda&#10;Garansi servis 3 hari."
            />
            <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
              Tekan Enter untuk membuat baris baru. Jangan ketik simbol '\n' secara manual.
            </small>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.85rem 1.5rem',
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              width: '100%',
              marginTop: '1.5rem',
            }}
          >
            <IoCheckmarkCircleOutline size={20} />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Profil'}
          </button>
        </form>
      </div>
    </div>
  );
};
