"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CompletionStatus } from "@/types/database";

const statusLabels: Record<CompletionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "等待审核", variant: "secondary" },
  verified: { label: "已审核，等打款", variant: "outline" },
  paid: { label: "已付款，请确认收款", variant: "default" },
  confirmed: { label: "已确认收款", variant: "outline" },
  dispute_pending: { label: "举报待仲裁", variant: "destructive" },
  disputed: { label: "仲裁结果：赖账", variant: "destructive" },
};

interface CompletionDetail {
  id: string;
  completer_name: string | null;
  completer_phone: string | null;
  payment_status: CompletionStatus;
  created_at: string;
}

interface TaskInfo {
  title: string;
  reward_amount: number;
  creator_id: string;
}

export default function CompletionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<{
    completion: CompletionDetail;
    task: TaskInfo | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState("");

  useEffect(() => {
    fetch(`/api/completions/${id}`)
      .then((res) => res.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/completions/${id}/confirm`, { method: "POST" });
      if (res.ok) {
        setActionDone("confirmed");
        setData((p) => p ? { ...p, completion: { ...p.completion, payment_status: "confirmed" } } : p);
      } else { const d = await res.json(); setError(d.error || "操作失败"); }
    } catch { setError("网络错误"); }
    finally { setActionLoading(false); }
  };

  const handleDispute = async () => {
    if (!confirm("确认举报？举报后发布者信用分会受影响")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/completions/${id}/dispute`, { method: "POST" });
      if (res.ok) {
        setActionDone("disputed");
        setData((p) => p ? { ...p, completion: { ...p.completion, payment_status: "disputed" } } : p);
      } else { const d = await res.json(); setError(d.error || "操作失败"); }
    } catch { setError("网络错误"); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="text-muted-foreground">加载中...</div></div>;
  if (error && !data) return <div className="flex min-h-screen items-center justify-center p-4"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>;
  if (!data) return null;

  const status = statusLabels[data.completion.payment_status];

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card className="animate-fade-in-up">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{data.task?.title || "任务"}</CardTitle>
          <CardDescription>完成记录详情</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {actionDone === "confirmed" && <Alert><AlertDescription>已确认收款！</AlertDescription></Alert>}
          {actionDone === "disputed" && <Alert variant="destructive"><AlertDescription>已举报</AlertDescription></Alert>}

          <div className="text-center">
            <Badge variant={status.variant} className="text-base px-4 py-1">{status.label}</Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">赏金</span><span className="font-medium">{((data.task?.reward_amount || 0) / 100).toFixed(2)} 元</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">姓名</span><span className="font-medium">{data.completion.completer_name || "未填写"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">手机号</span><span>{data.completion.completer_phone || "未填写"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">提交时间</span><span>{new Date(data.completion.created_at).toLocaleString("zh-CN")}</span></div>
          </div>

          {data.completion.payment_status === "paid" && (
            <>
              <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                请确认微信转账已到账。如未收到，可选择举报。
              </p>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleConfirm} disabled={actionLoading}>确认收到</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDispute} disabled={actionLoading}>举报未收到</Button>
              </div>
            </>
          )}

          {data.completion.payment_status === "pending" && <p className="text-center text-sm text-muted-foreground">等待发布者审核截图</p>}
          {data.completion.payment_status === "verified" && <p className="text-center text-sm text-muted-foreground">截图已审核通过，等待发布者打款</p>}
          {data.completion.payment_status === "dispute_pending" && <p className="text-center text-sm text-muted-foreground">举报已提交，等待平台仲裁</p>}
          {(data.completion.payment_status === "confirmed" || data.completion.payment_status === "disputed") && <p className="text-center text-sm text-muted-foreground">该记录已处理完毕</p>}
        </CardContent>
      </Card>
    </div>
  );
}
