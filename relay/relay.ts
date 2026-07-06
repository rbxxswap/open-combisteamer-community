// Open-Combisteamer Community-Relay (Deno Deploy)
// Nimmt Rezepte/Profile entgegen, prueft sie und legt einen Pull Request an.
// Das GitHub-Token liegt NUR hier als Umgebungsvariable GH_TOKEN (nie am Geraet).

const REPO = Deno.env.get("REPO") ?? "rbxxswap/open-combisteamer-community";
const BASE = Deno.env.get("BASE_BRANCH") ?? "master";
const TOKEN = Deno.env.get("GH_TOKEN") ?? "";
const API = "https://api.github.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function gh(path: string, init: RequestInit = {}) {
  return fetch(API + path, {
    ...init,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ocs-relay",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function num(v: unknown) { return typeof v === "number" && isFinite(v); }

function validate(type: string, d: any): string | null {
  if (!d || typeof d !== "object") return "kein Objekt";
  if (type === "rezept") {
    if (d.schema !== "garprogramm/v1") return "falsches Schema";
    if (!Array.isArray(d.phasen) || d.phasen.length < 1) return "keine Phasen";
    for (const p of d.phasen) {
      if (!num(p.temperatur_c) || p.temperatur_c < 0 || p.temperatur_c > 300) return "Temperatur ausserhalb 0..300";
      if (!num(p.feuchte_pct) || p.feuchte_pct < 0 || p.feuchte_pct > 100) return "Feuchte ausserhalb 0..100";
      if (!["daempfen","dampf","heissluft","kombi"].includes(String(p.betriebsart))) return "unbekannte Betriebsart";
    }
    return null;
  }
  if (type === "profil") {
    if (d.schema !== "hwprofil/v1") return "falsches Schema";
    if (num(d.heizleistung_w) && (d.heizleistung_w < 0 || d.heizleistung_w > 40000)) return "Heizleistung unplausibel";
    if (num(d.max_temp_c) && (d.max_temp_c < 50 || d.max_temp_c > 350)) return "max. Temperatur unplausibel";
    return null;
  }
  return "unbekannter Typ";
}

async function makePR(type: string, data: any): Promise<string> {
  const id = (data.id && String(data.id).replace(/[^a-zA-Z0-9_-]/g,"")) || crypto.randomUUID();
  const dir = type === "profil" ? "profile/incoming" : "rezepte/incoming";
  const path = `${dir}/${id}.json`;
  const branch = `contrib/${type}-${id}-${Date.now()}`;

  const refRes = await gh(`/repos/${REPO}/git/ref/heads/${BASE}`);
  if (!refRes.ok) throw new Error("base ref: " + refRes.status);
  const baseSha = (await refRes.json()).object.sha;

  const brRes = await gh(`/repos/${REPO}/git/refs`, { method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }) });
  if (!brRes.ok) throw new Error("branch: " + brRes.status);

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const fRes = await gh(`/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method: "PUT",
    body: JSON.stringify({ message: `Beitrag: ${type} ${data.name ?? id}`, content, branch }) });
  if (!fRes.ok) throw new Error("file: " + fRes.status);

  const prRes = await gh(`/repos/${REPO}/pulls`, { method: "POST",
    body: JSON.stringify({ title: `Beitrag: ${type} – ${data.name ?? id}`, head: branch, base: BASE,
      body: "Automatischer Community-Beitrag ueber den Relay. Bitte pruefen." }) });
  if (!prRes.ok) throw new Error("pr: " + prRes.status);
  return (await prRes.json()).html_url;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("ocs-relay ok", { headers: CORS });
  if (!TOKEN) return Response.json({ ok:false, error:"GH_TOKEN fehlt" }, { status:500, headers:CORS });
  try {
    const body = await req.json();
    const type = String(body.type ?? "rezept");
    const err = validate(type, body.data);
    if (err) return Response.json({ ok:false, error:err }, { status:400, headers:CORS });
    const url = await makePR(type, body.data);
    return Response.json({ ok:true, pr:url }, { headers:CORS });
  } catch (e) {
    return Response.json({ ok:false, error:String(e) }, { status:500, headers:CORS });
  }
});
