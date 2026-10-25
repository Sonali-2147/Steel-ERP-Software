# Steel ERP Desktop App

## Quick Start

### Windows Users
Simply double-click the **"Start Steel ERP.bat"** file to launch the application.

### Mac/Linux Users
Run the following command in the terminal:
```bash
npm start
```

The application will:
1. Start the backend server automatically
2. Open your default browser at `http://localhost:5000`
3. Use a local SQLite database (no Supabase required)

## Data Storage

The database is stored locally at:
- **Windows**: `C:\Users\Perfect\Downloads\steel-erp-project\steel-erp\server\data\erp.db`
- **Mac/Linux**: `./server/data/erp.db`

All your data (items, parties, invoices, etc.) is stored in this local SQLite database.

## Features

✅ **Complete ERP Functionality**
- Inventory management
- Purchase bills
- Sales invoices
- Quotations
- Payments tracking
- Stock entries
- Reports and analytics
- PDF generation

✅ **No Cloud Required**
- Works completely offline
- All data stored locally
- No internet connection needed

✅ **Easy to Share**
- Copy the entire folder to another PC
- Run the batch file to start
- Data is included in the folder

## Sharing with Other PCs

To use this on another PC:

1. **Copy the entire folder** to the target PC
2. **Ensure Node.js is installed** on the target PC (download from nodejs.org)
3. **Double-click "Start Steel ERP.bat"** (Windows) or run `npm start` (Mac/Linux)
4. The app will start with the existing data

## Data Backup

To backup your data:
1. **Copy the `server/data` folder** to a safe location
2. Or copy the entire project folder

To restore:
1. **Replace the `server/data` folder** with your backup
2. Restart the application

## Stopping the Application

- **Windows**: Close the command prompt window or press Ctrl+C
- **Mac/Linux**: Press Ctrl+C in the terminal

## Customization

### Change Port
Edit `start-app.mjs` and change line 12:
```javascript
env: { ...process.env, PORT: '5000' }, // Change 5000 to your preferred port
```

### Change Data Location
The data is stored in `server/data/erp.db` by default. You can move this file anywhere and update the `DATA_DIR` environment variable.

## Troubleshooting

**Port already in use?**
- Change the port in `start-app.mjs` as shown above
- Or stop other applications using port 5000

**Node.js not found?**
- Download and install Node.js from https://nodejs.org
- Restart your computer after installation

**Database errors?**
- Delete the `server/data` folder
- Restart the application (it will create a fresh database)

## Technical Details

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Database**: SQLite (local file-based)
- **Port**: 5000 (configurable)

## Support

For issues or questions, check the main README.md file.
