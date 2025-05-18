import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create a single connection to the database
const connectionString = process.env.POSTGRES_URL!;
const client = postgres(connectionString, { max: 1 });

// Create the database instance
export const db = drizzle(client, { schema });

// Export the client for use in other parts of the application
export { client };
