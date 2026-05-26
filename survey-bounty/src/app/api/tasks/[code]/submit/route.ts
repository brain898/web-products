import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidName, isValidPhone } from "@/lib/utils/share-code";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "任务不存在" },
  NOT_ACTIVE: { status: 410, message: "任务已关闭" },
  FULL: { status: 410, message: "名额已满" },
  DUPLICATE: { status: 409, message: "你已经提交过了" },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // 速率限制：每个 IP 每分钟最多 10 次提交（完成者未登录，只能用 IP）
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`submit:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: "操作太频繁，请稍后再试" }, { status: 429 });
  }

  const supabase = await createClient();
  const body = await request.json();

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const proof_screenshot_url = body.proof_screenshot_url || null;

  if (!name) {
    return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
  }

  if (!isValidName(name)) {
    return NextResponse.json(
      { error: "姓名长度需在 2-50 个字符之间" },
      { status: 400 }
    );
  }

  if (!phone) {
    return NextResponse.json({ error: "请填写手机号" }, { status: 400 });
  }

  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { error: "手机号格式不正确（请输入 11 位中国大陆手机号）" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("submit_task_completion", {
    p_share_code: code,
    p_name: name,
    p_phone: phone,
    p_proof_url: proof_screenshot_url,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (row?.error_code) {
    const mapped = ERROR_MAP[row.error_code] || {
      status: 500,
      message: "提交失败",
    };
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({
    success: true,
    completion_id: row.completion_id,
  });
}
