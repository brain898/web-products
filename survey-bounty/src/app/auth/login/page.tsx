"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthForm } from "@/components/auth/auth-form";

function LoginContent() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const errorParam = searchParams.get("error");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>登录你的问卷悬赏账号</CardDescription>
        </CardHeader>
        <CardContent>
          {registered && (
            <Alert className="mb-4">
              <AlertDescription>注册成功！请登录。</AlertDescription>
            </Alert>
          )}
          {errorParam && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorParam}</AlertDescription>
            </Alert>
          )}

          <AuthForm mode="login" />

          <div className="mt-4 text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
