// /api/snapshot — pensado para ser llamado por un cron EXTERNO (no el cron de Vercel,
// limitado a 1 vez/día en el plan Hobby) cada 15-30 min.
// Requiere la cabecera x-cron-key con el valor de la variable de entorno CRON_SECRET.
import { neon } from "@neondatabase/serverless";
import { PARK_IDS } from "./_parks.js";

export const config = { runtime: "edge" };

const sql = neon(process.env.DATABASE_URL);

async function fetchParkRides(parkId) {
  const res = await fetch(`https://queue-times.com/parks/${parkId}/queue_times.json`, {
    headers: { "user-agent": "colas-app-snapshot/1.0" },
  });
  if (!res.ok) throw new Error(`queue-times ${parkId}: http ${res.status}`);
  const data = await res.json();
  return [
    ...(data.rides || []),
    ...(data.lands || []).flatMap((l) => l.rides || []),
  ];
}

async function insertSnapshots(parkId, rides) {
  if (rides.length === 0) return 0;
  const values = [];
  const placeholders = rides.map((r, i) => {
    const base = i * 4;
    values.push(parkId, r.name, r.is_open ? (r.wait_time ?? 0) : null, !!r.is_open);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });
  const text = `INSERT INTO wait_snapshots (park_id, ride_name, wait_minutes, is_open) VALUES ${placeholders.join(",")}`;
  await sql.query(text, values);
  return rides.length;
}

// Limita cuántas parques se procesan en paralelo
async function runLimited(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export default async function handler(req) {
  const key = req.headers.get("x-cron-key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let parksProcessed = 0;
  let rowsInserted = 0;
  const errors = [];

  await runLimited(PARK_IDS, 5, async (parkId) => {
    try {
      const rides = await fetchParkRides(parkId);
      const n = await insertSnapshots(parkId, rides);
      parksProcessed += 1;
      rowsInserted += n;
    } catch (e) {
      errors.push({ parkId, error: String(e && e.message ? e.message : e) });
    }
  });

  return new Response(
    JSON.stringify({ success: true, parksProcessed, rowsInserted, errors }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
