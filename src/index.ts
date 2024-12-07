import cors from '@fastify/cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fastify, FastifyInstance } from 'fastify';
import type { CreateUserBody, CreateUserResponse } from './types';

// Load environment variables
dotenv.config();

const server: FastifyInstance = fastify({
	logger: true,
});

// Initialize Supabase Admin client
const supabase = createClient(
	process.env.SUPABASE_URL ?? '',
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	}
);

// Register plugins
async function registerPlugins(): Promise<void> {
	await server.register(cors, {
		origin: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	});
}

// Register routes
async function registerRoutes(): Promise<void> {
	// Root route
	server.get('/', async () => {
		return {
			status: 'ok',
			message: 'Supabase Admin Server is running',
			timestamp: new Date().toISOString(),
		};
	});

	// add user
	server.post<{
		Body: CreateUserBody;
		Reply: CreateUserResponse;
	}>('/users', async (request, reply) => {
		const { email, password } = request.body;

		try {
			const { data, error } = await supabase.auth.admin.createUser({
				email,
				password,
				email_confirm: true, // Automatically confirm the user's email
			});

			if (error) {
				throw error;
			}

			return { success: true, user: data.user };
		} catch (error) {
			const err = error as Error;
			reply.code(400);
			return { success: false, error: err.message };
		}
	});

	// delete user
	server.delete<{
		Params: { id: string };
		Reply: { success: boolean; error?: string };
	}>('/users/:id', async (request, reply) => {
		const { id } = request.params;

		try {
			const { error } = await supabase.auth.admin.deleteUser(id);

			if (error) {
				throw error;
			}

			return { success: true };
		} catch (error) {
			const err = error as Error;
			reply.code(400);
			return { success: false, error: err.message };
		}
	});
}

// Start the server
async function startServer(): Promise<void> {
	try {
		await registerPlugins();
		await registerRoutes();

		const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
		await server.listen({ port, host: '0.0.0.0' });

		console.log(`Server is running on http://localhost:${port}`);
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
}

startServer();
