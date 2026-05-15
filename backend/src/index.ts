import { getSandbox, Sandbox } from "@cloudflare/sandbox";

export { Sandbox };

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  DB: D1Database;
  ALLOWED_ORIGIN: string;
}

const DEMO_USER_ID = "demo-user";
const ONE_DAY_SECONDS = 24 * 60 * 60;
const EXEC_TIMEOUT_MS = 15_000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return preflight(env);
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true }, env);
    }

    if (url.pathname === "/api/run" && request.method === "POST") {
      return handleRun(request, env);
    }

    return json({ error: "not_found" }, env, 404);
  },
};

async function handleRun(request: Request, env: Env): Promise<Response> {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, env, 400);
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return json({ error: "empty_code" }, env, 400);
  }
  if (code.length > 50_000) {
    return json({ error: "code_too_large" }, env, 413);
  }

  const user = await env.DB.prepare(
    "SELECT id, daily_limit FROM users WHERE id = ?"
  )
    .bind(DEMO_USER_ID)
    .first<{ id: string; daily_limit: number }>();

  if (!user) {
    return json({ error: "user_not_found" }, env, 401);
  }

  const since = Math.floor(Date.now() / 1000) - ONE_DAY_SECONDS;
  const usage = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM execution_logs WHERE user_id = ? AND created_at > ?"
  )
    .bind(user.id, since)
    .first<{ n: number }>();

  if ((usage?.n ?? 0) >= user.daily_limit) {
    return json(
      { error: "rate_limited", limit: user.daily_limit },
      env,
      429,
    );
  }

  const sessionId = `${user.id}:${crypto.randomUUID()}`;
  const sandbox = getSandbox(env.Sandbox, sessionId);

  const started = Date.now();
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;

  try {
    await sandbox.writeFile("/tmp/script.py", code);
    const result = await sandbox.exec("python3 /tmp/script.py", {
      timeout: EXEC_TIMEOUT_MS,
    });
    stdout = result.stdout ?? "";
    stderr = result.stderr ?? "";
    exitCode = result.exitCode ?? null;
  } catch (err) {
    stderr = err instanceof Error ? err.message : String(err);
    exitCode = -1;
  }

  const durationMs = Date.now() - started;

  await env.DB.prepare(
    `INSERT INTO execution_logs
       (id, user_id, code, stdout, stderr, exit_code, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      user.id,
      code,
      stdout,
      stderr,
      exitCode,
      durationMs,
    )
    .run();

  return json({ stdout, stderr, exitCode, durationMs }, env);
}

function corsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(env),
    },
  });
}
