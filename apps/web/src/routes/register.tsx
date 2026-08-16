import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { register } from "../features/auth/api";
import { ApiError } from "../lib/api";

// US-01.01: "creating an org makes the creator an Administrator" —
// this form is that first real onboarding step for a fresh self-hosted
// install, which starts with zero users (Step 10's pilot readiness
// dry-run: db/registration.ts's registerOrganizationAndAdmin already
// did the real work, this is its first UI).
export const Route = createFileRoute("/register")({
	component: RegisterPage,
});

function RegisterPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [organizationName, setOrganizationName] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const registerMutation = useMutation({
		mutationFn: register,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
			navigate({ to: "/" });
		},
	});

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		registerMutation.mutate({ organizationName, name, email, password });
	}

	return (
		<div>
			<h1>Register your organization</h1>
			<form onSubmit={handleSubmit}>
				<div>
					<label htmlFor="organizationName">Organization name</label>
					<input
						id="organizationName"
						required
						value={organizationName}
						onChange={(event) => setOrganizationName(event.target.value)}
					/>
				</div>
				<div>
					<label htmlFor="name">Your name</label>
					<input
						id="name"
						required
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
				</div>
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
						minLength={8}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
					/>
				</div>
				<button type="submit" disabled={registerMutation.isPending}>
					{registerMutation.isPending ? "Creating..." : "Create organization"}
				</button>
			</form>
			{registerMutation.isError && (
				<p role="alert">
					{registerMutation.error instanceof ApiError
						? registerMutation.error.message
						: "Registration failed"}
				</p>
			)}
			<p>
				Already have an account? <Link to="/login">Log in</Link>
			</p>
		</div>
	);
}
