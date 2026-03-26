import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";

/** 1:1 还原首页（深色模式视觉）的大致布局，用于 Remotion 视频 */
export const SceneHomeDark: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bgBody,
        backgroundImage:
          `radial-gradient(${theme.textSecondary} 1px, transparent 1px),` +
          `radial-gradient(${theme.textSecondary} 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
        backgroundPosition: "0 0, 25px 25px",
        padding: "3.5rem 6%",
        fontFamily: theme.fontFamily,
        color: theme.textMain,
        boxSizing: "border-box",
      }}
    >
      {/* 顶部 Hero */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
          gap: 40,
          alignItems: "flex-start",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 48,
              lineHeight: 1.2,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            让数学计算
            <br />
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                background:
                  "linear-gradient(135deg, #93c5fd 0%, #a5b4fc 35%, #c4b5fd 65%, #bfdbfe 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              看得见、摸得着
            </span>
          </h1>
          <p
            style={{
              marginTop: 18,
              fontSize: 18,
              lineHeight: 1.7,
              color: theme.textSecondary,
              maxWidth: 520,
            }}
          >
            融合 <b>OCR</b> 手写识别 <b>Manim</b> 动态引擎。
            <br />
            将枯燥的公式转化为直观的视觉语言，专为新一代学习者打造。
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginTop: 26,
              marginBottom: 22,
            }}
          >
            <button
              style={{
                padding: "0.9rem 2.1rem",
                borderRadius: 999,
                border: "none",
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                color: theme.textInverse,
                fontSize: 15,
                fontWeight: 600,
                boxShadow: theme.shadowCtaPrimary,
                cursor: "default",
              }}
            >
              ✨ 试试智能体
            </button>
            <button
              style={{
                padding: "0.9rem 2.1rem",
                borderRadius: 999,
                border: `1px solid ${theme.border}`,
                background: theme.bgGlass,
                color: theme.textMain,
                fontSize: 15,
                fontWeight: 500,
                backdropFilter: "blur(12px)",
                cursor: "default",
              }}
            >
              立即体验 →
            </button>
            <button
              style={{
                padding: "0.9rem 1.9rem",
                borderRadius: 999,
                border: `1px solid ${theme.border}`,
                background: theme.bgGlass,
                color: theme.textMain,
                fontSize: 15,
                fontWeight: 500,
                backdropFilter: "blur(12px)",
                cursor: "default",
              }}
            >
              ▶ 观看演示
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 22,
              fontSize: 14,
              color: theme.textSecondary,
            }}
          >
            <span>🤖 用一句话完成识别与动画</span>
            <span>📊 查看全站知识图谱</span>
            <span>❓ 30 秒教程</span>
          </div>
        </div>

        {/* 右侧：简化的 3D 星云 / 知识图谱占位 */}
        <div
          style={{
            position: "relative",
            minHeight: 260,
            borderRadius: 24,
            background:
              "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.5), transparent 55%)," +
              "radial-gradient(circle at 100% 100%, rgba(56,189,248,0.45), transparent 55%)," +
              "linear-gradient(135deg, #020617, #020617)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
            border: "1px solid rgba(30,64,175,0.8)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 22,
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.8)",
                  fontSize: 13,
                  color: theme.textSecondary,
                }}
              >
                <i className="fa-solid fa-diagram-project" />
                知识图谱 · 智算星云
              </span>
              <h3
                style={{
                  margin: "12px 0 4px",
                  fontSize: 22,
                  fontWeight: 700,
                  color: theme.textMain,
                }}
              >
                全站功能一图掌握
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: theme.textSecondary,
                  maxWidth: 340,
                }}
              >
                智能体、识别、动态计算、教学案例、开发者工具和设置等节点，一眼看清入口与路径。
              </p>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                fontSize: 13,
                color: theme.textSecondary,
              }}
            >
              <span>左键旋转 · 右键平移 · 滚轮缩放</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.7)",
                    background: "rgba(15,23,42,0.9)",
                    color: theme.textMain,
                    fontSize: 14,
                  }}
                >
                  +
                </button>
                <button
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.7)",
                    background: "rgba(15,23,42,0.9)",
                    color: theme.textMain,
                    fontSize: 14,
                  }}
                >
                  −
                </button>
                <button
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.7)",
                    background: "rgba(15,23,42,0.9)",
                    color: theme.textMain,
                    fontSize: 14,
                  }}
                >
                  ↺
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 智能体功能高亮条 */}
      <div
        style={{
          marginBottom: 28,
        }}
      >
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.24), rgba(30,64,175,0.46))",
            boxShadow: "0 16px 40px rgba(15,23,42,0.9)",
            border: "1px solid rgba(59,130,246,0.7)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "4px 9px",
              borderRadius: 999,
              background: "#fca5a5",
              color: "#7f1d1d",
            }}
          >
            NEW
          </span>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "#e5e7eb",
              }}
            >
              智能体
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 14,
                color: theme.textSecondary,
              }}
            >
              用自然语言描述需求，自动跳转并执行：识别公式、生成动画、打开 LaTeX / Manim 工作台等，一站调度全站能力。
            </p>
          </div>
          <span
            style={{
              fontSize: 16,
              color: theme.textSecondary,
            }}
          >
            &gt;
          </span>
        </div>
      </div>

      {/* 三个主功能卡片 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        {[
          {
            icon: "🤖",
            title: "智能体",
            body:
              "用一句话调用全站功能。例如：\"把 sin(x) = 1/2 做成动画\" 或 \"识别这张图并去计算\"，自动跳转并完成任务。",
          },
          {
            icon: "👁️",
            title: "视觉识别",
            body:
              "支持手写公式与图片上传，毫秒级精准转换 LaTeX 代码，复杂矩阵也能一键提取。",
          },
          {
            icon: "✨",
            title: "动态推演",
            body:
              "拒绝死板的答案。基于 Python Manim 引擎，实时渲染矩阵变换、行列式展开过程。",
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              borderRadius: 20,
              padding: 18,
              background: theme.bgSurface,
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadowPanel,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(129,140,248,0.24))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              {item.icon}
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {item.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: theme.textSecondary,
                lineHeight: 1.7,
              }}
            >
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

