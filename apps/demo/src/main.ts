import { captureException, init } from "@frontwatch/sdk";

const publicKeyInput = document.getElementById("publicKey") as HTMLInputElement;
const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;
const logEl = document.getElementById("log") as HTMLDivElement;

// Persist across reloads — re-typing a public key every time you
// refresh this page would be needless friction for something meant to
// be poked at repeatedly.
publicKeyInput.value = localStorage.getItem("fw_demo_public_key") ?? "";
endpointInput.value =
	localStorage.getItem("fw_demo_endpoint") ?? "http://localhost:8080";

function log(message: string) {
	const line = `[${new Date().toLocaleTimeString()}] ${message}\n`;
	logEl.textContent = line + logEl.textContent;
	console.log(message);
}

let initialized = false;

document.getElementById("init")?.addEventListener("click", () => {
	const publicKey = publicKeyInput.value.trim();
	const endpoint = endpointInput.value.trim();
	if (!publicKey || !endpoint) {
		statusEl.textContent = "Need both a public key and an endpoint.";
		return;
	}

	localStorage.setItem("fw_demo_public_key", publicKey);
	localStorage.setItem("fw_demo_endpoint", endpoint);

	init({
		publicKey,
		endpoint,
		environment: "demo",
		release: "0.0.1",
	});
	initialized = true;
	statusEl.textContent = `Initialized against ${endpoint}. Go generate some telemetry.`;
	log("SDK initialized");
});

document.getElementById("unhandledError")?.addEventListener("click", () => {
	if (!initialized) {
		log("Initialize the SDK first.");
		return;
	}
	log("Throwing an unhandled error — captured via window.onerror");
	// Deliberately uncaught — registerErrorInstrumentation's
	// window.addEventListener("error", ...) is what's actually being
	// exercised here, the same path a real bug in a real app would hit.
	// Malformed JSON is a real, unforced SyntaxError — no `any`/`!`
	// trickery needed to produce a genuine uncaught exception.
	setTimeout(() => {
		JSON.parse("{ this is not valid json");
	}, 0);
});

document.getElementById("handledError")?.addEventListener("click", () => {
	if (!initialized) {
		log("Initialize the SDK first.");
		return;
	}
	try {
		throw new Error("Demo: something recoverable went wrong");
	} catch (error) {
		captureException(error);
		log("Caught and captured a handled error");
	}
});

document.getElementById("goodFetch")?.addEventListener("click", async () => {
	if (!initialized) {
		log("Initialize the SDK first.");
		return;
	}
	log("Making a successful request...");
	await fetch("https://httpbin.org/get").catch(() => {
		// Network instrumentation still records the attempt even if this
		// specific demo call fails for reasons unrelated to FrontWatch
		// (e.g. no outbound internet access) — that's fine, it's still
		// real request/response instrumentation being exercised.
	});
	log("Successful request done");
});

document.getElementById("badFetch")?.addEventListener("click", async () => {
	if (!initialized) {
		log("Initialize the SDK first.");
		return;
	}
	log("Making a request that 404s...");
	await fetch("https://httpbin.org/status/404").catch(() => {});
	log("404 request done");
});

document.getElementById("slowFetch")?.addEventListener("click", async () => {
	if (!initialized) {
		log("Initialize the SDK first.");
		return;
	}
	log("Making a slow request (~1.5s)...");
	await fetch("https://httpbin.org/delay/1").catch(() => {});
	log("Slow request done");
});
