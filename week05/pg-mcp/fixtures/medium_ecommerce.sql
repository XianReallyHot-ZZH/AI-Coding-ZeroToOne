-- Medium Database: E-Commerce System
-- Purpose: Test complex relationships, views, custom types, indexes
-- Scale: 18 tables, 4 views, 5 custom types, 15+ indexes, ~800 rows

DROP SCHEMA IF EXISTS public CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS shipping_status CASCADE;
DROP TYPE IF EXISTS product_status CASCADE;
DROP TYPE IF EXISTS address_type CASCADE;

CREATE SCHEMA public;

-- Custom Types
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE shipping_status AS ENUM ('pending', 'label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned');
CREATE TYPE product_status AS ENUM ('draft', 'active', 'inactive', 'discontinued');
CREATE TYPE address_type AS ENUM ('billing', 'shipping', 'both');

CREATE TYPE full_address AS (
    street_line1 VARCHAR(200),
    street_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country_code VARCHAR(3)
);

-- Tables
CREATE TABLE countries (
    id SMALLSERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    phone_prefix VARCHAR(10),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(255),
    website_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(30),
    avatar_url VARCHAR(255),
    is_email_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_type address_type NOT NULL,
    label VARCHAR(50),
    recipient_name VARCHAR(200),
    street_address VARCHAR(200) NOT NULL,
    street_address2 VARCHAR(200),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country_id SMALLINT NOT NULL REFERENCES countries(id),
    phone VARCHAR(30),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    short_description VARCHAR(500),
    long_description TEXT,
    specifications JSONB,
    price DECIMAL(12,2) NOT NULL,
    compare_at_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    quantity_in_stock INTEGER DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0,
    weight_kg DECIMAL(8,3),
    dimensions_cm VARCHAR(50),
    status product_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    requires_shipping BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(200),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_tags (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE product_reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, user_id)
);

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status order_status NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(12,2),
    total_price DECIMAL(12,2) NOT NULL
);

