"use client";

import { useState, useCallback } from "react";
import type { SurveyQuestion, QuestionType } from "@/types/database";
import {
  GripVertical,
  Trash2,
  Plus,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

interface QuestionEditorProps {
  questions: SurveyQuestion[];
  surveyTitle: string;
  onQuestionsChange: (questions: SurveyQuestion[]) => void;
  onTitleChange: (title: string) => void;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "单选题",
  multiple: "多选题",
  text: "填空题",
  essay: "简答题",
  rating: "量表题",
  matrix: "矩阵题",
  sort: "排序题",
};

const needsOptions = (type: QuestionType) =>
  type === "single" || type === "multiple" || type === "sort" || type === "rating" || type === "matrix";

const needsRows = (type: QuestionType) => type === "matrix";

export function QuestionEditor({
  questions,
  surveyTitle,
  onQuestionsChange,
  onTitleChange,
}: QuestionEditorProps) {
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // 更新单个题目
  const updateQuestion = useCallback(
    (id: string, updates: Partial<SurveyQuestion>) => {
      onQuestionsChange(
        questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
      );
    },
    [questions, onQuestionsChange]
  );

  // 删除题目
  const deleteQuestion = useCallback(
    (id: string) => {
      onQuestionsChange(questions.filter((q) => q.id !== id));
    },
    [questions, onQuestionsChange]
  );

  // 添加新题目
  const addQuestion = useCallback(() => {
    const newQ: SurveyQuestion = {
      id: `q-${Date.now()}-new`,
      type: "single",
      text: "",
      options: ["选项1", "选项2"],
      required: true,
    };
    onQuestionsChange([...questions, newQ]);
    setExpandedId(newQ.id);
  }, [questions, onQuestionsChange]);

  // 更新矩阵行标
  const updateRow = useCallback(
    (questionId: string, rowIndex: number, value: string) => {
      const q = questions.find((q) => q.id === questionId);
      if (!q?.rows) return;
      const newRows = [...q.rows];
      newRows[rowIndex] = value;
      updateQuestion(questionId, { rows: newRows });
    },
    [questions, updateQuestion]
  );

  const addRow = useCallback(
    (questionId: string) => {
      const q = questions.find((q) => q.id === questionId);
      if (!q) return;
      updateQuestion(questionId, {
        rows: [...(q.rows || []), `维度${(q.rows?.length || 0) + 1}`],
      });
    },
    [questions, updateQuestion]
  );

  const deleteRow = useCallback(
    (questionId: string, rowIndex: number) => {
      const q = questions.find((q) => q.id === questionId);
      if (!q?.rows || q.rows.length <= 1) return;
      updateQuestion(questionId, {
        rows: q.rows.filter((_, i) => i !== rowIndex),
      });
    },
    [questions, updateQuestion]
  );

  // 更新选项
  const updateOption = useCallback(
    (questionId: string, optIndex: number, value: string) => {
      const q = questions.find((q) => q.id === questionId);
      if (!q?.options) return;
      const newOptions = [...q.options];
      newOptions[optIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    },
    [questions, updateQuestion]
  );

  // 添加选项
  const addOption = useCallback(
    (questionId: string) => {
      const q = questions.find((q) => q.id === questionId);
      if (!q) return;
      updateQuestion(questionId, {
        options: [...(q.options || []), `选项${(q.options?.length || 0) + 1}`],
      });
    },
    [questions, updateQuestion]
  );

  // 删除选项
  const deleteOption = useCallback(
    (questionId: string, optIndex: number) => {
      const q = questions.find((q) => q.id === questionId);
      if (!q?.options || q.options.length <= 2) return;
      updateQuestion(questionId, {
        options: q.options.filter((_, i) => i !== optIndex),
      });
    },
    [questions, updateQuestion]
  );

  // 拖拽排序
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === targetIndex) return;
      const reordered = [...questions];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      onQuestionsChange(reordered);
      setDragIndex(targetIndex);
    },
    [dragIndex, questions, onQuestionsChange]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  // 导出纯文本（问卷星格式）
  const handleExport = useCallback(() => {
    if (questions.length === 0) return;

    const lines: string[] = [];

    questions.forEach((q, i) => {
      // 第一行：题号 + 题目文本 + [题型标签]
      lines.push(`${i + 1}.${q.text}[${QUESTION_TYPE_LABELS[q.type]}]`);

      // 选项行（选项之间不空行）
      if (q.type === "matrix" && q.rows && q.options) {
        // 矩阵题：列头行 + 每行一个维度
        lines.push(q.options.join("\t"));
        q.rows.forEach((row) => {
          lines.push(row);
        });
      } else if (q.options && q.options.length > 0) {
        if (q.type === "single" || q.type === "multiple") {
          q.options.forEach((opt, j) => {
            lines.push(`${String.fromCharCode(65 + j)}.${opt}`);
          });
        } else if (q.type === "rating") {
          // 量表题：选项逐行排列
          q.options.forEach((opt) => {
            lines.push(opt);
          });
        } else if (q.type === "sort") {
          q.options.forEach((opt, j) => {
            lines.push(`${j + 1}.${opt}`);
          });
        }
      }

      // 选项结束后一个空行表示题目结束
      lines.push("");
    });

    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [questions]);

  // 空状态
  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">题目列表</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-3xl mb-3 opacity-30">📝</div>
          <p className="text-sm text-muted-foreground">
            AI 还没生成题目
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            在左边和 AI 对话，理清需求后会自动生成
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <input
            value={surveyTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 truncate flex-1 min-w-0"
            placeholder="问卷标题"
          />
          <span className="text-xs text-muted-foreground shrink-0">
            {questions.length} 题
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={addQuestion}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="添加题目"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                复制
              </>
            )}
          </button>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {questions.map((q, index) => {
          const isExpanded = expandedId === q.id;
          const hasOpts = needsOptions(q.type);

          return (
            <div
              key={q.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                border rounded-xl bg-card transition-all
                ${dragIndex === index ? "opacity-50" : ""}
                ${isExpanded ? "shadow-sm" : ""}
              `}
            >
              {/* 题目头部 */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                <span className="text-xs text-muted-foreground w-5 shrink-0">
                  {index + 1}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                  {QUESTION_TYPE_LABELS[q.type]}
                </span>
                <span className="text-sm truncate flex-1 min-w-0">
                  {q.text || "(未填写)"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteQuestion(q.id);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>

              {/* 展开编辑 */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t pt-2">
                  {/* 题型选择 */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(
                      (type) => (
                        <button
                          key={type}
                          onClick={() =>
                            updateQuestion(q.id, {
                              type,
                              options: needsOptions(type)
                                ? q.options || ["选项1", "选项2"]
                                : undefined,
                              rows: needsRows(type)
                                ? q.rows || ["维度1", "维度2", "维度3"]
                                : undefined,
                            })
                          }
                          className={`
                            px-2 py-1 rounded-lg text-xs transition-colors
                            ${q.type === type
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                            }
                          `}
                        >
                          {QUESTION_TYPE_LABELS[type]}
                        </button>
                      )
                    )}
                  </div>

                  {/* 题干 */}
                  <input
                    value={q.text}
                    onChange={(e) =>
                      updateQuestion(q.id, { text: e.target.value })
                    }
                    placeholder="输入题目内容..."
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />

                  {/* 选项 */}
                  {hasOpts && q.options && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        {q.type === "matrix" ? "列标（评价等级）" : "选项"}
                      </p>
                      {q.options.map((opt, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 shrink-0">
                            {String.fromCharCode(65 + j)}
                          </span>
                          <input
                            value={opt}
                            onChange={(e) =>
                              updateOption(q.id, j, e.target.value)
                            }
                            className="flex-1 text-sm border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          {q.options!.length > 2 && (
                            <button
                              onClick={() => deleteOption(q.id, j)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(q.id)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        添加选项
                      </button>
                    </div>
                  )}

                  {/* 矩阵行标 */}
                  {needsRows(q.type) && q.rows && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        行标（评价维度）
                      </p>
                      {q.rows.map((row, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 shrink-0">
                            {j + 1}
                          </span>
                          <input
                            value={row}
                            onChange={(e) =>
                              updateRow(q.id, j, e.target.value)
                            }
                            className="flex-1 text-sm border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          {q.rows!.length > 1 && (
                            <button
                              onClick={() => deleteRow(q.id, j)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addRow(q.id)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        添加维度
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
