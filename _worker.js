export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // TEST 1: The Subrequest
    // Cloudflare tracks every time your worker talks to an external server.
    if (url.pathname === '/api/normal') {
      const externalApiCall = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      const data = await externalApiCall.json();
      return new Response(`Subrequest completed! Fetched data: ${data.title}`, { status: 200 });
    }

    // TEST 2: The CPU Spike
    // This forces the processor to do heavy math, raising the "CPU Time" metric.
    if (url.pathname === '/api/heavy') {
      let uselessMath = 0;
      for (let i = 0; i < 5000000; i++) {
        uselessMath += Math.sqrt(i);
      }
      return new Response(`Heavy compute finished. CPU Time should register a spike. Result: ${uselessMath}`, { status: 200 });
    }

    // TEST 3: The Uncaught Exception
    // This intentionally attempts to read a variable that doesn't exist to trigger a 500 Error.
    if (url.pathname === '/api/error') {
      console.log(thisVariableDoesNotExist.crashTheSystem);
      return new Response("You will never see this message.", { status: 200 });
    }

    // Default: Serve the HTML page for any other route
    return env.ASSETS.fetch(request);
  }
};