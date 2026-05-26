"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { uploadImage } from "@/lib/supabase/storage";
import type { Task } from "@/types/database";

export default function TaskFillPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [publisherStats, setPublisherStats] = useState<{
    total_published: number;
    total_completions: number;
    payment_rate: number | null;
    avg_response_hours: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completionId, setCompletionId] = useState("");

  useEffect(() => {
    fetch(`/api/tasks/${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else { setTask(data.task); setPublisherStats(data.publisher_stats); }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [code]);

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("截图不能超过 5MB"); return; }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("请填写姓名"); return; }
    if (!phone.trim()) { setError("请填写手机号"); return; }
    if (!proofFile) { setError("请上传完成截图"); return; }

    setSubmitting(true);
    try {
      const proofUrl = await uploadImage(proofFile, "task-images", "proofs");

      const res = await fetch(`/api/tasks/${code}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), proof_screenshot_url: proofUrl }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "提交失败"); return; }

      setCompletionId(data.completion_id);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 text-center">
            <p className="text-5xl mb-4">😔</p>
            <p className="text-lg font-semibold">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">请联系任务发布者</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 text-center">
            <p className="text-5xl mb-4">🎉</p>
            <p className="text-xl font-semibold">提交成功！</p>
            <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/30 p-4">
              <p className="text-sm text-green-700 dark:text-green-400">
                赏金 <strong className="text-lg">{((task?.reward_amount || 0) / 100).toFixed(2)}</strong> 元
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                审核通过后发布者将通过微信手机号转账
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                平台不担保资金到账，请自行与发布者确认
              </p>
            </div>
            <div className="mt-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <strong>重要：</strong>如果还没开启「允许通过手机号向我转账」，发布者将无法给你转账。
                <br />路径：微信 → 我 → 服务 → 钱包 → 支付设置 → 允许通过手机号向我转账
              </p>
            </div>
            <a href="/my" className="block mt-4">
              <Button className="w-full" size="lg">查看我的提交状态</Button>
            </a>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              用手机号 {phone} 随时查看审核和收款进度
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!task) return null;

  // 已满或已关闭
  if (task.status === "full" || task.status === "closed") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 text-center">
            <p className="text-5xl mb-4">{task.status === "full" ? "🎯" : "🔒"}</p>
            <p className="text-xl font-semibold">
              {task.status === "full" ? "名额已满" : "任务已关闭"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {task.status === "full"
                ? "所有名额已被领取，下次手速快一点"
                : "发布者已关闭此任务"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remaining = task.max_slots - task.current_completions;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      {/* 任务头部 */}
      <Card className="mb-5">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl sm:text-2xl leading-tight flex-1">{task.title}</CardTitle>
            <Badge variant="secondary" className="shrink-0 text-sm px-3 py-1 font-semibold">
              ¥{(task.reward_amount / 100).toFixed(2)}
            </Badge>
          </div>
          {task.description && (
            <CardDescription className="mt-2 text-sm leading-relaxed">{task.description}</CardDescription>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              剩余 {remaining} 个名额
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
              {publisherStats && publisherStats.total_published > 0 ? (
                <>
                  已发 {publisherStats.total_published} 单
                  {publisherStats.payment_rate !== null && (
                    <> · {publisherStats.payment_rate}% 按时付款</>
                  )}
                  {publisherStats.avg_response_hours !== null && (
                    <> · 平均 {publisherStats.avg_response_hours}h 回复</>
                  )}
                </>
              ) : (
                "新发布者"
              )}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* 任务截图 */}
      {task.task_image_url && (
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">任务详情</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={task.task_image_url}
              alt="任务截图"
              className="w-full rounded-lg border"
              loading="lazy"
            />
          </CardContent>
        </Card>
      )}

      {/* 外部链接 */}
      {task.external_link && (
        <Card className="mb-5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">第 1 步：完成任务</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{task.external_link}</p>
              </div>
              <a href={task.external_link} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="shrink-0">打开链接</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-5" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 免责提示 */}
      <Alert className="mb-5 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
          本平台仅提供任务撮合服务。报酬由发布者通过微信直接转账，平台不担保资金安全。
        </AlertDescription>
      </Alert>

      {/* 提交表单 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm font-medium text-muted-foreground">
          {task.external_link ? "第 2 步：" : ""}上传完成截图
        </p>

        {/* 完成截图 */}
        <Card>
          <CardContent className="pt-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">完成截图 *</Label>
              <p className="text-xs text-muted-foreground">
                截图证明你已完成任务（如问卷星「已完成」页面）
              </p>
              <div className="flex items-start gap-3">
                <label className="flex-1 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  {proofPreview ? (
                    <img src={proofPreview} alt="预览" className="h-24 w-24 rounded object-cover" />
                  ) : (
                    <>
                      <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 16V8m0 0l-3 3m3-3l3 3" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                      </svg>
                      <span className="text-xs text-muted-foreground">点击上传截图</span>
                    </>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 姓名 + 手机号 */}
        <Card>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">姓名 *</Label>
                <Input
                  id="name"
                  placeholder="真名或微信昵称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">手机号 *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="用于微信手机号转账收款"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  发布者通过微信手机号转账给你
                </p>
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-2.5 mt-1">
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <strong>收款前提醒：</strong>请先确认你的微信已开启「允许通过手机号向我转账」。
                    <br />路径：微信 → 我 → 服务 → 钱包 → 支付设置 → 允许通过手机号向我转账
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-base" size="lg" disabled={submitting}>
          {submitting ? "提交中..." : "提交完成"}
        </Button>
      </form>
    </div>
  );
}
