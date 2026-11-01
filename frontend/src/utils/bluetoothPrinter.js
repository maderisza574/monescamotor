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

/**
 * Bungkus teks agar pas di kertas thermal 58mm (maks 32 karakter per baris)
 * Memecah baris berdasarkan tanda koma atau spasi kata (bukan memotong kata di tengah)
 * dan mengonversi literal '\n' menjadi baris baru ESC/POS sebenarnya.
 */
export const wrapEscposText = (text, maxChars = 32) => {
  if (!text) return '';
  const normalized = String(text)
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalized.split('\n');
  const result = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      result.push(trimmed);
      continue;
    }

    // Jika ada tanda koma dan baris terlalu panjang (seperti alamat), utamakan potong setelah koma
    if (trimmed.includes(',')) {
      const parts = trimmed.split(/,\s*/);
      let curr = '';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i] + (i < parts.length - 1 ? ',' : '');
        if (!curr) {
          curr = p;
        } else if ((curr + ' ' + p).length <= maxChars) {
          curr += ' ' + p;
        } else {
          result.push(curr);
          curr = p;
        }
      }
      if (curr) result.push(curr);
      continue;
    }

    // Pemecahan per batas kata
    const words = trimmed.split(/\s+/);
    let curr = '';
    for (const w of words) {
      if (!curr) {
        curr = w;
      } else if ((curr + ' ' + w).length <= maxChars) {
        curr += ' ' + w;
      } else {
        result.push(curr);
        curr = w;
      }
    }
    if (curr) result.push(curr);
  }

  return result.join('\n');
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

// State koneksi bluetooth aktif (disimpan agar tidak perlu connect / pilih device berulang)
let cachedDevice = null;
let cachedCharacteristic = null;

export const getConnectedBluetoothDevice = () => cachedDevice;

export const isBluetoothConnected = () => {
  return Boolean(cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected && cachedCharacteristic);
};

export const disconnectBluetooth = () => {
  if (cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected) {
    try {
      cachedDevice.gatt.disconnect();
    } catch (e) {
      console.warn('Gagal disconnect printer:', e);
    }
  }
  cachedDevice = null;
  cachedCharacteristic = null;
};

// Daftar UUID service printer thermal bluetooth paling umum di dunia (ESC/POS BLE)
const KNOWN_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Thermal printer standard (0x18F0)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Generic Serial / VSC / Panda / Eppos (0xFFE0)
  '0000ff00-0000-1000-8000-00805f9b34fb', // PT-210 / MPT-II / 58mm POS (0xFF00)
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent (Microchip)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Android / Mobile POS
  '0000af30-0000-1000-8000-00805f9b34fb', // Custom POS
  '0000fff0-0000-1000-8000-00805f9b34fb', // 0xFFF0
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / POS BLE
];

// Cari characteristic yang mendukung penulisan (write / writeWithoutResponse)
const findWritableCharacteristic = async (server) => {
  // Coba cari service spesifik satu per satu terlebih dahulu (jauh lebih stabil daripada getPrimaryServices() massal)
  for (const serviceUuid of KNOWN_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const chars = await service.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          return c;
        }
      }
    } catch (e) {
      // Lanjut coba service berikutnya
    }
  }

  // Fallback: cari ke seluruh primary services jika ada custom UUID lain
  try {
    const services = await server.getPrimaryServices();
    for (const s of services) {
      try {
        const chars = await s.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            return c;
          }
        }
      } catch (e) {
        // Lanjut
      }
    }
  } catch (err) {
    console.warn('Fallback getPrimaryServices error:', err);
  }

  return null;
};

// Sambungkan ke GATT server dengan retry otomatis (hingga 3x)
const connectGattWithRetry = async (device, maxRetries = 3) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (device.gatt.connected) {
        return device.gatt;
      }

      const server = await device.gatt.connect();
      // Jeda 250ms agar negosiasi GATT handshake stabil di OS
      await new Promise((r) => setTimeout(r, 250));

      if (server && server.connected) {
        return server;
      }
    } catch (err) {
      lastError = err;
      console.warn(`GATT Connect attempt ${attempt}/${maxRetries} gagal:`, err);
      // Tunggu 500ms sebelum mencoba menyambungkan kembali
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw new Error(
    lastError?.message || 
    'GATT Server terputus. Pastikan printer dalam keadaan ON dan jika ada pilihan nama berakhiran _BLE, pilih yang _BLE.'
  );
};

