import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// ============================================================
// GET  /api/ai-survey/quota  → 查询今日剩余次数
// POST /api/ai-survey/quota  → 消耗一次生成配额
// ============================================================

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_ai_survey_quota", {
    p_user_id: user.id,
    p_daily_limit: 5,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ remaining: data ?? 5, limit: 5 });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("use_ai_survey_quota", {
    p_user_id: user.id,
    p_daily_limit: 5,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data === -1) {
    return NextResponse.json(
      { error: "今日生成次数已用完，明天再来", remaining: 0 },
      { status: 429 }
    );
  }

  return NextResponse.json({ remaining: data, limit: 5 });
}
