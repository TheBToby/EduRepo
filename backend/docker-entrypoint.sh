#!/bin/sh
# EduRepo Backend – Container-Entrypoint (Produktion)
# --------------------------------------------------------------------------
# 1. Datenbank-Schema anwenden:
#    - Falls Migrationen existieren (prisma/migrations): `prisma migrate deploy`
#    - Sonst (noch keine vorgenerierten Migrationen): `prisma db push`
# 2. Seed ausführen (idempotent: Kataloge upserten, Admin nur wenn fehlt).
# 3. Backend starten (exec → PID 1, Signale wie SIGTERM kommen durch).
# --------------------------------------------------------------------------
set -e

if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo ">> Prisma: applying migrations (migrate deploy) ..."
  npx prisma migrate deploy
else
  echo ">> Prisma: no migrations found, syncing schema (db push) ..."
  npx prisma db push --skip-generate
fi

echo ">> Prisma: seeding database (idempotent) ..."
node dist/prisma/seed.js

echo ">> Starting EduRepo backend ..."
exec "$@"