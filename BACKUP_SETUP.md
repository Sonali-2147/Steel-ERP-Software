# Database Backup Setup for Free Tier

## Problem
The SQLite database is stored locally and gets wiped on each redeploy in Render's free tier, even with a disk mount.

## Solution
Cloud backup using **Supabase Storage** (free tier - 1GB storage, 2GB bandwidth/month).

## Setup Instructions

### 1. Create a Supabase Project (Free)
1. Go to https://supabase.com
2. Sign up for a free account
3. Create a new project
4. Wait for the project to be ready (~2 minutes)

### 2. Create Storage Bucket
1. Go to your Supabase project dashboard
2. Navigate to **Storage** on the left sidebar
3. Click **Create a new bucket**
4. Name it: `steel-erp-backup`
5. Make it **Public** (or keep private - either works)
6. Click **Create bucket**

### 3. Get API Credentials
1. In Supabase dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** (supabase.com)
   - **service_role key** (NOT the anon key - this has admin access)

### 4. Add Environment Variables to Render
1. Go to your Render dashboard
2. Navigate to your steel-erp service
3. Go to **Environment**
4. The SUPABASE_URL is already configured: `https://nqyvhalksyjmfvpjbdqy.supabase.co`
5. Add only the SUPABASE_SERVICE_KEY:
   ```
   SUPABASE_SERVICE_KEY = your-service-role-key-here
   ```

### 5. Deploy
1. Push the changes to your repository
2. Render will automatically redeploy
3. Check the logs to see: `Supabase backup initialized`

## How It Works

### Automatic Backups
- **On startup**: Checks if local database exists. If not, downloads from Supabase
- **Periodic**: Uploads database to Supabase every 5 minutes
- **Manual**: API endpoint `/api/backup` (POST) to trigger immediate backup

### Backup Retention
- Keeps only the latest 5 backups
- Older backups are automatically deleted
- Current backup is always named `erp.db`

### Benefits
✅ Free (1GB storage, 2GB bandwidth/month)
✅ Data persists across redeploy
✅ Automatic no-configuration setup
✅ Manual backup trigger available
✅ No code changes needed for the app

## Testing

### Check if backup is working:
1. Add some data to your app
2. Wait 5 minutes or trigger manual backup via API
3. Go to Supabase Storage → steel-erp-backup bucket
4. You should see `erp.db` file

### Test restore:
1. Delete your Render service (or clear the database)
2. Redeploy
3. Your data should be restored automatically

## Costs

**Supabase Free Tier:**
- 500MB database storage
- 1GB file storage
- 2GB bandwidth/month
- 50k API requests/month

This is more than enough for a small ERP system.

## Alternative Options

If you prefer not to use Supabase, you can also use:
- **Cloudflare R2** (Free 10GB storage, $0.015/GB after)
- **Backblaze B2** (Free 10GB storage, $0.005/GB after)
- **GitHub Releases** (Free for small databases)

The backup module can be easily adapted for these services.
