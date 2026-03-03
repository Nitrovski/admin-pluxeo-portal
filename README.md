# Pluxeo Admin UI

Standalone admin UI for `admin.pluxeo.com` built with Vite + React + TypeScript.

## Environment variables

Create `.env.local`:

```bash
VITE_API_BASE_URL="https://<api-host>"
VITE_ADMIN_CLERK_PUBLISHABLE_KEY="pk_..."
VITE_ADMIN_CLERK_JWT_AUDIENCE="https://admin.pluxeo.com"
```

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Backend/CORS requirements

- Allow admin origin in API CORS config (`https://admin.pluxeo.com` and local dev origin).
- Configure admin auth backend with the separate Clerk instance used by this app.
- Expose admin routes:
  - `GET /api/admin/me`
  - `GET /api/admin/tenants`
  - `GET /api/admin/tenants/:customerId`
  - `POST /api/admin/impersonation/start`
  - `POST /api/admin/impersonation/stop`