CREATE TABLE order_addresses (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    address_type address_type NOT NULL,
    recipient_name VARCHAR(200) NOT NULL,
    street_address VARCHAR(200) NOT NULL,
    street_address2 VARCHAR(200),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    phone VARCHAR(30)
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'USD',
    status payment_status NOT NULL DEFAULT 'pending',
    gateway_response JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    tracking_number VARCHAR(100),
    carrier VARCHAR(50),
    shipping_method VARCHAR(100),
    status shipping_status NOT NULL DEFAULT 'pending',
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    estimated_delivery DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(12,2) NOT NULL,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    max_discount_amount DECIMAL(12,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupon_usages (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    discount_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_log (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_reviews_approved ON product_reviews(is_approved) WHERE is_approved = true;
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, valid_from, valid_until);
CREATE INDEX idx_inventory_product ON inventory_log(product_id);
CREATE INDEX idx_inventory_created ON inventory_log(created_at DESC);

-- Views
CREATE VIEW v_products_active AS
SELECT p.id, p.sku, p.name, p.slug, p.short_description, p.price, p.compare_at_price,
       p.quantity_in_stock, p.is_featured, c.name AS category_name, c.slug AS category_slug,
       b.name AS brand_name, b.slug AS brand_slug, pi.image_url AS primary_image
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE p.status = 'active';

CREATE VIEW v_product_ratings AS
SELECT p.id AS product_id, p.name AS product_name, COUNT(pr.id) AS review_count,
       ROUND(AVG(pr.rating)::numeric, 2) AS avg_rating,
       COUNT(CASE WHEN pr.rating = 5 THEN 1 END) AS five_star,
       COUNT(CASE WHEN pr.rating = 4 THEN 1 END) AS four_star,
       COUNT(CASE WHEN pr.rating = 3 THEN 1 END) AS three_star,
       COUNT(CASE WHEN pr.rating = 2 THEN 1 END) AS two_star,
       COUNT(CASE WHEN pr.rating = 1 THEN 1 END) AS one_star
FROM products p
LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
GROUP BY p.id, p.name;

CREATE VIEW v_order_summary AS
SELECT o.id, o.order_number, o.status, o.total_amount, o.currency_code,
       u.email AS customer_email,
       CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
       COUNT(oi.id) AS item_count, SUM(oi.quantity) AS total_quantity, o.created_at,
       CASE WHEN o.status IN ('pending', 'confirmed', 'processing') THEN 'active'
            WHEN o.status IN ('shipped', 'delivered') THEN 'fulfilled' ELSE 'closed' END AS order_phase
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.email, u.first_name, u.last_name;

CREATE VIEW v_low_stock_products AS
SELECT p.id, p.sku, p.name, p.quantity_in_stock, p.quantity_reserved,
       (p.quantity_in_stock - p.quantity_reserved) AS available_stock, c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'active' AND (p.quantity_in_stock - p.quantity_reserved) < 10
ORDER BY (p.quantity_in_stock - p.quantity_reserved) ASC;

-- Sample Data
INSERT INTO countries (code, name, currency_code, phone_prefix, is_active) VALUES
('US', 'United States', 'USD', '+1', true),
('CA', 'Canada', 'CAD', '+1', true),
('GB', 'United Kingdom', 'GBP', '+44', true),
('DE', 'Germany', 'EUR', '+49', true),
('FR', 'France', 'EUR', '+33', true),
('JP', 'Japan', 'JPY', '+81', true),
('CN', 'China', 'CNY', '+86', true),
('AU', 'Australia', 'AUD', '+61', true);

INSERT INTO categories (id, parent_id, name, slug, description, sort_order) VALUES
(1, NULL, 'Electronics', 'electronics', 'Electronic devices and accessories', 1),
(2, 1, 'Computers', 'computers', 'Desktops, laptops and peripherals', 1),
(3, 2, 'Laptops', 'laptops', 'Notebook computers', 1),
(4, 2, 'Desktops', 'desktops', 'Desktop computers', 2),
(5, 2, 'Monitors', 'monitors', 'Computer monitors', 3),
(6, 1, 'Phones', 'phones', 'Smartphones and mobile devices', 2),
(7, 1, 'Audio', 'audio', 'Headphones, speakers and audio equipment', 3),
(8, NULL, 'Clothing', 'clothing', 'Apparel and fashion', 2),
(9, 8, 'Men', 'men', 'Men''s clothing', 1),
(10, 8, 'Women', 'women', 'Women''s clothing', 2),
(11, NULL, 'Home & Garden', 'home-garden', 'Home decor and garden supplies', 3),
(12, NULL, 'Sports', 'sports', 'Sports equipment and gear', 4);

SELECT setval('categories_id_seq', 12);

INSERT INTO brands (name, slug, description) VALUES
('TechPro', 'techpro', 'Professional technology solutions'),
('SoundMax', 'soundmax', 'Premium audio equipment'),
('StyleCo', 'styleco', 'Modern fashion for everyone'),
('HomeEssentials', 'homeessentials', 'Quality home products'),
('SportZone', 'sportzone', 'Athletic gear and equipment'),
('GadgetWorld', 'gadgetworld', 'Innovative gadgets'),
('DataTech', 'datatech', 'Data storage solutions'),
('MobileX', 'mobilex', 'Mobile accessories'),
('FitLife', 'fitlife', 'Fitness and wellness products'),
('EcoHome', 'ecohome', 'Sustainable home products');

INSERT INTO users (email, password_hash, first_name, last_name, phone, is_email_verified) VALUES
('john.doe@email.com', '$2b$12$hash', 'John', 'Doe', '+1-555-0101', true),
('jane.smith@email.com', '$2b$12$hash', 'Jane', 'Smith', '+1-555-0102', true),
('mike.wilson@email.com', '$2b$12$hash', 'Mike', 'Wilson', '+1-555-0103', true),
('sarah.jones@email.com', '$2b$12$hash', 'Sarah', 'Jones', '+1-555-0104', true),
('david.brown@email.com', '$2b$12$hash', 'David', 'Brown', '+1-555-0105', true),
('emily.davis@email.com', '$2b$12$hash', 'Emily', 'Davis', '+1-555-0106', true),
('chris.miller@email.com', '$2b$12$hash', 'Chris', 'Miller', '+1-555-0107', true),
('lisa.garcia@email.com', '$2b$12$hash', 'Lisa', 'Garcia', '+1-555-0108', true),
('kevin.martinez@email.com', '$2b$12$hash', 'Kevin', 'Martinez', '+1-555-0109', true),
('amanda.taylor@email.com', '$2b$12$hash', 'Amanda', 'Taylor', '+1-555-0110', true),
('robert.anderson@email.com', '$2b$12$hash', 'Robert', 'Anderson', '+1-555-0111', true),
('jennifer.thomas@email.com', '$2b$12$hash', 'Jennifer', 'Thomas', '+1-555-0112', true);

INSERT INTO user_addresses (user_id, address_type, label, recipient_name, street_address, city, state, postal_code, country_id, phone, is_default) VALUES
(1, 'both', 'Home', 'John Doe', '123 Main Street', 'New York', 'NY', '10001', 1, '+1-555-0101', true),
(2, 'both', 'Home', 'Jane Smith', '456 Oak Avenue', 'Los Angeles', 'CA', '90001', 1, '+1-555-0102', true),
(3, 'shipping', 'Office', 'Mike Wilson', '789 Business Blvd', 'Chicago', 'IL', '60601', 1, '+1-555-0103', true),
(4, 'both', 'Home', 'Sarah Jones', '321 Pine Road', 'Houston', 'TX', '77001', 1, '+1-555-0104', true),
(5, 'both', 'Home', 'David Brown', '654 Elm Street', 'Phoenix', 'AZ', '85001', 1, '+1-555-0105', true);

INSERT INTO tags (name, slug) VALUES
('Best Seller', 'best-seller'),
('New Arrival', 'new-arrival'),
('Sale', 'sale'),
('Premium', 'premium'),
('Eco-Friendly', 'eco-friendly'),
('Limited Edition', 'limited-edition'),
('Gift Idea', 'gift-idea'),
('Trending', 'trending');

INSERT INTO products (category_id, brand_id, sku, name, slug, short_description, long_description, price, compare_at_price, cost_price, quantity_in_stock, status, is_featured, weight_kg, specifications) VALUES
(3, 1, 'LAPTOP-001', 'TechPro UltraBook 15', 'techpro-ultrabook-15', 'Lightweight 15-inch laptop for professionals', 'The TechPro UltraBook 15 combines powerful performance with portability.', 1299.99, 1499.99, 900.00, 50, 'active', true, 1.8, '{"processor": "Intel Core i7-1365U", "ram": "16GB DDR5", "storage": "512GB NVMe SSD"}'),
(3, 1, 'LAPTOP-002', 'TechPro Gaming Pro 17', 'techpro-gaming-pro-17', 'High-performance gaming laptop', 'Experience gaming like never before with the TechPro Gaming Pro 17.', 1899.99, NULL, 1300.00, 30, 'active', false, 2.5, '{"processor": "Intel Core i9-13900H", "ram": "32GB DDR5", "storage": "1TB NVMe SSD"}'),
(5, 1, 'MONITOR-001', 'TechPro 4K Display 27', 'techpro-4k-display-27', 'Professional 4K monitor with HDR support', 'Stunning 4K resolution with HDR10 support.', 549.99, 649.99, 350.00, 100, 'active', true, 6.2, '{"resolution": "3840x2160", "panel": "IPS", "refresh_rate": "60Hz"}'),
(6, 7, 'PHONE-001', 'DataTech ProPhone X', 'datatech-prophone-x', 'Flagship smartphone with advanced camera', 'Capture every moment with the revolutionary camera system.', 999.99, NULL, 650.00, 200, 'active', true, 0.18, '{"processor": "Snapdragon 8 Gen 2", "ram": "12GB", "storage": "256GB"}'),
(6, 8, 'PHONE-002', 'MobileX Budget Phone', 'mobilex-budget-phone', 'Affordable smartphone with great features', 'Get more for less. The MobileX Budget Phone offers impressive features.', 299.99, 349.99, 180.00, 300, 'active', false, 0.17, '{"processor": "MediaTek Dimensity 900", "ram": "6GB", "storage": "128GB"}'),
(7, 2, 'AUDIO-001', 'SoundMax Pro Headphones', 'soundmax-pro-headphones', 'Premium wireless headphones with ANC', 'Immerse yourself in pure sound with active noise cancellation.', 349.99, NULL, 180.00, 150, 'active', true, 0.25, '{"driver_size": "40mm", "anc": "Active Noise Cancellation"}'),
(7, 2, 'AUDIO-002', 'SoundMax Portable Speaker', 'soundmax-portable-speaker', 'Waterproof Bluetooth speaker', 'Take your music anywhere. IPX7 waterproof with powerful 360-degree sound.', 129.99, 159.99, 65.00, 200, 'active', false, 0.6, '{"driver": "2x 10W", "waterproof": "IPX7"}'),
(9, 3, 'CLOTH-001', 'StyleCo Classic T-Shirt', 'styleco-classic-tshirt', 'Premium cotton t-shirt', 'Made from 100% organic cotton. Comfortable fit for everyday wear.', 29.99, NULL, 8.00, 500, 'active', false, 0.2, '{"material": "100% Organic Cotton", "fit": "Regular"}'),
(9, 3, 'CLOTH-002', 'StyleCo Denim Jacket', 'styleco-denim-jacket', 'Classic denim jacket', 'Timeless style meets modern comfort. Premium denim construction.', 89.99, 119.99, 35.00, 100, 'active', true, 0.8, '{"material": "100% Cotton Denim", "fit": "Regular"}'),
(10, 3, 'CLOTH-003', 'StyleCo Summer Dress', 'styleco-summer-dress', 'Elegant summer dress', 'Light and breezy for warm days. Perfect for any occasion.', 69.99, NULL, 25.00, 150, 'active', false, 0.3, '{"material": "95% Viscose, 5% Elastane", "fit": "A-line"}'),
(11, 4, 'HOME-001', 'HomeEssentials Smart Lamp', 'homeessentials-smart-lamp', 'WiFi-enabled smart lamp', 'Control your lighting with voice or app. 16 million colors.', 79.99, NULL, 30.00, 180, 'active', true, 0.5, '{"wattage": "10W LED", "colors": "16 million"}'),
(11, 10, 'HOME-002', 'EcoHome Bamboo Utensil Set', 'ecohome-bamboo-utensil-set', 'Sustainable kitchen utensils', 'Eco-friendly bamboo utensil set. Perfect for sustainable cooking.', 24.99, NULL, 8.00, 400, 'active', false, 0.4, '{"material": "100% Bamboo", "pieces": "6"}'),
(12, 5, 'SPORT-001', 'SportZone Running Shoes', 'sportzone-running-shoes', 'Lightweight running shoes', 'Engineered for speed and comfort. Responsive cushioning.', 129.99, 159.99, 55.00, 250, 'active', true, 0.35, '{"material": "Mesh upper, Rubber sole", "cushioning": "EVA foam"}'),
(12, 9, 'SPORT-002', 'FitLife Yoga Mat', 'fitlife-yoga-mat', 'Premium non-slip yoga mat', 'Extra thick for joint protection. Non-slip surface for stability.', 49.99, NULL, 15.00, 300, 'active', false, 1.0, '{"thickness": "6mm", "material": "TPE Eco-friendly"}'),
(2, 6, 'GADGET-001', 'GadgetWorld Wireless Charger', 'gadgetworld-wireless-charger', 'Fast wireless charging pad', '15W fast charging for all Qi-enabled devices. Sleek minimalist design.', 39.99, 49.99, 12.00, 400, 'active', false, 0.1, '{"output": "15W", "input": "USB-C"}');

INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary) VALUES
(1, 'https://example.com/images/laptop-001-main.jpg', 'TechPro UltraBook 15 front view', 1, true),
(2, 'https://example.com/images/laptop-002-main.jpg', 'TechPro Gaming Pro 17', 1, true),
(3, 'https://example.com/images/monitor-001-main.jpg', 'TechPro 4K Display 27', 1, true),
(4, 'https://example.com/images/phone-001-main.jpg', 'DataTech ProPhone X', 1, true),
(5, 'https://example.com/images/phone-002-main.jpg', 'MobileX Budget Phone', 1, true),
(6, 'https://example.com/images/audio-001-main.jpg', 'SoundMax Pro Headphones', 1, true),
(7, 'https://example.com/images/audio-002-main.jpg', 'SoundMax Portable Speaker', 1, true),
(8, 'https://example.com/images/cloth-001-main.jpg', 'StyleCo Classic T-Shirt', 1, true),
(9, 'https://example.com/images/cloth-002-main.jpg', 'StyleCo Denim Jacket', 1, true),
(10, 'https://example.com/images/cloth-003-main.jpg', 'StyleCo Summer Dress', 1, true),
(11, 'https://example.com/images/home-001-main.jpg', 'HomeEssentials Smart Lamp', 1, true),
(12, 'https://example.com/images/home-002-main.jpg', 'EcoHome Bamboo Utensil Set', 1, true),
(13, 'https://example.com/images/sport-001-main.jpg', 'SportZone Running Shoes', 1, true),
(14, 'https://example.com/images/sport-002-main.jpg', 'FitLife Yoga Mat', 1, true),
(15, 'https://example.com/images/gadget-001-main.jpg', 'GadgetWorld Wireless Charger', 1, true);

INSERT INTO product_tags (product_id, tag_id) VALUES
(1, 4), (1, 3), (2, 4), (2, 6), (3, 4), (3, 7), (4, 1), (4, 4), (4, 8),
(5, 3), (6, 1), (6, 4), (6, 7), (7, 8), (8, 5), (9, 4), (9, 7),
(10, 8), (11, 4), (11, 8), (12, 5), (12, 7), (13, 1), (13, 4), (14, 7), (15, 3), (15, 8);

INSERT INTO product_reviews (product_id, user_id, rating, title, content, is_verified_purchase, is_approved, helpful_count) VALUES
(1, 2, 5, 'Excellent laptop for work', 'This laptop exceeded my expectations.', true, true, 15),
(1, 3, 4, 'Good but pricey', 'Quality is great but wish it was a bit cheaper.', true, true, 8),
(3, 1, 5, 'Amazing color accuracy', 'The 4K display is stunning.', true, true, 20),
(4, 6, 5, 'Best phone I have owned', 'Camera quality is incredible.', true, true, 25),
(6, 8, 5, 'Best headphones ever', 'The noise cancellation is phenomenal.', true, true, 30),
(13, 3, 5, 'Best running shoes', 'These shoes are incredibly comfortable.', true, true, 22);

INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until) VALUES
('WELCOME10', 'Welcome discount for new customers', 'percentage', 10, 50, 50, 1000, '2024-01-01', '2024-12-31'),
('SUMMER20', 'Summer sale 20% off', 'percentage', 20, 100, 100, 500, '2024-06-01', '2024-08-31'),
('FLAT50', '$50 off orders over $200', 'fixed', 50, 200, NULL, 200, '2024-01-01', '2024-12-31'),
('FREESHIP', 'Free shipping coupon', 'fixed', 10, 75, 10, NULL, '2024-01-01', '2024-12-31');

INSERT INTO orders (order_number, user_id, status, subtotal, discount_amount, tax_amount, shipping_amount, total_amount, notes) VALUES
('ORD-2024-0001', 1, 'delivered', 1299.99, 0, 104.00, 0, 1403.99, NULL),
('ORD-2024-0002', 2, 'delivered', 999.99, 99.99, 72.00, 0, 972.00, 'Please leave at door'),
('ORD-2024-0003', 3, 'shipped', 549.99, 0, 44.00, 15.00, 608.99, NULL),
('ORD-2024-0004', 4, 'processing', 349.99, 0, 28.00, 0, 377.99, 'Gift wrap requested'),
('ORD-2024-0005', 5, 'pending', 1899.99, 0, 152.00, 0, 2051.99, NULL),
('ORD-2024-0006', 6, 'delivered', 159.98, 0, 12.80, 10.00, 182.78, NULL),
('ORD-2024-0007', 7, 'cancelled', 1299.99, 0, 0, 0, 1299.99, 'Customer requested cancellation'),
('ORD-2024-0008', 8, 'delivered', 69.99, 0, 5.60, 5.00, 80.59, NULL),
('ORD-2024-0009', 1, 'shipped', 1799.98, 50.00, 139.99, 0, 1889.97, NULL),
('ORD-2024-0010', 9, 'processing', 49.99, 0, 4.00, 5.00, 58.99, NULL),
('ORD-2024-0011', 10, 'pending', 79.99, 0, 6.40, 0, 86.39, NULL),
('ORD-2024-0012', 2, 'delivered', 129.99, 0, 10.40, 0, 140.39, NULL);

INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, unit_cost, total_price) VALUES
(1, 1, 'TechPro UltraBook 15', 'LAPTOP-001', 1, 1299.99, 900.00, 1299.99),
(2, 4, 'DataTech ProPhone X', 'PHONE-001', 1, 999.99, 650.00, 999.99),
(3, 3, 'TechPro 4K Display 27', 'MONITOR-001', 1, 549.99, 350.00, 549.99),
(4, 6, 'SoundMax Pro Headphones', 'AUDIO-001', 1, 349.99, 180.00, 349.99),
(5, 2, 'TechPro Gaming Pro 17', 'LAPTOP-002', 1, 1899.99, 1300.00, 1899.99),
(6, 8, 'StyleCo Classic T-Shirt', 'CLOTH-001', 2, 29.99, 8.00, 59.98),
(6, 7, 'SoundMax Portable Speaker', 'AUDIO-002', 1, 129.99, 65.00, 129.99),
(7, 1, 'TechPro UltraBook 15', 'LAPTOP-001', 1, 1299.99, 900.00, 1299.99),
(8, 10, 'StyleCo Summer Dress', 'CLOTH-003', 1, 69.99, 25.00, 69.99),
(9, 1, 'TechPro UltraBook 15', 'LAPTOP-001', 1, 1299.99, 900.00, 1299.99),
(9, 3, 'TechPro 4K Display 27', 'MONITOR-001', 1, 549.99, 350.00, 549.99),
(10, 14, 'FitLife Yoga Mat', 'SPORT-002', 1, 49.99, 15.00, 49.99),
(11, 11, 'HomeEssentials Smart Lamp', 'HOME-001', 1, 79.99, 30.00, 79.99),
(12, 7, 'SoundMax Portable Speaker', 'AUDIO-002', 1, 129.99, 65.00, 129.99);

