# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Development server in background (logs to logs.txt)
npm run dev:daemon

# Build for production
npm run build

# Run tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Lint
npm run lint

# Reset database (destructive)
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Apply new migrations
npx prisma migrate dev
```

> All npm scripts require `node-compat.cjs` (a Node.js compatibility shim loaded via `NODE_OPTIONS='--require ./node-compat.cjs'`).

## Environment

- `ANTHROPIC_API_KEY` in `.env` — optional. If empty, the app uses a `MockLanguageModel` that generates static demo components without calling Anthropic. Set it to use real Claude.
- `JWT_SECRET` — defaults to `"development-secret-key"` if unset.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat; Claude generates code via tool calls; a live iframe preview renders the result.

### Key Data Flow

1. Chat message → `POST /api/chat`
2. Backend deserializes `VirtualFileSystem` from the request body, runs `streamText()` with Claude Haiku
3. Claude uses `str_replace_editor` and `file_manager` tools to create/modify files in the VFS
4. Tool results stream back to the client; `ChatContext` applies them to `FileSystemContext`
5. `PreviewFrame` detects file changes, transpiles JSX with Babel standalone, and re-renders in a sandboxed iframe
6. On finish, messages + serialized VFS are saved to the project row in SQLite (if authenticated)

### Virtual File System (`src/lib/file-system.ts`)

All generated code lives in an **in-memory** `VirtualFileSystem` — no disk writes. It serializes/deserializes as JSON and travels in the request body between client and server. The AI tools (`str_replace_editor`, `file_manager`) and the frontend preview both operate on this same class.

### AI Provider (`src/lib/provider.ts`)

`getLanguageModel()` returns either `anthropic("claude-haiku-4-5")` or a `MockLanguageModel`. The mock simulates a multi-step conversation (create file → enhance styles → create App.jsx → summary) to enable development without an API key.

### State Management

Two React contexts wrap the app in `main-content.tsx`:
- **`FileSystemProvider`** — holds the VFS state; exposes file CRUD operations
- **`ChatProvider`** — wraps Vercel AI SDK's `useChat` hook; on each tool call from the AI, it dispatches to `FileSystemProvider`

### Authentication

JWT sessions stored in httpOnly cookies (7-day expiry). Auth is **optional** — the app works fully without login. Projects can be anonymous (no `userId`). Server actions in `src/actions/` handle sign-up/sign-in/sign-out/CRUD. `src/lib/anon-work-tracker.ts` persists anonymous user work (messages + VFS snapshot) in `sessionStorage` so it can be claimed after sign-in.

### Database (`prisma/schema.prisma`)

SQLite via Prisma. Two models:
- `User` — email + bcrypt password
- `Project` — `messages` (JSON string) + `data` (serialized VFS JSON), optional `userId`

### Preview (`src/components/preview/PreviewFrame.tsx` + `src/lib/transform/jsx-transformer.ts`)

Renders generated files in a sandboxed `<iframe>`. Entry point detection looks for `App.jsx/tsx` or `index.jsx/tsx`. Babel standalone transpiles JSX at runtime; an import map wires module imports.

### System Prompt (`src/lib/prompts/generation.tsx`)

The AI is instructed to create React components with `App.jsx` as the entry point, use Tailwind CSS (no inline styles), and import local files with the `@/` alias.

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
