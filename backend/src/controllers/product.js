const productModel = require("../models/product");
const stockMovementModel = require("../models/stockMovement");
const wrapper = require("../utils/wrapper");

module.exports = {
  getAllProducts: async (request, response) => {
    try {
      let { page = 1, limit = 50, brandId, categoryId, search, sortBy, sortOrder, isService } = request.query;
      page = Math.max(1, parseInt(page, 10) || 1);
      limit = Math.max(1, parseInt(limit, 10) || 50);

      const filters = {
        brandId: brandId ? parseInt(brandId, 10) : undefined,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        search: search ? search.trim() : undefined,
        sortBy,
        sortOrder,
        isService: isService !== undefined ? isService === "true" : undefined,
      };

      const totalData = await productModel.getCountProduct(filters);
      const totalPage = Math.ceil(totalData / limit);
      const offset = (page - 1) * limit;

      const pagination = {
        page,
        totalPage,
        limit,
        totalData,
      };

      const result = await productModel.getAllProducts(filters, offset, limit);

      return wrapper.response(
        response,
        200,
        "Berhasil mengambil data sparepart",
        result.data,
        pagination
      );
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil data sparepart", error);
    }
  },

  getProductById: async (request, response) => {
    try {
      const { id } = request.params;
      const result = await productModel.getProductById(id);
      return wrapper.response(response, 200, "Berhasil mengambil detail sparepart", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 404, "Sparepart tidak ditemukan", error);
    }
  },

  createProduct: async (request, response) => {
    try {
      const {
        sku,
        name,
        brand_id,
        category_id,
        motor_compatibility,
        cost_price = 0,
        selling_price = 0,
        stock = 0,
        min_stock = 3,
        rack_location,
        unit = "pcs",
        image_url,
        is_service = false,
      } = request.body;

      if (!name) {
        return wrapper.response(response, 400, "Nama sparepart wajib diisi");
      }

      const isServiceItem = Boolean(is_service);

      const productPayload = {
        sku: sku || null,
        name,
        brand_id: brand_id || null,
        category_id: category_id || null,
        motor_compatibility: motor_compatibility || null,
        cost_price: Number(cost_price),
        selling_price: Number(selling_price),
        stock: isServiceItem ? 0 : Number(stock),
        min_stock: isServiceItem ? 0 : Number(min_stock),
        rack_location: rack_location || null,
        unit: unit || (isServiceItem ? "jasa" : "pcs"),
        image_url: image_url || null,
        is_service: isServiceItem,
        is_active: true,
      };

      const result = await productModel.createProduct(productPayload);
      const newProduct = result.data[0];

      // Catat mutasi stok awal HANYA jika bukan jasa dan stok > 0
      if (!isServiceItem && Number(stock) > 0) {
        await stockMovementModel.createMovement({
          product_id: newProduct.id,
          type: "IN",
          quantity: Number(stock),
          previous_stock: 0,
          current_stock: Number(stock),
          notes: "Input stok awal saat pendaftaran barang baru",
        });
      }

      return wrapper.response(response, 201, "Berhasil menambahkan sparepart baru", newProduct);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menambahkan sparepart", error);
    }
  },

  updateProduct: async (request, response) => {
    try {
      const { id } = request.params;
      const {
        sku,
        name,
        brand_id,
        category_id,
        motor_compatibility,
        cost_price,
        selling_price,
        stock,
        min_stock,
        rack_location,
        unit,
        image_url,
        is_active,
      } = request.body;

      const updatePayload = {};
      if (sku !== undefined) updatePayload.sku = sku;
      if (name !== undefined) updatePayload.name = name;
      if (brand_id !== undefined) updatePayload.brand_id = brand_id;
      if (category_id !== undefined) updatePayload.category_id = category_id;
      if (motor_compatibility !== undefined) updatePayload.motor_compatibility = motor_compatibility;
      if (cost_price !== undefined) updatePayload.cost_price = Number(cost_price);
      if (selling_price !== undefined) updatePayload.selling_price = Number(selling_price);
      if (min_stock !== undefined) updatePayload.min_stock = Number(min_stock);
      if (rack_location !== undefined) updatePayload.rack_location = rack_location;
      if (unit !== undefined) updatePayload.unit = unit;
      if (image_url !== undefined) updatePayload.image_url = image_url;
      if (is_active !== undefined) updatePayload.is_active = is_active;

      // Fitur Edit Jumlah Stok Fisik Gudang (KHUSUS ADMIN / SUPER_ADMIN)
      if (stock !== undefined && stock !== null && stock !== "") {
        if (!request.user || request.user.role !== "SUPER_ADMIN") {
          return wrapper.response(
            response,
            403,
            "Akses ditolak: Hanya Admin / Owner yang diizinkan mengedit jumlah stok gudang"
          );
        }

        const targetStock = Math.max(0, parseInt(stock, 10) || 0);
        const currentProdRes = await productModel.getProductById(id);
        const currentProd = currentProdRes?.data;
        const prevStock = currentProd ? (currentProd.stock || 0) : 0;

        if (targetStock !== prevStock) {
          updatePayload.stock = targetStock;

          // Catat ke riwayat mutasi stok (Audit Log)
          const diff = targetStock - prevStock;
          await stockMovementModel.createMovement({
            product_id: id,
            type: "ADJUSTMENT",
            quantity: diff,
            previous_stock: prevStock,
            current_stock: targetStock,
            notes: `Koreksi stok langsung oleh Admin (${prevStock} -> ${targetStock})`,
          });
        }
      }

      const result = await productModel.updateProduct(id, updatePayload);
      return wrapper.response(response, 200, "Berhasil memperbarui data sparepart", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui sparepart", error);
    }
  },

  adjustStock: async (request, response) => {
    try {
      const { id } = request.params;
      const { type = "IN", quantity, notes } = request.body;

      if (quantity === undefined || quantity === null || Number(quantity) < 0) {
        return wrapper.response(response, 400, "Jumlah mutasi stok harus angka 0 atau lebih");
      }

      // Khusus tipe "SET" (mengatur ulang jumlah stok total secara langsung), hanya Admin yang diizinkan
      if (type === "SET") {
        if (!request.user || request.user.role !== "SUPER_ADMIN") {
          return wrapper.response(
            response,
            403,
            "Akses ditolak: Hanya Admin / Owner yang diizinkan mengatur ulang jumlah stok secara langsung"
          );
        }
      }

      const productRes = await productModel.getProductById(id);
      const currentProduct = productRes.data;
      if (!currentProduct) {
        return wrapper.response(response, 404, "Sparepart tidak ditemukan");
      }

      const prevStock = currentProduct.stock || 0;
      let newStock = prevStock;
      const qtyNumber = Number(quantity);
      let movementType = type;
      let movementQty = 0;

      if (type === "IN") {
        newStock = prevStock + Math.abs(qtyNumber);
        movementQty = Math.abs(qtyNumber);
      } else if (type === "OUT") {
        newStock = Math.max(0, prevStock - Math.abs(qtyNumber));
        movementQty = -Math.abs(qtyNumber);
      } else if (type === "SET" || type === "ADJUSTMENT") {
        newStock = Math.max(0, qtyNumber);
        movementQty = newStock - prevStock;
        movementType = "ADJUSTMENT";
      }

      // Update stok di produk
      await productModel.updateStock(id, newStock);

      // Catat mutasi stok
      const movement = await stockMovementModel.createMovement({
        product_id: id,
        type: movementType,
        quantity: movementQty,
        previous_stock: prevStock,
        current_stock: newStock,
        notes: notes || (type === "SET" ? `Koreksi stok langsung oleh Admin (${prevStock} -> ${newStock})` : `Penyesuaian stok manual (${type})`),
      });

      return wrapper.response(response, 200, "Stok berhasil diperbarui", {
        product_id: id,
        previous_stock: prevStock,
        current_stock: newStock,
        movement: movement.data ? movement.data[0] : null,
      });
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menyesuaikan stok", error);
    }
  },

  deleteProduct: async (request, response) => {
    try {
      const { id } = request.params;
      await productModel.deleteProduct(id);
      return wrapper.response(response, 200, "Berhasil menghapus sparepart");
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menghapus sparepart", error);
    }
  },
};
