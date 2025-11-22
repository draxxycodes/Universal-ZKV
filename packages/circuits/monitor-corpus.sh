#!/bin/bash
# Monitor Test Corpus Generation Progress
# Run this script to check progress: ./monitor-corpus.sh

CIRCUITS_DIR="/mnt/c/Users/priya/OneDrive/Documents/uzkv/packages/circuits"

echo "═══════════════════════════════════════════════════════"
echo "  Test Corpus Generation Monitor"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if process is running
if ps aux | grep "generate-test-corpus" | grep -v grep > /dev/null; then
    echo "✓ Generation process is running"
    PID=$(ps aux | grep "generate-test-corpus" | grep -v grep | awk '{print $2}')
    echo "  PID: $PID"
else
    echo "✗ Generation process not running"
fi

echo ""
echo "───────────────────────────────────────────────────────"
echo ""

# Show progress
cd "$CIRCUITS_DIR"
cmd.exe /c "node scripts/check-corpus-progress.cjs"

echo ""
echo "───────────────────────────────────────────────────────"
echo ""

# Show last 15 lines of log
if [ -f "corpus-generation.log" ]; then
    echo "Last log entries:"
    echo ""
    tail -n 15 corpus-generation.log
else
    echo "No log file found"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "To monitor continuously: watch -n 10 ./monitor-corpus.sh"
echo "═══════════════════════════════════════════════════════"