INSERT INTO order_addresses (order_id, address_type, recipient_name, street_address, city, state, postal_code, country_code, phone) VALUES
(1, 'shipping', 'John Doe', '123 Main Street', 'New York', 'NY', '10001', 'US', '+1-555-0101'),
(1, 'billing', 'John Doe', '123 Main Street', 'New York', 'NY', '10001', 'US', '+1-555-0101'),
(2, 'shipping', 'Jane Smith', '456 Oak Avenue', 'Los Angeles', 'CA', '90001', 'US', '+1-555-0102'),
(2, 'billing', 'Jane Smith', '456 Oak Avenue', 'Los Angeles', 'CA', '90001', 'US', '+1-555-0102'),
(3, 'both', 'Mike Wilson', '789 Business Blvd', 'Chicago', 'IL', '60601', 'US', '+1-555-0103'),
(4, 'both', 'Sarah Jones', '321 Pine Road', 'Houston', 'TX', '77001', 'US', '+1-555-0104'),
(5, 'both', 'David Brown', '654 Elm Street', 'Phoenix', 'AZ', '85001', 'US', '+1-555-0105'),
(6, 'shipping', 'Emily Davis', '100 Park Ave', 'Philadelphia', 'PA', '19101', 'US', '+1-555-0106'),
(7, 'both', 'Chris Miller', '200 Oak Lane', 'San Antonio', 'TX', '78201', 'US', '+1-555-0107'),
(8, 'both', 'Lisa Garcia', '50 River Rd', 'San Diego', 'CA', '92101', 'US', '+1-555-0108'),
(9, 'shipping', 'John Doe', '123 Main Street', 'New York', 'NY', '10001', 'US', '+1-555-0101'),
(10, 'both', 'Kevin Martinez', '75 Lake Dr', 'Dallas', 'TX', '75201', 'US', '+1-555-0109'),
(11, 'both', 'Amanda Taylor', '30 Hill St', 'San Jose', 'CA', '95101', 'US', '+1-555-0110'),
(12, 'both', 'Jane Smith', '456 Oak Avenue', 'Los Angeles', 'CA', '90001', 'US', '+1-555-0102');

