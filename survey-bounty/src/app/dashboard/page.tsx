"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Stagger } from "@/components/stagger";
import type { Task } from "@/types/database";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "进行中", variant: "default" },
  full: { label: "已满", variant: "secondary" },
  closed: { label: "已关闭", variant: "outline" },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdCode = searchParams.get("created");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    // 立即开始拉任务（cookie 已有，API 自己会校验权限），不必等 AuthProvider 完成
    fetch("/api/tasks/list")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/t/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // 只要任一已经加载好就先渲染骨架，而不是两个都得等
  if (loading && authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  // auth 没加载好时不跳转，避免闪跳
  if (!authLoading && !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Stagger interval={100}>
        {createdCode && (
          <Alert className="mb-5">
            <AlertDescription className="text-sm">
              任务发布成功！分享链接给同学：
              <code className="block mt-1 bg-muted px-2 py-1 rounded text-xs break-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/t/{createdCode}
              </code>
            </AlertDescription>
          </Alert>
        )}

        {/* 页头 */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">我的任务</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {loading ? "加载中..." : `共 ${tasks.length} 个任务`}
            </p>
          </div>
          <Link href="/dashboard/create">
            <Button size="sm" className="sm:text-sm">+ 发布任务</Button>
          </Link>
        </div>

        {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-4 pb-4 sm:pt-5 sm:pb-5">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-5 bg-muted rounded w-12" />
                  </div>
                  <div className="h-1.5 bg-muted rounded-full w-full" />
                  <div className="flex justify-between">
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="flex gap-2">
                      <div className="h-8 bg-muted rounded w-14" />
                      <div className="h-8 bg-muted rounded w-16" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center text-muted-foreground">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">暂无任务</p>
              <p className="text-sm mt-1">点击右上角「发布任务」开始</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, taskIndex) => {
            const status = statusLabels[task.status];
            const progress = task.max_slots > 0
              ? Math.round((task.current_completions / task.max_slots) * 100)
              : 0;
            return (
              <Card
                key={task.id}
                className="card-hover border-border/50 animate-fade-in-up"
                style={{ animationDelay: `${200 + taskIndex * 60}ms` }}
              >
                <CardContent className="pt-4 pb-4 sm:pt-5 sm:pb-5">
                  {/* 标题行 */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{task.title}</h3>
                      <Badge variant={status.variant} className="shrink-0 text-xs">{status.label}</Badge>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{task.current_completions}/{task.max_slots} 人已完成</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 信息行 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>¥{(task.reward_amount / 100).toFixed(2)}/人</span>
                      <span>{new Date(task.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Link href={`/dashboard/task/${task.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs px-3">查看</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => copyLink(task.share_code)}
                      >
                        {copiedCode === task.share_code ? "已复制" : "复制链接"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </Stagger>
    </div>
  );
}
