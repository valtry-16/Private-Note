import { NextResponse } from "next/server";
import { createAdminClient } from "@/supabase/admin";
import { BrevoClient } from "@getbrevo/brevo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

  // Find users with dead man's switch enabled who have been inactive
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("user_id, emergency_contact_email, dead_man_inactivity_days, last_active_at")
    .eq("dead_man_switch_enabled", true)
    .not("emergency_contact_email", "is", null);

  if (error || !profiles) {
    return NextResponse.json({ error: "Failed to query profiles" }, { status: 500 });
  }

  // Filter profiles that have exceeded inactivity threshold
  const toTrigger = profiles.filter((profile) => {
    const lastActive = new Date(profile.last_active_at || 0);
    const inactivityDays = profile.dead_man_inactivity_days || 90;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - inactivityDays);
    return lastActive < thresholdDate && profile.emergency_contact_email;
  });

  // Process all triggered profiles in parallel
  await Promise.all(
    toTrigger.map(async (profile) => {
      const inactivityDays = profile.dead_man_inactivity_days || 90;
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const ownerEmail = authUser?.user?.email || "Unknown";

      await Promise.all([
        brevo.transactionalEmails.sendTransacEmail({
          sender: { name: "ZeroVault", email: process.env.BREVO_SENDER_EMAIL || "noreply@zerovault.app" },
          to: [{ email: profile.emergency_contact_email }],
          subject: "ZeroVault — Emergency Access Notification",
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1d4ed8;">🛡️ ZeroVault Emergency Notification</h2>
              <p>This is an automated message from <strong>ZeroVault</strong>.</p>
              <p>The vault owner (<strong>${ownerEmail}</strong>) has been inactive for 
              <strong>${inactivityDays} days</strong>, triggering the Dead Man's Switch.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p>The vault owner configured you as their emergency contact. 
              If you have been given a master password or recovery key, you can use it to 
              access the vault at the application URL.</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                This email was sent because the vault owner enabled the Dead Man's Switch feature.
                If you believe this was sent in error, please disregard this message.
              </p>
            </div>
          `,
        }),
        supabase.from("security_logs").insert({
          user_id: profile.user_id,
          event_type: "dead_man_switch_triggered",
        }),
        supabase
          .from("user_profiles")
          .update({ dead_man_switch_enabled: false, updated_at: new Date().toISOString() })
          .eq("user_id", profile.user_id),
      ]);
    })
  );

  return NextResponse.json({ checked: profiles.length, triggered: toTrigger.length });
}
