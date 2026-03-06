DB setup and migration guide — v0-tallermecanico2.0

This document explains recommended steps to set up PostgreSQL on your Hostinger VPS for development, create the Prisma schema, run migrations and import existing localStorage data.

1) On the VPS (Ubuntu example)

- Update and install Postgres:

sudo apt update; sudo apt upgrade -y
sudo apt install -y postgresql postgresql-contrib

- Create DB user and database (replace myuser and mydb):

sudo -u postgres createuser --pwprompt myuser
sudo -u postgres createdb -O myuser mydb

You can also configure roles via psql: sudo -u postgres psql

- Allow remote connections (if needed) and configure firewall (UFw):

Edit /etc/postgresql/*/main/postgresql.conf and set listen_addresses = '*'.
Edit /etc/postgresql/*/main/pg_hba.conf to allow host connections from your app host.

sudo ufw allow 5432/tcp
sudo systemctl restart postgresql

2) Locally (your dev machine) — install Prisma and client

Open PowerShell in your project root and run:

npm install -D prisma
npm install @prisma/client
npx prisma init

3) Put your DATABASE_URL into .env (project root) or set as environment variable on the VPS.

Example DATABASE_URL (Postgres):
DATABASE_URL="postgresql://myuser:myPassword@your-vps-ip:5432/mydb"

4) Use the provided Prisma schema

The repo already contains prisma/schema.prisma. Run the migration and generate the client:

npx prisma migrate dev --name init
npx prisma generate

5) Import existing data from localStorage

- In the browser with the app running (localhost), export localStorage to JSON:

Open DevTools → Console and run the following JS snippet:
const exportData = { vehicles: JSON.parse(localStorage.getItem('vehicles') || '[]'), services: JSON.parse(localStorage.getItem('services') || '[]') }
copy(JSON.stringify(exportData))

- Save clipboard into data/export.json at the project root.

- Run the import script (ensure your DATABASE_URL points to the VPS DB or your local DB):

node scripts/import.mjs data/export.json

6) Update the app to use Prisma / server-side storage

- Create API routes (or server functions) that call Prisma client (lib/prisma.ts). The app currently uses lib/data-store.ts which operates on localStorage — you'll need to replace client-side persistence with fetch calls to your API, or create server actions that read/write DB.

7) Deploy considerations

- For production, run Postgres on VPS (managed or self-hosted) and deploy Next app to a server that can run Node (Hostinger VPS, Vercel, etc.).
- Use environment variables on the host to set DATABASE_URL.
- Add backups and monitoring for Postgres (pg_dump, scheduled backups).

If you want, I can:
- add example Next API route(s) wired to Prisma (e.g. app/api/vehicles/route.ts) and
- convert lib/data-store.ts to call those APIs (a migration path) or provide a compatibility adapter.
