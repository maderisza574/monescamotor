const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("PERINGATAN: SUPABASE_URL atau SUPABASE_KEY belum diisi di file .env!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
