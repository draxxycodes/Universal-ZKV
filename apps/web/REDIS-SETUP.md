# Redis Setup for UZKV Workflow

## Quick Start

### Option 1: Local Redis (Recommended for Development)

#### Windows (WSL):

```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Verify it's running
redis-cli ping
# Should return: PONG
```

#### macOS:

```bash
# Install via Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify
redis-cli ping
```

#### Docker (Cross-platform):

```bash
# Run Redis container
docker run -d -p 6379:6379 --name uzkv-redis redis:alpine

# Verify
docker exec uzkv-redis redis-cli ping
```

### Option 2: Cloud Redis (Production)

Use services like:

- **Upstash** (https://upstash.com) - Free tier available
- **Redis Cloud** (https://redis.com/cloud) - Free tier available
- **AWS ElastiCache**
- **Azure Cache for Redis**

## Configuration

1. Copy the example environment file:

```bash
cd apps/web
cp .env.local.example .env.local
```

2. Edit `.env.local` with your Redis settings:

```env
# Local Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# For cloud Redis, use your connection details
# REDIS_HOST=your-redis-host.upstash.io
# REDIS_PORT=6379
# REDIS_PASSWORD=your-password
```

3. Restart your Next.js dev server:

```bash
npm run dev
```

## How It Works

The workflow uses Redis to:

1. **Store Session State**: Each workflow gets a unique session ID stored in Redis
2. **Persist Proofs**: Generated proof file paths are stored for verification phase
3. **Track Progress**: Real-time progress updates (0% → 33% → 66% → 100%)
4. **Cache Results**: Verification results and transaction hashes stored for 1 hour
5. **Handle Recovery**: If the stream disconnects, state is preserved in Redis

## Session Lifecycle

```
User clicks "Run Complete Workflow"
    ↓
Frontend creates sessionId and connects to SSE stream
    ↓
Backend creates Redis session (TTL: 1 hour)
    ↓
Phase 1: Generate proofs → Store proof files in Redis
    ↓
Phase 2: Verify proofs → Read from Redis, store results
    ↓
Phase 3: Attest on-chain → Store transaction hashes
    ↓
Complete event sent → Frontend displays results
    ↓
Session auto-expires after 1 hour
```

## Troubleshooting

### "Connection refused" error

- Make sure Redis is running: `redis-cli ping`
- Check if port 6379 is available: `netstat -an | grep 6379`

### "Authentication failed" error

- Verify REDIS_PASSWORD in `.env.local` matches your Redis config

### Sessions not persisting

- Check Redis memory: `redis-cli INFO memory`
- Increase maxmemory if needed: `redis-cli CONFIG SET maxmemory 256mb`

## Testing

Test your Redis connection:

```bash
cd apps/web
node -e "
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379
});
redis.ping().then(r => console.log('Redis connected:', r));
"
```

Should output: `Redis connected: PONG`
