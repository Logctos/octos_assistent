import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: fetch expenses/projects from Supabase, summarize with OpenAI,
  // and push the result via Firebase Cloud Messaging (lib/firebase/admin.ts).
  return NextResponse.json({ ok: true, message: "TODO: implement morning brief" });
}
