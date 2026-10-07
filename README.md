# The Grooming Master

Luxury salon booking & management. React + Vite + Tailwind frontend, Node/Express backend, Supabase (Postgres) database.

- **Public site** (`/`, `/contact`): dark charcoal + champagne gold, Inter Tight. Copy for the sections marked SAMPLE lives in `frontend/src/lib/siteContent.js`; photos go in `frontend/public/images/` (see names below).
- **App** (`/app`, `/salon`): monoZHub console layout, Inter.

```
frontend/   React 19 + Vite + Tailwind 3   (http://localhost:5173)
backend/    Express API                    (http://localhost:4000)
supabase/   schema.sql                     (run in the Supabase SQL editor)
```

## Setup

1. Create a Supabase project, open **SQL editor**, run `supabase/schema.sql`, then `supabase/update_price_list.sql` (real price list + enquiries table), then `supabase/update_profile_and_bookings.sql` (profile pictures + booking approval).
2. `cd backend && cp .env.example .env` and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service-role key, server only), `JWT_SECRET`, optional `SMTP_*` for e-bills.
3. `npm install && npm run seed:admin && npm run dev` in `backend/` (creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
4. `cd frontend && npm install && npm run dev`. Vite proxies `/api` to the backend.

## Roles

| Role | Can do |
|---|---|
| Customer | Register/login, pick services, book & cancel appointments |
| Staff | Calendar, add bookings, add/view customers, generate own salary slips |
| Admin | Everything: dashboard & charts, services CRUD, billing (print / PDF / email e-bill), customer CSV export, payroll & slips, team management |

Customers sign in at `/login`, staff and admin at `/salon-login`. Walk-in customers added by staff have no password and can claim their profile by registering with the same email.

## Notes

- Auth is the app's own (bcrypt + JWT); the database is reached only through the backend with the service-role key, and RLS is enabled with no public policies.
- Salary commission = (invoice totals attributed to the staff member in the month) × their commission %. Paid slips are locked.
- Theme: light by default with a dark option. Change `--accent` in `frontend/src/index.css` to rebrand.
- Online bookings from customers start as **Pending** and appear in the calendar's "New booking" panel until the salon accepts or rejects them. Bookings created by salon staff are confirmed immediately.
- Profile pictures are stored as base64 in `users.avatar` (2 MB max, PNG/JPG/GIF/WebP, validated on the server).

## Homepage photos

Drop JPGs into `frontend/public/images/` - missing files show a dark placeholder. Names: `hero`, `about-1`, `about-2`, `service-1`..`service-4`, `benefits`, `studio`, `why-1`..`why-3`, `product-1`..`product-3`, `gallery-1`..`gallery-11`, `team-1`..`team-3`, `client-1`..`client-4`, `blog-1`..`blog-3` (all `.jpg`).

Contact/appointment form submissions are stored in the Supabase `enquiries` table.
