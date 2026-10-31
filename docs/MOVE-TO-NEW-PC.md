# Krishna Steel ERP - Moving the project to another Windows PC

Everything needed to rebuild, run, license and hand over the desktop app.

## 1. What this project is

| Item | Detail |
|---|---|
| Name | Krishna Steel ERP (package name `krishna-steel-center`) |
| Type | Windows desktop app (Electron) with a built-in web server and a local database |
| Front end | React 19, TypeScript, Vite, Tailwind |
| Back end | Express, started inside the app on `http://localhost:5000` |
| Database | One SQLite file, `erp.db` |
| Modules | Items, Stock In/Out, Suppliers, Customers, Quotations, Purchase Bills, Sales Invoices (printed as "Estimate"), Payment In/Out, Expenses, Reports |
| Login | First start creates `admin` / `admin123`. Change it from the sidebar after login. |
| Licence | Offline key tied to the PC's Machine ID, with an expiry date (see section 6) |
| Source | https://github.com/Sonali-2147/Steel-ERP-Software (branch `main`, public) |

Two builds exist because Windows 7 cannot run new Electron:

| Build | Windows | Electron | Database engine | Built with |
|---|---|---|---|---|
| Main | 10 and 11 (64-bit) | 37 | Node's built-in `node:sqlite` | `npx electron-builder --win zip --x64` |
| Win7 | 7 (64-bit and 32-bit) | 22.3.27 | `better-sqlite3` 9.6.0 | `node scripts/build-win7.mjs` |

## 2. Where things are

| What | Where |
|---|---|
| Source code | GitHub repo above (also `Downloads\steel-erp-project (2)\...\steel-erp` on the old PC) |
| Finished zips | `Downloads\steel-erp-exe\` (three files: Win10/11, Win7 64-bit, Win7 32-bit) |
| Licence key generator | `Krishna-Key-Generator.html` (one file, opens in Chrome or Edge) |
| Key generator source (no secrets) | `tools/licence/` in the repo |
| Licence steps for you | `docs/Krishna-Licence-Steps.pdf` |
| Client data on their PC | `erp.db` inside the app's data folder (see section 7) |

## 3. Set up the new PC (build machine)

1. Install **Node.js 22 or newer** (https://nodejs.org) and **Git**.
2. Open Command Prompt or PowerShell:
   ```
   git clone https://github.com/Sonali-2147/Steel-ERP-Software.git
   cd Steel-ERP-Software
   npm install
   ```
3. Run it for testing: `npm run dev` then open http://localhost:5173 (the API runs on port 5000).
4. Check types and build the web app: `npm run build`.

## 4. Build the Windows 10/11 zip

```
npm install
npm run build
npx electron-builder --win zip --x64 -c.directories.output=dist-electron-new
```

The zip appears in `dist-electron-new\`. Unzip it and double-click `Krishna Steel ERP.exe`.

## 5. Build the Windows 7 zips

```
node scripts/build-win7.mjs          (both 64-bit and 32-bit)
node scripts/build-win7.mjs x64      (64-bit only)
node scripts/build-win7.mjs ia32     (32-bit only)
```

The zips appear in `dist-win7\`. The script copies the source to `.build-win7`, applies the Windows 7 changes (Express 4, better-sqlite3, older browser target), downloads the matching SQLite engine and checks its SHA-256, then packages. It needs internet on the first run. If GitHub is slow, save the file by hand as `.build-win7-cache\bs3-x64.tar.gz` or `bs3-ia32.tar.gz` and run again.

## 6. Licence lock

- On first start the app shows **Activation required** and a **Machine ID**.
- The client sends you the Machine ID. You make a key in `Krishna-Key-Generator.html` (passphrase, Machine ID, client name, validity) and send it back. The client pastes it and presses Activate.
- The Machine ID is built from the computer name and processor, so it changes if the client renames the PC or changes hardware. Make a new key then.
- Keys cannot be switched off early. They stop working on the end date. If the PC date is set back, the app locks.
- **The signing key exists only inside `Krishna-Key-Generator.html`, locked by your passphrase.** Keep at least two copies of that file. If every copy is lost you cannot make keys for apps already sold, and you would have to generate a new keypair and rebuild the app for every client.
- To make a new keypair and a new generator page (only if the old one is lost): see `tools/licence/build-keygen-page.mjs`. You also need to put the new public key into `server/licence.js`.
- Do not put the generator page on GitHub. The repo is public.

## 7. Client data and backups

- The app stores `erp.db` in its data folder, which is `data` inside Electron's user-data folder. This is normally under `%APPDATA%` in a folder named after the app. [INFERENCE: the exact folder name was not verified on a Windows PC. Search for `erp.db` if you cannot find it.]
- To back up or move a client's data, close the app and copy `erp.db` (and any `erp.db-wal` / `erp.db-shm` files next to it).
- Optional cloud backup uses Supabase. Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` as environment variables. See `BACKUP_SETUP.md`. Never commit real keys.

## 8. Things to remember

- **Copyright** text is in `src/lib/copyright.ts` ("© year Sonali Kadam. All rights reserved.").
- **Business name** is set in `src/lib/share.ts` (`BUSINESS_NAME = 'Krishna Steel'`). Address, phone and bank details are written in the print and PDF code: `src/pages/SalesInvoices.tsx`, `src/pages/PurchaseBills.tsx` and `src/lib/documentPdf.ts`.
- **Zips given out before the licence lock was added have no lock.** Give clients only recent builds.
- The packaged Windows apps have not been run on a real Windows PC by the author of this guide. Test each zip once after building.
- Line endings: the repo uses LF. Keep it that way (`git config core.autocrlf false`).

## 9. Quick checklist for the first day on the new PC

1. Install Node 22 and Git.
2. `git clone` and `npm install`.
3. `npm run dev` and log in as `admin` / `admin123`.
4. Build the Win10/11 zip and test it. Check the Activation screen appears.
5. Copy `Krishna-Key-Generator.html` to the new PC, unlock it, and make a test key for the Machine ID shown.
6. Activate the test copy and check an invoice print and the WhatsApp PDF.
