import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/bluetoothPrinter';
import { ThermalReceipt } from '../components/ThermalReceipt';

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
import { 
  IoSearchOutline, 
  IoTrashOutline, 
  IoAddOutline, 
  IoRemoveOutline,
  IoCheckmarkCircle,
  IoCardOutline,
  IoCashOutline,
  IoQrCodeOutline,
  IoConstructOutline,
  IoCubeOutline,
  IoReceiptOutline,
  IoArrowForwardOutline,
  IoArrowBackOutline
} from 'react-icons/io5';

export const PosView = () => {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Keranjang Transaksi Kasir
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Pelanggan Umum');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashGiven, setCashGiven] = useState('');
  const [notes, setNotes] = useState('');

  // Mobile Tab State: 'catalog' (Katalog Part) atau 'cart' (Faktur Kasir)
  const [mobileTab, setMobileTab] = useState('catalog');

  // Selesai transaksi & Cetak Struk
  const [completedTransaction, setCompletedTransaction] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    fetchBrands();
    fetchStoreSettings();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedBrand, search]);

  const fetchBrands = async () => {
    try {
      const res = await api.get('/brands');
      setBrands(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const res = await api.get('/settings');
      setStoreSettings(res.data?.data || null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();

      if (selectedBrand === 'SERVICE') {
        params.isService = 'true';
      } else if (selectedBrand !== 'ALL') {
        params.brandId = selectedBrand;
      }

      const res = await api.get('/products', { params });
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (!product.is_service && existing.quantity >= product.stock) {
          alert(`Stok fisik untuk ${product.name} hanya tersisa ${product.stock}`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            brand_name: product.brand?.name || null,
            cost_price: product.cost_price || 0,
            unit_price: product.selling_price,
            quantity: 1,
            subtotal: product.selling_price,
            is_service: product.is_service,
            max_stock: product.stock,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (!item.is_service && newQty > item.max_stock) {
              alert(`Maksimal stok tersedia adalah ${item.max_stock}`);
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unit_price,
            };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Kalkulasi Total
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalAmount = Math.max(0, subtotal - Number(discount || 0));
  const changeDue = paymentMethod === 'CASH' && cashGiven 
    ? Math.max(0, Number(cashGiven) - totalAmount) 
    : 0;

  const handleQuickCash = (amount) => {
    setCashGiven(amount);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'CASH') {
      const given = Number(cashGiven) || 0;
      if (given < totalAmount) {
        setErrorMessage(`Nominal bayar masih kurang Rp ${formatNumber(totalAmount - given)}`);
        return;
      }
    }

    try {
      setProcessingOrder(true);
      setErrorMessage(null);

      const payload = {
        customer_name: customerName.trim() || 'Pelanggan Umum',
        vehicle_plate: vehiclePlate.trim().toUpperCase() || null,
        vehicle_model: vehicleModel.trim() || null,
        discount: Number(discount) || 0,
        payment_method: paymentMethod,
        cash_given: paymentMethod === 'CASH' ? Number(cashGiven) : totalAmount,
        notes: notes || null,
        items: cart,
      };

      const res = await api.post('/transactions', payload);
      const { transaction, store } = res.data.data;

      // Bersihkan keranjang kasir
      setCart([]);
      setCashGiven('');
      setVehiclePlate('');
      setVehicleModel('');
      setCustomerName('Pelanggan Umum');
      setDiscount(0);
      setMobileTab('catalog');

      // Refresh data produk
      fetchProducts();

      // Buka pop-up Struk Thermal Bluetooth
      setCompletedTransaction(transaction);
      if (store) setStoreSettings(store);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Gagal memproses transaksi kasir');
    } finally {
      setProcessingOrder(false);
    }
  };

  const getBrandBadgeClass = (brandName, isService) => {
    if (isService) return 'tag-service';
    switch (brandName?.toLowerCase()) {
      case 'honda': return 'tag-honda';
      case 'yamaha': return 'tag-yamaha';
      case 'kawasaki': return 'tag-kawasaki';
      case 'suzuki': return 'tag-suzuki';
      default: return 'tag-universal';
    }
  };

  // Reusable Faktur Kasir Component
  const renderFakturKasir = () => (
    <div className="cart-panel">
      <div className="cart-header">
        <div className="cart-title">
          <span style={{ fontWeight: 800 }}>Faktur Kasir</span>
          <span style={{
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '99px',
            fontWeight: 700,
          }}>
            {cart.length} Item
          </span>
        </div>

        {cart.length > 0 && (
          <button
            onClick={() => setCart([])}
            style={{ background: 'transparent', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <IoTrashOutline /> Kosongkan
          </button>
        )}
      </div>

      {/* Form Kendaraan Konsumen */}
      <div className="vehicle-info-box">
        <div className="mini-input-group">
          <label>Plat Motor</label>
          <input
            type="text"
            className="mini-input"
            placeholder="B 1234 ABC"
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
          />
        </div>

        <div className="mini-input-group">
          <label>Tipe Motor</label>
          <input
            type="text"
            className="mini-input"
            placeholder="Vario / Beat"
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
          />
        </div>
      </div>

      {/* Item List di Keranjang */}
      <div className="cart-items-scroll">
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Keranjang masih kosong.<br />
            Silakan pilih sparepart atau jasa servis.
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => setMobileTab('catalog')}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--primary)',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                Pilih Sparepart Sekarang
              </button>
            </div>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product_id} className="cart-item-row">
              <div className="cart-item-info">
                <div className="cart-item-name">
                  {item.is_service && <span style={{ color: '#c084fc', marginRight: '4px' }}>[JASA]</span>}
                  {item.product_name}
                </div>
                <div className="cart-item-sub">
                  {formatCurrency(item.unit_price)}
                </div>
              </div>

              <div className="cart-item-stepper">
                <button className="stepper-btn" onClick={() => updateQuantity(item.product_id, -1)}>
                  <IoRemoveOutline />
                </button>
                <span className="stepper-qty">{item.quantity}</span>
                <button className="stepper-btn" onClick={() => updateQuantity(item.product_id, 1)}>
                  <IoAddOutline />
                </button>
              </div>

              <div className="cart-item-total">
                {formatCurrency(item.subtotal)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ringkasan & Form Pembayaran */}
      {cart.length > 0 && (
        <div className="cart-summary">
          {errorMessage && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              padding: '0.45rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              marginBottom: '0.5rem',
            }}>
              {errorMessage}
            </div>
          )}

          <div className="summary-row">
            <span>Subtotal</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(subtotal)}</span>
          </div>

          <div className="summary-row" style={{ alignItems: 'center' }}>
            <span>Diskon</span>
            <div style={{ position: 'relative', width: '110px' }}>
              <input
                type="text"
                inputMode="numeric"
                style={{
                  width: '100%',
                  padding: '3px 8px 3px 26px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  textAlign: 'right',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                }}
                placeholder="0"
                value={discount ? formatRupiahInput(discount) : ''}
                onChange={(e) => setDiscount(parseRupiahInput(e.target.value))}
              />
              <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, pointerEvents: 'none' }}>
                Rp
              </span>
            </div>
          </div>

          <div className="summary-row total-row">
            <span>TOTAL</span>
            <span className="total-amount">{formatCurrency(totalAmount)}</span>
          </div>

          {/* Metode Bayar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem', margin: '0.65rem 0' }}>
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              style={{
                padding: '0.45rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: paymentMethod === 'CASH' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-input)',
                border: `1px solid ${paymentMethod === 'CASH' ? '#10b981' : 'var(--border-color)'}`,
                color: paymentMethod === 'CASH' ? '#34d399' : 'var(--text-muted)',
              }}
            >
              <IoCashOutline /> Tunai
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('QRIS')}
              style={{
                padding: '0.45rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: paymentMethod === 'QRIS' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-input)',
                border: `1px solid ${paymentMethod === 'QRIS' ? '#3b82f6' : 'var(--border-color)'}`,
                color: paymentMethod === 'QRIS' ? '#60a5fa' : 'var(--text-muted)',
              }}
            >
              <IoQrCodeOutline /> QRIS
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('TRANSFER')}
              style={{
                padding: '0.45rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: paymentMethod === 'TRANSFER' ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-input)',
                border: `1px solid ${paymentMethod === 'TRANSFER' ? '#a855f7' : 'var(--border-color)'}`,
                color: paymentMethod === 'TRANSFER' ? '#c084fc' : 'var(--text-muted)',
              }}
            >
              <IoCardOutline /> Transfer
            </button>
          </div>

          {/* Quick Cash Buttons */}
          {paymentMethod === 'CASH' && (
            <div>
              <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => handleQuickCash(totalAmount)}
                  style={{ flex: 1, padding: '3px', fontSize: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)' }}
                >
                  Uang Pas
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(50000)}
                  style={{ flex: 1, padding: '3px', fontSize: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)' }}
                >
                  50rb
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(100000)}
                  style={{ flex: 1, padding: '3px', fontSize: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)' }}
                >
                  100rb
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(200000)}
                  style={{ flex: 1, padding: '3px', fontSize: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)' }}
                >
                  200rb
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Uang Diterima:</span>
                <div style={{ position: 'relative', width: '135px' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '4px 8px 4px 28px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-mono)',
                      textAlign: 'right',
                      fontWeight: 600,
                    }}
                    value={cashGiven ? formatRupiahInput(cashGiven) : ''}
                    onChange={(e) => setCashGiven(parseRupiahInput(e.target.value))}
                  />
                  <span style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, pointerEvents: 'none' }}>
                    Rp
                  </span>
                </div>
              </div>

              {Number(cashGiven) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#34d399', fontWeight: 700 }}>
                  <span>Kembalian:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(changeDue)}</span>
                </div>
              )}
            </div>
          )}

          <button
            className="btn-checkout"
            onClick={handleCheckout}
            disabled={processingOrder}
          >
            <IoCheckmarkCircle size={18} />
            {processingOrder ? 'Memproses Transaksi...' : 'Bayar & Cetak Struk'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* MOBILE SEGMENTED SWITCHER (Hanya muncul di Layar HP/Tablet) */}
      <div className="mobile-pos-switcher">
        <button
          className={`mobile-pos-switcher-btn ${mobileTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setMobileTab('catalog')}
        >
          <IoCubeOutline size={18} />
          <span>Katalog Part</span>
        </button>

        <button
          className={`mobile-pos-switcher-btn ${mobileTab === 'cart' ? 'active' : ''}`}
          onClick={() => setMobileTab('cart')}
        >
          <IoReceiptOutline size={18} />
          <span>Faktur Kasir</span>
          {cart.length > 0 && <span className="cart-count-badge">{cart.length}</span>}
        </button>
      </div>

      <div className="pos-container">
        {/* KATALOG PRODUK & JASA */}
        <div className={`pos-catalog-side ${mobileTab === 'cart' ? 'mobile-hidden' : ''}`}>
          {/* Filter Merk */}
          <div className="brand-filter-bar">
            <button
              className={`brand-pill pill-all ${selectedBrand === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedBrand('ALL')}
            >
              Semua
            </button>

            {brands.map((b) => (
              <button
                key={b.id}
                className={`brand-pill pill-${b.name.toLowerCase()} ${selectedBrand === b.id ? 'active' : ''}`}
                onClick={() => setSelectedBrand(b.id)}
              >
                {b.name}
              </button>
            ))}

            <button
              className={`brand-pill pill-service ${selectedBrand === 'SERVICE' ? 'active' : ''}`}
              onClick={() => setSelectedBrand('SERVICE')}
            >
              <IoConstructOutline /> Jasa Servis
            </button>
          </div>

          {/* Search Input */}
          <div className="search-wrapper">
            <IoSearchOutline className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Cari part/motor (misal: 'kampas vario', 'oli mpx', 'roller beat')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grid Produk */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Memuat katalog sparepart...
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Tidak ada sparepart yang sesuai.
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => {
                const inCart = cart.find((item) => item.product_id === p.id);
                const isOutOfStock = !p.is_service && p.stock <= 0;

                return (
                  <div key={p.id} className="product-card">
                    <div>
                      <div className="card-top">
                        <span className={`card-brand-tag ${getBrandBadgeClass(p.brand?.name, p.is_service)}`}>
                          {p.is_service ? 'JASA' : (p.brand?.name || 'UNIVERSAL')}
                        </span>

                        <span className={`stock-indicator ${
                          p.is_service 
                            ? 'stock-service' 
                            : p.stock <= (p.min_stock || 3) 
                              ? 'stock-low' 
                              : 'stock-safe'
                        }`}>
                          {p.is_service ? 'NON-STOK' : `Stok: ${p.stock}`}
                        </span>
                      </div>

                      <h4 className="product-name">{p.name}</h4>

                      {p.motor_compatibility && (
                        <p className="product-compat">
                          Cocok: {p.motor_compatibility}
                        </p>
                      )}

                      {p.rack_location && (
                        <div className="product-rack">
                          📍 {p.rack_location}
                        </div>
                      )}
                    </div>

                    <div className="card-bottom">
                      <span className="product-price">
                        {formatCurrency(p.selling_price)}
                      </span>

                      <button
                        className="btn-add-cart"
                        onClick={() => addToCart(p)}
                        disabled={isOutOfStock}
                      >
                        {isOutOfStock ? 'Habis' : (inCart ? `+ (${inCart.quantity})` : '+ Tambah')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tombol Pintas Bawah ke Faktur Kasir jika di HP ada item di keranjang */}
          {cart.length > 0 && (
            <div className="mobile-bottom-view-cart" style={{ marginTop: '1.25rem' }}>
              <button
                onClick={() => setMobileTab('cart')}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                }}
              >
                <span>Lihat Faktur Kasir ({cart.length} Item)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {formatCurrency(totalAmount)} <IoArrowForwardOutline />
                </span>
              </button>
            </div>
          )}
        </div>

        {/* FAKTUR KASIR PANEL */}
        <div className={`cart-panel-wrapper ${mobileTab === 'catalog' ? 'mobile-hidden' : ''}`}>
          {/* Tombol kembali ke katalog di tampilan mobile */}
          <div className="mobile-back-to-catalog" style={{ marginBottom: '0.75rem' }}>
            <button
              onClick={() => setMobileTab('catalog')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.45rem 0.75rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <IoArrowBackOutline /> Kembali Pilih Part Lain
            </button>
          </div>

          {renderFakturKasir()}
        </div>
      </div>

      {/* Pop-up Cetak Struk Bluetooth */}
      {completedTransaction && (
        <ThermalReceipt
          transaction={completedTransaction}
          store={storeSettings}
          onClose={() => setCompletedTransaction(null)}
        />
      )}
    </div>
  );
};
