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
	// 允许的基础域名列表（不包含 *.vercel.app）
	const allowedOrigins = [
		'http://localhost:3000',
		'http://localhost:5173',
		'https://testmytest.com',
		'https://www.testmytest.xyz',
		'https://testmytest.xyz',
		'https://dashboard-server-cfty.onrender.com',
	];

	await server.register(cors, {
		origin: (origin, cb) => {
			// 非浏览器环境（如curl测试）可能没有origin
			if (!origin) {
				return cb(null, true);
			}

			// 检查是否匹配 vercel 子域名
			const isVercel = origin.endsWith('.vercel.app');
			// 检查列表中是否存在当前origin
			const isAllowed = allowedOrigins.includes(origin);

			if (isAllowed || isVercel) {
				cb(null, true);
			} else {
				cb(new Error('Not allowed by CORS'), false);
			}
		},
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
		exposedHeaders: ['Content-Range', 'X-Content-Range'],
		credentials: true,
		preflight: true,
		strictPreflight: false,
		maxAge: 86400,
	});
}

// 如果 `registerHooks()` 仅用于CORS相关配置，可不需要该函数
// 如果还有其他hook逻辑，可保留，但请确保不再重复设置CORS相关header
async function registerHooks(): Promise<void> {
	// 如果您还有其他全局Hook逻辑，可在此添加
	// 当前不需要添加CORS相关的onRequest Hook了
}

// 定义路由
async function registerRoutes(): Promise<void> {
	// Root route
	server.get('/', async () => {
		return {
			status: 'ok',
			message: 'Supabase Admin Server is running',
			timestamp: new Date().toISOString(),
		};
	});

	// add user route
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

	// delete user route
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