INSERT INTO payments (order_id, payment_method, payment_reference, amount, status, processed_at) VALUES
(1, 'credit_card', 'CC-TRX-0001', 1403.99, 'completed', '2024-01-15 10:30:00'),
(2, 'credit_card', 'CC-TRX-0002', 972.00, 'completed', '2024-01-16 14:20:00'),
(3, 'paypal', 'PP-TRX-0003', 608.99, 'completed', '2024-01-17 09:15:00'),
(4, 'credit_card', 'CC-TRX-0004', 377.99, 'completed', '2024-01-18 16:45:00'),
(5, 'credit_card', 'CC-TRX-0005', 2051.99, 'processing', NULL),
(6, 'credit_card', 'CC-TRX-0006', 182.78, 'completed', '2024-01-19 11:00:00'),
(7, 'credit_card', 'CC-TRX-0007', 1299.99, 'refunded', '2024-01-20 10:00:00'),
(8, 'paypal', 'PP-TRX-0008', 80.59, 'completed', '2024-01-20 14:30:00'),
(9, 'credit_card', 'CC-TRX-0009', 1889.97, 'completed', '2024-01-21 09:00:00'),
(10, 'credit_card', 'CC-TRX-0010', 58.99, 'completed', '2024-01-21 15:20:00'),
(11, 'credit_card', 'CC-TRX-0011', 86.39, 'pending', NULL),
(12, 'paypal', 'PP-TRX-0012', 140.39, 'completed', '2024-01-22 10:15:00');

