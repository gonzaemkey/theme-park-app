// Vercel Serverless Function: /api/queue-times?id=<parkId>
// Hace de intermediario con Queue-Times.com para evitar el problema de CORS en el navegador.
// Corre en el servidor de Vercel, así que no hay límite de un proxy de terceros.

export const config = { runtime: "edge" };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !/^\d+$/.test(id)) {
    return new Response(JSON.stringify({ error: "id de parque inválido" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const upstream = await fetch(`https://queue-times.com/parks/${id}/queue_times.json`, {
    headers: { "user-agent": "colas-app/1.0" },
  });

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "queue-times.com no respondió" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const data = await upstream.text();
  return new Response(data, {
    status: 200,
    headers: {
      "content-type": "application/json",
      // cache breve en el edge: la API fuente se actualiza cada 5 min
      "cache-control": "public, s-maxage=120, stale-while-revalidate=60",
      "access-control-allow-origin": "*",
    },
  });
}
