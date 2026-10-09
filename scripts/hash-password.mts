/**
 * Membuat RESEARCHER_PASSWORD_HASH (scrypt) dari kata sandi peneliti.
 * Pemakaian: node scripts/hash-password.mts "kata sandi"
 * Simpan hasilnya sebagai environment variable; kata sandi asli tidak perlu disimpan di server.
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Berikan kata sandi minimal 12 karakter sebagai argumen.");
  process.exit(1);
}
// Parameter harus sama dengan src/lib/auth/session.ts.
const N = 2 ** 15, r = 8, p = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 });
console.log(["scrypt", N, r, p, salt.toString("base64"), hash.toString("base64")].join(":"));
