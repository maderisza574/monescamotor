const supabase = require("../config/supabase");

module.exports = {
  getSettings: () =>
    new Promise((resolve, reject) => {
      supabase
        .from("store_settings")
        .select("*")
        .eq("id", 1)
        .single()
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  updateSettings: (data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("store_settings")
        .upsert({ id: 1, ...data })
        .select()
        .single()
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),
};
