const supabase = require("../config/supabase");

module.exports = {
  getCountProduct: (filters = {}) =>
    new Promise((resolve, reject) => {
      let query = supabase.from("products").select("*", { count: "exact", head: true });

      if (filters.brandId) {
        query = query.eq("brand_id", filters.brandId);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,motor_compatibility.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`
        );
      }
      if (filters.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }
      if (filters.isService !== undefined) {
        query = query.eq("is_service", filters.isService);
      }

      query.then((result) => {
        if (!result.error) {
          resolve(result.count || 0);
        } else {
          reject(result);
        }
      });
    }),

  getAllProducts: (filters = {}, offset = 0, limit = 50) =>
    new Promise((resolve, reject) => {
      let query = supabase.from("products").select(`
        *,
        brand:brands ( id, name ),
        category:categories ( id, name )
      `);

      if (filters.brandId) {
        query = query.eq("brand_id", filters.brandId);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,motor_compatibility.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`
        );
      }
      if (filters.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }
      if (filters.isService !== undefined) {
        query = query.eq("is_service", filters.isService);
      }

      // Default sorting: urutkan berdasarkan nama barang (A-Z)
      const sortBy = filters.sortBy || "name";
      const sortOrder = filters.sortOrder === "desc" ? false : true;
      query = query.order(sortBy, { ascending: sortOrder });

      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      query.then((result) => {
        if (!result.error) {
          resolve(result);
        } else {
          reject(result);
        }
      });
    }),

  getProductById: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .select(`
          *,
          brand:brands ( id, name ),
          category:categories ( id, name )
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

  createProduct: (data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .insert([data])
        .select(`
          *,
          brand:brands ( id, name ),
          category:categories ( id, name )
        `)
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  updateProduct: (id, data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .update(data)
        .eq("id", id)
        .select(`
          *,
          brand:brands ( id, name ),
          category:categories ( id, name )
        `)
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  deleteProduct: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .delete()
        .eq("id", id)
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  updateStock: (id, newStock) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", id)
        .select()
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),
};
