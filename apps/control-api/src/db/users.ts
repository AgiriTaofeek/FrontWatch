import { eq } from "drizzle-orm";
import { db } from "./client";
import { users } from "./schema";

export async function getUserByEmail(email: string) {
	const [user] = await db.select().from(users).where(eq(users.email, email));
	return user ?? null;
}

export async function getUserById(id: string) {
	const [user] = await db.select().from(users).where(eq(users.id, id));
	return user ?? null;
}
