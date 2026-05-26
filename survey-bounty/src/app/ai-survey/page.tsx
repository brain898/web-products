"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/ai-survey/chat-panel";
import { QuestionEditor } from "@/components/ai-survey/question-editor";
import type { SurveyQuestion, AiSurveySession } from "@/types/database";
import { MessageSquare, List, Trash2, Plus, Clock, Zap } from "lucide-react";

type Tab = "chat" | "questions";

export default function AiSurveyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 会话状态
  const [sessions, setSessions] = useState<AiSurveySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [surveyTitle, setSurveyTitle] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<Tab>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaLimit] = useState(5);

  // 未登录跳转
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login?redirect=/ai-survey");
    }
  }, [user, loading, router]);

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-survey/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    if (user) loadSessions();
  }, [user, loadSessions]);

  // 加载配额
  const loadQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-survey/quota");
      if (res.ok) {
        const data = await res.json();
        setQuotaRemaining(data.remaining);
      }
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    if (user) loadQuota();
  }, [user, loadQuota]);

  // 新建会话
  const handleNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setQuestions([]);
    setSurveyTitle("");
    setMobileTab("chat");
  }, []);

  // AI 生成题目后的回调
  const handleQuestionsGenerated = useCallback(
    (result: { title: string; questions: SurveyQuestion[] }) => {
      setQuestions(result.questions);
      setSurveyTitle(result.title);
      setMobileTab("questions"); // 移动端自动切到题目 tab
      loadSessions(); // 刷新会话列表（标题可能更新了）
      loadQuota(); // 刷新配额
    },
    [loadSessions, loadQuota]
  );

  // 会话创建/切换回调
  const handleSessionChange = useCallback(
    (sessionId: string) => {
      setCurrentSessionId(sessionId);
      loadSessions();
    },
    [loadSessions]
  );

  // 删除会话
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!confirm("确定删除这个会话？")) return;
      try {
        const res = await fetch(`/api/ai-survey/sessions/${sessionId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          if (currentSessionId === sessionId) {
            handleNewSession();
          }
          loadSessions();
        }
      } catch {
        // 静默失败
      }
    },
    [currentSessionId, handleNewSession, loadSessions]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* 侧边栏 - 会话列表 */}
      <aside
        className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          fixed md:static inset-y-0 left-0 z-30
          w-64 bg-card border-r flex flex-col
          transition-transform duration-200
        `}
      >
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80">历史会话</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-muted-foreground hover:text-foreground"
          >
            &times;
          </button>
        </div>

        {/* 配额显示 */}
        {quotaRemaining !== null && (
          <div className="px-3 py-2 border-b">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span>今日剩余 <strong className={quotaRemaining <= 1 ? "text-destructive" : "text-foreground"}>{quotaRemaining}</strong>/{quotaLimit} 次生成</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`
                group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm
                ${currentSessionId === s.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground/80"
                }
              `}
              onClick={() => {
                setCurrentSessionId(s.id);
                setSidebarOpen(false);
              }}
            >
              <Clock className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span className="flex-1 truncate">{s.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(s.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              还没有会话
            </p>
          )}
        </div>

        <div className="p-3 border-t">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            新问卷
          </button>
        </div>
      </aside>

      {/* 遮罩层（移动端侧边栏打开时） */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端 tab 切换 + 侧边栏按钮 */}
        <div className="md:hidden flex items-center border-b">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-3 py-2 text-muted-foreground hover:text-foreground border-r"
          >
            <List className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMobileTab("chat")}
            className={`flex-1 py-2 text-sm font-medium text-center ${
              mobileTab === "chat"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-1" />
            对话
          </button>
          <button
            onClick={() => setMobileTab("questions")}
            className={`flex-1 py-2 text-sm font-medium text-center ${
              mobileTab === "questions"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            题目 {questions.length > 0 && `(${questions.length})`}
          </button>
        </div>

        {/* 桌面端：左右分栏 / 移动端：按 tab 切换 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 对话区 */}
          <div
            className={`
              ${mobileTab === "chat" ? "flex" : "hidden"}
              md:flex flex-col flex-1 min-w-0
            `}
          >
            <ChatPanel
              sessionId={currentSessionId}
              onQuestionsGenerated={handleQuestionsGenerated}
              onSessionCreated={handleSessionChange}
              quotaRemaining={quotaRemaining}
            />
          </div>

          {/* 题目编辑区 */}
          <div
            className={`
              ${mobileTab === "questions" ? "flex" : "hidden"}
              md:flex flex-col
              md:w-[420px] lg:w-[480px]
              border-l
            `}
          >
            <QuestionEditor
              questions={questions}
              surveyTitle={surveyTitle}
              onQuestionsChange={setQuestions}
              onTitleChange={setSurveyTitle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
