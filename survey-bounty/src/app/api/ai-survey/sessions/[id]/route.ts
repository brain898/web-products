import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ============================================================
// GET    /api/ai-survey/sessions/[id]  → 获取会话详情 + 消息历史
// DELETE /api/ai-survey/sessions/[id]  → 删除会话
// ============================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // 获取会话
  const { data: session, error: sErr } = await supabase
    .from("ai_survey_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (sErr || !session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }
  if (session.user_id !== user.id) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  // 获取消息
  const { data: messages } = await supabase
    .from("ai_survey_messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ session, messages: messages || [] });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // 验证归属
  const { data: session } = await supabase
    .from("ai_survey_sessions")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const { error } = await supabase
    .from("ai_survey_sessions")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
