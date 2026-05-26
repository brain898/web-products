import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 确认收款（paid → confirmed）
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
    return NextResponse.json({ error: "状态不正确：只有标记付款后才能确认" }, { status: 400 });
  }

  // 调用事务 RPC：原子性更新状态 + 加信用分
  const { data, error } = await supabase.rpc("confirm_payment_transaction", {
    p_completion_id: id,
    p_creator_id: creatorId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.error_code) {
    return NextResponse.json({ error: "状态冲突，请刷新重试" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
