/**
 * Utility Cetak Printer Bluetooth Thermal (ESC/POS) & Format Struk 58mm
 */

// Encoder ESC/POS sederhana untuk thermal 58mm (rata-rata 32 karakter per baris)
export const escposFormat = {
  INIT: '\x1B\x40',
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  FEED_2: '\x0A\x0A',
  FEED_4: '\x0A\x0A\x0A\x0A',
  CUT: '\x1D\x56\x41\x00',
};

export const formatRow58mm = (left, right, totalWidth = 32) => {
  const leftStr = String(left || '');
  const rightStr = String(right || '');
  const spaceNeeded = totalWidth - leftStr.length - rightStr.length;
  if (spaceNeeded <= 0) {
    return leftStr.slice(0, totalWidth - rightStr.length - 1) + ' ' + rightStr + '\n';
  }
  return leftStr + ' '.repeat(spaceNeeded) + rightStr + '\n';
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('id-ID').format(num || 0);
};

/**
 * Konversi gambar logo menjadi data raster bit image ESC/POS (GS v 0)
 * @param {string} imageUrl URL gambar logo (default '/logo-thermal.png')
 * @param {number} maxWidth Lebar maksimal dalam dots (default 384 untuk 58mm)
 * @returns {Promise<Uint8Array>} Byte command ESC/POS raster
 */
export const getLogoEscposCommands = (imageUrl = '/logo-thermal.png', maxWidth = 384) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.document) {
      return resolve(new Uint8Array(0));
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }

        // Lebar harus kelipatan 8 bit (1 byte)
        width = Math.floor(width / 8) * 8;
        if (width <= 0 || height <= 0) return resolve(new Uint8Array(0));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(new Uint8Array(0));

        // Background putih bersih
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height).data;
        const widthBytes = width / 8;
        const rasterBytes = new Uint8Array(widthBytes * height);

        // Convert pixels to 1-bit monochrome bitmap
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const offset = (y * width + x) * 4;
            const r = imgData[offset];
            const g = imgData[offset + 1];
            const b = imgData[offset + 2];
            const a = imgData[offset + 3];

            // Hitung luminansi
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            // Titik hitam (dibakar panas): jika pixel tidak transparan dan gelap
            const isBlack = a > 120 && luminance < 160;

            if (isBlack) {
              const byteIndex = y * widthBytes + Math.floor(x / 8);
              const bitIndex = 7 - (x % 8);
              rasterBytes[byteIndex] |= (1 << bitIndex);
            }
          }
        }

        // Format ESC/POS GS v 0:
        // [0x1B, 0x61, 0x01] -> ALIGN CENTER
        // [0x1D, 0x76, 0x30, 0x00] -> GS v 0 (mode normal)
        // [xL, xH, yL, yH]
        // [...rasterBytes]
        // [0x0A] -> Line Feed
        const xL = widthBytes % 256;
        const xH = Math.floor(widthBytes / 256);
        const yL = height % 256;
        const yH = Math.floor(height / 256);

        const header = new Uint8Array([
          0x1B, 0x61, 0x01, // Align Center
          0x1D, 0x76, 0x30, 0x00, // GS v 0
          xL, xH,
          yL, yH
        ]);

        const result = new Uint8Array(header.length + rasterBytes.length + 1);
        result.set(header, 0);
        result.set(rasterBytes, header.length);
        result.set([0x0A], header.length + rasterBytes.length);

        resolve(result);
      } catch (err) {
        console.warn('Gagal meraster gambar logo untuk printer thermal:', err);
        resolve(new Uint8Array(0));
      }
    };
    img.onerror = () => {
      console.warn('File logo-thermal.png tidak dapat dimuat, melanjutkan tanpa logo gambar.');
      resolve(new Uint8Array(0));
    };
    img.src = imageUrl;
  });
};

