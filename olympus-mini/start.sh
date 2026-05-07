#!/bin/bash
# Usage: ./start.sh app-search app-ads app-profile
# Starts the proxy + any combination of apps.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo "Stopping all processes..."
  kill 0 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

if [ "$#" -lt 1 ]; then
  echo "Usage: ./start.sh <app1> [app2] ..."
  exit 1
fi

# Kill any process already on each app's port
kill_port() {
  local pid
  pid=$(lsof -t -i:"$1" 2>/dev/null)
  [ -n "$pid" ] && kill "$pid" 2>/dev/null
}

for app in "$@"; do
  case "$app" in
    app-search)  kill_port 3001 ;;
    app-ads)     kill_port 3002 ;;
    app-profile) kill_port 3003 ;;
  esac
done

# Start proxy
echo "Starting proxy..."
node "$SCRIPT_DIR/proxy/server.js" &

# Start each app
for app in "$@"; do
  app_dir="$SCRIPT_DIR/apps/$app"
  if [ ! -d "$app_dir" ]; then
    echo "App '$app' not found at $app_dir"
    continue
  fi
  echo "Starting $app..."
  (cd "$app_dir" && npm run dev 2>&1 | sed "s/^/\x1b[36m[$app]\x1b[0m /") &
done

wait
