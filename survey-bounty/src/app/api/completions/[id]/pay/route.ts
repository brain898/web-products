import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 发布者标记已付款（verified/dispute_pending → paid）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: completion } = await supabase
    .from("task_completions")
    .select("*, tasks!inner(creator_id)")
    .eq("id", id)
    .single();

  if (!completion || completion.tasks.creator_id !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  // 支持从 verified 或 dispute_pending 状态标记付款
  if (!["verified", "dispute_pending"].includes(completion.payment_status)) {
    return NextResponse.json({ error: "当前状态无法标记付款" }, { status: 400 });
  }

  const { error } = await supabase
    .from("task_completions")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
