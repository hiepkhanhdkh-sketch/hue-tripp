export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/tricount/")) {
      return Response.json({
        ok: false,
        message: "Tricount API adapter is ready but still requires a readable JSON data source."
      }, { status: 501 });
    }

    return env.ASSETS.fetch(request);
  }
};
