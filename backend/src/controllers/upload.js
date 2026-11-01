const supabase = require("../config/supabase");
const wrapper = require("../utils/wrapper");
const path = require("path");

let bucketEnsured = false;
async function ensureBucket() {
  if (bucketEnsured) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "spareparts")) {
      await supabase.storage.createBucket("spareparts", {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
      });
    }
    bucketEnsured = true;
  } catch (e) {
    console.warn("Notice: bucket check:", e.message);
  }
}

module.exports = {
  uploadImage: async (request, response) => {
    try {
      if (!request.file) {
        return wrapper.response(response, 400, "Tidak ada file gambar yang diunggah");
      }

      await ensureBucket();

      const file = request.file;
      const fileExt = path.extname(file.originalname) || ".jpg";
      const fileName = `sparepart_${Date.now()}_${Math.round(Math.random() * 1e6)}${fileExt}`;

      // Upload langsung ke Supabase Storage bucket 'spareparts'
      const { data, error } = await supabase.storage
        .from("spareparts")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Ambil Public URL gambar
      const { data: publicUrlData } = supabase.storage
        .from("spareparts")
        .getPublicUrl(fileName);

      return wrapper.response(response, 200, "Berhasil mengunggah gambar", {
        fileName,
        fileUrl: publicUrlData.publicUrl,
      });
    } catch (error) {
      console.error("Error upload ke Supabase Storage:", error);
      return wrapper.response(response, 500, "Gagal mengunggah foto ke Supabase Storage: " + (error.message || ""), error);
    }
  },
};
