import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/bluetoothPrinter';
import { useAuth } from '../context/AuthContext';
import { AddProductModal } from '../components/AddProductModal';
import { QuickRestockModal } from '../components/QuickRestockModal';
import { 
  IoAddOutline, 
  IoSearchOutline, 
  IoCubeOutline, 
  IoWarningOutline, 
  IoCreateOutline, 
  IoTrashOutline,
  IoTimeOutline,
  IoRefreshOutline
} from 'react-icons/io5';

export const InventoryView = () => {
  const { isSuperAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [productToRestock, setProductToRestock] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedBrand, selectedCategory]);

  const fetchBrands = async () => {
    try {
      const res = await api.get('/brands');
      setBrands(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (selectedBrand) params.brandId = selectedBrand;
      if (selectedCategory) params.categoryId = selectedCategory;

      const res = await api.get('/products', { params });
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const res = await api.get('/stock-movements?limit=100');
      setMovements(res.data?.data || []);
      setShowHistoryModal(true);
    } catch (err) {
      console.error(err);
      alert('Gagal memuat riwayat mutasi stok');
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Yakin ingin menghapus sparepart "${product.name}"?`)) return;

    try {
      await api.delete(`/products/${product.id}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus sparepart');
    }
  };

  // Filter low stock
  const displayedProducts = products.filter((p) => {
    if (onlyLowStock) {
      return !p.is_service && p.stock <= (p.min_stock || 3);
    }
    return true;
  });

  const totalItems = products.length;
  const lowStockCount = products.filter((p) => !p.is_service && p.stock <= (p.min_stock || 3)).length;
  const totalStockCount = products.filter((p) => !p.is_service).reduce((sum, p) => sum + (p.stock || 0), 0);

  return (
    <div>
      {/* Header Statistik Stok */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(37, 99, 235, 0.15)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
          }}>
            <IoCubeOutline />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Jenis Barang</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {totalItems} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dim)' }}>item</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
          }}>
            <IoRefreshOutline />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Stok Fisik</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
              {formatNumber(totalStockCount)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dim)' }}>unit</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: `1px solid ${lowStockCount > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
          }}>
            <IoWarningOutline />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stok Menipis / Kritis</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: lowStockCount > 0 ? '#f87171' : 'var(--text-main)' }}>
              {lowStockCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dim)' }}>perlu kulakan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Aksi & Filter */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.85rem',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center', flex: 1 }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
            <IoSearchOutline style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Cari sparepart..."
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Merk */}
          <select
            style={{
              padding: '0.55rem 0.75rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">Semua Merk</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Filter Kategori */}
          <select
            style={{
              padding: '0.55rem 0.75rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Toggle Stok Menipis */}
          <button
            type="button"
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: onlyLowStock ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-input)',
              border: `1px solid ${onlyLowStock ? '#ef4444' : 'var(--border-color)'}`,
              color: onlyLowStock ? '#f87171' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IoWarningOutline /> Stok Menipis ({lowStockCount})
          </button>
        </div>

        {/* Tombol Tambah Barang & Mutasi */}
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            onClick={fetchMovements}
            style={{
              padding: '0.6rem 1rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <IoTimeOutline size={16} /> Riwayat Mutasi
          </button>

          <button
            onClick={() => {
              setProductToEdit(null);
              setShowAddModal(true);
            }}
            style={{
              padding: '0.6rem 1.15rem',
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
            }}
          >
            <IoAddOutline size={18} /> Tambah Sparepart Baru
          </button>
        </div>
      </div>

      {/* Tabel Data Barang */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Foto & Nama Sparepart</th>
              <th style={{ padding: '0.85rem 1rem' }}>Merk Motor</th>
              <th style={{ padding: '0.85rem 1rem' }}>Kompatibilitas</th>
              <th style={{ padding: '0.85rem 1rem' }}>Rak</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Harga Modal</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Harga Jual</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Stok Fisik</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Memuat data stok...
                </td>
              </tr>
            ) : displayedProducts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Tidak ada data sparepart.
                </td>
              </tr>
            ) : (
              displayedProducts.map((p) => {
                const isLow = !p.is_service && p.stock <= (p.min_stock || 3);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          background: 'var(--bg-input)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-dim)',
                        }}>
                          <IoCubeOutline size={18} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {p.category?.name || 'Komponen'} {p.sku ? `• SKU: ${p.sku}` : ''}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      {p.is_service ? (
                        <span className="card-brand-tag tag-service">JASA SERVIS</span>
                      ) : (
                        <span className="card-brand-tag tag-universal">
                          {p.brand?.name || 'UNIVERSAL'}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '200px' }}>
                      {p.motor_compatibility || '-'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {p.rack_location || '-'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatCurrency(p.cost_price)}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                      {formatCurrency(p.selling_price)}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {p.is_service ? (
                        <span style={{ color: '#c084fc', fontSize: '0.8rem', fontWeight: 700 }}>NON-STOK</span>
                      ) : (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '99px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          background: isLow ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          color: isLow ? '#f87171' : '#34d399',
                        }}>
                          {p.stock} {p.unit || 'pcs'}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                        {/* Tombol Cepat Tambah / Koreksi Stok (Khusus Admin bisa koreksi langsung) */}
                        {!p.is_service && (
                          <button
                            onClick={() => setProductToRestock(p)}
                            style={{
                              padding: '4px 8px',
                              background: isSuperAdmin ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: isSuperAdmin ? '#60a5fa' : '#34d399',
                              border: `1px solid ${isSuperAdmin ? 'rgba(59, 130, 246, 0.35)' : 'rgba(16, 185, 129, 0.3)'}`,
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title={isSuperAdmin ? "Kelola / Edit Jumlah Stok Gudang (Admin)" : "Tambah Stok Masuk (Kulakan)"}
                          >
                            {isSuperAdmin ? "± Edit Stok" : "+ Stok"}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setProductToEdit(p);
                            setShowAddModal(true);
                          }}
                          style={{
                            padding: '4px 6px',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                          title={isSuperAdmin ? "Edit Data & Stok" : "Edit Data Sparepart"}
                        >
                          <IoCreateOutline size={18} />
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(p)}
                            style={{
                              padding: '4px 6px',
                              background: 'transparent',
                              color: '#ef4444',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                            title="Hapus Sparepart (Khusus Admin)"
                          >
                            <IoTrashOutline size={18} />
                          </button>
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

      {/* Modal Tambah/Edit Barang */}
      {showAddModal && (
        <AddProductModal
          productToEdit={productToEdit}
          brands={brands}
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchProducts}
        />
      )}

      {/* Modal Tambah Stok Cepat */}
      {productToRestock && (
        <QuickRestockModal
          product={productToRestock}
          onClose={() => setProductToRestock(null)}
          onSuccess={fetchProducts}
        />
      )}

      {/* Modal Riwayat Mutasi Stok */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3>Riwayat Keluar Masuk Stok (Audit Log)</h3>
              <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>
                &times;
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px' }}>Waktu</th>
                    <th style={{ padding: '6px' }}>Barang</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Tipe</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Jumlah</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Sisa Akhir</th>
                    <th style={{ padding: '6px' }}>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '6px', color: 'var(--text-dim)' }}>
                        {new Date(m.created_at).toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '6px', fontWeight: 600 }}>{m.product?.name}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: m.type === 'IN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: m.type === 'IN' ? '#34d399' : '#f87171',
                        }}>
                          {m.type === 'IN' ? 'MASUK' : 'KELUAR'}
                        </span>
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {m.current_stock}
                      </td>
                      <td style={{ padding: '6px', color: 'var(--text-muted)' }}>{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
