#!/bin/sh
set -eu

echo "Generating Prisma client..."
npx prisma generate

if [ -d "prisma/migrations" ] && [ "$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l)" -gt 0 ]; then
  echo "Applying Prisma migrations..."
  npx prisma migrate deploy
else
  echo "No Prisma migrations found; syncing schema with prisma db push..."
  npx prisma db push
fi

if [ ! -f ".next/BUILD_ID" ]; then
  echo "Building Next.js app..."
  npm run build
else
  echo "Existing Next.js build found, skipping rebuild."
fi

echo "Starting Next.js..."
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
