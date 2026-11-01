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
    // HANYA transaksi BUKAN DRAFT (COMPLETED) dan barang fisik (bukan Jasa) yang dipotong stok fisiknya
    if (trxData.status !== "DRAFT") {
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
        .neq("status", "DRAFT")
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
        .select("*", { count: "exact", head: true })
        .neq("status", "DRAFT");

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

  deleteTransaction: async (id, restoreStock = true) => {
    // 1. Ambil data transaksi dan itemnya terlebih dahulu
    const { data: trx, error: fetchErr } = await supabase
      .from("transactions")
      .select("*, items:transaction_items (*)")
      .eq("id", id)
      .single();

    if (fetchErr) {
      throw fetchErr;
    }

    // 2. Kembalikan stok fisik jika diminta (restoreStock = true)
    if (restoreStock && trx && trx.items && trx.items.length > 0) {
      for (const item of trx.items) {
        if (!item.is_service && item.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (product) {
            const prevStock = product.stock || 0;
            const newStock = prevStock + Number(item.quantity);

            await supabase
              .from("products")
              .update({ stock: newStock })
              .eq("id", item.product_id);

            await supabase.from("stock_movements").insert([
              {
                product_id: item.product_id,
                type: "ADJUSTMENT",
                quantity: Number(item.quantity),
                previous_stock: prevStock,
                current_stock: newStock,
                notes: `Pembatalan/Hapus Transaksi #${trx.invoice_number}`,
              },
            ]);
          }
        }
      }
    }

    // 3. Hapus transaksi (transaction_items otomatis terhapus via ON DELETE CASCADE di database)
    const { error: delErr } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (delErr) {
      throw delErr;
    }

    return true;
  },

  deleteDraft: (idOrInvoice) =>
    new Promise(async (resolve, reject) => {
      try {
        if (!idOrInvoice) return resolve({ message: "No draft identifier provided" });
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrInvoice);
        let query = supabase.from("transactions").delete().eq("status", "DRAFT");
        if (isUuid) {
          query = query.eq("id", idOrInvoice);
        } else {
          query = query.eq("invoice_number", idOrInvoice);
        }
        const res = await query;
        if (!res.error) resolve(res);
        else reject(res.error);
      } catch (err) {
        reject(err);
      }
    }),

  getDrafts: () =>
    new Promise((resolve, reject) => {
      supabase
        .from("transactions")
        .select(`
          *,
          items:transaction_items (*)
        `)
        .eq("status", "DRAFT")
        .order("created_at", { ascending: false })
        .then((res) => {
          if (!res.error) resolve(res.data || []);
          else reject(res.error);
        });
    }),

  updateDraft: async (draftId, trxData, items) => {
    if (!draftId) throw new Error("Draft identifier is required");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId);
    let findQuery = supabase.from("transactions").select("id").eq("status", "DRAFT");
    if (isUuid) {
      findQuery = findQuery.eq("id", draftId);
    } else {
      findQuery = findQuery.eq("invoice_number", draftId);
    }
    const { data: existingDraft, error: findErr } = await findQuery.single();
    if (findErr || !existingDraft) {
      throw new Error("Draft tidak ditemukan di database");
    }
    const realId = existingDraft.id;

    // 1. Update header draft
    const { error: updErr } = await supabase
      .from("transactions")
      .update({
        customer_name: trxData.customer_name,
        customer_phone: trxData.customer_phone || null,
        vehicle_plate: trxData.vehicle_plate || null,
        vehicle_model: trxData.vehicle_model || null,
        subtotal: trxData.subtotal,
        discount: trxData.discount,
        total_amount: trxData.total_amount,
        notes: trxData.notes || null,
      })
      .eq("id", realId);

    if (updErr) throw updErr;

    // 2. Ganti seluruh item draft
    await supabase.from("transaction_items").delete().eq("transaction_id", realId);

    const itemsToInsert = items.map((item) => ({
      transaction_id: realId,
      product_id: item.product_id || null,
      product_name: item.product_name,
      brand_name: item.brand_name || null,
      is_service: Boolean(item.is_service),
      cost_price: item.cost_price || 0,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity),
      subtotal: Number(item.subtotal || item.unit_price * item.quantity),
    }));

    const { error: insertErr } = await supabase
      .from("transaction_items")
      .insert(itemsToInsert);

    if (insertErr) throw insertErr;

    const { data: updated } = await supabase
      .from("transactions")
      .select(`
        *,
        items:transaction_items (*)
      `)
      .eq("id", realId)
      .single();

    return updated;
  },

  resetAllTransactions: async (restoreStock = true) => {
    // 1. Kembalikan seluruh stok barang terjual jika diminta
    if (restoreStock) {
      const { data: allItems } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("is_service", false);

      if (allItems && allItems.length > 0) {
        for (const item of allItems) {
          if (item.product_id) {
            const { data: product } = await supabase
              .from("products")
              .select("stock")
              .eq("id", item.product_id)
              .single();

            if (product) {
              await supabase
                .from("products")
                .update({ stock: (product.stock || 0) + Number(item.quantity) })
                .eq("id", item.product_id);
            }
          }
        }
      }
    }

    // 2. Hapus seluruh data di tabel transactions (otomatis mengosongkan transaction_items juga)
    const { error: delErr } = await supabase
      .from("transactions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (delErr) {
      throw delErr;
    }

    return true;
  },
};
