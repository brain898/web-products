"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const StepIcon = ({ type }: { type: string }) => {
  if (type === "publish") {
    return (
      <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
        <rect x="5" y="3" width="22" height="26" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <line x1="10" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="10" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="10" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="23" cy="23" r="6" fill="currentColor" opacity="0.15" />
        <path d="M23 20v6M20 23h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "complete") {
    return (
      <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
        <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13.5 16l2 2 3.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 6V4M22 6V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
      <path d="M16 4l3.09 6.26L26 11.27l-5 4.87L22.18 23 16 19.77 9.82 23 11 16.14l-5-4.87 6.91-1.01L16 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 27h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 24h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
};

const steps = [
  {
    iconType: "publish",
    title: "发布任务",
    desc: "上传截图、设置赏金",
    detail: "问卷星截图一键上传，生成专属分享链接",
  },
  {
    iconType: "complete",
    title: "完成领赏",
    desc: "做完任务、截图证明",
    detail: "去问卷星填完问卷，截图上传等审核",
  },
  {
    iconType: "review",
    title: "审核付款",
    desc: "审核通过、红包到账",
    detail: "一键复制微信号批量转账，信用公开透明",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="bg-warm-gradient">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-20">
          <div className="animate-fade-in-up">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary tracking-wide uppercase mb-4 sm:mb-6">
              大学生互助平台
            </span>
          </div>

          <h1 className="animate-fade-in-up delay-100 text-3xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
            发悬赏
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              找人做任务
            </span>
          </h1>

          <p className="animate-fade-in-up delay-200 mt-4 sm:mt-7 text-sm sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            上传任务截图、设置赏金，同学完成后截图领取红包。
            <br className="hidden sm:block" />
            填问卷、做调研，一个链接搞定。
          </p>

          <div className="animate-fade-in-up delay-300 mt-6 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto px-8 h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                  进入我的任务
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/register">
                  <Button size="lg" className="w-full sm:w-auto px-8 h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                    免费注册
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 h-12 text-base font-medium">
                    登录
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* AI 写问卷入口 */}
        <div className="animate-fade-in-up delay-350 mb-8 sm:mb-14">
          <Link href="/ai-survey">
            <Card className="card-hover relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-card/80 to-cyan-500/5 backdrop-blur-sm shadow-sm cursor-pointer group">
              <CardContent className="py-5 sm:py-6 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-center sm:text-left flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <h3 className="text-base font-semibold">AI 写问卷</h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      NEW
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    不知道问什么？跟 AI 聊几句，帮你理清需求，自动生成问卷题目
                  </p>
                </div>
                <span className="text-sm text-primary font-medium group-hover:underline shrink-0">
                  立即使用 →
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 流程说明 */}
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-3">
          {steps.map((step, i) => (
            <Card
              key={i}
              className={`animate-fade-in-up card-hover relative overflow-hidden border-0 bg-card/80 backdrop-blur-sm shadow-sm`}
              style={{ animationDelay: `${400 + i * 120}ms` }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                    <StepIcon type={step.iconType} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm font-medium">{step.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 底部信任条 */}
        <div className="animate-fade-in delay-500 mt-14 sm:mt-20 text-center">
          <div className="inline-flex items-center gap-6 sm:gap-8 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
              平台不抽成
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              信用评分公开
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/70" />
              微信直付
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500/70" />
              撮合不担保
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
