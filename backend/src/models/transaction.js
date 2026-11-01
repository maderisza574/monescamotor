const supabase = require("../config/supabase");

module.exports = {
  createTransaction: async (trxData, items) => {
    // 1. Simpan Header Transaksi Kasir
    const { data: trx, error: trxError } = await supabase
      .from("transactions")
      .insert([trxData])
      .select()
      .single();

    if (trxError) {
      throw trxError;
    }

    // 2. Format & Simpan Seluruh Item (Sparepart + Jasa Servis)
    const itemsToInsert = items.map((item) => ({
      transaction_id: trx.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      brand_name: item.brand_name || null,
      is_service: Boolean(item.is_service),
      cost_price: item.cost_price || 0,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity),
      subtotal: Number(item.subtotal || item.unit_price * item.quantity),
    }));

    const { error: itemsError } = await supabase
      .from("transaction_items")
      .insert(itemsToInsert);

    if (itemsError) {
      throw itemsError;
    }

    // 3. LOGIKA PENGURANGAN STOK:
    // HANYA barang fisik (bukan Jasa) yang dipotong stok fisiknya & dicatat mutasinya
    for (const item of items) {
      // Jika bukan jasa servis dan memiliki product_id
      if (!item.is_service && item.product_id) {
        // Ambil data produk terkini
        const { data: currentProduct } = await supabase
          .from("products")
          .select("stock, is_service")
          .eq("id", item.product_id)
          .single();

        // Pastikan di database memang bukan jasa
        if (currentProduct && !currentProduct.is_service) {
          const prevStock = currentProduct.stock || 0;
          const newStock = Math.max(0, prevStock - Number(item.quantity));

          // Update stok fisik di tabel produk
          await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", item.product_id);

          // Catat riwayat mutasi keluar
          await supabase.from("stock_movements").insert([
            {
              product_id: item.product_id,
              type: "OUT",
              quantity: -Number(item.quantity),
              previous_stock: prevStock,
              current_stock: newStock,
              notes: `Penjualan Kasir / Servis #${trx.invoice_number}`,
            },
          ]);
        }
      }
    }

    // 4. Ambil Data Transaksi Lengkap untuk Struk Kasir
    const { data: fullTrx } = await supabase
      .from("transactions")
      .select(`
        *,
        items:transaction_items (*)
      `)
      .eq("id", trx.id)
      .single();

    return fullTrx;
  },

  getAllTransactions: (offset = 0, limit = 100, startDate = null, endDate = null) =>
    new Promise((resolve, reject) => {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          items:transaction_items (*)
        `)
        .order("created_at", { ascending: false });

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      query
        .range(offset, offset + limit - 1)
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  getTransactionById: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("transactions")
        .select(`
          *,
          items:transaction_items (*)
        `)
        .eq("id", id)
        .single()
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  getCountTransactions: (startDate = null, endDate = null) =>
    new Promise((resolve, reject) => {
      let query = supabase
        .from("transactions")
        .select("*", { count: "exact", head: true });

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      query.then((result) => {
        if (!result.error) {
          resolve(result.count || 0);
        } else {
          reject(result);
        }
      });
    }),
};
