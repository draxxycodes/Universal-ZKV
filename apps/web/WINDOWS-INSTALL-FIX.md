# Windows Installation Fix

## Problem
OneDrive sync is interfering with `node_modules` installation, causing permission errors.

## ✅ Solution 1: Exclude node_modules from OneDrive (RECOMMENDED)

### Step 1: Stop OneDrive Sync for node_modules

1. **Right-click** on `C:\Users\priya\OneDrive\Documents\uzkv\node_modules`
2. Select **"Free up space"** or **"Always keep on this device" → "Free up space"**
3. Repeat for `C:\Users\priya\OneDrive\Documents\uzkv\apps\web\node_modules`

### Step 2: Add to .gitignore (already done)
```
node_modules/
```

### Step 3: Install using PowerShell (not WSL)

Open **PowerShell** as Administrator:

```powershell
cd C:\Users\priya\OneDrive\Documents\uzkv\apps\web
npm install
```

### Step 4: Start dev server
```powershell
npm run dev
```

---

## ✅ Solution 2: Move Project Out of OneDrive (BEST)

### Move to a local directory:

```powershell
# In PowerShell
cd C:\
mkdir Dev
cd Dev
git clone https://github.com/draxxycodes/Universal-ZKV.git
cd Universal-ZKV\apps\web
npm install
npm run dev
```

**Advantages:**
- No OneDrive interference
- Faster builds
- No permission issues
- Better Git performance

---

## ✅ Solution 3: Use WSL Native Filesystem (FASTEST)

### Clone to WSL home directory:

```bash
# In WSL terminal
cd ~
git clone https://github.com/draxxycodes/Universal-ZKV.git
cd Universal-ZKV
pnpm install
cd apps/web
pnpm dev
```

**Advantages:**
- Best performance
- No Windows/WSL translation overhead
- Proper symlink support
- No OneDrive issues

**Edit files:** VS Code WSL extension handles this seamlessly

---

## Current Status

Your installation keeps failing because:
1. OneDrive is syncing the `node_modules` folder
2. It locks files while syncing
3. Package managers can't rename/delete locked files

## Quick Test

Try this RIGHT NOW to verify packages work:

```powershell
# Open PowerShell (NOT WSL)
cd C:\Users\priya\OneDrive\Documents\uzkv\apps\web

# Clear everything
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Install
npm install

# If successful, start dev server
npm run dev
```

If you see "Ready" and a localhost URL, **it worked!** 🎉

---

## My Recommendation

**Use Solution 2** (move to C:\Dev):
- Simple
- Clean
- No OneDrive headaches
- Still easy to access

Then you can commit and push from there normally.
