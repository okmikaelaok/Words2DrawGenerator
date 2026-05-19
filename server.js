const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const HOST = "127.0.0.1";
const ORIGIN = `http://${HOST}:${PORT}`;
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
const ROOT_DIR = __dirname;
const SETTINGS_DIR = path.join(
  process.env.LOCALAPPDATA ||
    path.join(process.env.USERPROFILE || process.cwd(), "AppData", "Local"),
  "Words2DrawGenerator",
  "UserSettings",
);
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");
const DEFAULT_MODEL = "gpt-5.4-mini";
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function readSettings() {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    return {
      apiKey: settings.apiKey || "",
      model: settings.model || DEFAULT_MODEL,
      direction: settings.direction || "",
    };
  } catch {
    return {
      apiKey: "",
      model: DEFAULT_MODEL,
      direction: "",
    };
  }
}

function publicSettings() {
  const settings = readSettings();
  return {
    hasApiKey: Boolean(settings.apiKey),
    model: settings.model,
    direction: settings.direction,
    settingsPath: SETTINGS_FILE,
  };
}

function saveSettings(nextSettings) {
  const current = readSettings();
  const submittedApiKey = String(nextSettings.apiKey || "").trim();
  const apiKeyProvided = Object.prototype.hasOwnProperty.call(
    nextSettings,
    "apiKey",
  );

  if (apiKeyProvided && !submittedApiKey && !current.apiKey) {
    const error = new Error(
      "Enter an OpenAI API key before saving, or use built-in word lists without saving settings.",
    );
    error.statusCode = 400;
    throw error;
  }

  const merged = {
    apiKey: submittedApiKey || current.apiKey,
    model: String(nextSettings.model || current.model || DEFAULT_MODEL).trim(),
    direction: String(nextSettings.direction || "").trim(),
  };

  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf8");

  return {
    apiKeyAction: submittedApiKey ? "saved" : "kept",
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(
    statusCode,
    withSecurityHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    }),
  );
  response.end(JSON.stringify(body));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function safeStaticPath(urlPath) {
  try {
    const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
    const decodedPath = decodeURIComponent(requestedPath.split("?")[0]);
    const filePath = path.normalize(path.join(ROOT_DIR, decodedPath));
    const relativePath = path.relative(ROOT_DIR, filePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return null;
    }

    return filePath;
  } catch {
    return null;
  }
}

function serveStatic(request, response) {
  const filePath = safeStaticPath(request.url);
  if (
    !filePath ||
    !fs.existsSync(filePath) ||
    fs.statSync(filePath).isDirectory()
  ) {
    response.writeHead(
      404,
      withSecurityHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
    );
    response.end("Not found");
    return;
  }

  const extension = path.extname(filePath);
  response.writeHead(
    200,
    withSecurityHeaders({
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    }),
  );
  fs.createReadStream(filePath).pipe(response);
}

async function generateWithOpenAi(requestBody) {
  const settings = readSettings();
  if (!settings.apiKey) {
    const error = new Error("Add your OpenAI API key in settings first.");
    error.statusCode = 400;
    throw error;
  }

  const avoidText =
    Array.isArray(requestBody.rejectedPhrases) &&
    requestBody.rejectedPhrases.length
      ? `Also avoid these rejected phrases and their root words: ${requestBody.rejectedPhrases.join("; ")}.`
      : "";
  const targetKeys =
    Array.isArray(requestBody.targetKeys) && requestBody.targetKeys.length
      ? requestBody.targetKeys
      : [
          "time",
          "mood",
          "action",
          "adjective",
          "object",
          "place",
          "animal",
          "person",
        ];
  const jsonShape = `{${targetKeys.map((key) => `"${key}":"..."`).join(", ")}}`;

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content:
            "Return only valid JSON. Create concise, drawable prompt words. Each value must be 1 to 3 words. Every category must use different root words and different visual ideas. Use only the exact lowercase JSON keys requested in the JSON shape. Do not add keys that were not requested.",
        },
        {
          role: "user",
          content: `Generate one fresh word or short phrase for each requested category: ${requestBody.categoryList}. The lowercase key before each parenthesis is the exact JSON key to return. Difficulty: ${requestBody.difficulty}.Easy means simple common things, medium means more specific composition prompts, hard means unusual or technically challenging visual ideas. Do not repeat the same word, root word, noun, place, object, or concept across categories. For example, never return combinations like "city", "city park", and "park" together. Keep locked words in mind but do not return or overlap with them: ${requestBody.lockedWords || "none"}. Do not return these current or recently used words: ${requestBody.recentWords || "none"}. ${avoidText} Creative direction: ${settings.direction || "surprising but easy to draw"}. Return every requested key and only requested keys. JSON shape: ${jsonShape}`,
        },
      ],
    }),
  });

  const data = await openAiResponse.json();
  if (!openAiResponse.ok) {
    const error = new Error(data.error?.message || "The API request failed.");
    error.statusCode = openAiResponse.status;
    throw error;
  }

  return {
    outputText:
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        .map((item) => item.text || "")
        .join("\n") ||
      "",
  };
}

function withSecurityHeaders(headers = {}) {
  return { ...SECURITY_HEADERS, ...headers };
}

function isTrustedHost(request) {
  const host = String(request.headers.host || "").toLowerCase();
  return !host || host === `${HOST}:${PORT}` || host === `localhost:${PORT}`;
}

function isTrustedOrigin(request) {
  const origin = request.headers.origin;
  return !origin || origin === ORIGIN || origin === `http://localhost:${PORT}`;
}

function validateApiRequest(request) {
  if (!isTrustedHost(request)) {
    return { statusCode: 403, message: "Blocked non-local host header." };
  }

  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    return { statusCode: 405, message: "Method not allowed." };
  }

  if (
    ["POST", "DELETE"].includes(request.method) &&
    !isTrustedOrigin(request)
  ) {
    return { statusCode: 403, message: "Blocked cross-origin API request." };
  }

  if (request.method === "POST") {
    const contentType = String(
      request.headers["content-type"] || "",
    ).toLowerCase();
    if (!contentType.includes("application/json")) {
      return {
        statusCode: 415,
        message: "API POST requests must use application/json.",
      };
    }
  }

  return null;
}
async function handleApi(request, response) {
  try {
    const apiGuardError = validateApiRequest(request);
    if (apiGuardError) {
      sendJson(response, apiGuardError.statusCode, {
        error: apiGuardError.message,
      });
      return;
    }
    if (request.url === "/api/settings" && request.method === "GET") {
      sendJson(response, 200, publicSettings());
      return;
    }

    if (request.url === "/api/settings" && request.method === "POST") {
      const saveResult = saveSettings(await readJsonBody(request));
      sendJson(response, 200, { ...publicSettings(), ...saveResult });
      return;
    }

    if (request.url === "/api/settings" && request.method === "DELETE") {
      if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
      sendJson(response, 200, publicSettings());
      return;
    }

    if (request.url === "/api/generate" && request.method === "POST") {
      sendJson(
        response,
        200,
        await generateWithOpenAi(await readJsonBody(request)),
      );
      return;
    }

    sendJson(response, 404, { error: "API route not found." });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Server error.",
    });
  }
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith("/api/")) {
    handleApi(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(PORT, HOST, () => {
  console.log(`Words2DrawGenerator running at http://${HOST}:${PORT}`);
  console.log(`Settings file: ${SETTINGS_FILE}`);
});
