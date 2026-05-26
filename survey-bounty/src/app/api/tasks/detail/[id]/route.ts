import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, reward_amount, max_slots, current_completions, share_code, task_image_url, external_link, created_at")
    .eq("id", id)
    .eq("creator_id", session.user.id)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  return NextResponse.json({ task });
}
