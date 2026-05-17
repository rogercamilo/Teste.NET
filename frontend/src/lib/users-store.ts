/**
 * Server-side user store backed by a JSON file at <project>/data/users-auth.json.
 * Created automatically on first access with a single admin account.
 * Set SEED_ADMIN_PASSWORD env var before first boot; otherwise a random strong
 * password is generated and printed to stdout once.
 * NEVER import this module in client components — it uses Node.js 'fs'.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

export interface UserAuth {
  id: string;
  nome: string;
  email: string;
  passwordHash?: string; // undefined for Google-only accounts
  perfil: "administrador" | "formador_geral" | "formador_comunitario";
  moradaId?: string;
  ativo: boolean;
  criadoEm: string;
  primeiroAcesso?: boolean;
}

export type UserPublic = Omit<UserAuth, "passwordHash">;

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "users-auth.json");

export function generateRandomPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "@#$!%*?&";
  const all = lower + upper + digits + special;

  const pick = (charset: string) => charset[randomBytes(1)[0] % charset.length];
  const required = [pick(lower), pick(upper), pick(digits), pick(special)];
  const rest = Array.from(randomBytes(8), (b) => all[b % all.length]);

  const arr = [...required, ...rest];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const key = scryptSync(password, salt, 64);
    return timingSafeEqual(key, Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

function ensureFile(): UserAuth[] {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) {
    const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? generateRandomPassword();
    if (!process.env.SEED_ADMIN_PASSWORD) {
      // Log only on first boot so the operator can set the initial password.
      console.warn(`[SEED] Admin password gerada automaticamente: ${seedPassword}`);
    }
    const initial: UserAuth[] = [
      {
        id: "u1",
        nome: "Roger",
        email: "rogercmdb@gmail.com",
        passwordHash: hashPassword(seedPassword),
        perfil: "administrador",
        ativo: true,
        criadoEm: new Date().toISOString().split("T")[0],
        primeiroAcesso: true,
      },
    ];
    writeFileSync(FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  return JSON.parse(readFileSync(FILE, "utf-8")) as UserAuth[];
}

function persist(users: UserAuth[]): void {
  writeFileSync(FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function listUsers(): UserAuth[] {
  return ensureFile();
}

export function findByEmail(email: string): UserAuth | undefined {
  return listUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findById(id: string): UserAuth | undefined {
  return listUsers().find((u) => u.id === id);
}

export function authenticate(email: string, password: string): UserAuth | null {
  const user = findByEmail(email);
  if (!user || !user.ativo || !user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export function createUser(
  data: Omit<UserAuth, "id" | "criadoEm" | "passwordHash"> & { password?: string }
): { user: UserAuth; tempPassword?: string } {
  const users = listUsers();
  const tempPassword = !data.password ? generateRandomPassword() : undefined;
  const password = data.password ?? tempPassword!;
  const newUser: UserAuth = {
    id: `u${Date.now()}`,
    nome: data.nome,
    email: data.email,
    passwordHash: hashPassword(password),
    perfil: data.perfil,
    moradaId: data.moradaId || undefined,
    ativo: data.ativo,
    criadoEm: new Date().toISOString().split("T")[0],
    primeiroAcesso: tempPassword !== undefined ? true : (data.primeiroAcesso ?? false),
  };
  users.push(newUser);
  persist(users);
  return { user: newUser, tempPassword };
}

export function updateUser(
  id: string,
  data: Partial<Omit<UserAuth, "id" | "criadoEm" | "passwordHash">> & { password?: string }
): UserAuth | null {
  const users = listUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const { password, ...rest } = data;
  const updated: UserAuth = {
    ...users[idx],
    ...rest,
    ...(password ? { passwordHash: hashPassword(password) } : {}),
  };
  users[idx] = updated;
  persist(users);
  return updated;
}

export function deleteUser(id: string): boolean {
  const users = listUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;
  persist(filtered);
  return true;
}

export function toPublic(u: UserAuth): UserPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...pub } = u;
  return pub;
}
