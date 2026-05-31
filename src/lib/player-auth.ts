import process from "node:process";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

function getPepper(): string {
  const pepper = process.env.PEPPER_SECRET;
  if (!pepper && process.env.NODE_ENV !== "production") {
    console.warn(
      "PEPPER_SECRET is not set. Player passwords will be hashed without a pepper.",
    );
  }
  return pepper ?? "";
}

export async function hashPlayerPassword(password: string): Promise<string> {
  return bcrypt.hash(getPepper() + password, SALT_ROUNDS);
}

export async function verifyPlayerPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(getPepper() + password, hash);
}
