// Copy this code into your Cloudflare Worker script.
// Add your API key as a Worker secret named OPENAI_API_KEY.
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Allow browsers to check whether they can send the chat request.
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Chat requests must use POST.
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // The API key is stored securely in the Cloudflare Worker settings.
    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Worker API key is not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    let userInput;
    try {
      userInput = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Request body must be valid JSON" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (
      !userInput ||
      typeof userInput !== "object" ||
      !Array.isArray(userInput.messages)
    ) {
      return new Response(JSON.stringify({ error: "Request must include a messages array" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: userInput.messages,
        max_completion_tokens: 300,
      }),
    });

    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: corsHeaders,
    });
  },
};
