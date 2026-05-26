"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ProfileData {
  profile: {
    nickname: string;
    created_at: string;
  };
  credit: {
    credit_score: number;
    total_surveys: number;
    completed_payments: number;
    disputed_count: number;
  };
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/profile/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setData(data);
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">{error || "用户不存在"}</p>
      </div>
    );
  }

  const score = data.credit.credit_score;
  const scoreColor =
    score >= 80 ? "text-green-500" : score >= 50 ? "text-orange-500" : "text-red-500";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{data.profile.nickname}</CardTitle>
          <CardDescription>
            注册于 {new Date(data.profile.created_at).toLocaleDateString("zh-CN")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 信用分展示 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">信用评分</p>
            <p className={`text-5xl font-bold ${scoreColor}`}>{score}</p>
            <Progress value={score} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {score >= 80 ? "信用良好" : score >= 50 ? "信用一般" : "信用较差"}
            </p>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{data.credit.total_surveys}</p>
              <p className="text-xs text-muted-foreground">发布问卷</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">
                {data.credit.completed_payments}
              </p>
              <p className="text-xs text-muted-foreground">按时付款</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">
                {data.credit.disputed_count}
              </p>
              <p className="text-xs text-muted-foreground">争议次数</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
