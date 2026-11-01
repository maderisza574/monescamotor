import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // agar bisa diakses dari HP / device lain di jaringan Wi-Fi yang sama
  },
});
