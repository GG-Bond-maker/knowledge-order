import React from 'react';

export interface CourseIconProps {
  /** 课程图标（可为 Emoji、SVG 图案名称如 GitFork/BarChart3/GitBranch/Layers/Bot/Terminal/Cpu、或任意图案键） */
  icon?: string;
  /** 课程 ID（用于兜底匹配专属矢量图案） */
  courseId?: string;
  /** 矢量图案色彩（默认使用继承色或课程品牌主色） */
  color?: string;
  /** 图标尺寸（数字默认为 px，或传入 CSS 尺寸如 '1.2em'） */
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/** 检测字符串是否属于 Emoji 表情符号 */
function isEmoji(str: string): boolean {
  if (!str) return false;
  const s = str.trim();
  // 长度较短且包含 Unicode 表情符号范围
  if (
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u.test(
      s,
    )
  ) {
    return true;
  }
  // 单个或两个非英文字符（如特殊符号）
  return s.length <= 2 && !/^[A-Za-z0-9_-]+$/.test(s);
}

/**
 * 规范化图标键：统一转为小写并去除连字符
 */
function normalizeIconKey(icon?: string, courseId?: string): string {
  const raw = (icon || '').trim().toLowerCase().replace(/[-_\s]/g, '');
  if (raw) return raw;
  const cid = (courseId || '').trim().toLowerCase().replace(/[-_\s]/g, '');
  return cid;
}

/**
 * 知序课程统一图标渲染组件 (CourseIcon)
 *
 * 彻底解决英文字符串（如 GitFork, BarChart3, GitBranch, Layers）在前端以纯文字渲染时
 * 溢出、叠字、破坏排版的问题。
 *
 * - 针对已知图案名称渲染高清晰度矢量 SVG 图案（图案模式）
 * - 针对 Emoji 渲染原生高清符号
 * - 针对未知字符串渲染精美矢量徽章，并开启严格的截断与居中约束
 */
export function CourseIcon({
  icon = '📖',
  courseId,
  color,
  size = 22,
  className = '',
  style = {},
}: CourseIconProps) {
  const pxSize = typeof size === 'number' ? `${size}px` : size;
  const strokeColor = color || 'currentColor';

  // 1. 若为 Emoji，直接渲染
  if (isEmoji(icon)) {
    return (
      <span
        className={`course-icon-emoji ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: pxSize,
          lineHeight: 1,
          userSelect: 'none',
          ...style,
        }}
        aria-hidden="true"
      >
        {icon.trim()}
      </span>
    );
  }

  // 2. 根据图案标识或 courseId 映射高精度 SVG 矢量图案
  const key = normalizeIconKey(icon, courseId);

  // 矢量图标容器公共属性
  const svgProps = {
    width: pxSize,
    height: pxSize,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: strokeColor,
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `course-icon-svg ${className}`,
    style: {
      display: 'inline-block',
      verticalAlign: 'middle',
      flexShrink: 0,
      ...style,
    },
    'aria-hidden': true,
  };

  // 2.1 GitFork / 因果推断 (Causal DAG / 分叉树图)
  if (key.includes('gitfork') || key.includes('causalinference') || key.includes('fork')) {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="18" r="2.8" />
        <circle cx="6" cy="6" r="2.8" />
        <circle cx="18" cy="6" r="2.8" />
        <path d="M18 9v1.5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9" />
        <line x1="12" y1="13.5" x2="12" y2="15.2" />
      </svg>
    );
  }

  // 2.2 BarChart3 / 统计推断 / 财报估值 (三柱直方图与基准线)
  if (
    key.includes('barchart3') ||
    key.includes('barchart') ||
    key.includes('statsfoundations') ||
    key.includes('financialstatements') ||
    key.includes('histogram')
  ) {
    return (
      <svg {...svgProps}>
        <line x1="18" y1="20" x2="18" y2="8" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="13" />
        <line x1="3" y1="20" x2="21" y2="20" />
      </svg>
    );
  }

  // 2.3 GitBranch / Airflow 数据管道编排 (DAG 分支与管道流)
  if (
    key.includes('gitbranch') ||
    key.includes('airflow') ||
    key.includes('branch') ||
    key.includes('pipeline')
  ) {
    return (
      <svg {...svgProps}>
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="2.8" />
        <circle cx="6" cy="18" r="2.8" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </svg>
    );
  }

  // 2.4 Layers / dbt 分析工程 / Python 工程化 (3D 叠加数据层级建模)
  if (
    key.includes('layers') ||
    key.includes('dbt') ||
    key.includes('pythonengineering') ||
    key.includes('stack')
  ) {
    return (
      <svg {...svgProps}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  }

  // 2.5 Terminal / Python 基础与终端处理 (命令行 >_ 图案)
  if (
    key.includes('terminal') ||
    key.includes('pythonfoundations') ||
    key.includes('console') ||
    key.includes('cli')
  ) {
    return (
      <svg {...svgProps}>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    );
  }

  // 2.6 Cpu / Python LLM 应用开发 (微处理器芯片与引脚)
  if (
    key.includes('cpu') ||
    key.includes('pythonllm') ||
    key.includes('chip') ||
    key.includes('processor')
  ) {
    return (
      <svg {...svgProps}>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    );
  }

  // 2.7 Bot / Python Agent 开发实战 (智能体机器人图案)
  if (
    key.includes('bot') ||
    key.includes('agent') ||
    key.includes('pythonagent') ||
    key.includes('robot')
  ) {
    return (
      <svg {...svgProps}>
        <rect x="3" y="11" width="18" height="10" rx="3" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4" />
        <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth={3} />
        <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth={3} />
      </svg>
    );
  }

  // 2.8 数据库 (Database)
  if (key.includes('database') || key.includes('sql') || key.includes('db')) {
    return (
      <svg {...svgProps}>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    );
  }

  // 2.9 代码 (Code / Algorithm)
  if (key.includes('code') || key.includes('algo')) {
    return (
      <svg {...svgProps}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }

  // 3. 通用兜底矢量图案（书本/知识图腾），杜绝任何文字溢出
  return (
    <svg {...svgProps}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
