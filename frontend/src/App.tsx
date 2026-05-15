import { useState } from "react";

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

const SAMPLE = `print("Hello from inside the Sandbox")
import sys, platform
print("python:", sys.version.split()[0])
print("host:", platform.platform())
`;

export default function App() {
  const [code, setCode] = useState(SAMPLE);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data as RunResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>ISA Sandbox Playground</h1>
        <p className="sub">
          Python code is executed inside an isolated Cloudflare Sandbox
          container. The Worker never trusts what you type here.
        </p>
      </header>

      <section className="editor">
        <label htmlFor="code">Python</label>
        <textarea
          id="code"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="actions">
          <button onClick={run} disabled={running || !code.trim()}>
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </section>

      <section className="output">
        <h2>Output</h2>
        {error && <pre className="err">Error: {error}</pre>}
        {result && (
          <>
            <div className="meta">
              exit {result.exitCode ?? "?"} · {result.durationMs} ms
            </div>
            {result.stdout && <pre className="stdout">{result.stdout}</pre>}
            {result.stderr && <pre className="stderr">{result.stderr}</pre>}
            {!result.stdout && !result.stderr && (
              <pre className="muted">(no output)</pre>
            )}
          </>
        )}
        {!error && !result && !running && (
          <pre className="muted">Press Run to execute.</pre>
        )}
      </section>
    </main>
  );
}
