import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TOTP, generateSecret, generateURI, verifySync } from "otplib";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, action, token } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (action === "generate") {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: "ZeroVault",
      label: userId,
      secret,
      algorithm: "sha1",
      digits: 6,
      period: 30,
    });
    // Store secret temporarily (not yet enabled)
    await supabaseAdmin
      .from("user_profiles")
      .update({ totp_secret: secret })
      .eq("user_id", userId);

    return NextResponse.json({ secret, otpauthUrl });
  }

  if (action === "verify") {
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("totp_secret")
      .eq("user_id", userId)
      .single();

    if (!profile?.totp_secret) {
      return NextResponse.json({ error: "No TOTP secret found" }, { status: 400 });
    }

    const result = verifySync({ secret: profile.totp_secret, token, algorithm: "sha1", digits: 6, period: 30 });
    if (result) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ totp_enabled: true })
        .eq("user_id", userId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  if (action === "disable") {
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("totp_secret")
      .eq("user_id", userId)
      .single();

    if (!profile?.totp_secret) {
      return NextResponse.json({ error: "No TOTP secret found" }, { status: 400 });
    }

    const result = verifySync({ secret: profile.totp_secret, token, algorithm: "sha1", digits: 6, period: 30 });
    if (result) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ totp_secret: null, totp_enabled: false })
        .eq("user_id", userId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