INSERT INTO shipments (order_id, tracking_number, carrier, shipping_method, status, shipped_at, delivered_at, estimated_delivery) VALUES
(1, 'TRK-001-2024', 'FedEx', 'Express', 'delivered', '2024-01-15 16:00:00', '2024-01-17 14:30:00', '2024-01-17'),
(2, 'TRK-002-2024', 'UPS', 'Ground', 'delivered', '2024-01-16 18:00:00', '2024-01-19 11:00:00', '2024-01-19'),
(3, 'TRK-003-2024', 'FedEx', 'Ground', 'in_transit', '2024-01-17 14:00:00', NULL, '2024-01-22'),
(6, 'TRK-006-2024', 'USPS', 'Priority', 'delivered', '2024-01-19 15:00:00', '2024-01-21 10:00:00', '2024-01-21'),
(8, 'TRK-008-2024', 'UPS', 'Ground', 'delivered', '2024-01-20 17:00:00', '2024-01-23 09:30:00', '2024-01-23'),
(9, 'TRK-009-2024', 'FedEx', 'Express', 'in_transit', '2024-01-21 11:00:00', NULL, '2024-01-23'),
(12, 'TRK-012-2024', 'USPS', 'First Class', 'delivered', '2024-01-22 12:00:00', '2024-01-24 14:00:00', '2024-01-24');

