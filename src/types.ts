export interface CreateUserBody {
  email: string;
  password: string;
}

export interface CreateUserResponse {
  success: boolean;
  user?: any;
  error?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    supabase: any;
  }
}
