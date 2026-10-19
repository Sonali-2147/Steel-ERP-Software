# Steel ERP – Stock Management

A simple stock management app: maintain items, record stock in / stock out, keep suppliers and customers, and view reports.

## Modules

| Menu | What it does |
|------|--------------|
| **Dashboard** | Total items, stock value, this month's stock in/out, low-stock items, recent entries |
| **Items** | Create / edit items, mark inactive, search & filter, export to CSV, **bulk import from Excel (.xlsx) or CSV** |
| **Stock In** | Record material received (supplier, bill no, multiple items, qty, rate) |
| **Stock Out** | Record material issued (customer, invoice/challan no, multiple items). Prevents stock going negative |
| **Suppliers / Customers** | Add, edit, deactivate, export |
| **Reports** | Stock Summary (opening / in / out / closing / value), Item Ledger, Stock In Register, Stock Out Register, Low Stock – all with Export (CSV) and Print |

Current stock = Opening stock + Total Stock In − Total Stock Out.

## Bulk item import

Items → **Import Items** → *Download Template*, fill it in Excel, upload it, check the preview and click Import.

Columns: `Item Code, Item Name, Category, Grade, Size, Unit, Opening Stock, Min Stock, Purchase Rate, Sale Rate`.
Only **Item Name** is required; blank codes are generated automatically (`ITM-0001`…).
Existing items (same code, or same name when code is blank) are skipped unless *Update items that already exist* is ticked.

## Running

Requires Node.js 22.5+ (uses the built-in `node:sqlite`).

```bash
npm install
npm run dev        # backend on :5000 + frontend on http://localhost:5173
```

Production (single server):

```bash
npm run build
npm run server     # serves the app and API on http://localhost:5000
```

Data is stored in `server/data/erp.db` (SQLite). Set `DATA_DIR` to store it elsewhere, and `SKIP_SEED=1` to start with an empty item list instead of the client's item list (194 items, all in kg). Back up by copying the `.db` file.

## Login

All pages and API calls require login. On first start an admin user is created:

- Username: `admin` (or `ADMIN_USERNAME`)
- Password: `admin123` (or `ADMIN_PASSWORD`)

Change the password after first login (sidebar → Password). The env variables only apply when the database is created for the first time.

## Deployment

The app is one Node server plus one SQLite file, so the host needs **permanent disk** for the database.

### Render (Free Tier - Recommended)

1. Push your code to GitHub
2. Sign up at [render.com](https://render.com)
3. Create a new **Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Environment Variables:**
     - `ADMIN_PASSWORD` (set a secure password)
     - `DATA_DIR` (optional, defaults to `./server/data`)
6. Add a **Disk** (1 GB free tier) mounted at `/data`
7. Deploy!

The app will be available at `https://your-app-name.onrender.com`

### Other Options

- **Docker (any VPS):** `docker build -t steel-erp . && docker run -d -p 80:5000 -v steel-erp-data:/data -e ADMIN_PASSWORD=yourpass steel-erp`
- **Without Docker:** Node 22.5+, `npm ci && npm run build && npm run server` (use `pm2` to keep it running)
