"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadImage } from "@/lib/supabase/storage";
import { Stagger } from "@/components/stagger";

export default function CreateTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [maxSlots, setMaxSlots] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("图片不能超过 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("请填写任务标题"); return; }
    if (!rewardAmount || parseFloat(rewardAmount) <= 0) { setError("请设置赏金金额"); return; }
    if (!maxSlots || parseInt(maxSlots) <= 0) { setError("请设置名额"); return; }

    setLoading(true);
    try {
      let imageUrl = "";
      if (imageFile) imageUrl = await uploadImage(imageFile, "task-images", "tasks");

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          task_image_url: imageUrl || null,
          external_link: externalLink || null,
          reward_amount: parseFloat(rewardAmount),
          max_slots: parseInt(maxSlots),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "创建失败"); return; }

      router.push(`/dashboard?created=${data.task.share_code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Stagger interval={100}>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold">发布任务</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">上传任务截图、设置赏金，生成分享链接</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {error && (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          )}

          {/* 任务信息 */}
          <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">任务信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm">任务标题 *</Label>
              <Input id="title" placeholder="例如：帮我填一份大学生消费调查问卷" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm">任务说明（可选）</Label>
              <Textarea id="description" placeholder="补充说明，填写者会看到..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link" className="text-sm">问卷链接（可选）</Label>
              <Input id="link" type="url" placeholder="https://www.wjx.cn/vm/xxxxx.aspx" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* 任务截图 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">任务截图</CardTitle>
            <CardDescription className="text-xs">上传问卷截图，填写者可以看到任务详情</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
              {imagePreview ? (
                <img src={imagePreview} alt="预览" className="max-h-40 rounded object-contain" />
              ) : (
                <>
                  <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 16V8m0 0l-3 3m3-3l3 3" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                  </svg>
                  <span className="text-xs text-muted-foreground">点击上传截图（最大 5MB）</span>
                </>
              )}
              <Input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </CardContent>
        </Card>

        {/* 赏金设置 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">赏金设置</CardTitle>
            <CardDescription className="text-xs">平台不抽成，赏金全额给填写者</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reward" className="text-sm">每份赏金（元）*</Label>
                <Input id="reward" type="number" step="0.01" min="0.01" placeholder="2" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slots" className="text-sm">名额 *</Label>
                <Input id="slots" type="number" min="1" placeholder="25" value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} />
              </div>
            </div>
            {rewardAmount && maxSlots && parseFloat(rewardAmount) > 0 && parseInt(maxSlots) > 0 && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                总预算：<strong>{(parseFloat(rewardAmount) * parseInt(maxSlots)).toFixed(2)}</strong> 元
                <span className="text-muted-foreground ml-1">（{rewardAmount} × {maxSlots}）</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 提交 */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            发布后，您承诺通过微信向完成者支付报酬。平台仅提供撮合服务，不介入资金环节。
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">取消</Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "创建中..." : "发布任务"}
            </Button>
          </div>
        </div>
        </form>
      </Stagger>
    </div>
  );
}
