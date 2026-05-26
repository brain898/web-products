import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // getSession 从本地 cookie 读 JWT，不需要网络请求到 Supabase 验证
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, reward_amount, max_slots, current_completions, share_code, created_at")
    .eq("creator_id", session.user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  return NextResponse.json({ tasks: tasks || [] });
}
