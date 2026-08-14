import { afterEach, describe, expect, it } from "bun:test";
import { deliverWebhook } from "./webhook";

// Real local HTTP server, not a mocked fetch — deliverWebhook's whole
// job is real network I/O (method, headers, body shape, status
// handling), which a mock can't actually verify.
let server: ReturnType<typeof Bun.serve> | undefined;

afterEach(() => {
	server?.stop(true);
	server = undefined;
});

describe("deliverWebhook", () => {
	it("POSTs the payload as JSON and reports delivered on a 2xx response", async () => {
		let receivedMethod: string | undefined;
		let receivedContentType: string | undefined;
		let receivedBody: unknown;

		server = Bun.serve({
			port: 0,
			fetch: async (req) => {
				receivedMethod = req.method;
				receivedContentType = req.headers.get("content-type") ?? undefined;
				receivedBody = await req.json();
				return new Response(null, { status: 200 });
			},
		});

		const result = await deliverWebhook(`http://localhost:${server.port}/`, {
			type: "new_issue",
			fingerprint: "fp_1",
		});

		expect(result.delivered).toBe(true);
		expect(result.status).toBe(200);
		expect(receivedMethod).toBe("POST");
		expect(receivedContentType).toContain("application/json");
		expect(receivedBody).toEqual({ type: "new_issue", fingerprint: "fp_1" });
	});

	it("reports not delivered on a non-2xx response", async () => {
		server = Bun.serve({
			port: 0,
			fetch: () => new Response("nope", { status: 500 }),
		});

		const result = await deliverWebhook(`http://localhost:${server.port}/`, {
			foo: "bar",
		});

		expect(result.delivered).toBe(false);
		expect(result.status).toBe(500);
	});

	it("reports not delivered, without throwing, when the endpoint is unreachable", async () => {
		// Nothing is listening on this port — a real connection failure,
		// not a simulated one.
		const result = await deliverWebhook("http://localhost:1/", { foo: "bar" });

		expect(result.delivered).toBe(false);
		expect(result.status).toBeUndefined();
	});
});
