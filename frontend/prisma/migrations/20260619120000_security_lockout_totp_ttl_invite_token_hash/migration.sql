-- Security: account lockout, TOTP setup TTL, invite token hashing
-- (invite token: cuid() was Prisma client-side — no DB default to drop)

ALTER TABLE "Usuario" ADD COLUMN "mfaSecretExpiresAt" TIMESTAMP(3);
ALTER TABLE "Usuario" ADD COLUMN "loginFailures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Usuario" ADD COLUMN "lockedUntil" TIMESTAMP(3);
