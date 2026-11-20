// Railway helpers for the Kaneo image. Never prints secret values.
//   node railway-kaneo.mjs auth-secret   -> prints a usable AUTH_SECRET (>= 32 chars)
//   node railway-kaneo.mjs bucket-cors   -> allows browser uploads from KANEO_CLIENT_URL
//   node railway-kaneo.mjs admin         -> creates the first account from KANEO_ADMIN_*
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const log = (msg) => console.log(`[railway] ${msg}`);
const warn = (msg) => console.warn(`[railway] WARNING: ${msg}`);
const API = "http://127.0.0.1:1337/api";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authSecret() {
  const raw = (process.env.AUTH_SECRET ?? "").trim();
  if (raw.length >= 32) return raw;
  if (raw) {
    warn("AUTH_SECRET is shorter than 32 characters; using its SHA-256 instead. Set a 64-character value to silence this.");
    return createHash("sha256").update(raw).digest("hex");
  }
  warn("AUTH_SECRET is empty; using a random value, so everyone is signed out on each restart. Set AUTH_SECRET.");
  return randomBytes(32).toString("hex");
}

function corsOrigins() {
  const origins = [process.env.KANEO_CLIENT_URL, ...(process.env.CORS_ORIGINS ?? "").split(",")]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return [...new Set(origins)];
}

async function bucketCors() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    log("file storage not configured (S3_* empty): uploads stay off");
    return;
  }
  if ((process.env.S3_BUCKET_CORS ?? "true").toLowerCase() === "false") {
    log("S3_BUCKET_CORS=false: bucket CORS left unchanged");
    return;
  }
  const origins = corsOrigins();
  if (!origins.length) {
    warn("no valid KANEO_CLIENT_URL; bucket CORS not set");
    return;
  }
  const require = createRequire("/app/apps/api/package.json");
  const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
  const client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  const rule = {
    AllowedHeaders: ["*"],
    AllowedMethods: ["GET", "PUT", "HEAD"],
    AllowedOrigins: origins,
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  };
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await client.send(new PutBucketCorsCommand({ Bucket: S3_BUCKET, CORSConfiguration: { CORSRules: [rule] } }));
      log(`bucket CORS allows ${origins.join(", ")}`);
      return;
    } catch (error) {
      warn(`bucket CORS attempt ${attempt}/5 failed: ${error?.name ?? "error"} ${error?.message ?? ""}`.trim());
      await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
    }
  }
  warn("bucket CORS not set; browser uploads may fail until the next restart");
}

async function getJson(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
  return response.json();
}

async function admin() {
  let email = (process.env.KANEO_ADMIN_EMAIL ?? "").trim().toLowerCase();
  let password = process.env.KANEO_ADMIN_PASSWORD ?? "";
  const name = (process.env.KANEO_ADMIN_NAME ?? "").trim() || "Admin";
  let status;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      status = await getJson("/instance/status");
      break;
    } catch (error) {
      if (attempt === 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (status.hasUsers) {
    log("instance already has accounts: first-admin bootstrap skipped");
    return;
  }
  if (!EMAIL.test(email)) {
    warn("KANEO_ADMIN_EMAIL is not a valid e-mail; using admin@example.com for the first admin. Change the e-mail later in Settings.");
    email = "admin@example.com";
  }
  let locked = false;
  if (password.length < 8 || password.length > 128) {
    warn("KANEO_ADMIN_PASSWORD must be 8-128 characters; the admin account is created with a random password nobody knows. Use 'Forgot password' (needs SMTP) or delete the user in Postgres, set a valid KANEO_ADMIN_PASSWORD and redeploy.");
    password = randomBytes(24).toString("base64url");
    locked = true;
  }
  const origin = new URL(process.env.KANEO_CLIENT_URL || "http://localhost:5173").origin;
  const response = await fetch(`${API}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password, name }),
  });
  if (!response.ok) {
    const text = (await response.text()).slice(0, 300);
    throw new Error(`sign-up of the first admin failed: HTTP ${response.status} ${text}`);
  }
  const after = await getJson("/instance/status");
  log(`first admin ${email} created${locked ? " (locked, see warning above)" : ""}; instance admin present: ${after.hasAdmin}`);
}

const command = process.argv[2];
try {
  if (command === "auth-secret") process.stdout.write(authSecret());
  else if (command === "bucket-cors") await bucketCors();
  else if (command === "admin") await admin();
  else throw new Error(`unknown command ${command}`);
} catch (error) {
  console.error(`[railway] ERROR: ${error?.message ?? error}`);
  process.exit(1);
}
