# 🚀 Quick Start: Build the Demo Website

## TL;DR - Get Running in 5 Minutes

```bash
# 1. Run setup script
cd /c/Users/priya/OneDrive/Documents/uzkv
bash scripts/setup-demo-website.sh

# 2. Configure environment
cd apps/web
cp .env.local.example .env.local

# 3. Start development
pnpm dev

# Open http://localhost:3000
```

---

## ✅ What You Need to Do

### Step 1: Initialize Next.js (5 minutes)

```bash
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --app
```

Choose these options:
- ✅ TypeScript: Yes
- ✅ ESLint: Yes  
- ✅ Tailwind CSS: Yes
- ✅ src/ directory: Yes
- ✅ App Router: Yes
- ✅ Import alias: @/*

### Step 2: Install Dependencies (3 minutes)

```bash
# Web3 libraries
pnpm add wagmi@2.x viem@2.x @tanstack/react-query

# UI components
pnpm add zustand react-dropzone recharts lucide-react react-hot-toast

# shadcn/ui
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button card tabs progress badge
```

### Step 3: Copy Sample Code (2 minutes)

1. Copy `SAMPLE-PAGE.tsx` → `src/app/page.tsx`
2. Adjust imports and types as needed
3. Remove compile errors by installing React types

### Step 4: Configure Web3 (5 minutes)

Create `src/lib/wagmi.ts`:

```typescript
import { http, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';

export const config = createConfig({
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC)
  }
});
```

### Step 5: Add API Routes (10 minutes)

See `docs/WEBSITE-DEMO-PLAN.md` Phase 3 for API route code.

Quick example for `src/app/api/verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST(req: NextRequest) {
  const result = execSync(
    'node scripts/verify-with-uzkv.cjs',
    { cwd: process.cwd(), encoding: 'utf8' }
  );
  return NextResponse.json({ verified: true });
}
```

---

## 🎯 Key Features to Implement

### Priority 1 (Must Have) 🔴
- ✅ Landing page with hero section
- ✅ Proof system comparison cards
- ✅ "Try Demo" button linking to workflow
- ✅ Wallet connection

### Priority 2 (Should Have) 🟡
- ✅ Interactive proof generator
- ✅ Gas comparison charts
- ✅ Live verification display
- ✅ Attestation status

### Priority 3 (Nice to Have) 🟢
- ✅ Dark/light mode toggle
- ✅ Mobile responsive design
- ✅ Video demo embed
- ✅ Analytics integration

---

## 📁 File Structure After Setup

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Landing (copy from SAMPLE-PAGE.tsx)
│   │   ├── demo/page.tsx       # Interactive demo
│   │   └── api/
│   │       ├── generate/route.ts
│   │       ├── verify/route.ts
│   │       └── attest/route.ts
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── WalletConnect.tsx
│   │   └── CompleteWorkflow.tsx
│   └── lib/
│       ├── wagmi.ts
│       └── utils.ts
├── public/
│   └── proofs/                 # Sample proofs
├── .env.local
└── package.json
```

---

## 🎨 Quick Customization

### Change Colors

Edit `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      groth16: '#3b82f6',
      plonk: '#8b5cf6', 
      stark: '#ec4899',
    }
  }
}
```

### Add Logo

Put your logo in `public/logo.svg` and import in layout:

```tsx
import Image from 'next/image';

<Image src="/logo.svg" alt="UZKV" width={40} height={40} />
```

---

## 🚀 Deploy to Vercel

### One-Click Deploy

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repo
5. Set environment variables
6. Deploy! 🎉

### Manual Deploy

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy
cd apps/web
vercel --prod
```

---

## 🐛 Common Issues

### Issue: "Module not found: wagmi"
**Fix**: Make sure you're in `apps/web` and run `pnpm install`

### Issue: "Cannot find module 'next/link'"
**Fix**: Run `pnpm add next react react-dom`

### Issue: Wallet not connecting
**Fix**: Check that `.env.local` has correct RPC URL

### Issue: API routes failing
**Fix**: Ensure scripts path is correct: `../../scripts/...`

---

## 📚 Resources

- **Full Plan**: [docs/WEBSITE-DEMO-PLAN.md](./WEBSITE-DEMO-PLAN.md)
- **Next.js Docs**: https://nextjs.org/docs
- **wagmi Docs**: https://wagmi.sh
- **Tailwind**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com

---

## 💡 Pro Tips

1. **Use sample proofs**: Copy from `packages/circuits/proofs/deployment/` to `public/proofs/` for instant demo
2. **Add loading states**: Use `react-hot-toast` for user feedback
3. **Mobile-first**: Design for mobile, then scale up
4. **Keep it simple**: Start with landing page, add features iteratively
5. **Test on testnet**: Always use Arbitrum Sepolia first

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Setup Next.js | 5 min |
| Install deps | 3 min |
| Landing page | 30 min |
| Demo page | 2 hours |
| API routes | 1 hour |
| Wallet integration | 1 hour |
| Charts & stats | 1 hour |
| Polish & deploy | 1 hour |
| **TOTAL** | **~7 hours** |

---

## 🎯 Success Checklist

Before launching:

- [ ] Landing page loads without errors
- [ ] Wallet connects successfully
- [ ] Complete workflow button works
- [ ] Gas charts display correctly
- [ ] Mobile responsive (test on phone)
- [ ] Dark mode works
- [ ] All links functional
- [ ] Environment variables set
- [ ] Deployed to Vercel
- [ ] Custom domain configured (optional)

---

**Questions?** Check the full plan in `docs/WEBSITE-DEMO-PLAN.md` or open an issue!

**Ready?** Run `bash scripts/setup-demo-website.sh` and start building! 🚀
