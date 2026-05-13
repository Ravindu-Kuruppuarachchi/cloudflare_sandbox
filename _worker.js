export default {
  async fetch(request, env) {
    // 1. Log the incoming request (This activates the compute engine)
    const url = new URL(request.url);
    console.log(`Incoming request for: ${url.pathname}`);

    // 2. Fetch the static assets (your index.html) from Cloudflare's cache
    const response = await env.ASSETS.fetch(request);

    // 3. Optional: Modify the response by adding a custom security/tracking header
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('X-ISA-Environment', 'Sandbox-Compute-Active');

    return modifiedResponse;
  }
};