"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** 每个子元素之间的延迟间隔（ms），默认 80 */
  interval?: number;
  /** 整体延迟（ms），默认 0 */
  delay?: number;
}

/**
 * 包裹一组子元素，让它们依次淡入上浮。
 * 用法：
 *   <Stagger>
 *     <div>第一块</div>
 *     <div>第二块</div>
 *   </Stagger>
 */
export function Stagger({ children, className, interval = 80, delay = 0 }: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div
              key={i}
              className="animate-fade-in-up"
              style={{
                animationDelay: `${delay + i * interval}ms`,
                opacity: visible ? undefined : 0,
              }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}
