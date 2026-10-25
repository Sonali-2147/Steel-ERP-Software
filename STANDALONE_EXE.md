# Steel ERP Standalone Executable

## Overview

The Steel ERP can now be distributed as a standalone Windows executable (.exe) that runs directly without requiring a browser or manual server startup.

## Location

The executable is located at:
```
dist-electron/win-unpacked/Steel ERP.exe
```

## How to Use

### Running the Executable

1. Navigate to the `dist-electron/win-unpacked` folder
2. Double-click `Steel ERP.exe`
3. The application will launch in its own window
4. **No browser required!**

### What Happens When You Run It

1. The Electron app starts
2. The backend server starts automatically (in the background)
3. The React app loads in an Electron window
4. Data is stored in: `%APPDATA%/steel-erp/data/` (Windows AppData folder)

## Features

✅ **Standalone Application**
- Runs as a native Windows application
- No browser required
- No command line needed
- Just double-click and run

✅ **All Functionality Preserved**
- Inventory management
- Purchase/Sales invoices
- Quotations
- Payments
- Reports
- PDF generation
- Everything works exactly as before

✅ **Local SQLite Database**
- Data stored in Windows AppData folder
- No cloud required
- Works offline
- Automatic data directory creation

✅ **Easy Distribution**
- Copy the entire `dist-electron/win-unpacked` folder to another PC
- Double-click `Steel ERP.exe` to run
- Data will be stored in that PC's AppData folder

## Data Location

Your data is stored in:
```
C:\Users\<YourUsername>\AppData\Roaming\steel-erp\data\erp.db
```

To backup your data:
1. Navigate to the data folder above
2. Copy the `erp.db` file
3. Save it to a safe location

To restore:
1. Replace the `erp.db` file with your backup
2. Restart the application

## Rebuilding the Executable

If you make changes to the code and want to rebuild the executable:

```bash
npm run electron:build:win
```

This will:
1. Build the React app
2. Package it with Electron
3. Create the executable in `dist-electron/win-unpacked`

## Distribution to Other PCs

To distribute the app to other users:

1. **Copy the entire folder** `dist-electron/win-unpacked`
2. **Zip it** for easy distribution
3. **Send to users** via email, Google Drive, etc.
4. **Users extract and run** `Steel ERP.exe`

**Note:** Each installation will have its own local database in that PC's AppData folder.

## Troubleshooting

**App won't start:**
- Make sure you're running a 64-bit Windows system
- Check if Windows Defender is blocking it
- Try running as Administrator

**Data not persisting:**
- Check the data folder location: `%APPDATA%\steel-erp\data\`
- Ensure you have write permissions to that folder

**Performance issues:**
- The app includes all dependencies (~200MB)
- This is normal for Electron applications
- First launch may take a few seconds

## Technical Details

- **Technology**: Electron 28.3.3
- **Backend**: Node.js + Express (runs inside Electron)
- **Frontend**: React + Vite
- **Database**: SQLite (local file-based)
- **Platform**: Windows x64

## Advantages Over Browser Version

✅ No browser required
✅ Native window experience
✅ Automatic server startup
✅ Professional desktop application feel
✅ Can be pinned to taskbar
✅ Can create desktop shortcut

## Future Enhancements

Potential improvements:
- Create installer (NSIS) for easier installation
- Add auto-update functionality
- Create Mac and Linux versions
- Add application icon
- Add splash screen
