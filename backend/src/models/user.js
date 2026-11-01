const supabase = require("../config/supabase");

module.exports = {
  getUserByUsername: (username) =>
    new Promise((resolve, reject) => {
      supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single()
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  getUserById: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("users")
        .select("id, username, name, role, is_active, created_at")
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

  getAllUsers: () =>
    new Promise((resolve, reject) => {
      supabase
        .from("users")
        .select("id, username, name, role, is_active, created_at")
        .order("created_at", { ascending: false })
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  createUser: (data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("users")
        .insert([data])
        .select("id, username, name, role, is_active, created_at")
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  updateUser: (id, data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("users")
        .update(data)
        .eq("id", id)
        .select("id, username, name, role, is_active, created_at")
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  deleteUser: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("users")
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
