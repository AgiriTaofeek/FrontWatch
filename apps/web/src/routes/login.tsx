import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { login } from "../features/auth/api";
import { ApiError } from "../lib/api";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const loginMutation = useMutation({
		mutationFn: login,
		onSuccess: async () => {
			// /auth/me was queried (or attempted) before login — it needs
			// to be re-fetched now that a session cookie exists, same
			// invalidate-on-mutation pattern every other feature's api.ts
			// already uses (AlertRuleList.tsx's createMutation, etc.).
			await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
			navigate({ to: "/" });
		},
	});

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		loginMutation.mutate({ email, password });
	}

	return (
		<div>
			<h1>Log in</h1>
			<form onSubmit={handleSubmit}>
				<div>
					<label htmlFor="email">Email</label>
					<input
						id="email"
						type="email"
						required
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
				</div>
				<div>
					<label htmlFor="password">Password</label>
					<input
						id="password"
						type="password"
						required
						value={password}
						onChange={(event) => setPassword(event.target.value)}
					/>
				</div>
				<button type="submit" disabled={loginMutation.isPending}>
					{loginMutation.isPending ? "Logging in..." : "Log in"}
				</button>
			</form>
			{loginMutation.isError && (
				<p role="alert">
					{loginMutation.error instanceof ApiError
						? loginMutation.error.message
						: "Login failed"}
				</p>
			)}
			<p>
				No account? <Link to="/register">Register an organization</Link>
			</p>
		</div>
	);
}
