import { createBrowserClient } from "@supabase/ssr";

type SupabaseRuntimeConfig = {
  url: string;
  anonKey: string;
};

let clientPromise: Promise<ReturnType<typeof createBrowserClient>> | null = null;

async function getRuntimeConfig(): Promise<SupabaseRuntimeConfig> {
  const response = await fetch("/api/supabase/config", {
    credentials: "same-origin",
    cache: "no-store",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.data?.url || !body.data?.anonKey) {
    throw new Error(body.error || "Failed to load Supabase runtime config.");
  }

  return body.data as SupabaseRuntimeConfig;
}

export async function createClient() {
  if (!clientPromise) {
    clientPromise = getRuntimeConfig().then(({ url, anonKey }) => createBrowserClient(url, anonKey));
  }

  return clientPromise;
}
