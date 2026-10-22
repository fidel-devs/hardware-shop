CREATE DATABASE IF NOT EXISTS hardware_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hardware_shop;

CREATE TABLE IF NOT EXISTS products (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(150) NOT NULL,
 sku VARCHAR(50) NOT NULL UNIQUE,
 category VARCHAR(100) NOT NULL,
 supplier VARCHAR(150),
 purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
 selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
 quantity INT NOT NULL DEFAULT 0,
 low_stock_level INT NOT NULL DEFAULT 5,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CHECK (purchase_price >= 0), CHECK (selling_price >= 0),
 CHECK (quantity >= 0), CHECK (low_stock_level >= 0)
);

CREATE TABLE IF NOT EXISTS sales (
 id INT AUTO_INCREMENT PRIMARY KEY,
 receipt_number VARCHAR(50) NOT NULL UNIQUE,
 customer_name VARCHAR(150),
 customer_phone VARCHAR(30),
 total DECIMAL(12,2) NOT NULL,
 payment_method ENUM('cash','mpesa','bank','credit','other') NOT NULL DEFAULT 'cash',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
 id INT AUTO_INCREMENT PRIMARY KEY,
 sale_id INT NOT NULL,
 product_id INT NOT NULL,
 product_name VARCHAR(150) NOT NULL,
 sku VARCHAR(50) NOT NULL,
 quantity INT NOT NULL,
 unit_price DECIMAL(12,2) NOT NULL,
 line_total DECIMAL(12,2) NOT NULL,
 FOREIGN KEY (sale_id) REFERENCES sales(id),
 FOREIGN KEY (product_id) REFERENCES products(id),
 CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS stock_movements (
 id INT AUTO_INCREMENT PRIMARY KEY,
 product_id INT NOT NULL,
 movement_type ENUM('opening','purchase','sale','return','damage','adjustment') NOT NULL,
 quantity_change INT NOT NULL,
 note VARCHAR(255),
 reference_id INT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS customer_deposits (
 id INT AUTO_INCREMENT PRIMARY KEY,
 customer_name VARCHAR(150) NOT NULL,
 customer_phone VARCHAR(30),
 item_description VARCHAR(255) NOT NULL,
 agreed_amount DECIMAL(12,2) NOT NULL,
 amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
 status ENUM('active','collected','cancelled') NOT NULL DEFAULT 'active',
 notes TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CHECK (agreed_amount > 0), CHECK (amount_paid >= 0)
);

CREATE TABLE IF NOT EXISTS deposit_payments (
 id INT AUTO_INCREMENT PRIMARY KEY,
 deposit_id INT NOT NULL,
 amount DECIMAL(12,2) NOT NULL,
 payment_method ENUM('cash','mpesa','bank','other') NOT NULL DEFAULT 'cash',
 reference_code VARCHAR(100),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (deposit_id) REFERENCES customer_deposits(id),
 CHECK (amount > 0)
);
