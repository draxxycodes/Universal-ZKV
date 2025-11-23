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
│   │   ├── ProofGenerator.tsx
│   │   ├── VerificationDisplay.tsx
│   │   └── GasChart.tsx
│   └── lib/                    # Utilities
│       ├── wagmi.ts            # Web3 config
│       └── contracts.ts        # Contract ABIs
├── public/                     # Static assets
│   └── proofs/                 # Sample proofs
└── package.json
```

## 🎯 Features

### Landing Page
- Hero section with 3 proof systems
- Feature comparison table
- Live network statistics
- Architecture diagram

### Interactive Demo
- Complete workflow: Generate → Verify → Attest
- Real-time progress tracking
- Gas cost display
- Transaction links to Arbiscan

### Gas Comparison
- Interactive charts (Groth16 vs PLONK vs STARK)
- Cost calculator
- Benchmark tables
- Stylus vs Solidity comparison

### Attestation Explorer
- Search by proof hash
- Recent attestations list
- Network statistics
- Transaction history

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
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### Web3
- **wagmi v2** - React hooks for Ethereum
- **viem** - Ethereum utilities
- **@uzkv/sdk** - Universal verifier SDK

### UI
- **shadcn/ui** - UI components
- **recharts** - Charts
- **lucide-react** - Icons
- **react-hot-toast** - Notifications

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
- **Large**: 1280px+

## 🧪 Testing

```bash
# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

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
Generate proof for a circuit

**Request**:
```json
{
  "circuit": "poseidon_test",
  "proofType": "groth16",
  "inputs": { /* circuit inputs */ }
}
```

**Response**:
```json
{
  "proof": { /* proof data */ },
  "publicInputs": [/* public signals */]
}
```

### `POST /api/verify`
Verify proof locally

**Request**:
```json
{
  "proof": { /* proof data */ },
  "publicInputs": [/* public signals */],
  "proofType": "groth16"
}
```

**Response**:
```json
{
  "verified": true,
  "gasEstimate": 285432
}
```

### `POST /api/attest`
Submit attestation to Arbitrum

**Request**:
```json
{
  "proofHash": "0x123...",
  "signature": "0xabc..."
}
```

**Response**:
```json
{
  "txHash": "0x789...",
  "status": "success"
}
```

## 🔗 Links

- **Live Demo**: https://uzkv.vercel.app
- **GitHub**: https://github.com/draxxycodes/Universal-ZKV
- **Docs**: [/docs/WEBSITE-DEMO-PLAN.md](../../docs/WEBSITE-DEMO-PLAN.md)
- **Arbitrum Sepolia**: https://sepolia.arbiscan.io

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ for the zero-knowledge proof community**
