const SNOV_BASE = "https://api.snov.io";

let cachedToken: { token: string; expiresAt: number } | null = null;

function hasSnovKeys(): boolean {
  return Boolean(process.env.SNOV_CLIENT_ID && process.env.SNOV_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string | null> {
  if (!hasSnovKeys()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  try {
    const res = await fetch(`${SNOV_BASE}/v1/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.SNOV_CLIENT_ID,
        client_secret: process.env.SNOV_CLIENT_SECRET,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000,
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

export interface SnovEmailResult {
  email: string;
  status: "verified" | "guessed" | "unknown";
  source: "snov" | "demo";
}

/**
 * Waterfall step used when Apollo did not return a verified email for a contact:
 * Snov.io "Get emails from names" + verification status.
 */
export async function findAndVerifyEmail(
  firstName: string,
  lastName: string,
  domain: string
): Promise<SnovEmailResult> {
  const token = await getAccessToken();
  if (!token) return demoEmail(firstName, lastName, domain);

  try {
    const findRes = await fetch(
      `${SNOV_BASE}/v1/get-emails-from-names?` +
        new URLSearchParams({
          access_token: token,
          firstName,
          lastName,
          domain,
        }).toString()
    );
    if (!findRes.ok) return demoEmail(firstName, lastName, domain);
    const findData = await findRes.json();
    const best = (findData.data ?? []).find((e: any) => e.email) ?? findData.data?.[0];
    const email: string | undefined = best?.email;
    if (!email) return demoEmail(firstName, lastName, domain);

    const verifyRes = await fetch(
      `${SNOV_BASE}/v1/get-emails-verification-status?` +
        new URLSearchParams({
          access_token: token,
          emails: email,
        }).toString()
    );
    if (verifyRes.ok) {
      const verifyData = await verifyRes.json();
      const result = (verifyData.data ?? [])[0];
      const status = result?.status === "valid" ? "verified" : "guessed";
      return { email, status, source: "snov" };
    }
    return { email, status: "guessed", source: "snov" };
  } catch {
    return demoEmail(firstName, lastName, domain);
  }
}

function demoEmail(firstName: string, lastName: string, domain: string): SnovEmailResult {
  const local = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, "");
  return { email: `${local}@${domain}`, status: "guessed", source: "demo" };
}
