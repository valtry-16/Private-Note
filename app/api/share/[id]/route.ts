import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const shareKey = params.id;

  const { data: link, error } = await supabase
    .from("shared_links")
    .select("*")
    .eq("share_key", shareKey)
    .single();

  if (error || !link) {
    // If the table doesn't exist or no row found
    console.error("Share link lookup error:", error?.message || "Not found");
    return NextResponse.json(
      { error: error?.code === "PGRST116" ? "Link not found" : "Link not found or service unavailable" },
      { status: 404 }
    );
  }

  // Check expiry
  if (new Date(link.expires_at) < new Date()) {
    await supabase.from("shared_links").delete().eq("id", link.id);
    return NextResponse.json({ error: "Link has expired" }, { status: 410 });
  }

  // Check max views
  if (link.view_count >= link.max_views) {
    return NextResponse.json({ error: "Max views reached" }, { status: 410 });
  }

  // Increment view count
  await supabase
    .from("shared_links")
    .update({ view_count: link.view_count + 1 })
    .eq("id", link.id);

  return NextResponse.json({
    encrypted_data: link.encrypted_data,
    view_count: link.view_count + 1,
    max_views: link.max_views,
  });
}
