import { NextResponse } from "next/server";
import { createAdminClient } from "@/supabase/admin";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const { userId, eventType } = await request.json();

    if (!userId || !eventType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const headersList = headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      null;
    const ua = headersList.get("user-agent") || null;

    const supabase = createAdminClient();

    await supabase.from("security_logs").insert({
      user_id: userId,
      event_type: eventType,
      ip_address: ip,
      user_agent: ua,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
