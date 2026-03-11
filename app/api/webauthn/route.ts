import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, action, credentialId, publicKey } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (action === "challenge") {
    const challenge = crypto.randomBytes(32).toString("base64url");
    // Store challenge temporarily (in-memory for simplicity; in production use Redis/DB)
    // We'll validate on the client side for this implementation
    return NextResponse.json({ challenge });
  }

  if (action === "register") {
    if (!credentialId || !publicKey) {
      return NextResponse.json({ error: "Missing credential data" }, { status: 400 });
    }

    await supabaseAdmin
      .from("user_profiles")
      .update({
        webauthn_credential_id: credentialId,
        webauthn_public_key: publicKey,
      })
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  }

  if (action === "check") {
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("webauthn_credential_id")
      .eq("user_id", userId)
      .single();

    return NextResponse.json({
      enabled: !!profile?.webauthn_credential_id,
      credentialId: profile?.webauthn_credential_id || null,
    });
  }

  if (action === "remove") {
    await supabaseAdmin
      .from("user_profiles")
      .update({
        webauthn_credential_id: null,
        webauthn_public_key: null,
      })
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
