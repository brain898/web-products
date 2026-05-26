import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ============================================================
// GET  /api/ai-survey/sessions  → 列出当前用户所有会话
// POST /api/ai-survey/sessions  → 创建新会话（可选）
// ============================================================

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: sessions, error } = await supabase
    .from("ai_survey_sessions")
    .select("id, title, summary, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: sessions || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = body.title?.trim() || "新问卷";

  const { data: session, error } = await supabase
    .from("ai_survey_sessions")
    .insert({ user_id: user.id, title })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session });
}
