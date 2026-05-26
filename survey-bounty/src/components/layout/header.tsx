"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export function Header() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinks = user
    ? [
        { href: "/dashboard", label: "我的任务" },
        { href: "/dashboard/create", label: "发布任务" },
        { href: "/ai-survey", label: "AI写问卷" },
      ]
    : [];

  return (
    <header className="border-b border-border/50 bg-background/70 backdrop-blur-xl sticky top-0 z-50">
      <div className="mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm">
            赏
          </span>
          <span>任务悬赏</span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden sm:flex items-center gap-3">
          <Link href="/my">
            <Button variant="ghost" size="sm">我的提交</Button>
          </Link>
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded bg-muted" />
          ) : user ? (
            <>
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button variant="ghost" size="sm">{link.label}</Button>
                </Link>
              ))}
              <Separator orientation="vertical" className="h-6 mx-1" />
              <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                {user.user_metadata?.nickname || user.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>退出</Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">登录</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">注册</Button>
              </Link>
            </>
          )}
        </nav>

        {/* 移动端汉堡菜单 */}
        <div className="sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="sm" className="p-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </Button>
              }
            />
            <SheetContent side="right" className="w-[260px]">
              <SheetTitle className="sr-only">导航菜单</SheetTitle>
              <SheetDescription className="sr-only">应用导航</SheetDescription>
              <div className="flex flex-col gap-4 mt-8">
                {loading ? (
                  <div className="h-8 w-full animate-pulse rounded bg-muted" />
                ) : user ? (
                  <>
                    <div className="px-2">
                      <p className="text-sm font-medium truncate">
                        {user.user_metadata?.nickname || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <Separator />
                    <Link href="/my" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">我的提交</Button>
                    </Link>
                    {navLinks.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">{link.label}</Button>
                      </Link>
                    ))}
                    <Separator />
                    <Button variant="outline" className="w-full" onClick={() => { signOut(); setOpen(false); }}>
                      退出登录
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/my" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">我的提交</Button>
                    </Link>
                    <Separator />
                    <Link href="/auth/login" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full">登录</Button>
                    </Link>
                    <Link href="/auth/register" onClick={() => setOpen(false)}>
                      <Button className="w-full">注册</Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
