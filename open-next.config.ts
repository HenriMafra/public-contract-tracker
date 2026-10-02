import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// ATLAS B2G — adapter OpenNext para Cloudflare (Workers + assets estáticos).
// Backend = Supabase MedFlow. SSR/API/middleware rodam no Worker com nodejs_compat.
// Cache padrão (sem KV/R2 incremental) — suficiente para o app (dados vêm do Supabase).
export default defineCloudflareConfig({});
