const supabase = require("../config/supabase");

module.exports = {
  getAllBrands: () =>
    new Promise((resolve, reject) => {
      supabase
        .from("brands")
        .select("*")
        .order("name", { ascending: true })
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  getBrandById: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("brands")
        .select("*")
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

  createBrand: (data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("brands")
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

  updateBrand: (id, data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("brands")
        .update(data)
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

  deleteBrand: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("brands")
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
};
