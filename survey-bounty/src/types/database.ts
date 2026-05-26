// ============================================================
// 通用悬赏平台 - Supabase 数据库类型定义
// 与 supabase/migrations/003_rebuild_tasks.sql 保持同步
// ============================================================

export type TaskStatus = "active" | "full" | "closed" | "deleted";
export type CompletionStatus =
  | "pending"          // 待审核
  | "verified"         // 已审核，等打款
  | "paid"             // 发布者标记已付款
  | "confirmed"        // 填写者确认收到
  | "dispute_pending"  // 举报待仲裁（不直接扣分）
  | "disputed";        // 仲裁结果：确认赖账（扣分）

export type UserRole = "publisher" | "filler";

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  task_image_url: string | null;
  external_link: string | null;
  reward_amount: number;   // 分
  max_slots: number;
  current_completions: number;
  status: TaskStatus;
  share_code: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  completer_name: string | null;
  completer_phone: string | null;
  completer_wechat: string | null;  // 旧字段，历史数据兼容，新数据不再写入
  proof_screenshot_url: string | null;
  payment_status: CompletionStatus;
  paid_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditScore {
  user_id: string;
  total_surveys: number;
  completed_payments: number;
  disputed_count: number;
  credit_score: number;
  updated_at: string;
}

// ============================================================
// AI 写问卷类型
// ============================================================

export type QuestionType = "single" | "multiple" | "text" | "essay" | "rating" | "matrix" | "sort";

export interface SurveyQuestion {
  id: string;              // 前端生成的临时 ID
  type: QuestionType;
  text: string;
  options?: string[];      // 单选/多选/量表/排序/矩阵列标
  rows?: string[];         // 矩阵题行标
  required?: boolean;
}

export interface AiSurveySession {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiSurveyMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  questions_snapshot: SurveyQuestion[] | null;
  created_at: string;
}

export interface AiSurveyQuota {
  user_id: string;
  usage_date: string;
  used_count: number;
}

// ============================================================
// Supabase Database 类型
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "current_completions" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "creator_id" | "created_at">>;
      };
      task_completions: {
        Row: TaskCompletion;
        Insert: Omit<TaskCompletion, "id" | "paid_at" | "confirmed_at" | "disputed_at" | "created_at" | "updated_at">;
        Update: Partial<Omit<TaskCompletion, "id" | "task_id" | "created_at">>;
      };
      credit_scores: {
        Row: CreditScore;
        Insert: Omit<CreditScore, "updated_at">;
        Update: Partial<Omit<CreditScore, "user_id">>;
      };
      ai_survey_sessions: {
        Row: AiSurveySession;
        Insert: Omit<AiSurveySession, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AiSurveySession, "id" | "user_id" | "created_at">>;
      };
      ai_survey_messages: {
        Row: AiSurveyMessage;
        Insert: Omit<AiSurveyMessage, "id" | "created_at">;
        Update: Partial<Omit<AiSurveyMessage, "id" | "session_id" | "created_at">>;
      };
      ai_survey_quota: {
        Row: AiSurveyQuota;
        Insert: Omit<AiSurveyQuota, never>;
        Update: Partial<Omit<AiSurveyQuota, "user_id" | "usage_date">>;
      };
    };
  };
}
