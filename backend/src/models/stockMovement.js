const supabase = require("../config/supabase");

module.exports = {
  createMovement: (data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("stock_movements")
        .insert([data])
        .select()
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  getAllMovements: (productId = null, limit = 50) =>
    new Promise((resolve, reject) => {
      let query = supabase
        .from("stock_movements")
        .select(`
          *,
          product:products ( id, name, sku, brand:brands ( name ) )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (productId) {
        query = query.eq("product_id", productId);
      }

      query.then((result) => {
        if (!result.error) {
          resolve(result);
        } else {
          reject(result);
        }
      });
    }),
};
