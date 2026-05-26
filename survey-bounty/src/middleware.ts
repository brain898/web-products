import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 简化版中间件 - 只做基本请求转发，不做 Supabase session 刷新
// 认证由客户端 AuthProvider 处理
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
