-- BorrowBox schema
-- Run with: psql -U <user> -d borrowbox -f schema.sql

DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS condition_logs CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(160) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    phone           VARCHAR(30),
    area            VARCHAR(120),
    role            VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. CATEGORIES
CREATE TABLE categories (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(80) NOT NULL UNIQUE
);

-- 3. ITEMS
CREATE TABLE items (
    id              SERIAL PRIMARY KEY,
    owner_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     INT NOT NULL REFERENCES categories(id),
    title           VARCHAR(160) NOT NULL,
    description     TEXT,
    condition       VARCHAR(10) NOT NULL DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair')),
    max_days        INT NOT NULL CHECK (max_days > 0),
    pickup_area     VARCHAR(120),
    image_url       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_owner ON items(owner_id);

-- 4. BOOKINGS
CREATE TABLE bookings (
    id              SERIAL PRIMARY KEY,
    item_id         INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    borrower_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(12) NOT NULL DEFAULT 'REQUESTED'
                    CHECK (status IN ('REQUESTED','APPROVED','REJECTED','CANCELLED','PICKED_UP','RETURNED')),
    message         TEXT,
    reject_reason   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);
CREATE INDEX idx_bookings_item_status ON bookings(item_id, status);
CREATE INDEX idx_bookings_borrower ON bookings(borrower_id);

-- 5. CONDITION LOGS
CREATE TABLE condition_logs (
    id          SERIAL PRIMARY KEY,
    booking_id  INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    stage       VARCHAR(10) NOT NULL CHECK (stage IN ('handover', 'return')),
    condition   VARCHAR(10) NOT NULL CHECK (condition IN ('new', 'good', 'fair', 'damaged')),
    note        TEXT,
    logged_by   INT NOT NULL REFERENCES users(id),
    logged_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (booking_id, stage)
);

-- 6. REVIEWS
CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    booking_id  INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL REFERENCES users(id),
    reviewee_id INT NOT NULL REFERENCES users(id),
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (booking_id, reviewer_id)
);

-- Trigger to keep bookings.updated_at current
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
