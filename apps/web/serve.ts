// Production entry — replaces `bun dist/server/server.js` as the
// container's CMD.
//
// dist/server/server.js is TanStack Start's default entry: it exports
// a bare `{ fetch }` handler (SSR + route matching only) and nothing
// else. Bun's "if a module's default export has a `fetch`, run an
// HTTP server with it" auto-server behavior is *why* running that
// file alone already serves `/` — but that handler has no concept of
// static files, so every `/assets/*.js` the SSR HTML references
// 404'd. Found the hard way running the self-hosted stack for real:
// the dashboard was stuck on the SSR "Loading..." fallback forever,
// because the client bundle that would hydrate past it never loaded.
//
// TanStack Start's Vite build assumes a deploy target (Vercel,
// Cloudflare Pages, Netlify) that serves dist/client as static/CDN
// assets *separately* from the server function — this self-hosted
// Docker profile has no such layer in front of it, so the app server
// has to do both jobs itself. This wrapper adds exactly that: serve
// dist/client/assets/* directly, delegate everything else to the real
// SSR handler.
import { join } from "node:path";
// @ts-expect-error — dist/server/server.js only exists after `vite
// build` runs; not present (or type-checked) at source-tree time.
import ssrHandler from "./dist/server/server.js";

const clientAssetsDir = join(import.meta.dir, "dist", "client", "assets");
const port = Number(process.env.PORT ?? 3001);

Bun.serve({
	port,
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/assets/")) {
			const file = Bun.file(
				join(clientAssetsDir, url.pathname.slice("/assets/".length)),
			);
			if (await file.exists()) {
				return new Response(file);
			}
			return new Response("Not found", { status: 404 });
		}

		return ssrHandler.fetch(request);
	},
});

console.log(`web listening on http://localhost:${port}`);
