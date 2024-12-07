import cors from '@fastify/cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fastify, FastifyInstance } from 'fastify';
import type { CreateUserBody, CreateUserResponse } from './types';

dotenv.config();

const server: FastifyInstance = fastify({
	logger: true,
});

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
	// 更新 CORS 配置
	await server.register(cors, {
		origin: [
			'http://localhost:3000',
			'http://localhost:5173',
			'https://testmytest.com',
			'https://*.vercel.app',
			'https://www.testmytest.xyz',
			'https://testmytest.xyz',
			'https://dashboard-server-cfty.onrender.com',
		],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
		exposedHeaders: ['Content-Range', 'X-Content-Range'],
		credentials: true,
		preflight: true,
		strictPreflight: false,
		maxAge: 86400,
	});
}

// 修改全局钩子处理
async function registerHooks(): Promise<void> {
	server.addHook('onRequest', async (request, reply) => {
		// 允许所有来源，或者使用具体的域名列表
		const allowedOrigins = [
			'http://localhost:3000',
			'http://localhost:5173',
			'https://testmytest.com',
			'https://*.vercel.app',
			'https://www.testmytest.xyz',
			'https://testmytest.xyz',
			'https://dashboard-server-cfty.onrender.com',
		];

		const origin = request.headers.origin;
		if (
			origin &&
			allowedOrigins.some((allowed) =>
				allowed.includes('*')
					? origin.endsWith(allowed.replace('*', ''))
					: origin === allowed
			)
		) {
			reply.header('Access-Control-Allow-Origin', origin);
		}

		reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
		reply.header(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, Origin, Accept'
		);
		reply.header('Access-Control-Allow-Credentials', 'true');
	});
}

async function registerRoutes(): Promise<void> {
	// Root route
	server.get('/', async () => {
		return {
			status: 'ok',
			message: 'Supabase Admin Server is running',
			timestamp: new Date().toISOString(),
		};
	});

	// add user with improved logging
	server.post<{
		Body: CreateUserBody;
		Reply: CreateUserResponse;
	}>('/users', async (request, reply) => {
		const { email, password } = request.body;

		server.log.info('Received create user request');

		try {
			const { data, error } = await supabase.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
			});

			if (error) {
				server.log.error(`User creation error: ${error.message}`);
				throw error;
			}

			server.log.info(`User created successfully: ${data.user.id}`);
			return { success: true, user: data.user };
		} catch (error) {
			const err = error as Error;
			server.log.error(`User creation failed: ${err.message}`);
			reply.code(400);
			return { success: false, error: err.message };
		}
	});

	// delete user with improved logging
	server.delete<{
		Params: { id: string };
		Reply: { success: boolean; error?: string };
	}>('/users/:id', async (request, reply) => {
		const { id } = request.params;

		server.log.info(`Received delete request for user ID: ${id}`);

		try {
			const { error } = await supabase.auth.admin.deleteUser(id);

			if (error) {
				server.log.error(`User deletion error: ${error.message}`);
				throw error;
			}

			server.log.info(`User deleted successfully: ${id}`);
			return { success: true };
		} catch (error) {
			const err = error as Error;
			server.log.error(`User deletion failed: ${err.message}`);
			reply.code(400);
			return { success: false, error: err.message };
		}
	});
}

async function startServer(): Promise<void> {
	try {
		await registerPlugins();
		await registerHooks();
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
