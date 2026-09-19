/** Read-only: list production vendors + profiles for PHASE 4.1 prep. */
import { masterLoginPassword, masterLoginUsername } from "../src/lib/site-account";

const BASE = process.env.QA_BASE_URL || "https://mginfo.vercel.app";

async function main() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: masterLoginUsername(),
      password: masterLoginPassword(),
    }),
  });
  if (!login.ok) {
    console.error("login failed", await login.text());
    process.exit(1);
  }
  const setCookie = login.headers.getSetCookie?.() || [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    String(login.headers.get("set-cookie") || "")
      .split(",")
      .map((p) => p.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");

  const [vRes, pRes] = await Promise.all([
    fetch(`${BASE}/api/ad-vendors`, { headers: { Cookie: cookie } }),
    fetch(`${BASE}/api/vendor-profiles`, { headers: { Cookie: cookie } }),
  ]);
  const vendors = await vRes.json();
  const profiles = await pRes.json();
  const summary = {
    vendorCount: (vendors.vendors || []).length,
    vendors: (vendors.vendors || []).map((v: { id: string; name: string; phone?: string; address?: string }) => ({
      id: v.id,
      name: v.name,
      phone: v.phone || "",
      address: v.address || "",
    })),
    profileCount: (profiles.store?.profiles || []).length,
    animalCount: (profiles.store?.animals || []).length,
    animals: (profiles.store?.animals || []).map(
      (a: { id: string; vendorId: string; breed: string; status: string; name?: string }) => ({
        id: a.id,
        vendorId: a.vendorId,
        breed: a.breed,
        status: a.status,
        name: a.name || "",
      })
    ),
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