// Cetak langsung lewat Web Bluetooth API (Chrome / Edge di Android & Windows)
export const printViaWebBluetooth = async (transaction, store, options = {}) => {
  if (!navigator.bluetooth) {
    throw new Error('Browser ini belum mendukung Web Bluetooth. Silakan gunakan Google Chrome atau Cetak via Print Dialog.');
  }

  const { includeLogo = true } = options;
  const storeName = (store?.store_name || 'MONESCA MOTOR').toUpperCase();
  const tagline = store?.tagline || 'Pusat Sparepart & Servis Motor';
  const address = store?.address || 'Jl. Raya Bengkel';
  const phone = store?.phone ? `Telp: ${store.phone}` : '';
  const footer = store?.receipt_footer || 'Terima kasih atas kunjungan Anda!';

  // Ambil perintah raster gambar logo jika diaktifkan
  let logoBytes = new Uint8Array(0);
  if (includeLogo) {
    try {
      logoBytes = await getLogoEscposCommands('/logo-thermal.png', 384);
    } catch (e) {
      console.warn('Lewati logo bluetooth karena error:', e);
    }
  }

  // Susun teks ESC/POS
  let text = escposFormat.INIT;
  text += escposFormat.ALIGN_CENTER;
  text += escposFormat.BOLD_ON + storeName + '\n' + escposFormat.BOLD_OFF;
  text += tagline + '\n';
  text += address + '\n';
  if (phone) text += phone + '\n';
  text += '--------------------------------\n';
  text += escposFormat.ALIGN_LEFT;
  text += `No. Faktur : ${transaction.invoice_number}\n`;
  text += `Tanggal    : ${new Date(transaction.created_at || Date.now()).toLocaleString('id-ID')}\n`;
  text += `Kasir      : ${transaction.cashier_name || 'Kasir'}\n`;
  if (transaction.vehicle_plate) {
    text += `Plat Motor : ${transaction.vehicle_plate.toUpperCase()}\n`;
  }
  if (transaction.vehicle_model) {
    text += `Tipe Motor : ${transaction.vehicle_model}\n`;
  }
  if (transaction.customer_name && transaction.customer_name !== 'Pelanggan Umum') {
    text += `Pelanggan  : ${transaction.customer_name}\n`;
  }
  text += '--------------------------------\n';

  // Rincian Item (Sparepart & Jasa Servis)
  const items = transaction.items || [];
  for (const item of items) {
    const itemName = item.is_service ? `[JASA] ${item.product_name}` : item.product_name;
    text += itemName + '\n';
    const detailLeft = `  ${item.quantity} x ${formatNumber(item.unit_price)}`;
    const detailRight = formatNumber(item.subtotal);
    text += formatRow58mm(detailLeft, detailRight, 32);
  }

  text += '--------------------------------\n';
  text += formatRow58mm('Subtotal', formatNumber(transaction.subtotal), 32);
  if (Number(transaction.discount) > 0) {
    text += formatRow58mm('Diskon', `-${formatNumber(transaction.discount)}`, 32);
  }
  text += escposFormat.BOLD_ON;
  text += formatRow58mm('TOTAL', formatNumber(transaction.total_amount), 32);
  text += escposFormat.BOLD_OFF;
  text += formatRow58mm(`Bayar (${transaction.payment_method})`, formatNumber(transaction.cash_given || transaction.total_amount), 32);
  if (Number(transaction.change_due) > 0) {
    text += formatRow58mm('Kembalian', formatNumber(transaction.change_due), 32);
  }
  text += '--------------------------------\n';
  text += escposFormat.ALIGN_CENTER;
  text += footer + '\n';
  text += escposFormat.FEED_4;

  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);

  // Jika ada logoBytes, selipkan setelah perintah INIT
  let fullData;
  if (logoBytes && logoBytes.length > 0) {
    const initBytes = encoder.encode(escposFormat.INIT);
    const remainingTextBytes = textBytes.slice(initBytes.length);

    fullData = new Uint8Array(initBytes.length + logoBytes.length + remainingTextBytes.length);
    let offset = 0;
    fullData.set(initBytes, offset);
    offset += initBytes.length;
    fullData.set(logoBytes, offset);
    offset += logoBytes.length;
    fullData.set(remainingTextBytes, offset);
  } else {
    fullData = textBytes;
  }

  // Request device bluetooth
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb', // Thermal printer service standard
      '0000ffe0-0000-1000-8000-00805f9b34fb', // Generic serial service
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    ],
  });

  const server = await device.gatt.connect();

  // Cari service & characteristic printer yang writable
  let characteristic = null;
  const services = await server.getPrimaryServices();
  for (const s of services) {
    const chars = await s.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        characteristic = c;
        break;
      }
    }
    if (characteristic) break;
  }

  if (!characteristic) {
    throw new Error('Tidak dapat menemukan jalur tulis pada printer bluetooth ini.');
  }

  // Kirim data per chunk (maksimal 100 bytes per chunk untuk stabilitas bluetooth)
  const chunkSize = 100;
  for (let i = 0; i < fullData.length; i += chunkSize) {
    const chunk = fullData.slice(i, i + chunkSize);
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    // Delay 15ms agar buffer penerima printer thermal tidak kelebihan beban saat menerima gambar
    await new Promise((resolve) => setTimeout(resolve, 15));
  }

  await device.gatt.disconnect();
  return true;
};
