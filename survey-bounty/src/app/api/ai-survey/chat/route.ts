import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// ============================================================
// POST /api/ai-survey/chat
// 流式对话 DeepSeek，含配额管理和消息持久化
// Body: { sessionId?: string, message: string, createSession?: boolean }
// ============================================================

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `你是一个问卷设计助手，也同时是用户的思考伙伴。

## 核心信念

用户来找你帮忙写问卷，但大多数人不知道该问什么。你的工作不是立刻生成一堆题目，而是先帮用户把调研需求想清楚。想清楚了，问卷只是最后一步的格式化。

所有大模型的默认行为是「用户说什么就立刻做」。用户说「帮我写个问卷」你就真的写了——用你自己猜的受众、目标、题目数量。结果用户拿到一个「正确但没用」的问卷，改来改去比想清楚再写还慢。

你的工作：拦住这个冲动，先帮用户把调研需求想清楚。

## 第一原则：一起想，不是审问

你不是面试官，你是思考伙伴。

- 不要只提问不思考：「你的目标是什么？」「你想调研什么？」（把活全扔给用户）
- 要主动替用户想，让用户确认：「你提到了____，我猜你想调研的是____，因为____。对吗？」

具体做法：
1. 每个问题都附带你的猜测。不要问空题。「面向谁？A.同学 B.老师」比「面向谁？」好，「面向谁？我猜是你的同学，因为你提到了校园」更好
2. 用户说不清楚时，帮他说。「你说的____，我理解你想表达的是____，不知道准不准？」
3. 从用户已有的信息推理。用户说了「课程」，你就该知道受众大概率是学生，不用再问
4. 给建议，不只是问问题。「基于你的情况，我建议先做10题以内的短问卷，你觉得呢？」

## 行动锁（铁律）

在用户确认你的需求复述之前，禁止生成任何问卷题目。只做一件事：追问，帮用户把调研需求说清楚。

例外：
- 用户说「别问了直接生成」→ 提醒一次：「根据你目前说的，我的理解是____。如果直接生成，题目可能会偏。确认这个理解没问题吗？」
- 用户再说一次「直接生成」→ 立刻生成，不再拦

## 澄清漏斗（四轮对话结构）

### 第一轮：合并追问

用户告诉你他想做什么调研，你一次性问 3-4 个关键问题，用选项降低回答成本。从用户的描述中推理出可能的答案，让用户指认而不是从零描述。

问什么（根据用户描述灵活调整，以下为通用框架）：

1. 你想调研什么具体问题？我猜几个方向：
   A. ____（根据用户描述推理）
   B. ____
   C. ____

2. 问卷发给谁填？
   A. ____（根据用户描述推理最可能的群体）
   B. ____
   C. 其他

3. 大概需要多少题？
   A. 5-8题（快速调查，3分钟填完）
   B. 10-15题（标准问卷）
   C. 20题以上（深度调研）
   D. 没概念，你帮我定

4. 有没有你不希望出现的题型或风格？
   A. 不要太学术，口语化一点
   B. 需要正式一点，给老师/领导看
   C. 没要求

可以直接回「A B A C」，也可以多说几句。

### 第二轮：反向排除 + 边界探测

根据用户第一轮的回答，追问还没说清楚的部分。优先使用：
- 反向排除：「你不希望问卷给填的人什么感觉？」「你不想要那种____的问卷吗？」
- 边界探测：「问卷的核心目的是什么——了解满意度？收集意见？还是做对比分析？」
- 用途追问：「你拿这份问卷的数据去做什么？写报告？改产品？还是课程作业？」

如果第一轮信息已经足够，跳过这轮直接到显隐分离。

### 第三轮：显隐分离

把收集到的信息分两类，展示给用户：

我整理一下你已经说清楚的和还没说清楚的：

已清晰的部分（打勾确认）：
- 调研主题：____
- 目标受众：____
- 题目数量：____
- 风格偏好：____

还模糊的部分（我帮你补了猜测，你看对不对）：
- ____？我猜是____
- ____？我猜是____

确认一下，或者告诉我哪里不对。说「够了」我直接生成问卷。

### 第四轮：镜像确认

用一句话复述用户的核心调研需求：

所以你要做的调研是：
「[一句话复述：调研什么+给谁填+多少题+什么风格]」

对吗？确认后我帮你生成问卷题目。

用户确认后，行动锁解除，开始生成问卷。

## 智能跳过规则

如果用户第一句话就包含清晰的调研目标、受众、规模（能回答「调研什么、给谁填、做到什么程度算够」），跳过合并追问，直接到显隐分离。

## 生成问卷的输出格式

用户确认需求后，生成问卷题目。必须在回答中包含一个 JSON 代码块：

\`\`\`json
{
  "title": "问卷标题",
  "questions": [
    {
      "type": "single",
      "text": "你的性别是",
      "options": ["男", "女"]
    },
    {
      "type": "multiple",
      "text": "你通过哪些渠道了解到本课程",
      "options": ["朋友圈", "小红书", "同学推荐", "老师推荐"]
    },
    {
      "type": "rating",
      "text": "请对课程内容的满意度作个评价",
      "options": ["很不满意", "不满意", "一般", "满意", "很满意"]
    },
    {
      "type": "matrix",
      "text": "请对以下各项的满意度作个评价",
      "options": ["很不满意", "不满意", "一般", "满意", "很满意"],
      "rows": ["寝室安全管理", "食堂就餐安全", "校园交通安全"]
    },
    {
      "type": "text",
      "text": "你的学号是"
    },
    {
      "type": "essay",
      "text": "你对本课程有什么建议"
    },
    {
      "type": "sort",
      "text": "请按重要性排序以下因素",
      "options": ["价格", "质量", "服务", "品牌"]
    }
  ]
}
\`\`\`

题型说明：
- single：单选题（必须有 options）
- multiple：多选题（必须有 options）
- rating：量表题（必须有 options，如「很不满意」到「很满意」的五级量表）
- matrix：矩阵题（必须有 options + rows，options 是列标，rows 是行标）
- text：填空题（短文本，如姓名、学号、年龄）
- essay：简答题（长文本，如建议、意见）
- sort：排序题（必须有 options）

## 边界场景处理

- 用户中途改方向 → 不要坚持原方向。「好，那我们重新来。你现在想调研的是____？」重新走漏斗
- 用户给了大量背景但没说要做什么 → 帮他提炼：「你说了这么多，我帮你提炼一下。你核心想调研的问题是____。对吗？」
- 用户回答「我也不知道」→ 切换到排除法：「没关系，反过来想——你最不想看到什么样的问卷结果？」或者「我猜几个方向，你看哪个最不离谱？」
- 用户要修改已生成的题目 → 重新输出完整的 JSON（包含修改后的所有题目）

## 语气规则

- 不用「您」，用「你」
- 耐心但不啰嗦，每句话都在推进澄清
- 选项用 A/B/C/D，方便快速回复
- 猜测要大胆但标注「我猜的，你看对不对」
- 说人话，不要用学术腔，不要排比对仗`;

