#!/bin/sh
# Railway start script for Kaneo, adapted from upstream deploy/kaneo-entrypoint.sh
# (MIT, Copyright (c) 2024 Andrej Acevski). Differences: the first admin account is
# created from KANEO_ADMIN_* before nginx opens the public port, the Railway Bucket
# gets a CORS rule for browser uploads, and unusable form values never stop the start.
set -eu

helper=/usr/local/lib/railway-kaneo.mjs
api_pid=""
nginx_pid=""

cleanup() {
  [ -n "$api_pid" ] && kill "$api_pid" 2>/dev/null || true
  [ -n "$nginx_pid" ] && kill "$nginx_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Public URL: KANEO_CLIENT_URL, else the Railway domain.
client_url="$(printf '%s' "${KANEO_CLIENT_URL:-}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
client_url="${client_url%/}"
case "$client_url" in
  http://*|https://*) ;;
  *)
    if [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
      [ -n "$client_url" ] && echo "[railway] WARNING: KANEO_CLIENT_URL is not an http(s) URL; using https://$RAILWAY_PUBLIC_DOMAIN"
      client_url="https://$RAILWAY_PUBLIC_DOMAIN"
    fi
    ;;
esac
export KANEO_CLIENT_URL="$client_url"
if [ -z "${KANEO_API_URL:-}" ] && [ -n "$client_url" ]; then
  export KANEO_API_URL="${client_url}/api"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[railway] ERROR: DATABASE_URL is empty. Reference the Postgres service: \${{Postgres.DATABASE_URL}}" >&2
  sleep 30
  exit 1
fi

AUTH_SECRET="$(node "$helper" auth-secret)"
export AUTH_SECRET

node "$helper" bucket-cors || echo "[railway] WARNING: bucket CORS step failed; continuing"

/docker-entrypoint.d/05-kaneo-runtime-storage.sh
/docker-entrypoint.d/env.sh

node --enable-source-maps /app/apps/api/dist/index.js &
api_pid=$!

echo "[railway] waiting for the Kaneo API (migrations run on start)..."
until wget -Y off --spider --quiet http://127.0.0.1:1337/api/health 2>/dev/null; do
  if ! kill -0 "$api_pid" 2>/dev/null; then
    echo "[railway] API process exited unexpectedly" >&2
    exit 1
  fi
  sleep 1
done
echo "[railway] API is ready"

# Fail closed: the public port stays shut until the first admin exists.
node "$helper" admin

nginx -e /dev/stderr -g "daemon off;" &
nginx_pid=$!
echo "[railway] Kaneo is listening on :5173 ($KANEO_CLIENT_URL)"

while kill -0 "$api_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 2
done

status=0
if ! kill -0 "$api_pid" 2>/dev/null; then
  wait "$api_pid" || status=$?
  echo "[railway] API exited with status $status" >&2
else
  wait "$nginx_pid" || status=$?
  echo "[railway] nginx exited with status $status" >&2
fi
cleanup
[ "$status" -eq 0 ] && status=1
exit "$status"
