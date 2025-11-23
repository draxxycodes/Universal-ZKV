# Quick Start: Production Workflow

## Prerequisites

- Node.js 18+ installed
- Redis server running

## Setup (5 minutes)

### 1. Install Redis

**Windows (WSL):**

```bash
sudo apt update && sudo apt install redis-server -y
sudo service redis-server start
```

**macOS:**

```bash
brew install redis
brew services start redis
```

**Docker:**

```bash
docker run -d -p 6379:6379 --name uzkv-redis redis:alpine
```

Verify:

```bash
redis-cli ping
# Should return: PONG
```

### 2. Configure Environment

```bash
cd apps/web
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Optional - for attestation phase
PRIVATE_KEY=your_private_key_here
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Test Workflow

1. Open: http://localhost:3000/demo
2. Select proof type (groth16, plonk, or stark)
3. Click "Run Complete Workflow"
4. Watch real-time logs stream!

## What You'll See

```
Phase 1: Generating Proofs (0% → 33%)
├─ 📦 Starting proof generation...
├─ 🔄 Processing circuits...
├─ ✅ Generated: groth16_proof.json
└─ Progress: 33%

Phase 2: Verifying Proofs (33% → 66%)
├─ 📦 Starting verification with UZKV...
├─ ✅ Verified 3 circuits
├─ ⚡ Gas estimate: 500,000
└─ Progress: 66%

Phase 3: Attesting On-Chain (66% → 100%)
├─ 📦 Starting attestation...
├─ 🔗 Transaction: 0x123...
├─ ⏳ Waiting for confirmation...
├─ ✅ Attested on Arbitrum Sepolia
└─ Progress: 100%

🎉 Complete workflow finished!
```

## Troubleshooting

### Redis Connection Error

```bash
# Check if Redis is running
redis-cli ping

# Restart Redis
sudo service redis-server restart  # Linux/WSL
brew services restart redis         # macOS
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Package Issues

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install --legacy-peer-deps
```

## Next Steps

- Check `PRODUCTION-WORKFLOW-IMPLEMENTATION.md` for architecture details
- See `REDIS-SETUP.md` for advanced Redis configuration
- Review `apps/web/src/lib/redis.ts` for state management code
- Explore `apps/web/src/app/api/workflow/route.ts` for SSE implementation

## Support

If you encounter issues:

1. Check Redis is running: `redis-cli ping`
2. Verify environment variables in `.env.local`
3. Check Next.js console for errors
4. Review browser console for SSE connection issues
