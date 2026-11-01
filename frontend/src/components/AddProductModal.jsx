import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/bluetoothPrinter';
import { 
  IoCloseCircleOutline, 
  IoCloudUploadOutline, 
  IoCheckmarkCircleOutline,
  IoConstructOutline,
  IoCubeOutline,
  IoTrashOutline,
  IoImageOutline
} from 'react-icons/io5';

// Format angka menjadi format ribuan Rupiah (contoh: 10000 -> "10.000")
const formatRupiahInput = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const cleanNumber = String(val).replace(/\D/g, '');
  if (!cleanNumber) return '';
  return new Intl.NumberFormat('id-ID').format(cleanNumber);
};

// Ambil angka murni dari input berformat Rupiah (contoh: "10.000" -> 10000)
const parseRupiahInput = (val) => {
  const cleanNumber = String(val).replace(/\D/g, '');
  return cleanNumber ? Number(cleanNumber) : 0;
};

export const AddProductModal = ({ productToEdit, brands, categories, onClose, onSuccess }) => {
  const [isService, setIsService] = useState(productToEdit?.is_service || false);
  const [name, setName] = useState(productToEdit?.name || '');
  const [brandId, setBrandId] = useState(productToEdit?.brand_id || '');
  const [categoryId, setCategoryId] = useState(productToEdit?.category_id || '');
  const [motorCompatibility, setMotorCompatibility] = useState(productToEdit?.motor_compatibility || '');
  const [sku, setSku] = useState(productToEdit?.sku || '');
  const [costPrice, setCostPrice] = useState(productToEdit?.cost_price || 0);
  const [sellingPrice, setSellingPrice] = useState(productToEdit?.selling_price || 0);
  const [stock, setStock] = useState(productToEdit?.stock || 0);
  const [minStock, setMinStock] = useState(productToEdit?.min_stock || 3);
  const [rackLocation, setRackLocation] = useState(productToEdit?.rack_location || '');
  const [unit, setUnit] = useState(productToEdit?.unit || 'pcs');
  const [imageUrl, setImageUrl] = useState(productToEdit?.image_url || '');
  const [imagePreview, setImagePreview] = useState(productToEdit?.image_url || '');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sinkronisasi state setiap kali productToEdit berubah (Mode Edit vs Tambah)
  useEffect(() => {
    if (productToEdit) {
      setIsService(Boolean(productToEdit.is_service));
      setName(productToEdit.name || '');
      setBrandId(productToEdit.brand_id || '');
      setCategoryId(productToEdit.category_id || '');
      setMotorCompatibility(productToEdit.motor_compatibility || '');
      setSku(productToEdit.sku || '');
      setCostPrice(productToEdit.cost_price || 0);
      setSellingPrice(productToEdit.selling_price || 0);
      setStock(productToEdit.stock || 0);
      setMinStock(productToEdit.min_stock || 3);
      setRackLocation(productToEdit.rack_location || '');
      setUnit(productToEdit.unit || 'pcs');
      setImageUrl(productToEdit.image_url || '');
      setImagePreview(productToEdit.image_url || '');
    } else {
      setIsService(false);
      setName('');
      setBrandId('');
      setCategoryId('');
      setMotorCompatibility('');
      setSku('');
      setCostPrice(0);
      setSellingPrice(0);
      setStock(0);
      setMinStock(3);
      setRackLocation('');
      setUnit('pcs');
      setImageUrl('');
      setImagePreview('');
    }
  }, [productToEdit]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Tampilkan preview instan lokal detik itu juga!
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    try {
      setUploadingImage(true);
      setError(null);
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.data?.fileUrl) {
        setImageUrl(res.data.data.fileUrl);
        setImagePreview(res.data.data.fileUrl);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal mengunggah foto ke Supabase Storage');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama sparepart / jasa wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: name.trim(),
        brand_id: isService ? null : (brandId ? Number(brandId) : null),
        category_id: categoryId ? Number(categoryId) : null,
        motor_compatibility: isService ? null : (motorCompatibility.trim() || null),
        sku: sku.trim() || null,
        cost_price: Number(costPrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        stock: isService ? 0 : (Number(stock) || 0),
        min_stock: isService ? 0 : (Number(minStock) || 3),
        rack_location: isService ? null : (rackLocation.trim() || null),
        unit: unit || (isService ? 'jasa' : 'pcs'),
        image_url: imageUrl || null,
        is_service: Boolean(isService),
      };

      if (productToEdit) {
        await api.patch(`/products/${productToEdit.id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal menyimpan data barang');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>
              {productToEdit ? 'Edit Data Sparepart' : 'Tambah Sparepart / Jasa Baru'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Input data katalog toko & stok gudang
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
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {/* Tipe: Sparepart Fisik vs Jasa Servis */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.65rem',
          marginBottom: '1.25rem',
        }}>
          <button
            type="button"
            onClick={() => setIsService(false)}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              background: !isService ? 'rgba(37, 99, 235, 0.2)' : 'var(--bg-input)',
              border: `1px solid ${!isService ? '#3b82f6' : 'var(--border-color)'}`,
              color: !isService ? '#60a5fa' : 'var(--text-muted)',
            }}
          >
            <IoCubeOutline size={18} />
            Sparepart Fisik (Ada Stok)
          </button>

          <button
            type="button"
            onClick={() => setIsService(true)}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              background: isService ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-input)',
              border: `1px solid ${isService ? '#a855f7' : 'var(--border-color)'}`,
              color: isService ? '#c084fc' : 'var(--text-muted)',
            }}
          >
            <IoConstructOutline size={18} />
            Jasa / Servis (Non-Stok)
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {isService ? 'Nama Jasa / Servis *' : 'Nama Sparepart *'}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={isService ? 'Contoh: Jasa Servis CVT & Ganti Roller' : 'Contoh: Kampas Rem Depan / Oli Mesin 0.8L'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {!isService && (
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Merk Motor *</label>
                <select
                  className="form-select"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">-- Pilih Merk Motor --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kategori Komponen</label>
                <select
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!isService && (
            <div className="form-group">
              <label className="form-label">Kompatibilitas Motor (Model yang Cocok)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Vario 125, Vario 150, Beat FI, Scoopy ESP"
                value={motorCompatibility}
                onChange={(e) => setMotorCompatibility(e.target.value)}
              />
            </div>
          )}

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Harga Modal / Beli</label>
              <div className="input-currency-wrapper">
                <span className="input-currency-prefix">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input input-currency"
                  placeholder="0"
                  value={costPrice ? formatRupiahInput(costPrice) : ''}
                  onChange={(e) => setCostPrice(parseRupiahInput(e.target.value))}
                />
              </div>
              <div className="currency-live-hint">
                <span>{costPrice > 0 ? formatCurrency(costPrice) : 'Rp 0'}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Harga Jual Konsumen *</label>
              <div className="input-currency-wrapper">
                <span className="input-currency-prefix">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input input-currency"
                  placeholder="0"
                  value={sellingPrice ? formatRupiahInput(sellingPrice) : ''}
                  onChange={(e) => setSellingPrice(parseRupiahInput(e.target.value))}
                  required
                />
              </div>
              <div className="currency-live-hint">
                <span className="amount-label">{sellingPrice > 0 ? formatCurrency(sellingPrice) : 'Rp 0'}</span>
                {Number(sellingPrice) > 0 && Number(costPrice) > 0 && (Number(sellingPrice) - Number(costPrice)) > 0 && (
                  <span className="profit-badge">
                    +Rp {formatNumber(Number(sellingPrice) - Number(costPrice))} ({Math.round(((Number(sellingPrice) - Number(costPrice)) / Number(costPrice)) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isService && (
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Stok Fisik Awal</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  disabled={Boolean(productToEdit)} // edit stok pakai tombol Tambah Stok agar ada riwayat audit
                />
              </div>

              <div className="form-group">
                <label className="form-label">Peringatan Stok Menipis</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-grid-2">
            {!isService && (
              <div className="form-group">
                <label className="form-label">Lokasi Rak Gudang</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Rak A-02, Box 4"
                  value={rackLocation}
                  onChange={(e) => setRackLocation(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Satuan</label>
              <select
                className="form-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="pcs">pcs</option>
                <option value="botol">botol</option>
                <option value="set">set</option>
                <option value="dus">dus</option>
                <option value="liter">liter</option>
                <option value="jasa">jasa</option>
              </select>
            </div>
          </div>

          {/* Foto Sparepart & Live Preview Card */}
          <div className="form-group">
            <label className="form-label">Foto Sparepart / Produk</label>
            
            {imagePreview ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.85rem',
              }}>
                <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
                  <img
                    src={imagePreview}
                    alt="Preview Sparepart"
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid var(--border-color)',
                      background: '#0b0f19',
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/logo.png';
                    }}
                  />
                  {uploadingImage && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.65)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      color: '#38bdf8',
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: '2px',
                    }}>
                      Mengunggah...
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginBottom: '2px' }}>
                    {uploadingImage ? 'Sedang mengunggah foto...' : '✓ Foto Produk Terpasang'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>
                    {productToEdit ? 'Foto saat ini untuk produk ini' : 'Foto siap disimpan ke katalog gudang'}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{
                      padding: '5px 12px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <IoCloudUploadOutline size={15} /> Ganti Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        disabled={uploadingImage}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                      style={{
                        padding: '5px 10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#f87171',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <IoTrashOutline size={15} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label style={{
                padding: '1.25rem 1rem',
                background: 'var(--bg-input)',
                border: '2px dashed var(--border-color)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}>
                  <IoCloudUploadOutline />
                </div>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                  {uploadingImage ? 'Mengunggah Foto...' : 'Pilih Foto Sparepart dari HP / Kamera'}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Format JPG, PNG, WEBP (Maksimal 5MB)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  disabled={uploadingImage}
                />
              </label>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.85rem',
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
              disabled={submitting || uploadingImage}
              style={{
                padding: '0.85rem',
                background: 'var(--primary)',
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
              {submitting ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
