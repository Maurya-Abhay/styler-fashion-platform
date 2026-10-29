import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

export function validatePassword(password: string): void {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`);
  }
  if (/\s/.test(password)) throw new Error("Password must not contain whitespace.");
}

export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  if (!Number.isInteger(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 15) {
    throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 15.");
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

let dummyHashPromise: Promise<string> | null = null;

/** Burn the same bcrypt cost as a real check so unknown emails are not distinguishable by timing. */
export async function burnPasswordCheck(password: string): Promise<void> {
  if (!dummyHashPromise) dummyHashPromise = bcrypt.hash("styler-timing-equalizer", BCRYPT_ROUNDS);
  try { await bcrypt.compare(typeof password === "string" ? password : "", await dummyHashPromise); } catch { /* ignore */ }
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (typeof password !== "string" || typeof passwordHash !== "string" || !passwordHash) return false;
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}
