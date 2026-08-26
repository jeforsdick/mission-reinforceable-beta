#!/usr/bin/env bash
set -euo pipefail

# Destructive operations are deliberately restricted to the local Supabase stack.
# Never add --linked or a production database URL to this script.
if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required" >&2
  exit 127
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required by the local Supabase stack" >&2
  exit 127
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "Starting the isolated local Supabase stack..."
supabase start

echo "Rebuilding the local database from every committed migration..."
supabase db reset --local

echo "Checking the replayed schema for database errors..."
supabase db lint --local --level error

echo "Running repository migration-order and architecture checks..."
node --test scripts/supabase-migration-order.test.mjs

echo "Clean local Supabase replay passed."