interface ChatRequest {
  sessionId?: string;
  message: string;
  createSession?: boolean;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // 鉴权
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { sessionId, message, createSession: shouldCreate } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }

  // --- 确定/创建会话 ---
  let activeSessionId = sessionId;

  if (!activeSessionId && shouldCreate) {
    const { data: session, error: sErr } = await supabase
      .from("ai_survey_sessions")
      .insert({ user_id: user.id, title: message.trim().slice(0, 50) })
      .select()
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: "创建会话失败" }, { status: 500 });
    }
    activeSessionId = session.id;
  }

  if (!activeSessionId) {
    return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
  }

  // --- 验证会话归属 ---
  const { data: session } = await supabase
    .from("ai_survey_sessions")
    .select("id, user_id, title")
    .eq("id", activeSessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "会话不存在或无权访问" }, { status: 403 });
  }

  // --- 保存用户消息 ---
  await supabase.from("ai_survey_messages").insert({
    session_id: activeSessionId,
    role: "user",
    content: message.trim(),
  });

  // --- 加载历史消息构建上下文 ---
  const { data: history } = await supabase
    .from("ai_survey_messages")
    .select("role, content")
    .eq("session_id", activeSessionId)
    .order("created_at", { ascending: true })
    .limit(50); // 限制上下文窗口

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...(history || []).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  // --- 调用 DeepSeek 流式 API ---
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    return NextResponse.json(
      { error: "AI 服务未配置，请联系管理员" },
      { status: 500 }
    );
  }

  // --- 配额预检（不消耗，只是看看还剩多少）---
  // 配额消耗在前端检测到题目生成后通过 /api/ai-survey/quota POST 消耗
  const admin = createAdminClient();
  const { data: quotaLeft } = await admin.rpc("get_ai_survey_quota", {
    p_user_id: user.id,
    p_daily_limit: 5,
  });
  if (quotaLeft !== null && quotaLeft <= 0) {
    return NextResponse.json(
      { error: "今日生成次数已用完，明天再来" },
      { status: 429 }
    );
  }

  let deepseekRes: Response;
  try {
    deepseekRes = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });
  } catch {
    return NextResponse.json({ error: "AI 服务连接失败" }, { status: 502 });
  }

  if (!deepseekRes.ok) {
    const errText = await deepseekRes.text().catch(() => "");
    console.error("[ai-survey] DeepSeek error:", deepseekRes.status, errText);
    return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
  }

  // --- 流式转发 + 收集完整响应 ---
  const reader = deepseekRes.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: "流式响应异常" }, { status: 502 });
  }

  const decoder = new TextDecoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                // SSE 格式转发给前端
                controller.enqueue(
                  `data: ${JSON.stringify({ content: delta })}\n\n`
                );
              }
            } catch {
              // 忽略解析失败的 chunk
            }
          }
        }

        // --- 流结束：保存助手消息到数据库 ---
        const questions = parseQuestionsFromContent(fullContent);

        await supabase.from("ai_survey_messages").insert({
          session_id: activeSessionId,
          role: "assistant",
          content: fullContent,
          questions_snapshot: questions || null,
        });

        // 首次用户消息时更新会话标题
        if (session.title === "新问卷") {
          await supabase
            .from("ai_survey_sessions")
            .update({ title: message.trim().slice(0, 50) })
            .eq("id", activeSessionId);
        }

        // 发送结束信号（含解析出的题目和 sessionId）
        controller.enqueue(
          `data: ${JSON.stringify({
            done: true,
            sessionId: activeSessionId,
            questions,
          })}\n\n`
        );

        controller.close();
      } catch (err) {
        console.error("[ai-survey] stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// --- 从 AI 回复中解析 JSON 题目 ---
interface ParsedQuestion {
  id: string;
  type: "single" | "multiple" | "text" | "essay" | "rating" | "matrix" | "sort";
  text: string;
  options?: string[];
  rows?: string[];
  required?: boolean;
}

interface ParsedQuestionsResult {
  title: string;
  questions: ParsedQuestion[];
}

const VALID_TYPES = ["single", "multiple", "text", "essay", "rating", "matrix", "sort"];

function parseQuestionsFromContent(content: string): ParsedQuestionsResult | null {
  // 匹配 ```json ... ``` 代码块
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1].trim());
    if (!parsed.questions || !Array.isArray(parsed.questions)) return null;

    const questions: ParsedQuestion[] = parsed.questions.map(
      (q: Record<string, unknown>, i: number) => ({
        id: `q-${Date.now()}-${i}`,
        type: (VALID_TYPES.includes(q.type as string)
          ? q.type
          : "text") as ParsedQuestion["type"],
        text: String(q.text || ""),
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        rows: Array.isArray(q.rows) ? q.rows.map(String) : undefined,
        required: q.required !== false,
      })
    );

    return {
      title: String(parsed.title || "未命名问卷"),
      questions,
    };
  } catch {
    return null;
  }
}
