interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
}

interface Item {
  id: string;
  name: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  quantity: number;
  unit: string;
  price: number | null;
  low_stock_threshold: number;
  created_at: number;
  updated_at: number;
}

interface ItemBody {
  name?: unknown;
  description?: unknown;
  category_id?: unknown;
  quantity?: unknown;
  unit?: unknown;
  price?: unknown;
  low_stock_threshold?: unknown;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, method } = { pathname: url.pathname, method: request.method };

    if (method === "OPTIONS") return preflight(env);
    if (pathname === "/api/health") return json({ ok: true }, env);
    if (pathname === "/api/categories" && method === "GET") return getCategories(env);

    if (pathname === "/api/items") {
      if (method === "GET") return getItems(url, env);
      if (method === "POST") return createItem(request, env);
    }

    const match = pathname.match(/^\/api\/items\/([^/]+)$/);
    if (match) {
      const id = match[1];
      if (method === "GET") return getItem(id, env);
      if (method === "PUT") return updateItem(id, request, env);
      if (method === "DELETE") return deleteItem(id, env);
    }

    return json({ error: "not_found" }, env, 404);
  },
};

async function getCategories(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT id, name FROM categories ORDER BY name"
  ).all();
  return json(results, env);
}

async function getItems(url: URL, env: Env): Promise<Response> {
  const search = url.searchParams.get("search") ?? "";
  const catId = url.searchParams.get("category_id");
  const lowStock = url.searchParams.get("low_stock") === "true";

  let q = `
    SELECT i.*, c.name AS category_name
    FROM items i
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE 1=1
  `;
  const p: (string | number)[] = [];

  if (search) {
    q += " AND (i.name LIKE ? OR i.description LIKE ?)";
    p.push(`%${search}%`, `%${search}%`);
  }
  if (catId) {
    q += " AND i.category_id = ?";
    p.push(Number(catId));
  }
  if (lowStock) {
    q += " AND i.quantity <= i.low_stock_threshold";
  }
  q += " ORDER BY i.name";

  const { results } = await env.DB.prepare(q).bind(...p).all();
  return json(results, env);
}

async function getItem(id: string, env: Env): Promise<Response> {
  const item = await env.DB.prepare(`
    SELECT i.*, c.name AS category_name
    FROM items i
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.id = ?
  `).bind(id).first<Item>();
  if (!item) return json({ error: "not_found" }, env, 404);
  return json(item, env);
}

async function createItem(request: Request, env: Env): Promise<Response> {
  let body: ItemBody;
  try { body = await request.json(); }
  catch { return json({ error: "invalid_json" }, env, 400); }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return json({ error: "name is required" }, env, 400);

  const id = crypto.randomUUID();
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category_id = typeof body.category_id === "number" ? body.category_id : null;
  const quantity = typeof body.quantity === "number" ? Math.max(0, Math.floor(body.quantity)) : 0;
  const unit = typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : "unit";
  const price = typeof body.price === "number" && body.price >= 0 ? body.price : null;
  const low_stock_threshold = typeof body.low_stock_threshold === "number"
    ? Math.max(0, Math.floor(body.low_stock_threshold)) : 10;

  await env.DB.prepare(`
    INSERT INTO items (id, name, description, category_id, quantity, unit, price, low_stock_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, name, description, category_id, quantity, unit, price, low_stock_threshold).run();

  const item = await env.DB.prepare(`
    SELECT i.*, c.name AS category_name
    FROM items i LEFT JOIN categories c ON c.id = i.category_id WHERE i.id = ?
  `).bind(id).first();
  return json(item, env, 201);
}

async function updateItem(id: string, request: Request, env: Env): Promise<Response> {
  const exists = await env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(id).first();
  if (!exists) return json({ error: "not_found" }, env, 404);

  let body: ItemBody;
  try { body = await request.json(); }
  catch { return json({ error: "invalid_json" }, env, 400); }

  const fields: string[] = [];
  const p: (string | number | null)[] = [];

  if (typeof body.name === "string" && body.name.trim()) {
    fields.push("name = ?"); p.push(body.name.trim());
  }
  if (typeof body.description === "string") {
    fields.push("description = ?"); p.push(body.description.trim());
  }
  if ("category_id" in body) {
    fields.push("category_id = ?");
    p.push(typeof body.category_id === "number" ? body.category_id : null);
  }
  if (typeof body.quantity === "number") {
    fields.push("quantity = ?"); p.push(Math.max(0, Math.floor(body.quantity)));
  }
  if (typeof body.unit === "string" && body.unit.trim()) {
    fields.push("unit = ?"); p.push(body.unit.trim());
  }
  if ("price" in body) {
    fields.push("price = ?");
    p.push(typeof body.price === "number" && body.price >= 0 ? body.price : null);
  }
  if (typeof body.low_stock_threshold === "number") {
    fields.push("low_stock_threshold = ?");
    p.push(Math.max(0, Math.floor(body.low_stock_threshold)));
  }
  if (!fields.length) return json({ error: "nothing to update" }, env, 400);

  fields.push("updated_at = unixepoch()");
  p.push(id);

  await env.DB.prepare(`UPDATE items SET ${fields.join(", ")} WHERE id = ?`).bind(...p).run();

  const item = await env.DB.prepare(`
    SELECT i.*, c.name AS category_name
    FROM items i LEFT JOIN categories c ON c.id = i.category_id WHERE i.id = ?
  `).bind(id).first();
  return json(item, env);
}

async function deleteItem(id: string, env: Env): Promise<Response> {
  const exists = await env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(id).first();
  if (!exists) return json({ error: "not_found" }, env, 404);
  await env.DB.prepare("DELETE FROM items WHERE id = ?").bind(id).run();
  return json({ ok: true }, env);
}

function corsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function preflight(env: Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}
