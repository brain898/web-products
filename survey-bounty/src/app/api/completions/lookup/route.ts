import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - 根据手机号查询填写者的所有提交记录
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone")?.trim();

  if (!phone) {
    return NextResponse.json({ error: "请提供手机号" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: completions, error } = await supabase
    .from("task_completions")
    .select(
      "id, completer_name, completer_phone, payment_status, proof_screenshot_url, created_at, tasks!inner(id, title, reward_amount, status)"
    )
    .eq("completer_phone", phone)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (completions || []).map((c) => ({
    id: c.id,
    completer_name: c.completer_name,
    completer_phone: c.completer_phone,
    payment_status: c.payment_status,
    proof_screenshot_url: c.proof_screenshot_url,
    created_at: c.created_at,
    task: Array.isArray(c.tasks) ? c.tasks[0] : c.tasks,
  }));

  return NextResponse.json({ completions: results });
}
