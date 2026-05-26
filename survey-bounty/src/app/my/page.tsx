"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const statusLabels: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color: string;
  }
> = {
  pending: { label: "等待审核", variant: "secondary", color: "" },
  verified: { label: "已审核，等打款", variant: "outline", color: "" },
  paid: { label: "已付款，请确认收款", variant: "default", color: "text-amber-600" },
  confirmed: { label: "已确认收款", variant: "default", color: "text-green-600" },
  dispute_pending: { label: "举报待仲裁", variant: "destructive", color: "" },
  disputed: { label: "仲裁结果：赖账", variant: "destructive", color: "" },
};

interface CompletionRecord {
  id: string;
  completer_name: string | null;
  completer_phone: string | null;
  payment_status: string;
  proof_screenshot_url: string | null;
  created_at: string;
  task: {
    id: string;
    title: string;
    reward_amount: number;
    status: string;
  } | null;
}

export default function MySubmissionsPage() {
  const [phone, setPhone] = useState("");
  const [records, setRecords] = useState<CompletionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("请输入手机号");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/completions/lookup?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "查询失败");
        setRecords([]);
      } else {
        setRecords(data.completions || []);
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (completionId: string) => {
    setConfirmingId(completionId);
    try {
      const res = await fetch(`/api/completions/${completionId}/confirm`, {
        method: "POST",
      });
      if (res.ok) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === completionId ? { ...r, payment_status: "confirmed" } : r
          )
        );
      } else {
        const d = await res.json();
        setError(d.error || "确认失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDispute = async (completionId: string) => {
    if (!confirm("确认举报？举报后发布者信用分会受影响")) return;
    setConfirmingId(completionId);
    try {
      const res = await fetch(`/api/completions/${completionId}/dispute`, {
        method: "POST",
      });
      if (res.ok) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === completionId
              ? { ...r, payment_status: "dispute_pending" }
              : r
          )
        );
      } else {
        const d = await res.json();
        setError(d.error || "举报失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setConfirmingId(null);
    }
  };

  const totalReward = records
    .filter((r) => r.payment_status === "confirmed")
    .reduce((sum, r) => sum + (r.task?.reward_amount || 0), 0);

  const pendingConfirm = records.filter((r) => r.payment_status === "paid");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">我的提交</h1>
      <p className="text-sm text-muted-foreground mb-6">
        输入手机号查看你的所有提交记录和收款状态
      </p>

      {/* 搜索表单 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="flex-1">
          <Label htmlFor="phone" className="sr-only">手机号</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="输入提交时填写的手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "查询中..." : "查询"}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 待确认收款提醒 */}
      {pendingConfirm.length > 0 && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <strong>有 {pendingConfirm.length} 笔付款等待你确认收款！</strong>
            <br />
            <span className="text-xs">请检查微信转账是否到账，然后在下方确认。</span>
          </AlertDescription>
        </Alert>
      )}

      {searched && !loading && records.length === 0 && !error && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-4xl mb-2">📭</p>
            <p className="font-medium text-muted-foreground">未找到提交记录</p>
            <p className="text-xs text-muted-foreground mt-1">
              请确认手机号是否正确
            </p>
          </CardContent>
        </Card>
      )}

      {/* 统计 */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-xl font-bold">{records.length}</div>
              <p className="text-xs text-muted-foreground mt-0.5">总提交</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-xl font-bold text-green-600">
                ¥{(totalReward / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">已到账</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 提交列表 */}
      <div className="space-y-3">
        {records.map((r) => {
          const status = statusLabels[r.payment_status] || statusLabels.pending;
          const reward = ((r.task?.reward_amount || 0) / 100).toFixed(2);

          return (
            <Card
              key={r.id}
              className={
                r.payment_status === "paid"
                  ? "ring-2 ring-amber-400 dark:ring-amber-500"
                  : ""
              }
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {r.task?.title || "未知任务"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">¥{reward}</p>
                    <Badge
                      variant={status.variant}
                      className="text-xs mt-1"
                    >
                      {status.label}
                    </Badge>
                  </div>
                </div>

                {/* 截图预览 */}
                {r.proof_screenshot_url && (
                  <a
                    href={r.proof_screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={r.proof_screenshot_url}
                      alt="完成截图"
                      className="max-h-24 rounded border object-cover mt-2"
                    />
                  </a>
                )}

                {/* 状态说明 */}
                {r.payment_status === "pending" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    等待发布者审核你的截图
                  </p>
                )}
                {r.payment_status === "verified" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    截图审核通过，等待发布者通过微信转账付款
                  </p>
                )}
                {r.payment_status === "paid" && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      发布者已标记付款，请检查微信是否收到转账
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => handleConfirm(r.id)}
                        disabled={confirmingId === r.id}
                      >
                        {confirmingId === r.id ? "处理中..." : "确认收到"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-9"
                        onClick={() => handleDispute(r.id)}
                        disabled={confirmingId === r.id}
                      >
                        举报未收到
                      </Button>
                    </div>
                  </div>
                )}
                {r.payment_status === "confirmed" && (
                  <p className="text-xs text-green-600 mt-3 font-medium">
                    已确认收款
                  </p>
                )}
                {r.payment_status === "dispute_pending" && (
                  <p className="text-xs text-destructive mt-3">
                    举报已提交，等待平台仲裁
                  </p>
                )}
                {r.payment_status === "disputed" && (
                  <p className="text-xs text-destructive mt-3 font-medium">
                    仲裁结果：发布者赖账
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
