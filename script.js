/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendButton = document.getElementById("sendBtn");

// Send chat requests to the deployed Cloudflare Worker.
const workerUrl = "https://api-proxy.lrpinker.workers.dev/v1/chat/completions";

// Base URL for the JSONPlaceholder demo API.
const api_base_url = "https://jsonplaceholder.typicode.com";

// Keep the assistant focused on L’Oréal products and beauty advice.
const systemPrompt =
  "You are a helpful L’Oréal beauty assistant. Answer only questions about L’Oréal products, beauty routines, and product recommendations. Use the conversation history to remember the user's name, preferences, and earlier questions when relevant. Do not assume details the user has not shared. If a question is unrelated, politely say you can help only with those topics. Never invent product details; if unsure, say so.";

// Keep the conversation history so the assistant can use earlier messages.
const messages = [{ role: "system", content: systemPrompt }];

// Add a message to the chat without treating its text as HTML.
function addMessage(sender, text) {
  const message = document.createElement("p");
  const label = sender === "user" ? "You" : "L’Oréal Assistant";

  message.className = sender === "user" ? "msg user" : "msg ai";
  message.textContent = `${label}: ${text}`;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Show the assistant's greeting when the page loads.
addMessage("assistant", "Hello! How can I help you today?");

// Send each user message to the Cloudflare Worker and show its reply.
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userMessage = userInput.value.trim();

  if (!userMessage) {
    return;
  }

  // Show only the latest exchange while keeping the full history for the assistant.
  chatWindow.textContent = "";
  messages.push({ role: "user", content: userMessage });
  addMessage("user", userMessage);
  userInput.value = "";
  sendButton.disabled = true;

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4.1", messages }),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      if (!response.ok) {
        throw new Error(
          `Worker returned HTTP ${response.status}. Check the deployed Worker URL and route.`,
        );
      }

      throw new Error("The Worker response was not valid JSON.");
    }

    if (!data || typeof data !== "object") {
      throw new Error("The Worker response was not a valid chat response.");
    }

    if (!response.ok) {
      const errorMessage =
        data.error && data.error.message
          ? data.error.message
          : typeof data.error === "string"
            ? data.error
            : `Worker returned HTTP ${response.status}.`;
      throw new Error(errorMessage);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("The response did not include a chat message.");
    }

    const reply = data.choices[0].message.content;
    messages.push({ role: "assistant", content: reply });
    addMessage("assistant", reply);
  } catch (error) {
    console.error(error);
    addMessage(
      "assistant",
      error instanceof TypeError
        ? "I couldn't connect to the Worker. Check its URL, deployment, and CORS settings."
        : `The chat request failed: ${error.message}`,
    );
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
});
