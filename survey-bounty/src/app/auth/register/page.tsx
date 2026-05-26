"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">注册</CardTitle>
          <CardDescription>创建你的问卷悬赏账号</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="register" />

          <div className="mt-4 text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
