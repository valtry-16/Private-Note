import { NextResponse } from "next/server";
import { createAdminClient } from "@/supabase/admin";
import { createClient as createServerClient } from "@supabase/supabase-js";

const STORAGE_LIMIT_BYTES = 50 * 1024 * 1024; // 50 MB per user

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const supabase = createAdminClient();

    // Verify the user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // List all files in user's storage folder
    const { data: files, error: listError } = await supabase.storage
      .from("vault-documents")
      .list(user.id, { limit: 1000 });

    let usedBytes = 0;
    if (files && !listError) {
      for (const file of files) {
        usedBytes += file.metadata?.size || 0;
      }
    }

    return NextResponse.json({
      usedBytes,
      limitBytes: STORAGE_LIMIT_BYTES,
      remainingBytes: Math.max(0, STORAGE_LIMIT_BYTES - usedBytes),
      usedPercent: Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 100),
    });
  } catch {
    return NextResponse.json({ error: "Failed to check storage" }, { status: 500 });
  }
}