// Ambil koneksi printer yang sudah ada atau hubungkan baru
export const getOrConnectPrinter = async (forceSelect = false) => {
  if (!navigator.bluetooth) {
    throw new Error('Browser ini belum mendukung Web Bluetooth. Silakan gunakan Google Chrome di Android / Windows / Mac, atau gunakan tombol Cetak Standar.');
  }

  // 1. Jika sudah terkoneksi dan tidak minta ganti device, pakai langsung (INSTAN tanpa popup!)
  if (!forceSelect && cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected && cachedCharacteristic) {
    return cachedCharacteristic;
  }

  // 2. Jika device sudah pernah dipilih tapi koneksi GATT tidur / terputus, coba reconnect langsung tanpa popup
  if (!forceSelect && cachedDevice && cachedDevice.gatt) {
    try {
      const server = await connectGattWithRetry(cachedDevice, 2);
      const char = await findWritableCharacteristic(server);
      if (char) {
        cachedCharacteristic = char;
        return cachedCharacteristic;
      }
    } catch (reconnectErr) {
      console.warn('Auto-reconnect printer lama gagal, membuka jendela pilihan printer baru...', reconnectErr);
    }
  }

  // 3. Minta user memilih printer bluetooth (hanya saat pertama kali atau saat klik Ganti Printer)
  let device;
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_SERVICES,
    });
  } catch (userCancelErr) {
    if (userCancelErr.name === 'NotFoundError') {
      throw new Error('Pencarian printer dibatalkan.');
    }
    throw userCancelErr;
  }

  cachedDevice = device;

  // Pasang listener saat printer mati atau di luar jangkauan
  device.addEventListener('gattserverdisconnected', () => {
    console.warn('Printer bluetooth terputus.');
    cachedCharacteristic = null;
  });

  // Sambungkan dengan retry otomatis
  const server = await connectGattWithRetry(device, 3);
  const char = await findWritableCharacteristic(server);

  if (!char) {
    throw new Error(
      `Tidak dapat menemukan jalur tulis pada printer "${device.name || 'Bluetooth'}".\nTips: Jika muncul 2 nama printer di daftar, pastikan pilih yang berakhiran "_BLE" (contoh: MPT-II_BLE atau RPP02N_BLE).`
    );
  }

  cachedCharacteristic = char;
  return cachedCharacteristic;
};

// Kirim data byte per chunk ke printer thermal
const sendChunks = async (characteristic, data, chunkSize = 64) => {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    // Delay 20ms agar buffer mikrokontroler printer tidak overflow
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

// Cetak langsung lewat Web Bluetooth API (Chrome / Edge di Android & Windows)
export const printViaWebBluetooth = async (transaction, store, options = {}) => {
  const { includeLogo = true, forceSelect = false } = options;
  const storeName = (store?.store_name || 'MONESCA MOTOR').toUpperCase();
  const tagline = store?.tagline || 'Pusat Sparepart & Servis Motor';
  const address = store?.address || 'Jl. Raya Bengkel';
  const phone = store?.phone ? `Telp: ${store.phone}` : '';
  const footer = store?.receipt_footer || 'Terima kasih atas kunjungan Anda\nGaransi servis 3 hari.';

  // Format baris teks agar pas di 58mm (32 kolom) tanpa memotong kata dan tanpa literal '\n'
  const formattedAddress = wrapEscposText(address, 32);
  const formattedTagline = wrapEscposText(tagline, 32);
  const formattedFooter = wrapEscposText(footer, 32);

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
  const isDraft = Boolean(options.isDraft || transaction.is_draft);

  let text = escposFormat.INIT;
  text += escposFormat.ALIGN_CENTER;
  text += escposFormat.BOLD_ON + storeName + '\n' + escposFormat.BOLD_OFF;
  if (formattedTagline) text += formattedTagline + '\n';
  if (formattedAddress) text += formattedAddress + '\n';
  if (phone) text += phone + '\n';

  if (isDraft) {
    text += '================================\n';
    text += escposFormat.BOLD_ON + '*** TANDA TERIMA SERVIS ***\n' + escposFormat.BOLD_OFF;
    text += '(MOTOR DITINGGAL / ESTIMASI)\n';
    text += '================================\n';
    text += escposFormat.ALIGN_LEFT;
    text += `No. Draft  : ${transaction.draft_id || transaction.invoice_number}\n`;
    text += `Waktu Masuk: ${new Date(transaction.created_at || Date.now()).toLocaleString('id-ID')}\n`;
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
    text += escposFormat.BOLD_ON + 'Daftar Part & Servis:\n' + escposFormat.BOLD_OFF;

    const items = transaction.items || [];
    for (const item of items) {
      const prefix = item.is_manual ? '[LUAR] ' : (item.is_service ? '[JASA] ' : '');
      const itemName = `${prefix}${item.product_name}`;
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
    text += formatRow58mm('ESTIMASI TOTAL', formatNumber(transaction.total_amount), 32);
    text += escposFormat.BOLD_OFF;
    text += 'Status: DALAM PENGERJAAN\n';
    text += '--------------------------------\n';
    text += escposFormat.ALIGN_CENTER;
    text += '* Simpan struk ini sebagai bukti\n  pengambilan motor Anda.\n';
    text += '* Estimasi biaya dapat berubah jika\n  ada tambahan pengerjaan.\n';
    text += escposFormat.FEED_4;
  } else {
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
      const prefix = item.is_manual ? '[LUAR] ' : (item.is_service ? '[JASA] ' : '');
      const itemName = `${prefix}${item.product_name}`;
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
    if (formattedFooter) text += formattedFooter + '\n';
    text += escposFormat.FEED_4;
  }

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

  // Ambil koneksi printer (reusable singleton)
  let characteristic = await getOrConnectPrinter(forceSelect);

  try {
    await sendChunks(characteristic, fullData);
  } catch (writeErr) {
    console.warn('Gagal saat mengirim data ke printer, mencoba reconnect 1x...', writeErr);
    // Jika koneksi terputus saat pengiriman, reconnect otomatis 1x
    cachedCharacteristic = null;
    if (cachedDevice && cachedDevice.gatt) {
      const server = await cachedDevice.gatt.connect();
      await new Promise((r) => setTimeout(r, 200));
      characteristic = await findWritableCharacteristic(server);
      if (characteristic) {
        cachedCharacteristic = characteristic;
        await sendChunks(characteristic, fullData);
        return true;
      }
    }
    throw writeErr;
  }

  // PENTING: JANGAN disconnect device di sini!
  // Biarkan koneksi tetap tersambung sehingga cetak transaksi berikutnya bisa langsung instan tanpa popup!
  return true;
};
