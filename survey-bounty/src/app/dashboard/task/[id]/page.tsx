"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Task, TaskCompletion } from "@/types/database";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待审核", variant: "secondary" },
  verified: { label: "已审核", variant: "outline" },
  paid: { label: "已付款", variant: "default" },
  confirmed: { label: "已确认", variant: "default" },
  dispute_pending: { label: "待仲裁", variant: "destructive" },
  disputed: { label: "已仲裁", variant: "destructive" },
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const taskRes = await fetch(`/api/tasks/detail/${id}`);
      const taskData = await taskRes.json();
      if (!taskRes.ok || !taskData.task) { setError(taskData.error || "任务不存在"); setLoading(false); return; }
      setTask(taskData.task);

      // 任务信息到了立刻渲染，completions 在后台并行加载
      setLoading(false);

      const code = taskData.task.share_code;
      fetch(`/api/tasks/${code}/completions`)
        .then((res) => res.json())
        .then((data) => { if (data.completions) setCompletions(data.completions); })
        .catch(() => {});
    } catch { setError("加载失败"); setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/auth/login"); return; }
    if (user) loadData();
  }, [user, authLoading, loadData, router]);

  const copyAllInfo = () => {
    const list = completions
      .filter((c) => ["pending", "verified"].includes(c.payment_status))
      .map((c) => `${c.completer_name || ""} ${c.completer_phone || ""}`.trim())
      .join("\n");
    if (!list) { setError("没有待处理的填写者"); return; }
    navigator.clipboard.writeText(list).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleAction = async (completionId: string, action: "verify" | "pay") => {
    setActioningId(completionId);
    // 乐观更新：先改 UI
    const newStatus = action === "verify" ? "verified" : "paid";
    setCompletions((prev) =>
      prev.map((c) =>
        c.id === completionId ? { ...c, payment_status: newStatus } : c
      )
    );
    try {
      const res = await fetch(`/api/completions/${completionId}/${action}`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "操作失败");
        // 回滚
        loadData();
      }
    } catch {
      setError("网络错误");
      loadData();
    } finally {
      setActioningId(null);
    }
  };

  const handleTaskAction = async (action: "close" | "delete") => {
    const msg = action === "delete" ? "确认删除？删除后不可恢复" : "确认关闭？关闭后不再接受新提交";
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/tasks/${task!.share_code}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        if (action === "delete") router.push("/dashboard");
        else loadData();
      } else {
        const d = await res.json();
        setError(d.error || "操作失败");
      }
    } catch { setError("网络错误"); }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (error && !task) {
    return <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>;
  }
  if (!task) return null;

  const shareUrl = `${window.location.origin}/t/${task.share_code}`;
  const pendingCount = completions.filter((c) => c.payment_status === "pending").length;
  const verifiedCount = completions.filter((c) => c.payment_status === "verified").length;
  const confirmedCount = completions.filter((c) => c.payment_status === "confirmed").length;
  const disputeCount = completions.filter((c) => c.payment_status === "dispute_pending" || c.payment_status === "disputed").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="mb-4 -ml-2 text-muted-foreground">
        ← 返回
      </Button>

      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-3xl font-bold">{task.title}</h1>
        <div className="flex gap-2 shrink-0">
          {task.status === "active" && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleTaskAction("close")}>
              关闭任务
            </Button>
          )}
          <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleTaskAction("delete")}>
            删除
          </Button>
        </div>
      </div>
      {task.description && <p className="text-sm text-muted-foreground mb-6">{task.description}</p>}

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* 分享链接 */}
      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">分享链接</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-2.5 py-2 text-xs break-all">{shareUrl}</code>
            <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={() => navigator.clipboard.writeText(shareUrl)}>复制</Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-xl sm:text-2xl font-bold">{completions.length}</div>
          <p className="text-xs text-muted-foreground mt-0.5">已提交</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-xl sm:text-2xl font-bold text-orange-500">{pendingCount}</div>
          <p className="text-xs text-muted-foreground mt-0.5">待审核</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-xl sm:text-2xl font-bold text-green-500">{confirmedCount}</div>
          <p className="text-xs text-muted-foreground mt-0.5">已完成</p>
        </CardContent></Card>
        {disputeCount > 0 && (
          <Card><CardContent className="pt-4 pb-3 text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-500">{disputeCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">有争议</p>
          </CardContent></Card>
        )}
      </div>

      {/* 操作栏 */}
      {completions.length > 0 && (
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={copyAllInfo} className="w-full sm:w-auto">
            {copied ? "已复制 ✓" : "一键复制填写者信息"}
          </Button>
        </div>
      )}

      {/* 完成者列表 */}
      <div className="space-y-3">
        {completions.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              <p className="text-4xl mb-2">📭</p>
              <p className="font-medium">暂无提交</p>
              <p className="text-xs mt-1">分享链接给同学开始收集</p>
            </CardContent>
          </Card>
        ) : (
          completions.map((c) => {
            const status = statusLabels[c.payment_status];
            return (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{c.completer_name || "未填写"}</span>
                      <span className="text-xs text-muted-foreground">{c.completer_phone || ""}</span>
                      <Badge variant={status.variant} className="shrink-0 text-xs">{status.label}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(task.reward_amount / 100).toFixed(2)} 元
                    </span>
                  </div>

                  {/* 截图预览 */}
                  {c.proof_screenshot_url && (
                    <div className="mb-3">
                      <a href={c.proof_screenshot_url} target="_blank" rel="noopener noreferrer">
                        <img src={c.proof_screenshot_url} alt="完成截图" className="max-h-32 rounded border object-cover" />
                      </a>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("zh-CN")}
                    </span>
                    <div className="flex gap-2">
                      {c.payment_status === "pending" && (
                        <Button size="sm" className="h-8 text-xs" onClick={() => handleAction(c.id, "verify")}>审核通过</Button>
                      )}
                      {c.payment_status === "verified" && (
                        <Button size="sm" className="h-8 text-xs" onClick={() => handleAction(c.id, "pay")}>标记已付款</Button>
                      )}
                      {c.payment_status === "paid" && (
                        <span className="text-xs text-muted-foreground">等待确认</span>
                      )}
                      {c.payment_status === "confirmed" && (
                        <span className="text-xs text-green-600 font-medium">已完成</span>
                      )}
                      {c.payment_status === "dispute_pending" && (
                        <div className="flex gap-2">
                          <Badge variant="destructive" className="text-xs">待仲裁</Badge>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => handleAction(c.id, "pay")}>补付款</Button>
                        </div>
                      )}
                      {c.payment_status === "disputed" && (
                        <Badge variant="destructive" className="text-xs">仲裁：赖账</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
