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
  IoArrowBackOutline,
  IoAddCircleOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoCloseCircleOutline,
  IoSaveOutline
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

  // Antrean Draft / Motor Ditinggal
  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem('monesca_pos_drafts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState(null);

  // Input Item Manual / Part Beli di Luar (Non-Stok)
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualIsService, setManualIsService] = useState(false);

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

    // Periksa apakah ada draft yang diminta untuk dibuka dari halaman Riwayat Transaksi
    try {
      const pendingDraftJson = localStorage.getItem('monesca_active_draft_to_load');
      if (pendingDraftJson) {
        const d = JSON.parse(pendingDraftJson);
        localStorage.removeItem('monesca_active_draft_to_load');
        setTimeout(() => handleLoadDraft(d), 100);
      }
    } catch (e) {
      console.error(e);
    }

    const handleCustomLoadDraft = (e) => {
      if (e.detail) {
        handleLoadDraft(e.detail);
      }
    };

    window.addEventListener('monesca_load_draft', handleCustomLoadDraft);
    return () => {
      window.removeEventListener('monesca_load_draft', handleCustomLoadDraft);
    };
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

  const saveDraftsToStorage = (newDrafts) => {
    setDrafts(newDrafts);
    try {
      localStorage.setItem('monesca_pos_drafts', JSON.stringify(newDrafts));
    } catch (e) {
      console.error('Gagal menyimpan drafts ke localStorage', e);
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
            cart_item_id: 'prod_' + product.id,
            product_id: product.id,
            product_name: product.name,
            brand_name: product.brand?.name || null,
            cost_price: product.cost_price || 0,
            unit_price: product.selling_price,
            quantity: 1,
            subtotal: product.selling_price,
            is_service: product.is_service,
            max_stock: product.stock,
            is_manual: false,
          },
        ];
      }
    });
  };

  const updateQuantity = (identifier, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          const match = (item.cart_item_id && item.cart_item_id === identifier) || item.product_id === identifier;
          if (match) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (!item.is_service && !item.is_manual && newQty > item.max_stock) {
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

  const handleAddManualItem = (e) => {
    if (e) e.preventDefault();
    const trimmed = manualName.trim();
    const price = parseRupiahInput(manualPrice);
    const qty = Number(manualQty) || 1;

    if (!trimmed) {
      alert('Silakan isi nama sparepart atau jasa luar!');
      return;
    }
    if (price <= 0) {
      alert('Silakan isi harga jual yang valid (harus lebih dari Rp 0)!');
      return;
    }

    const newItem = {
      cart_item_id: 'manual_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      product_id: null,
      product_name: trimmed,
      brand_name: manualIsService ? 'JASA' : 'BELI LUAR',
      cost_price: 0,
      unit_price: price,
      quantity: qty,
      subtotal: price * qty,
      is_service: manualIsService,
      max_stock: 9999,
      is_manual: true,
    };

    setCart((prev) => [...prev, newItem]);
    setManualName('');
    setManualPrice('');
    setManualQty(1);
    setManualIsService(false);
    setShowManualModal(false);
  };

  const handleSaveDraft = () => {
    if (cart.length === 0) {
      alert('Keranjang masih kosong. Tambahkan sparepart atau jasa terlebih dahulu.');
      return;
    }

    const draftId = activeDraftId || ('DRAFT-' + Date.now().toString().slice(-6));
    const draftData = {
      draft_id: draftId,
      invoice_number: draftId,
      is_draft: true,
      created_at: new Date().toISOString(),
      customer_name: customerName.trim() || 'Pelanggan Umum',
      vehicle_plate: vehiclePlate.trim().toUpperCase() || '',
      vehicle_model: vehicleModel.trim() || '',
      discount: Number(discount) || 0,
      notes: notes || '',
      items: cart.map(item => ({ ...item })),
      subtotal: subtotal,
      total_amount: totalAmount,
      cashier_name: 'Kasir',
    };

    const existingIndex = drafts.findIndex((d) => d.draft_id === draftId);
    let updatedDrafts;
    if (existingIndex >= 0) {
      updatedDrafts = [...drafts];
      updatedDrafts[existingIndex] = draftData;
    } else {
      updatedDrafts = [draftData, ...drafts];
    }

    saveDraftsToStorage(updatedDrafts);

    // JANGAN LAKUKAN PRINT! (Draft masuk ke riwayat antrean tanpa popup cetak)
    // Reset keranjang untuk melayani konsumen lain
    setCart([]);
    setVehiclePlate('');
    setVehicleModel('');
    setCustomerName('Pelanggan Umum');
    setDiscount(0);
    setCashGiven('');
    setNotes('');
    setActiveDraftId(null);
    setMobileTab('catalog');

    alert(`✓ Motor ${draftData.vehicle_plate || 'Tanpa Plat'} berhasil disimpan sebagai draft ke riwayat antrean. Anda dapat melengkapinya nanti sebelum mencetak struk!`);
  };

  const handleLoadDraft = (draft) => {
    if (cart.length > 0) {
      const ok = window.confirm(
        'Keranjang saat ini masih berisi item. Apakah ingin menimpanya dengan antrean motor ini?'
      );
      if (!ok) return;
    }

    setCart(draft.items || []);
    setVehiclePlate(draft.vehicle_plate || '');
    setVehicleModel(draft.vehicle_model || '');
    setCustomerName(draft.customer_name || 'Pelanggan Umum');
    setDiscount(draft.discount || 0);
    setNotes(draft.notes || '');
    setActiveDraftId(draft.draft_id);
    setShowDraftsModal(false);
    setMobileTab('cart');
  };

  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Hapus antrean motor ini dari daftar draft?')) {
      const filtered = drafts.filter((d) => d.draft_id !== draftId);
      saveDraftsToStorage(filtered);
      if (activeDraftId === draftId) {
        setActiveDraftId(null);
      }
    }
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

      // Jika transaksi ini berasal dari antrean draft motor, hapus draft otomatis
      if (activeDraftId) {
        const remaining = drafts.filter((d) => d.draft_id !== activeDraftId);
        saveDraftsToStorage(remaining);
        setActiveDraftId(null);
      }

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer'
            }}
            title="Tambah part yang dibeli di luar dadakan"
          >
            <IoAddCircleOutline size={15} /> + Part Luar
          </button>

          {cart.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Kosongkan keranjang faktur saat ini?')) {
                  setCart([]);
                  setActiveDraftId(null);
                }
              }}
              style={{ background: 'transparent', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
            >
              <IoTrashOutline /> Kosongkan
            </button>
          )}
        </div>
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
          cart.map((item, idx) => {
            const itemKey = item.cart_item_id || item.product_id || `cart_item_${idx}`;
            return (
              <div key={itemKey} className="cart-item-row">
                <div className="cart-item-info">
                  <div className="cart-item-name">
                    {item.is_manual && (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#fbbf24',
                        fontSize: '0.68rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        marginRight: '4px',
                        fontWeight: 700
                      }}>
                        [BELI LUAR]
                      </span>
                    )}
                    {item.is_service && <span style={{ color: '#c084fc', marginRight: '4px' }}>[JASA]</span>}
                    {item.product_name}
                  </div>
                  <div className="cart-item-sub">
                    {formatCurrency(item.unit_price)}
                  </div>
                </div>

                <div className="cart-item-stepper">
                  <button className="stepper-btn" onClick={() => updateQuantity(item.cart_item_id || item.product_id, -1)}>
                    <IoRemoveOutline />
                  </button>
                  <span className="stepper-qty">{item.quantity}</span>
                  <button className="stepper-btn" onClick={() => updateQuantity(item.cart_item_id || item.product_id, 1)}>
                    <IoAddOutline />
                  </button>
                </div>

                <div className="cart-item-total">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            );
          })
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

          {/* Tombol Simpan Draft Motor Ditinggal (Tanpa Cetak) */}
          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={processingOrder}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #f59e0b',
                color: '#fbbf24',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
              }}
              title="Simpan motor yang ditinggal ke riwayat antrean tanpa mencetak"
            >
              <IoTimeOutline size={17} />
              <span>Simpan sebagai Draft (Motor Ditinggal)</span>
            </button>
          </div>

          <button
            className="btn-checkout"
            onClick={handleCheckout}
            disabled={processingOrder}
          >
            <IoCheckmarkCircle size={18} />
            {processingOrder ? 'Memproses Transaksi...' : 'Bayar & Cetak Struk (Lunas)'}
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
          
          {/* BAR AKSI CEPAT: INPUT PART LUAR & ANTREAN MOTOR DITINGGAL */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '8px',
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
              title="Input sparepart atau jasa yang dibeli di luar dadakan tanpa stok gudang"
            >
              <IoAddCircleOutline size={18} />
              <span>+ Input Part Luar / Manual</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDraftsModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                background: drafts.length > 0 ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)',
                border: `1px solid ${drafts.length > 0 ? '#3b82f6' : 'var(--border-color)'}`,
                borderRadius: '8px',
                color: drafts.length > 0 ? '#60a5fa' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
              title="Lihat daftar motor yang sedang diservis / ditinggal"
            >
              <IoTimeOutline size={18} />
              <span>Antrean Motor Ditinggal</span>
              <span style={{
                background: drafts.length > 0 ? '#2563eb' : 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: '99px',
                fontWeight: 800,
              }}>
                {drafts.length}
              </span>
            </button>
          </div>

          {/* INDIKATOR DRAFT AKTIF SEDANG DIKERJAKAN */}
          {activeDraftId && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              marginBottom: '0.75rem',
              fontSize: '0.82rem',
              color: '#fde047',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <strong>🛵 Mode Antrean Motor:</strong> {vehiclePlate || 'Tanpa Plat'} {vehicleModel ? `(${vehicleModel})` : ''} - {customerName}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  style={{
                    background: '#ca8a04',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '3px 9px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Simpan pembaruan draft tanpa mencetak"
                >
                  <IoSaveOutline /> Simpan Update Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Keluar dari mode pengerjaan antrean ini tanpa mengubah draft?')) {
                      setCart([]);
                      setActiveDraftId(null);
                      setVehiclePlate('');
                      setVehicleModel('');
                      setCustomerName('Pelanggan Umum');
                    }
                  }}
                  style={{
                    background: 'transparent',
                    color: '#fca5a5',
                    border: '1px solid rgba(248, 113, 113, 0.4)',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Keluar Antrean
                </button>
              </div>
            </div>
          )}

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

      {/* MODAL INPUT PART LUAR / MANUAL */}
      {showManualModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.25rem' }}>
            <div className="modal-header" style={{ marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#fbbf24' }}>
                <IoAddCircleOutline color="#fbbf24" size={20} /> Input Part Luar / Manual
              </h3>
              <button className="modal-close-btn" onClick={() => setShowManualModal(false)}>
                <IoCloseCircleOutline size={22} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
              Untuk barang yang dibeli mendadak di luar toko atau jasa non-katalog tanpa perlu stok gudang.
            </p>

            <form onSubmit={handleAddManualItem}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Tipe Item</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={() => setManualIsService(false)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: !manualIsService ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-input)',
                      border: `1px solid ${!manualIsService ? '#f59e0b' : 'var(--border-color)'}`,
                      color: !manualIsService ? '#fbbf24' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    📦 Sparepart Luar
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualIsService(true)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: manualIsService ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-input)',
                      border: `1px solid ${manualIsService ? '#a855f7' : 'var(--border-color)'}`,
                      color: manualIsService ? '#c084fc' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    🔧 Jasa / Ongkos
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Nama Barang / Jasa <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={manualIsService ? "contoh: Jasa Bubut Tromol / Pasang Luar" : "contoh: Kampas Rem Beli Toko Sebelah"}
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.65rem', marginBottom: '1.15rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Harga Jual (Rp) <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      style={{ paddingLeft: '28px', fontFamily: 'var(--font-mono)' }}
                      placeholder="0"
                      value={manualPrice ? formatRupiahInput(manualPrice) : ''}
                      onChange={(e) => setManualPrice(parseRupiahInput(e.target.value))}
                      required
                    />
                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, pointerEvents: 'none' }}>
                      Rp
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Jumlah (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={manualQty}
                    onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowManualModal(false)}
                  style={{ padding: '0.65rem' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.65rem', background: '#f59e0b', color: '#000', fontWeight: 800 }}
                >
                  + Masukkan Faktur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANTREAN MOTOR DITINGGAL (DRAFT SERVIS) */}
      {showDraftsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px', padding: '1.25rem' }}>
            <div className="modal-header" style={{ marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#60a5fa' }}>
                <IoTimeOutline color="#60a5fa" size={20} /> Antrean Motor Ditinggal ({drafts.length})
              </h3>
              <button className="modal-close-btn" onClick={() => setShowDraftsModal(false)}>
                <IoCloseCircleOutline size={22} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Daftar motor konsumen yang sedang diservis / ditinggal. Klik <strong>Buka & Bayar</strong> saat motor selesai dikerjakan dan konsumen ingin membayar.
            </p>

            {drafts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                🛵 Tidak ada antrean motor yang sedang ditinggal saat ini.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                {drafts.map((draft) => (
                  <div
                    key={draft.draft_id}
                    style={{
                      background: 'var(--bg-card)',
                      border: activeDraftId === draft.draft_id ? '1px solid #eab308' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{
                          background: '#1e293b',
                          border: '1px solid #475569',
                          color: '#f8fafc',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          letterSpacing: '0.5px'
                        }}>
                          {draft.vehicle_plate || 'TANPA PLAT'}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {draft.vehicle_model || 'Motor'} - {draft.customer_name}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {new Date(draft.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Rincian Ringkas Items */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {draft.items?.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
                      <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(draft.total_amount)}
                      </span>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleLoadDraft(draft)}
                          style={{
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '5px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ✏️ Buka & Lengkapi / Bayar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(draft.draft_id)}
                          style={{
                            background: 'transparent',
                            color: '#f87171',
                            border: '1px solid rgba(248, 113, 113, 0.25)',
                            borderRadius: '5px',
                            padding: '4px 6px',
                            fontSize: '0.74rem',
                            cursor: 'pointer'
                          }}
                          title="Hapus antrean draft"
                        >
                          <IoTrashOutline />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
