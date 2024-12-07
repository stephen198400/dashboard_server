# Supabase Admin Server

A TypeScript-based Fastify server that provides endpoints for Supabase user management using the Admin API.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
   - Copy `.env` file and update with your Supabase credentials:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (from project settings)
   - `PORT`: Server port (default: 3000)

3. Development:
```bash
pnpm dev
```

4. Build for production:
```bash
pnpm build
pnpm start
```

## API Endpoints

### Create User
- **POST** `/users`
- **Body:**
  ```typescript
  {
    "email": string;    // User's email
    "password": string; // User's password
  }
  ```
- **Response:**
  ```typescript
  {
    "success": boolean;
    "user"?: {         // Present if success is true
      "id": string;
      "email": string;
      // ... other user properties
    };
    "error"?: string;  // Present if success is false
  }
  ```

## Type Checking

Run type checking without emitting files:
```bash
pnpm type-check
```
