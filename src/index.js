const EXPORTER_BASE =
  "https://tricount-exporter.pages.dev/tricount/";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/tricount/")) {
      return handleTricount(request, url);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleTricount(request, url) {
  const prefix = "/api/tricount/";

  const tricountId = decodeURIComponent(
    url.pathname.slice(prefix.length)
  ).trim();

  if (!/^[A-Za-z0-9_-]{8,64}$/.test(tricountId)) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid Tricount ID"
      },
      400
    );
  }

  const sourceUrl =
    EXPORTER_BASE + encodeURIComponent(tricountId);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "Accept": "application/json, text/html;q=0.9",
        "User-Agent": "Hue-Trip-2026/1.0"
      }
    });

    const contentType =
      response.headers.get("content-type") || "";

    const text = await response.text();

    if (!response.ok) {
      return jsonResponse(
        {
          ok: false,
          error: `Exporter HTTP ${response.status}`,
          sourceUrl
        },
        502
      );
    }

    if (contentType.toLowerCase().includes("json")) {
      return jsonResponse({
        ok: true,
        sourceUrl,
        syncedAt: new Date().toISOString(),
        data: JSON.parse(text)
      });
    }

    const embeddedData = extractEmbeddedJson(text);

    if (embeddedData) {
      return jsonResponse({
        ok: true,
        sourceUrl,
        syncedAt: new Date().toISOString(),
        data: embeddedData
      });
    }

    return jsonResponse(
      {
        ok: false,
        code: "EXPORTER_HTML_ONLY",
        error:
          "Tricount Exporter trả HTML nhưng không có dữ liệu JSON nhúng.",
        sourceUrl,
        contentType
      },
      422
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error.message,
        sourceUrl
      },
      502
    );
  }
}

function extractEmbeddedJson(html) {
  const patterns = [
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
    /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i,
    /window\.__TRICOUNT_DATA__\s*=\s*([\s\S]*?);\s*<\/script>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (!match) {
      continue;
    }

    try {
      return JSON.parse(match[1].trim());
    } catch {
      // Thử mẫu tiếp theo.
    }
  }

  return null;
}

function jsonResponse(body, status = 200) {
  return new Response(
    JSON.stringify(body, null, 2),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
