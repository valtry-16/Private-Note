import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySync } from "otplib";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, token } = await req.json();
  if (!userId || !token) {
    return NextResponse.json({ error: "Missing userId or token" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("totp_secret, totp_enabled")
    .eq("user_id", userId)
    .single();

  if (!profile?.totp_enabled || !profile?.totp_secret) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
  }

  const isValid = verifySync({ secret: profile.totp_secret, token, algorithm: "sha1", digits: 6, period: 30 });
  return NextResponse.json({ valid: isValid });
}
