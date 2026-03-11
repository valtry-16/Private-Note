import { NextResponse } from "next/server";
import { createAdminClient } from "@/supabase/admin";
import { BrevoClient } from "@getbrevo/brevo";

export async function POST(request: Request) {
  try {
    const { email, origin } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Generate password recovery link via admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/reset-password` },
    });

    if (error || !data?.properties?.action_link) {
      // Don't reveal whether the email exists
      return NextResponse.json({ success: true });
    }

    // Send the reset email via Brevo
    const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });
    await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: "ZeroVault",
        email: process.env.BREVO_SENDER_EMAIL || "noreply@zerovault.app",
      },
      to: [{ email }],
      subject: "ZeroVault — Reset Your Account Password",
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1d4ed8;">🛡️ ZeroVault Password Reset</h2>
          <p>We received a request to reset the account password for <strong>${email}</strong>.</p>
          <p>Click the button below to set a new account password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.properties.action_link}" 
               style="display: inline-block; background: #1d4ed8; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your account password will not change.</p>
          <p style="color: #6b7280; font-size: 13px;"><strong>Note:</strong> This resets your <em>account login password</em>, not your master encryption password.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 11px;">This link expires in 24 hours. ZeroVault — Zero-knowledge encrypted vault.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }
}
