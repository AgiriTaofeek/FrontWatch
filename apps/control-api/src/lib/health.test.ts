import { describe, expect, it } from "bun:test";
import { healthRoutes } from "./health";

describe("GET /health/live", () => {
	it("returns 200 without touching any checker", async () => {
		const app = healthRoutes({
			postgres: async () => {
				throw new Error("should never be called by /health/live");
			},
		});

		const response = await app.handle(
			new Request("http://localhost/health/live"),
		);

		expect(response.status).toBe(200);
	});
});

describe("GET /health/ready", () => {
	it("returns 200 with every check reported up when all pass", async () => {
		const app = healthRoutes({
			postgres: async () => {},
			clickhouse: async () => {},
		});

		const response = await app.handle(
			new Request("http://localhost/health/ready"),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.checks.postgres.status).toBe("up");
		expect(body.checks.clickhouse.status).toBe("up");
	});

	it("returns 503 with the failing check's real error, while other checks still report up", async () => {
		const app = healthRoutes({
			postgres: async () => {},
			clickhouse: async () => {
				throw new Error("connection refused");
			},
		});

		const response = await app.handle(
			new Request("http://localhost/health/ready"),
		);
		const body = await response.json();

		expect(response.status).toBe(503);
		expect(body.checks.postgres.status).toBe("up");
		expect(body.checks.clickhouse.status).toBe("down");
		expect(body.checks.clickhouse.error).toBe("connection refused");
	});
});
