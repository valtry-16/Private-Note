import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated via Supabase cookie session
    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { item_id, encrypted_data, share_key, expires_at, max_views } = body;

    if (!item_id || !encrypted_data || !share_key || !expires_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("shared_links").insert({
      user_id: user.id,
      item_id,
      encrypted_data,
      share_key,
      expires_at,
      max_views: max_views ?? 1,
    });

    if (error) {
      console.error("Failed to insert shared_link:", error.message, error.code);
      return NextResponse.json(
        { error: "Failed to create share link" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Share API error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
