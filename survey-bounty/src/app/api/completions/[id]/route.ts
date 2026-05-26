import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - 获取单条完成记录详情
// 发布者或填写者均可访问：
// - 发布者通过 dashboard 访问（需登录，校验 creator_id）
// - 填写者通过 /response/{completion_id} 访问（未登录，completion_id UUID 不可猜测即为鉴权）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: completion, error } = await supabase
    .from("task_completions")
    .select("*, tasks!inner(id, title, reward_amount, creator_id)")
    .eq("id", id)
    .single();

  if (error || !completion) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  return NextResponse.json({
    completion,
    task: {
      title: completion.tasks.title,
      reward_amount: completion.tasks.reward_amount,
      creator_id: completion.tasks.creator_id,
    },
  });
}
