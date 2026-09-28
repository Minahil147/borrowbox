# BorrowBox

**Community Tool & Equipment Lending Platform** — built for the U Devs Internship Batch 6 Full Stack FYP brief.

Members list items they're willing to lend. Other members search, check date-wise availability, and send a
borrow request. The owner approves it, the handover and return are recorded with the item's condition, and
both sides rate each other so trust builds over time.

## Tech stack

- **PostgreSQL** — 6 related tables, constraints, a date-overlap query, transactions
- **Express.js** — REST API, JWT auth, role-based access, validation
- **React** (Vite) — routing, protected pages, forms, Axios API integration
- **Node.js**

## Features

- Authentication & profiles with bcrypt + JWT
- Item listing with full CRUD, browse/search/filter/pagination
- Booking engine with date-overlap prevention and a status state machine
  (`REQUESTED → APPROVED → PICKED_UP → RETURNED`, plus `REJECTED` / `CANCELLED`)
- Condition check-in/check-out logs at handover and return
- Two-way reviews and a trust score (average rating) per user
- Dashboard: My Items · My Borrowings · Incoming Requests
- Admin panel: users, categories, platform statistics

## Project structure

```
borrowbox/
├── client/              React app (Vite)
│   └── src/
│       ├── api/         Axios instance with JWT interceptor
│       ├── components/  Navbar, ItemCard, StatusBadge, Toast
│       ├── context/     AuthContext
│       ├── pages/       Home, ItemDetail, Login, Register, Dashboard, ItemForm, Profile, Admin
│       └── routes/      ProtectedRoute, AdminRoute
├── server/
│   └── src/
│       ├── config/      db.js (pg Pool)
│       ├── controllers/ auth, users, items, categories, bookings, reviews, admin
│       ├── middleware/  auth.js, role.js, validate.js, errorHandler.js
│       ├── routes/      one file per module
│       ├── services/    bookingService.js — business rules + status transitions
│       └── db/          schema.sql, seed.sql
└── README.md
```

## Setup

### 1. Database

Create a PostgreSQL database, then run the schema and seed scripts:

```bash
createdb borrowbox
psql -d borrowbox -f server/src/db/schema.sql
psql -d borrowbox -f server/src/db/seed.sql
```

Seed data includes an admin account and three sample members, all with password `password123`:

| Email | Role |
|---|---|
| admin@borrowbox.app | admin |
| ali@example.com | member |
| sara@example.com | member |
| bilal@example.com | member |

### 2. Backend

```bash
cd server
cp .env.example .env      # then edit DATABASE_URL and JWT_SECRET
npm install
npm run dev                # http://localhost:5000
```

### 3. Frontend

```bash
cd client
cp .env.example .env      # VITE_API_URL should point at the backend above
npm install
npm run dev                # http://localhost:5173
```

Open http://localhost:5173 in your browser.

## Business rules enforced

1. A member cannot borrow their own item.
2. `start_date` must not be in the past; `end_date ≥ start_date`.
3. Borrow duration must not exceed the item's `max_days`.
4. Requested dates must not overlap any `APPROVED`/`PICKED_UP` booking of the same item (the
   date-overlap SQL query lives in `bookingService.js`).
5. Only active items owned by active users can be requested.
6. A borrower may have at most 3 open bookings at a time.
7. Only the item owner can approve/reject/pickup/return; only the borrower can cancel.
8. Status can only move through the allowed transitions — invalid moves return `409 Conflict`.
9. Approving a booking auto-rejects other overlapping `REQUESTED` bookings on that item, all inside
   one database transaction.
10. Reviews only open after `RETURNED`, one per person per booking, rating 1–5.
11. An item with open bookings cannot be deleted; one with booking history is only deactivated.
12. A booking can be edited only while `REQUESTED`, deleted only when `REJECTED`/`CANCELLED`.
13. Only the review's author (or an admin) can edit/delete it; only the account owner can edit/delete
    their own profile.

## API overview

All endpoints are under `/api`. See `server/src/routes/` for the full list. Response shape:
`{ success, data, message }`. Errors use `400` (validation), `401` (not logged in), `403` (not allowed),
`404` (not found), `409` (date overlap or invalid status change).

## Notes

- Out of scope per the brief: payment gateway, live chat/sockets, maps/GPS, mobile app, AI features.
- All SQL uses parameterised queries (`$1, $2, …`) — never string concatenation.
- This is a learning project built against the U Devs FYP brief (Section 04–10); see the brief PDF for
  the full specification, mockups, and evaluation criteria.
