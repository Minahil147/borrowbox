-- BorrowBox seed data
-- Run AFTER schema.sql
-- Passwords below are all bcrypt hashes of "password123"

INSERT INTO users (name, email, password_hash, phone, area, role, is_active) VALUES
('Admin User',  'admin@borrowbox.app', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8g6b/rSJ.Xqhx1n4Q1eqW1e2N9wYyG', '0300-0000000', 'Head Office', 'admin',  true),
('Ali Raza',    'ali@example.com',     '$2b$10$CwTycUXWue0Thq9StjUM0uJ8g6b/rSJ.Xqhx1n4Q1eqW1e2N9wYyG', '0301-1111111', 'Block B',     'member', true),
('Sara Khan',   'sara@example.com',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8g6b/rSJ.Xqhx1n4Q1eqW1e2N9wYyG', '0302-2222222', 'Block C',     'member', true),
('Bilal Ahmed', 'bilal@example.com',   '$2b$10$CwTycUXWue0Thq9StjUM0uJ8g6b/rSJ.Xqhx1n4Q1eqW1e2N9wYyG', '0303-3333333', 'Block A',     'member', true);

INSERT INTO categories (name) VALUES
('Power Tools'), ('Home & Garden'), ('Electronics'), ('Kitchen'), ('Sports & Outdoor');

INSERT INTO items (owner_id, category_id, title, description, condition, max_days, pickup_area, is_active) VALUES
(2, 1, 'Cordless Drill 18V', '18V cordless drill with two batteries, charger and a set of bits. Return charged and clean.', 'good', 5, 'Block B', true),
(2, 2, 'Extension Ladder', '3.5m aluminium extension ladder, lightweight.', 'good', 3, 'Block B', true),
(3, 3, 'HD Projector', '1080p home projector with HDMI cable and remote.', 'new', 7, 'Block C', true),
(3, 3, 'DSLR Camera Kit', 'Entry-level DSLR with 18-55mm lens and extra battery.', 'good', 4, 'Block C', true),
(4, 5, 'Camping Tent (4P)', '4-person waterproof tent, easy setup.', 'fair', 6, 'Block A', true),
(4, 3, 'Bluetooth Speaker', 'Portable speaker, 10h battery life.', 'good', 3, 'Block A', true);

-- A sample completed booking so reviews/condition_logs have example data
INSERT INTO bookings (item_id, borrower_id, start_date, end_date, status, message)
VALUES (1, 3, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days', 'RETURNED', 'Need it for a shelf install.');

INSERT INTO condition_logs (booking_id, stage, condition, note, logged_by)
VALUES
(1, 'handover', 'good', 'No visible damage at pickup.', 2),
(1, 'return',   'good', 'Returned clean, works fine.', 2);

INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment)
VALUES
(1, 2, 3, 5, 'Great borrower, returned on time and in good condition.'),
(1, 3, 2, 5, 'Ali was very helpful, drill worked perfectly.');
