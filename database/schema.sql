-- ====================================================================
-- SKEMA DATABASE: MONESCA MOTOR (POS & STOK GUDANG SPAREPART)
-- Database: PostgreSQL (Supabase)
-- ====================================================================

-- 1. RESET TABEL LAMA (Agar skema bersih dan kolom baru terpasang sempurna)
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS store_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 3. TABEL PENGGUNA & HAK AKSES (USERS)
-- ====================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- bcrypt hash
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'KASIR', -- 'SUPER_ADMIN' atau 'KASIR'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Akun Super Admin Awal (Username: admin | Password: admin123)
INSERT INTO users (username, password, name, role) VALUES
('admin', '$2b$10$vrDyMJxOCIaZL4COZv/LWusIEMc/6EwZqCftxuniiRcAPKd5W4IRC', 'Owner Monesca Motor', 'SUPER_ADMIN');

-- ====================================================================
-- 4. TABEL MERK MOTOR (BRANDS)
-- ====================================================================
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Data Merk Motor
INSERT INTO brands (name, description) VALUES
('Honda', 'Sparepart untuk motor Honda'),
('Yamaha', 'Sparepart untuk motor Yamaha'),
('Kawasaki', 'Sparepart untuk motor Kawasaki'),
('Suzuki', 'Sparepart untuk motor Suzuki'),
('Universal', 'Sparepart umum / bisa untuk semua jenis motor');

-- ====================================================================
-- 5. TABEL KATEGORI SPAREPART (CATEGORIES)
-- ====================================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Data Kategori Komponen
INSERT INTO categories (name, description) VALUES
('Oli & Pelumas', 'Oli mesin, oli gardan, minyak rem, radiator coolant'),
('Pengereman', 'Kampas rem depan/belakang, piringan cakram, master rem'),
('Transmisi & CVT', 'V-belt, roller, kampas ganda, rantai & gir set'),
('Mesin', 'Piston, ring piston, klep, paking mesin, karburator/injeksi'),
('Kelistrikan & Busi', 'Aki/baterai, busi, bohlam lampu, kiprok, CDI/ECU'),
('Rangka & Bodi', 'Spion, shockbreaker, stang, spakbor, cover bodi'),
('Ban & Roda', 'Ban luar, ban dalam, velg, bearing roda, jari-jari'),
('Aksesoris & Baut', 'Baut, mur, handgrip, aksesoris variasi'),
('Jasa & Servis', 'Biaya pasang part, servis ringan, servis CVT, ganti oli');

-- ====================================================================
-- 6. TABEL DATA BARANG & JASA SERVIS (PRODUCTS)
-- ====================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE, -- Kode part manual (opsional)
    name VARCHAR(255) NOT NULL, -- Nama barang / jasa
    brand_id INT REFERENCES brands(id) ON DELETE SET NULL, -- Merk motor
    category_id INT REFERENCES categories(id) ON DELETE SET NULL, -- Kategori
    motor_compatibility TEXT, -- Contoh: "Vario 125, Vario 150, Beat FI, Scoopy"
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Modal beli
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Harga jual ke konsumen
    stock INT NOT NULL DEFAULT 0, -- Stok fisik barang
    min_stock INT NOT NULL DEFAULT 3, -- Peringatan stok menipis
    rack_location VARCHAR(50), -- Lokasi rak gudang
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs', -- Satuan (pcs, botol, set, paket)
    image_url TEXT, -- Link foto di Supabase Storage
    is_service BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE jika JASA SERVIS (TIDAK POTONG STOK)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian cepat kasir tanpa barcode
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('indonesian', name));
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_service ON products(is_service);
CREATE INDEX idx_products_active ON products(is_active);

-- Seed Data Jasa Servis Populer Awal (is_service = TRUE)
INSERT INTO products (name, category_id, cost_price, selling_price, stock, unit, is_service) VALUES
('Jasa Ganti Oli', 9, 0, 10000, 0, 'jasa', TRUE),
('Jasa Servis CVT & Ganti Roller', 9, 0, 35000, 0, 'jasa', TRUE),
('Jasa Tune Up / Servis Ringan', 9, 0, 45000, 0, 'jasa', TRUE),
('Jasa Pasang Kampas Rem', 9, 0, 15000, 0, 'jasa', TRUE),
('Jasa Bongkar Pasang Ban', 9, 0, 15000, 0, 'jasa', TRUE);

-- ====================================================================
-- 7. TABEL RIWAYAT MUTASI STOK (STOCK_MOVEMENTS)
-- ====================================================================
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'IN' (kulakan), 'OUT' (penjualan kasir), 'ADJUSTMENT' (koreksi manual)
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    current_stock INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);

-- ====================================================================
-- 8. TABEL TRANSAKSI PENJUALAN & SERVIS (TRANSACTIONS)
-- ====================================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Format: INV-YYYYMMDD-XXXX
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Kasir yang melayani
    cashier_name VARCHAR(100),
    customer_name VARCHAR(100) DEFAULT 'Pelanggan Umum',
    customer_phone VARCHAR(50),
    vehicle_plate VARCHAR(20), -- Plat Nomor motor pelanggan (misal: "B 1234 XYZ")
    vehicle_model VARCHAR(100), -- Tipe motor pelanggan (misal: "Beat ESP 2021")
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH', -- 'CASH', 'TRANSFER', 'QRIS', 'TEMPO'
    cash_given NUMERIC(12, 2) DEFAULT 0,
    change_due NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_invoice ON transactions(invoice_number);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ====================================================================
-- 9. TABEL DETAIL BARANG & JASA TERJUAL (TRANSACTION_ITEMS)
-- ====================================================================
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(100),
    is_service BOOLEAN NOT NULL DEFAULT FALSE,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_transaction ON transaction_items(transaction_id);

-- ====================================================================
-- 10. TABEL PROFIL TOKO (STORE_SETTINGS) - UNTUK CETAK STRUK BLUETOOTH
-- ====================================================================
CREATE TABLE store_settings (
    id INT PRIMARY KEY DEFAULT 1,
    store_name VARCHAR(100) NOT NULL DEFAULT 'MONESCA MOTOR',
    tagline VARCHAR(150) DEFAULT 'Pusat Sparepart & Servis Motor',
    address TEXT DEFAULT 'Jl. Raya Motor No. 123',
    phone VARCHAR(50) DEFAULT '0812-3456-7890',
    receipt_footer TEXT DEFAULT 'Terima kasih atas kunjungan Anda!\nGaransi servis 3 hari.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Data Toko
INSERT INTO store_settings (id, store_name, tagline, address, phone)
VALUES (1, 'MONESCA MOTOR', 'Sparepart Motor & Servis', 'Jl. Raya Utama Bengkel', '0812-xxxx-xxxx');

-- ====================================================================
-- 11. TRIGGER UPDATED_AT
-- ====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
