import { defineConfig } from "vite";

// A real, clickable browser app to instrument with @frontwatch/sdk —
// not a product surface, purely so a real customer-app integration can
// be exercised end to end (error capture, network capture, web-vitals
// performance capture) without needing an actual pilot customer's app
// yet. packages/sdk has no published/bundled artifact (PROGRESS.md's
// own Step 10 gap) — Vite resolving the workspace package straight
// from ./src is exactly the "consume from a local path" story the
// install guide already documents, made concrete here.
export default defineConfig({
	server: {
		port: 3002,
	},
});