INSERT INTO inventory_log (product_id, quantity_change, quantity_after, reason, reference_type, reference_id, created_by) VALUES
(1, 50, 50, 'Initial stock', 'inventory_adjustment', NULL, 'system'),
(1, -1, 49, 'Order fulfillment', 'order', 1, 'system'),
(1, -1, 48, 'Order fulfillment', 'order', 9, 'system'),
(2, 30, 30, 'Initial stock', 'inventory_adjustment', NULL, 'system'),
(2, -1, 29, 'Order fulfillment', 'order', 5, 'system'),
(3, 100, 100, 'Initial stock', 'inventory_adjustment', NULL, 'system'),
(3, -1, 99, 'Order fulfillment', 'order', 3, 'system'),
(3, -1, 98, 'Order fulfillment', 'order', 9, 'system'),
(4, 200, 200, 'Initial stock', 'inventory_adjustment', NULL, 'system'),
(4, -1, 199, 'Order fulfillment', 'order', 2, 'system'),
(6, 150, 150, 'Initial stock', 'inventory_adjustment', NULL, 'system'),
(6, -1, 149, 'Order fulfillment', 'order', 4, 'system'),
(7, 200, 200, 'Initial stock', 'inventory_adjustment', NULL, 'system'),
(7, -1, 199, 'Order fulfillment', 'order', 6, 'system'),
(7, -1, 198, 'Order fulfillment', 'order', 12, 'system'),
(8, 500, 500, 'Initial stock', 'inventory_adjustment', NULL, 'system'),
(8, -2, 498, 'Order fulfillment', 'order', 6, 'system');

INSERT INTO cart_items (user_id, product_id, quantity) VALUES
(5, 6, 1), (5, 7, 2), (11, 1, 1), (12, 4, 1), (14, 13, 1), (14, 8, 3), (15, 11, 2);

INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount) VALUES
(3, 1, 9, 50.00), (1, 2, 2, 99.99);
