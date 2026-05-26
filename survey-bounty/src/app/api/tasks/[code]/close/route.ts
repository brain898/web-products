import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 关闭/删除任务
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body; // "close" | "delete"

  const { data: task } = await supabase
    .from("tasks")
    .select("id, creator_id")
    .eq("share_code", code)
    .eq("creator_id", user.id)
    .single();

  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const newStatus = action === "delete" ? "deleted" : "closed";

  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", task.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
