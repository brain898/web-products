import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 举报未收到（paid → dispute_pending）
// 发布者或填写者均可操作：
// - 发布者通过 dashboard 操作（需登录，校验 creator_id）
// - 填写者通过 /response/{completion_id} 操作（未登录，completion_id UUID 不可猜测即为鉴权）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: completion, error: fetchError } = await supabase
    .from("task_completions")
    .select("id, payment_status, task_id, tasks!inner(creator_id)")
    .eq("id", id)
    .single();

  if (fetchError || !completion) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  // tasks join 可能返回数组或对象，兼容处理
  const task = Array.isArray(completion.tasks) ? completion.tasks[0] : completion.tasks;
  const creatorId = task?.creator_id;

  // 鉴权：如果有登录用户，校验是发布者；未登录用户通过 completion_id 鉴权（UUID 不可猜测）
  const { data: { user } } = await supabase.auth.getUser();
  if (user && creatorId !== user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  if (completion.payment_status !== "paid") {
    return NextResponse.json({ error: "状态不正确：只有标记付款后才能举报" }, { status: 400 });
  }

  // 改为 dispute_pending（待仲裁），不直接扣信用分
  const { error } = await supabase
    .from("task_completions")
    .update({
      payment_status: "dispute_pending",
      disputed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "举报已提交，等待平台仲裁" });
}
