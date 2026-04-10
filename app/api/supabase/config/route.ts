import { NextResponse } from "next/server";
import { getSupabaseServerConfig } from "@/lib/supabase/config";

export async function GET() {
  try {
    const { url, anonKey } = getSupabaseServerConfig();

    return NextResponse.json({
      data: {
        url,
        anonKey,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase config is not available." },
      { status: 500 }
    );
  }
}
