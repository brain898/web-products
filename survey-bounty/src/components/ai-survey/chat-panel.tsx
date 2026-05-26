"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { SurveyQuestion } from "@/types/database";
import { Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  sessionId: string | null;
  onQuestionsGenerated: (result: {
    title: string;
    questions: SurveyQuestion[];
  }) => void;
  onSessionCreated: (sessionId: string) => void;
  quotaRemaining?: number | null;
}

export function ChatPanel({
  sessionId,
  onQuestionsGenerated,
  onSessionCreated,
  quotaRemaining,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeSessionId = useRef<string | null>(sessionId);

  // 同步 sessionId ref
  useEffect(() => {
    activeSessionId.current = sessionId;
  }, [sessionId]);

  // 加载会话历史消息
  const loadMessages = useCallback(async (sid: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/ai-survey/sessions/${sid}`);
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = (data.messages || []).map(
          (m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })
        );
        setMessages(msgs);

        // 如果最后一条是 assistant 且包含题目，提取
        const lastAssistant = [...(data.messages || [])]
          .reverse()
          .find((m: { role: string }) => m.role === "assistant");
        if (lastAssistant?.questions_snapshot) {
          onQuestionsGenerated({
            title: data.session.title || "未命名问卷",
            questions: lastAssistant.questions_snapshot,
          });
        }
      }
    } catch {
      // 静默
    } finally {
      setLoadingHistory(false);
    }
  }, [onQuestionsGenerated]);

  // sessionId 变化时加载历史
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, loadMessages]);

  // 自动滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 发送消息
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);

    // 添加空的 assistant 消息用于流式填充
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const body: Record<string, unknown> = {
        message: text,
        createSession: !activeSessionId.current,
      };
      if (activeSessionId.current) {
        body.sessionId = activeSessionId.current;
      }

      const res = await fetch("/api/ai-survey/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errorMsg = errData.error || "请求失败";
        // 移除空的 assistant 消息
        setMessages((prev) => prev.slice(0, -1));
        // 用系统提示替代
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: res.status === 429
              ? `今日生成次数已用完，明天再来。你可以继续对话，但 AI 不会生成新的题目。`
              : `抱歉，出了点问题：${errorMsg}`,
          },
        ]);
        return;
      }

      // 读取 SSE 流
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.done) {
              // 流结束信号
              if (parsed.sessionId) {
                activeSessionId.current = parsed.sessionId;
                onSessionCreated(parsed.sessionId);
              }
              if (parsed.questions) {
                // 消耗一次配额
                fetch("/api/ai-survey/quota", { method: "POST" }).catch(() => {});
                onQuestionsGenerated(parsed.questions);
              }
              continue;
            }

            if (parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: fullContent,
                };
                return updated;
              });
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "网络错误，请稍后再试。",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, streaming, onQuestionsGenerated, onSessionCreated]);

  // Enter 发送，Shift+Enter 换行
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              AI 帮你写问卷
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              告诉我你想调研什么，我会先帮你理清需求，再生成完整的问卷题目。
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                "大学生消费习惯调研",
                "课程满意度调查",
                "校园生活需求问卷",
                "产品用户体验调研",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted transition-colors text-foreground/70"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                  }
                `}
              >
                <div className="whitespace-pre-wrap break-words">
                  {msg.content || (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      思考中...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isEmpty
                ? "告诉我你想做什么问卷..."
                : "继续对话，或让 AI 调整题目..."
            }
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
            style={{ minHeight: "42px" }}
            disabled={streaming}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 128) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="shrink-0 h-[42px] w-[42px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
