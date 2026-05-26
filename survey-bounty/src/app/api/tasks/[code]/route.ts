import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - 获取任务详情（公开，填写者看到的）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("share_code", code)
    .in("status", ["active", "full", "closed"])
    .single();

  // task 不存在时直接返回，不再做第二次查询
  if (error || !task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  // 只在 task 存在时才查信用分
  const { data: credit } = await supabase
    .from("credit_scores")
    .select("credit_score, total_surveys, completed_payments")
    .eq("user_id", task.creator_id)
    .single();

  // 计算发布者信任指标
  const { data: publisherTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("creator_id", task.creator_id)
    .in("status", ["active", "full", "closed"]);

  const taskIds = publisherTasks?.map((t: { id: string }) => t.id) || [];

  let publisherStats = {
    total_published: publisherTasks?.length || 0,
    total_completions: 0,
    payment_rate: null as number | null,
    avg_response_hours: null as number | null,
  };

  if (taskIds.length > 0) {
    const { data: allCompletions } = await supabase
      .from("task_completions")
      .select("payment_status, verified_at, created_at")
      .in("task_id", taskIds);

    if (allCompletions && allCompletions.length > 0) {
      const total = allCompletions.length;
      const confirmed = allCompletions.filter(
        (c: { payment_status: string }) => c.payment_status === "confirmed"
      ).length;
      const paymentRate = total > 0 ? Math.round((confirmed / total) * 100) : null;

      // 平均回复时长（从提交到审核通过）
      const responseTimes = allCompletions
        .filter((c: { verified_at: string | null }) => c.verified_at)
        .map((c: { verified_at: string; created_at: string }) =>
          (new Date(c.verified_at!).getTime() - new Date(c.created_at).getTime()) / 3600000
        );
      const avgHours = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
        : null;

      publisherStats = {
        total_published: publisherTasks?.length || 0,
        total_completions: total,
        payment_rate: paymentRate,
        avg_response_hours: avgHours,
      };
    }
  }

  return NextResponse.json({ task, credit: credit || null, publisher_stats: publisherStats });
}
