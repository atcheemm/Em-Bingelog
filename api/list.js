// Em's Bingelog — cloud storage endpoint (Vercel Serverless Function)
// Reads/writes the whole show list to a Vercel KV (Upstash Redis) store.
// No npm dependencies: talks to the Upstash REST API with built-in fetch.

const STORE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const STORE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "emsbingelog:list";

export default async function handler(req, res) {
  if (!STORE_URL || !STORE_TOKEN) {
    res.status(500).json({
      error: "Storage not configured. In Vercel, create a KV (Upstash Redis) store, connect it to this project, and redeploy.",
    });
    return;
  }

  const auth = { Authorization: `Bearer ${STORE_TOKEN}` };

  try {
    if (req.method === "GET") {
      const r = await fetch(`${STORE_URL}/get/${KEY}`, { headers: auth });
      const d = await r.json();
      let shows = [];
      if (d && typeof d.result === "string" && d.result) {
        try { shows = JSON.parse(d.result); } catch (e) { shows = []; }
      }
      res.status(200).json({ shows: Array.isArray(shows) ? shows : [] });
      return;
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      const shows = body && Array.isArray(body.shows) ? body.shows : [];
      const value = JSON.stringify(shows);
      const r = await fetch(`${STORE_URL}/set/${KEY}`, {
        method: "POST",
        headers: auth,
        body: value,
      });
      if (!r.ok) { res.status(502).json({ error: "Write failed" }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
