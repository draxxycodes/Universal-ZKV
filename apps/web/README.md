# 🌐 Universal ZK Verifier - Demo Website

Live demo website showcasing the Universal ZK Verifier with support for Groth16, PLONK, and STARK proof systems.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.local.example .env.local

# Run development server
pnpm dev

# Open http://localhost:3000
```

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Landing page
│   │   ├── demo/               # Interactive demo
│   │   ├── benchmarks/         # Gas comparison
│   │   ├── attestations/       # On-chain explorer
│   │   └── api/                # API routes
│   ├── components/             # React components
│   │   ├── WalletConnect.tsx
│   │   ├── ProofSystemCard.tsx
│   │   ├── WorkflowStep.tsx
│   │   └── StatCard.tsx
│   └── lib/                    # Utilities
│       ├── wagmi.ts            # Web3 config
│       └── utils.ts            # Helper functions
├── public/                     # Static assets
└── package.json
```

## 🎯 Features

### Landing Page (`/`)
- Hero section with 3 proof systems
- Feature comparison table
- Live network statistics
- Architecture diagram
- Call-to-action buttons

### Interactive Demo (`/demo`)
- Complete workflow: Generate → Verify → Attest
- Real-time progress tracking
- Gas cost display
- Transaction links to Arbiscan
- Proof system selector (Groth16/PLONK/STARK)

### Gas Comparison (`/benchmarks`)
- Interactive charts (Groth16 vs PLONK vs STARK)
- Cost calculator
- Benchmark tables
- Stylus vs Solidity comparison
- Detailed gas metrics

### Attestation Explorer (`/attestations`)
- Search by proof hash
- Recent attestations list
- Network statistics
- Transaction history
- Direct Arbiscan links

## 🔧 Configuration

### Environment Variables

```env
# Required
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_ATTESTOR_ADDRESS=0x36e937ebcf56c5dec6ecb0695001becc87738177
NEXT_PUBLIC_CHAIN_ID=421614

# Optional (for server-side operations)
PRIVATE_KEY=your_private_key
```

## 📦 Dependencies

### Core
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling

### Web3
- **wagmi v2** - React hooks for Ethereum
- **viem** - Ethereum utilities

### UI
- **lucide-react** - Icons
- **react-hot-toast** - Notifications
- **recharts** - Charts

## 🎨 Design System

### Colors
```css
--groth16: #3b82f6;  /* Blue */
--plonk: #8b5cf6;    /* Purple */
--stark: #ec4899;    /* Pink */
--arbitrum: #28a0f0; /* Arbitrum blue */
```

### Typography
- Font: Inter, system-ui, sans-serif
- Responsive sizing with Tailwind

## 📱 Responsive Design

- **Mobile**: 640px+
- **Tablet**: 768px+
- **Desktop**: 1024px+

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel --prod
```

### Manual Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 📖 API Routes

### `POST /api/generate`
Generate proofs using complete-workflow script

**Request**:
```json
{
  "proofType": "groth16" | "plonk" | "stark"
}
```

### `POST /api/verify`
Verify proofs locally

**Response**:
```json
{
  "verified": true,
  "gasEstimate": 285432
}
```

### `POST /api/attest`
Submit attestation to Arbitrum

**Response**:
```json
{
  "txHash": "0x789...",
  "status": "success"
}
```

## 🔗 Links

- **GitHub**: https://github.com/draxxycodes/Universal-ZKV
- **Docs**: [../../docs/WEBSITE-DEMO-PLAN.md](../../docs/WEBSITE-DEMO-PLAN.md)
- **Arbitrum Sepolia**: https://sepolia.arbiscan.io

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ for the zero-knowledge proof community**
