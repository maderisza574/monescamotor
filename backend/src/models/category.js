const supabase = require("../config/supabase");

module.exports = {
  getAllCategories: () =>
    new Promise((resolve, reject) => {
      supabase
        .from("categories")
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

  getCategoryById: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("categories")
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

  createCategory: (data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("categories")
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

  updateCategory: (id, data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("categories")
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

  deleteCategory: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("categories")
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
