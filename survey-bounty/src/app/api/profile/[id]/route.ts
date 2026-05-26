import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - 获取用户公开信息 + 信用分
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("nickname, created_at")
    .eq("id", id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const { data: credit } = await supabase
    .from("credit_scores")
    .select("credit_score, total_surveys, completed_payments, disputed_count")
    .eq("user_id", id)
    .single();

  return NextResponse.json({
    profile,
    credit: credit || {
      credit_score: 100,
      total_surveys: 0,
      completed_payments: 0,
      disputed_count: 0,
    },
  });
}
