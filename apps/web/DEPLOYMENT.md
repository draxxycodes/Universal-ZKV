# Universal ZK Verifier - Website Deployment Guide

## 🚀 Quick Deploy to Vercel

### 1. Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Repository pushed to GitHub

### 2. One-Click Deploy

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Select `Universal-ZKV`
4. Set root directory to `apps/web`
5. Add environment variables:

```
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_ATTESTOR_ADDRESS=0x36e937ebcf56c5dec6ecb0695001becc87738177
NEXT_PUBLIC_CHAIN_ID=421614
```

6. Click **Deploy**

### 3. CLI Deploy

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy from apps/web directory
cd apps/web
vercel --prod
```

## 🔧 Environment Variables

### Required (Public)

```env
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_ATTESTOR_ADDRESS=0x36e937ebcf56c5dec6ecb0695001becc87738177
NEXT_PUBLIC_CHAIN_ID=421614
```

### Optional (Server-side)

```env
PRIVATE_KEY=your_private_key_for_attestation
```

⚠️ **Never commit `.env.local` to git!**

## 🤖 GitHub Actions CI/CD

### Setup

1. Add secrets to GitHub repository:
   - `VERCEL_TOKEN` - From vercel.com/account/tokens
   - `VERCEL_ORG_ID` - From .vercel/project.json
   - `VERCEL_PROJECT_ID` - From .vercel/project.json
   - `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC`
   - `NEXT_PUBLIC_ATTESTOR_ADDRESS`
   - `NEXT_PUBLIC_CHAIN_ID`

2. GitHub Actions workflow is already configured in `.github/workflows/deploy-web.yml`

3. Push to `master` branch to trigger automatic deployment

### Manual Workflow Trigger

Go to Actions → Deploy Website → Run workflow

## 📱 Local Development

```bash
# Install dependencies
cd apps/web
pnpm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your values

# Run development server
pnpm dev

# Open http://localhost:3000
```

## 🏗️ Build for Production

```bash
# Build
pnpm build

# Test production build locally
pnpm start
```

## 🌐 Custom Domain

### Vercel

1. Go to your project on Vercel
2. Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed

### Example DNS Configuration

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

```
Type: A
Name: @
Value: 76.76.21.21
```

## 🔍 Monitoring & Analytics

### Vercel Analytics (Recommended)

1. Go to project → Analytics tab
2. Enable Analytics
3. Automatically tracks page views, performance

### Custom Analytics

Add to `src/app/layout.tsx`:

```typescript
// Google Analytics example
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## 🐛 Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
pnpm clean
pnpm install
pnpm build
```

### Environment Variables Not Working

- Ensure all `NEXT_PUBLIC_*` variables are set in Vercel dashboard
- Redeploy after changing environment variables

### API Routes Failing

- Check that scripts exist in `../../scripts/`
- Ensure Node.js version is >=20
- Check logs in Vercel Functions tab

## 📊 Performance Optimization

### Recommended Vercel Settings

- **Framework Preset**: Next.js
- **Build Command**: `cd ../.. && pnpm build --filter=@uzkv/web`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`
- **Development Command**: `pnpm dev`

### Image Optimization

Already configured via Next.js built-in Image component.

### Caching

Vercel automatically handles:

- Static assets (CDN cached)
- API routes (edge caching)
- ISR (Incremental Static Regeneration)

## 🔒 Security

### Environment Variables

- Never expose `PRIVATE_KEY` publicly
- Use Vercel Environment Variables for secrets
- Different values for Preview vs Production

### Headers

Add security headers in `next.config.js`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};
```

## 📈 Post-Deployment Checklist

- [ ] Website loads correctly
- [ ] All pages accessible (/, /demo, /benchmarks, /attestations)
- [ ] Wallet connection works
- [ ] Environment variables set correctly
- [ ] API routes functional
- [ ] Mobile responsive
- [ ] Analytics tracking (if enabled)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Performance check (PageSpeed Insights)

## 🆘 Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Project Issues**: https://github.com/draxxycodes/Universal-ZKV/issues

---

**Estimated deployment time**: 5-10 minutes ⚡
