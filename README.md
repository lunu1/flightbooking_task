# Flight Booking System — Backend

A MERN-stack flight booking API with JWT auth, role-based access control, Stripe payments, and concurrency-safe seat inventory management.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** PostgreSQL (raw `pg`, no ORM)
- **Auth:** JWT (access + refresh token rotation)
- **Payments:** Stripe (Checkout Sessions + Webhooks)
- **Dev tooling:** `tsx` for hot reload

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```properties
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgres://<user>:<password>@localhost:5432/flight_booking

# JWT secrets — use different values for access and refresh
ACCESS_TOKEN_SECRET=<your-access-secret>
REFRESH_TOKEN_SECRET=<your-refresh-secret>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from `stripe listen` during local dev

# Frontend origin (for Stripe redirect URLs)
FRONTEND_URL=http://localhost:5173
```

### 3. Database setup

Run the schema file against your Postgres database:

```bash
psql -d flight_booking -f src/config/schema.sql
```

Seed mock flight data:

```bash
npx tsx src/scripts/seedFlights.ts
```

### 4. Run the server

```bash
npm run dev
```

Server runs on `http://localhost:4000` (or your configured `PORT`).

### 5. Stripe webhooks (local dev)

Stripe can't reach `localhost` directly, so use the Stripe CLI to forward events:

```bash
stripe login
stripe listen --forward-to localhost:4000/webhooks/stripe
```

Copy the printed `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET` in `.env` and restart the server.

## Architecture

**Layering:** Routes → Controllers → Services → Models, consistently across every domain (auth, flights, bookings, admin).

- **Models** — raw SQL queries only, no business logic. The only layer that talks to Postgres directly.
- **Services** — business logic, validation, orchestration. Controllers never call models directly.
- **Controllers** — thin HTTP layer: pull from `req`, call a service, send a response. No business logic.
- **Routes** — wiring only (path + method → controller, plus middleware chain).

This keeps the flight/booking data layer swappable — replacing Postgres with another data source later would only require changes in the models layer.

## Key Design Decisions

### Token strategy (access + refresh)

- **Access token:** 15 min expiry, returned in the JSON response body, kept in memory on the frontend (not localStorage). Short lifespan limits the damage window if it's ever exposed.
- **Refresh token:** 7 day expiry, stored in an `httpOnly`, `secure` (in production), `sameSite`-scoped cookie, restricted to the `/auth` path. Never readable by client-side JS, which protects it from XSS.
- **Rotation:** every refresh issues a brand new refresh token and invalidates the old one (checked against a single stored value per user in the `users.refresh_token` column). If a stolen token is ever used, the legitimate user's next refresh will fail — an implicit signal of compromise, and it limits an attacker's window to a single refresh cycle rather than the full 7-day lifetime.
- **Logout:** sets `refresh_token` to `NULL` in the database (not just clearing the cookie client-side), so a captured token can't be replayed after logout.

### Concurrency handling (seat inventory)

Booking creation and cancellation both wrap seat updates in a Postgres transaction using `SELECT ... FOR UPDATE` to lock the flight row for the duration of the transaction. This serializes concurrent booking attempts on the same flight — a second request has to wait for the first transaction to commit or roll back before it can read the row, preventing overbooking (e.g. two users both reading `seats_available = 1` and both succeeding).

### Payment flow

- Booking is created in `pending` status and seats are decremented immediately (optimistic hold).
- A Stripe Checkout Session is created for the booking; `bookingId` is attached as metadata on both the session and the underlying PaymentIntent (the latter is required separately, since PaymentIntent metadata doesn't automatically inherit from the session).
- `checkout.session.completed` webhook → booking marked `confirmed`.
- `payment_intent.payment_failed` / `checkout.session.expired` webhook → booking marked `failed`, seats released back to inventory.
- Booking status transitions guard against double-processing (only a `pending` booking can transition on webhook events).

### Cancellation policy

- Users can cancel their own **confirmed** bookings up to **24 hours** before departure. Outside that window, cancellation is rejected.
- Admins can cancel any booking regardless of the time window.
- Cancellation triggers a Stripe refund against the stored PaymentIntent, releases seats back to the flight, and marks the booking `cancelled` — all within a transaction.

### Role-based access control

- `authenticate` middleware verifies the JWT and attaches `{ userId, role }` to `req.user`.
- `authorize(...roles)` middleware checks `req.user.role` against an allowed list.
- Role is embedded in the access token payload at login, avoiding a DB lookup on every request. Trade-off: a role change in the database won't take effect until the user's current access token expires (≤15 min) and they refresh — acceptable given the short token lifetime.
- Public registration never accepts a `role` field from the request body — all new accounts default to `user` at the database level. Admin accounts are provisioned manually.

### Query efficiency

- Search and listing endpoints (`/flights/search`, `/admin/bookings`, `/bookings/mine`) are paginated, capped at 50 results per page, and select only the columns the frontend needs (no `SELECT *` on list endpoints).
- Indexes on `flights(origin, destination)` and `flights(departure_date)` support the most common search filters.
- Dashboard stats are computed in a single query using `FILTER` clauses (conditional aggregation) rather than multiple separate queries.

## API Overview

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Login, returns access token + refresh cookie |
| POST | `/auth/refresh` | Refresh cookie | Rotate tokens |
| POST | `/auth/logout` | Refresh cookie | Invalidate session |
| GET | `/flights/search` | — | Search flights (filters + pagination) |
| GET | `/flights/:id` | — | Get single flight |
| POST | `/bookings` | User | Create a pending booking |
| POST | `/bookings/:id/checkout` | User | Create Stripe Checkout session |
| PATCH | `/bookings/:id/cancel` | User/Admin | Cancel a booking + refund |
| GET | `/bookings/mine` | User | View own booking history |
| POST | `/webhooks/stripe` | — (Stripe signature) | Payment status webhook |
| POST | `/admin/flights` | Admin | Create flight |
| PATCH | `/admin/flights/:id` | Admin | Update flight |
| DELETE | `/admin/flights/:id` | Admin | Delete flight |
| GET | `/admin/bookings` | Admin | View all bookings (filters + pagination) |
| GET | `/admin/dashboard/stats` | Admin | Bookings today, revenue, cancellation rate |

## Known Limitations / Not Implemented

- Booking confirmation email (marked optional in the spec) — not yet implemented.
- Frontend is in progress separately.
