# Flight Booking System

A MERN-stack flight booking application with JWT auth, role-based access control, Stripe payments, and concurrency-safe seat inventory management.

## Tech Stack

**Backend**
- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** PostgreSQL (raw `pg`, no ORM)
- **Auth:** JWT (access + refresh token rotation)
- **Payments:** Stripe (Checkout Sessions + Webhooks)
- **Dev tooling:** `tsx` for hot reload

**Frontend**
- **Framework:** React + TypeScript (Vite)
- **Routing:** React Router
- **HTTP client:** Axios, with a response interceptor for silent token refresh

## Backend Setup

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

## Frontend Setup

From the `frontend/` directory:

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173` by default. Requires the backend running on `http://localhost:4000` (hardcoded in `src/api/client.ts` and `src/context/AuthContext.tsx` — update both if your backend port differs), and `FRONTEND_URL` in the backend `.env` must match the frontend's origin exactly for CORS and Stripe redirects to work.

## Architecture

**Layering:** Routes → Controllers → Services → Models, consistently across every domain (auth, flights, bookings, admin).

- **Models** — raw SQL queries only, no business logic. The only layer that talks to Postgres directly.
- **Services** — business logic, validation, orchestration. Controllers never call models directly.
- **Controllers** — thin HTTP layer: pull from `req`, call a service, send a response. No business logic.
- **Routes** — wiring only (path + method → controller, plus middleware chain).
- **Middleware** — cross-cutting request logic (`authenticate`, `authorize`, rate limiting) that sits between routes and controllers.
- **Types** — shared TypeScript interfaces (e.g. token payloads), imported wherever needed instead of redefined per file.
- **Utils** — small reusable helpers (e.g. cookie options) with no business logic of their own.
- **Config** — environment-driven setup (DB pool, Stripe client) — the only place `process.env` values for these get read.

This keeps the flight/booking data layer swappable — replacing Postgres with another data source later would only require changes in the models layer.

**Frontend layering:** mirrors the same separation of concerns.

- **`services/`** — every API call lives here, one file per domain (`authService`, `flightService`, `bookingService`). Nothing outside this folder ever calls `axios` or `api` directly.
- **`api/client.ts`** — the shared axios instance: attaches the access token to outgoing requests, and on a 401 silently refreshes and retries the original request (with a queue so simultaneous failing requests don't each trigger their own refresh).
- **`types/`** — shared TypeScript interfaces (`Flight`, `Booking`, `Passenger`, `User`), imported wherever needed instead of redefined per component.
- **`utils/`** — pure functions: passenger/flight form validation, airport code lookup, cancellation-window logic — no side effects, easy to reason about independently of any component.
- **`context/AuthContext.tsx`** — thin: holds `user`/`loading` state and exposes `login`/`register`/`logout`, delegating all actual API work to `authService`.
- **`pages/`** — one file per route, responsible for layout and wiring state to services/components, not for knowing how requests are made.

## Key Design Decisions

- **Access token:** 15 min expiry, returned in the JSON response body, kept in memory on the frontend (not localStorage). Short lifespan limits the damage window if it's ever exposed.
- **Refresh token:** 7 day expiry, stored in an `httpOnly`, `secure` (in production), `sameSite`-scoped cookie, restricted to the `/auth` path. Never readable by client-side JS, which protects it from XSS.
- **Rotation:** every refresh issues a brand new refresh token and invalidates the old one (checked against a single stored value per user in the `users.refresh_token` column). If a stolen token is ever used, the legitimate user's next refresh will fail — an implicit signal of compromise, and it limits an attacker's window to a single refresh cycle rather than the full 7-day lifetime.
- **Logout:** sets `refresh_token` to `NULL` in the database (not just clearing the cookie client-side), so a captured token can't be replayed after logout.

### Concurrency handling (seat inventory)

Booking creation and cancellation both wrap seat updates in a Postgres transaction using `SELECT ... FOR UPDATE` to lock the flight row for the duration of the transaction. This serializes concurrent booking attempts on the same flight - a second request has to wait for the first transaction to commit or roll back before it can read the row, preventing overbooking (e.g. two users both reading `seats_available = 1` and both succeeding).

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
| GET | `/auth/me` | User | Get current user (used to restore session after a page reload) |
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

## What's Built on the Frontend

- Register / login, with silent token refresh on page load (no forced logout on access-token expiry)
- Flight search with origin/destination dropdowns and date filter
- Multi-passenger booking form with client-side validation, feeding into Stripe Checkout
- Booking history with status display and a cancel action (hidden once outside the 24h policy window, mirroring the backend rule)
- Admin panel (visible only to `admin`-role accounts): flight CRUD with search/filter, all-bookings view with status/date/route filters and an admin cancel-and-refund action, and a dashboard stats view

## Screenshots

Suggested set to capture before submitting (drop image files in a `/screenshots` folder and reference them here, e.g. `![Search](./screenshots/search.png)`):

- Flight search results
  <img width="639" height="730" alt="image" src="https://github.com/user-attachments/assets/f8f54985-3416-4c06-a772-b9962d405051" />
- Booking history (a confirmed and a cancelled booking)
<img width="990" height="707" alt="image" src="https://github.com/user-attachments/assets/1f4ce8a5-ebf2-47b1-b8ce-58012ed610e0" />
- Admin flight management (create + edit)
<img width="943" height="788" alt="image" src="https://github.com/user-attachments/assets/4f551dd8-00d3-4c72-8bb7-6c28adbdf4d9" />
- Admin all-bookings view with a filter applied
    <img width="984" height="757" alt="image" src="https://github.com/user-attachments/assets/f4eceed0-8f63-4ffb-ba83-bc256381c7ff" />

## Known Limitations / Not Implemented

- **Booking confirmation email** — marked optional in the spec, not implemented.
- **React StrictMode double-invoke in dev** — the auth-refresh effect is guarded against acting on a stale/duplicate response, but the double network call itself is a known dev-only side effect of StrictMode and doesn't occur in production builds.
- **Admin flight search** filters by origin/destination/date via the backend; flight-number filtering is done client-side against the already-loaded page of results, since the search endpoint doesn't index on that field.
