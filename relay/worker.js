// Open-Combisteamer Community-Relay — Cloudflare Worker
// Bindings:  GH_TOKEN (Secret, GitHub-PAT)   RATINGS (KV-Namespace)
// Endpunkte:
//   POST {type,data}                      -> legt Pull Request an (Beitrag)
//   POST {action:"rate",id,version,stars,comment?}  -> Bewertung speichern (KV)
//   GET  /?ratings=id@ver,id@ver          -> {id@ver:{avg,count}}
//   GET  /?comments=id@ver                -> [{stars,comment,ts}]
const REPO = "rbxxswap/open-combisteamer-community";
const BASE = "master";
const API  = "https://api.github.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function J(obj, status){ return new Response(JSON.stringify(obj), { status: status||200, headers: { ...CORS, "Content-Type":"application/json" } }); }
function num(v){ return typeof v==="number" && isFinite(v); }
function clean(s){ return String(s||"").replace(/[^a-zA-Z0-9_-]/g,""); }
function cleanVer(v){ return (String(v||"1").replace(/[^0-9]/g,"")) || "1"; }

function gh(token, path, init){
  init = init || {};
  return fetch(API + path, { ...init, headers: {
    "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ocs-relay",
    "Content-Type": "application/json", ...(init.headers||{}) } });
}
function validate(type, d){
  if(!d || typeof d!=="object") return "kein Objekt";
  if(type==="rezept"){
    if(d.schema!=="garprogramm/v1") return "falsches Schema";
    if(!Array.isArray(d.phasen)||d.phasen.length<1) return "keine Phasen";
    for(const p of d.phasen){
      if(!num(p.temperatur_c)||p.temperatur_c<0||p.temperatur_c>300) return "Temperatur außerhalb 0..300";
      if(!num(p.feuchte_pct)||p.feuchte_pct<0||p.feuchte_pct>100) return "Feuchte außerhalb 0..100";
      if(!["daempfen","dampf","heissluft","kombi"].includes(String(p.betriebsart))) return "unbekannte Betriebsart";
    }
    return null;
  }
  if(type==="profil"){
    if(d.schema!=="hwprofil/v1") return "falsches Schema";
    if(num(d.heizleistung_w)&&(d.heizleistung_w<0||d.heizleistung_w>40000)) return "Heizleistung unplausibel";
    if(num(d.max_temp_c)&&(d.max_temp_c<50||d.max_temp_c>350)) return "max. Temperatur unplausibel";
    return null;
  }
  return "unbekannter Typ";
}
async function makePR(token, type, data, image){
  const id  = clean(data.id) || crypto.randomUUID();
  const dir = type==="profil" ? "profile/incoming" : "rezepte/incoming";
  const path= `${dir}/${id}.json`;
  const branch = `contrib/${type}-${id}-${Date.now()}`;
  const refRes = await gh(token, `/repos/${REPO}/git/ref/heads/${BASE}`);
  if(!refRes.ok) throw new Error("base ref: "+refRes.status);
  const baseSha = (await refRes.json()).object.sha;
  const brRes = await gh(token, `/repos/${REPO}/git/refs`, { method:"POST", body: JSON.stringify({ ref:`refs/heads/${branch}`, sha: baseSha }) });
  if(!brRes.ok) throw new Error("branch: "+brRes.status);
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2))));
  const fRes = await gh(token, `/repos/${REPO}/contents/${encodeURIComponent(path)}`, { method:"PUT", body: JSON.stringify({ message:`Beitrag: ${type} ${data.name||id}`, content, branch }) });
  if(!fRes.ok) throw new Error("file: "+fRes.status);
  if(image && type!=="profil"){
    const imgPath = `rezepte/images/${id}.jpg`;
    await gh(token, `/repos/${REPO}/contents/${encodeURIComponent(imgPath)}`, { method:"PUT", body: JSON.stringify({ message:`Bild: ${id}`, content: image, branch }) });
  }
  const prRes = await gh(token, `/repos/${REPO}/pulls`, { method:"POST", body: JSON.stringify({ title:`Beitrag: ${type} - ${data.name||id}`, head: branch, base: BASE, body:"Automatischer Community-Beitrag über den Relay. Bitte prüfen." }) });
  if(!prRes.ok) throw new Error("pr: "+prRes.status);
  return (await prRes.json()).html_url;
}
async function rate(env, d){
  if(!env.RATINGS) return J({ ok:false, error:"KV RATINGS nicht gebunden" }, 500);
  const id = clean(d.id); const ver = cleanVer(d.version);
  const stars = Math.round(Number(d.stars));
  if(!id) return J({ ok:false, error:"id fehlt" }, 400);
  if(!(stars>=1 && stars<=5)) return J({ ok:false, error:"stars 1..5" }, 400);
  const ak = `agg:${id}:${ver}`;
  const cur = JSON.parse((await env.RATINGS.get(ak)) || '{"sum":0,"count":0}');
  cur.sum += stars; cur.count += 1;
  await env.RATINGS.put(ak, JSON.stringify(cur));
  const comment = String(d.comment||"").slice(0,280).trim();
  if(comment){
    const ck = `com:${id}:${ver}`;
    const list = JSON.parse((await env.RATINGS.get(ck)) || "[]");
    list.unshift({ stars, comment, ts: Date.now() });
    await env.RATINGS.put(ck, JSON.stringify(list.slice(0,50)));
  }
  return J({ ok:true, avg: cur.sum/cur.count, count: cur.count });
}
async function ratings(env, ids){
  const out = {};
  if(!env.RATINGS) return J(out);
  for(const raw of ids){
    const parts = String(raw).split("@");
    const key = `agg:${clean(parts[0])}:${cleanVer(parts[1])}`;
    const a = await env.RATINGS.get(key);
    out[raw] = a ? (()=>{ const o=JSON.parse(a); return { avg:o.sum/o.count, count:o.count }; })() : { avg:0, count:0 };
  }
  return J(out);
}
async function comments(env, raw){
  if(!env.RATINGS) return J([]);
  const parts = String(raw).split("@");
  const c = await env.RATINGS.get(`com:${clean(parts[0])}:${cleanVer(parts[1])}`);
  return J(c ? JSON.parse(c) : []);
}
export default {
  async fetch(req, env){
    if(req.method==="OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if(req.method==="GET"){
      if(url.searchParams.has("ratings")) return ratings(env, url.searchParams.get("ratings").split(",").filter(Boolean));
      if(url.searchParams.has("comments")) return comments(env, url.searchParams.get("comments"));
      return new Response("ocs-relay ok", { headers: CORS });
    }
    if(req.method!=="POST") return new Response("ocs-relay ok", { headers: CORS });
    let body; try { body = await req.json(); } catch(e){ return J({ ok:false, error:"kein JSON" }, 400); }
    const action = String(body.action||"");
    if(action==="rate")     return rate(env, body);
    if(action==="ratings")  return ratings(env, body.ids||[]);
    if(action==="comments") return comments(env, body.id);
    if(!env.GH_TOKEN) return J({ ok:false, error:"GH_TOKEN fehlt" }, 500);
    const type = String(body.type||"rezept");
    const err = validate(type, body.data);
    if(err) return J({ ok:false, error: err }, 400);
    try { const pr = await makePR(env.GH_TOKEN, type, body.data, body.image); return J({ ok:true, pr }); }
    catch(e){ return J({ ok:false, error: String(e) }, 500); }
  }
};