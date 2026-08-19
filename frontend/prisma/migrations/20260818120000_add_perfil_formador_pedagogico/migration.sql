-- O perfil `formador_pedagogico` já existia no tipo TypeScript, no PerfilEnum (Zod)
-- e na UI (cadastro/convite), mas o valor NUNCA foi adicionado ao enum Postgres.
-- Consequência: criar usuário com esse perfil passava na validação Zod e falhava no
-- INSERT do Prisma (valor de enum inválido) → 500 "Falha ao criar usuário".
ALTER TYPE "PerfilUsuario" ADD VALUE IF NOT EXISTS 'formador_pedagogico';
