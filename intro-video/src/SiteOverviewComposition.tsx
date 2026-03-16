import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { theme } from "./theme";

const FPS = 30;

// 时长（秒）按场景划分
const DUR = {
  intro: 3, // Logo + 标题
  overview: 8,
  agent: 9,
  detect: 8,
  calculate: 10,
  examples: 10,
  devtools: 9,
  outro: 5,
} as const;

export const SITE_OVERVIEW_DURATION_IN_FRAMES =
  (DUR.intro +
    DUR.overview +
    DUR.agent +
    DUR.detect +
    DUR.calculate +
    DUR.examples +
    DUR.devtools +
    DUR.outro) *
  FPS;

const SectionTitle: React.FC<{ label: string; subtitle?: string }> = ({ label, subtitle }) => (
  <div
    style={{
      marginBottom: 24,
    }}
  >
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 12px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.65)",
        border: "1px solid rgba(148,163,184,0.5)",
        marginBottom: 12,
      }}
    >
      <span style={{ fontSize: 18 }}>✨</span>
      <span
        style={{
          fontFamily: theme.fontFamily,
          fontSize: 14,
          color: theme.textSecondary,
        }}
      >
        功能与示例
      </span>
    </div>
    <h2
      style={{
        fontFamily: theme.fontFamily,
        fontSize: 40,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        margin: 0,
        color: theme.textMain,
      }}
    >
      {label}
    </h2>
    {subtitle ? (
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: theme.fontFamily,
          fontSize: 18,
          lineHeight: 1.6,
          color: theme.textSecondary,
          maxWidth: 640,
        }}
      >
        {subtitle}
      </p>
    ) : null}
  </div>
);

const Card: React.FC<{ title: string; body: string; tag?: string }> = ({ title, body, tag }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });

  return (
    <div
      style={{
        opacity: appear,
        transform: `translateY(${interpolate(appear, [0, 1], [8, 0])}px)`,
        borderRadius: 20,
        padding: 18,
        background:
          "radial-gradient(circle at 0% 0%, rgba(148,163,184,0.14), transparent 55%), rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.7)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: 18,
              fontWeight: 600,
              color: theme.textMain,
            }}
          >
            {title}
          </div>
          {tag ? (
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: theme.textSecondary,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background:
                    "radial-gradient(circle at 30% 0%, rgba(59,130,246,1), rgba(30,64,175,1))",
                  boxShadow: "0 0 14px rgba(59,130,246,0.8)",
                }}
              />
              {tag}
            </div>
          ) : null}
        </div>
        <div
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 6px 18px rgba(59,130,246,0.5)",
          }}
        >
          一键试试
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.7,
          color: theme.textSecondary,
          maxWidth: 560,
        }}
      >
        {body}
      </p>
    </div>
  );
};

// Scene 1: Logo + tagline
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 200 }, durationInFrames: DUR.intro * FPS });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: theme.introBgGradient,
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(appear, [0, 1], [0.8, 1])})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Img
          src={staticFile("智算视界_avatar.svg")}
          style={{ width: 140, height: 140, marginBottom: 24, opacity: appear }}
        />
        <h1
          style={{
            fontFamily: theme.fontFamily,
            fontSize: 70,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: 0,
            background:
              "linear-gradient(135deg, #93c5fd 0%, #a5b4fc 35%, #c4b5fd 65%, #bfdbfe 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          智算视界
        </h1>
        <p
          style={{
            marginTop: 16,
            fontSize: 22,
            color: theme.textSecondary,
            maxWidth: 520,
            lineHeight: 1.6,
          }}
        >
          把数学从纸面搬进动画的 AI 工作台
        </p>
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: Overview
const SceneOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const base = interpolate(frame, [0, DUR.overview * FPS], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: theme.bgBody,
        padding: "3.5rem 8%",
        color: theme.textMain,
        fontFamily: theme.fontFamily,
      }}
    >
      <SectionTitle
        label="你可以在这里做什么？"
        subtitle="从拍题识别、动态计算，到教学案例与云端 Manim 工作台，智算视界把数学学习和可视化放在同一个工作台里。"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
          gap: 24,
          opacity: base,
        }}
      >
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontSize: 16,
            color: theme.textSecondary,
          }}
        >
          <li>· <b>智能体</b>：一句话调度整站工具，自动完成识别 → 计算 → 渲染 → 课件。</li>
          <li>· <b>智能识别</b>：拍照 / 手写转换为可编辑的 LaTeX 公式。</li>
          <li>· <b>动态计算</b>：支持通用推演、可视化、完整解题演示。</li>
          <li>· <b>教学案例</b>：以视频方式学习数学，并配合弹幕、笔记和错题本。</li>
          <li>· <b>开发者工具</b>：云端 Manim 工作台 + Rainbow 拓展库。</li>
          <li>· <b>我的算式</b>：集中管理所有公式、脚本与模板。</li>
        </ul>
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            background:
              "radial-gradient(circle at 0% 0%, rgba(148,163,184,0.14), transparent 55%), rgba(15,23,42,0.98)",
            border: "1px solid rgba(51,65,85,0.9)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.8)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, color: theme.textSecondary }}>入口一览</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              fontSize: 13,
            }}
          >
            {["智能体", "智能识别", "动态计算", "教学案例", "开发者工具", "我的算式", "设置"].map(
              (label) => (
                <span
                  key={label}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(148,163,184,0.7)",
                    color: theme.textSecondary,
                  }}
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Agent
const SceneAgent: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: theme.bgBody,
        padding: "3.5rem 8%",
        color: theme.textMain,
        fontFamily: theme.fontFamily,
      }}
    >
      <SectionTitle
        label="智能体：一句话跑完整流程"
        subtitle="通过知识图谱理解你的需求，从拍题识别到生成 Manim 动画，再到保存课件和错题本，自动拼好一整条流水线。"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 24,
        }}
      >
        <Card
          title="整题解法 + 动画一键完成"
          tag="智能体 · 完整解题演示"
          body="你说：「帮我把这道极限题做成完整解题演示」。智能体会先识别题目，再在动态计算页选择完整解题模式，生成推导过程与对应的 Manim 动画，并把结果保存到我的算式与教学案例中。"
        />
        <Card
          title="从板书照片到课件包"
          tag="智能体 · 课件流水线"
          body="你说：「把这几张板书照片整理成微积分入门课件」。智能体会依次调用智能识别、动态计算和开发者工具，将关键公式与动画脚本整理为教学案例，并打包成可一键复用的课件包。"
        />
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: Detect
const SceneDetect: React.FC = () => (
  <AbsoluteFill
    style={{
      background: theme.bgBody,
      padding: "3.5rem 8%",
      color: theme.textMain,
      fontFamily: theme.fontFamily,
    }}
  >
    <SectionTitle
      label="智能识别：从图片 / 手写到 LaTeX"
      subtitle="支持拍照、上传和手写板，将题目中的公式识别为可编辑的 LaTeX 表达。"
    />
    <Card
      title="识别这张图"
      tag="智能识别"
      body="上传或粘贴题目图片，智能体会调用智能识别工具，将其中的数学公式转成 LaTeX，自动填入识别结果区域，并可一键保存到我的算式。"
    />
  </AbsoluteFill>
);

// Scene 5: Calculate
const SceneCalculate: React.FC = () => (
  <AbsoluteFill
    style={{
      background: theme.bgBody,
      padding: "3.5rem 8%",
      color: theme.textMain,
      fontFamily: theme.fontFamily,
    }}
  >
    <SectionTitle
      label="动态计算：推演 + 可视化 + 完整解题"
      subtitle="在一个页面里完成公式推演、可视化和完整解题演示，并与设置中的默认模式打通。"
    />
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
        gap: 24,
      }}
    >
      <Card
        title="把 sin(x)=1/2 做成动画"
        tag="动态计算 · 可视化"
        body="在动态计算页输入 sin(x)=1/2，选择可视化模式，系统会生成对应的 Manim 脚本，从解方程到函数图像，一次性展示在同一段动画中。"
      />
      <Card
        title="整题模式：完整解题演示"
        tag="动态计算 · solution"
        body="对于包含「已知」「求」「下列」等结构化题目，可以启用完整解题演示模式，将整道题拆为多个阶段，从文字推导到多屏动画展示。"
      />
    </div>
  </AbsoluteFill>
);

// Scene 6: Examples
const SceneExamples: React.FC = () => (
  <AbsoluteFill
    style={{
      background: theme.bgBody,
      padding: "3.5rem 8%",
      color: theme.textMain,
      fontFamily: theme.fontFamily,
    }}
  >
    <SectionTitle
      label="教学案例：像 B 站一样学数学"
      subtitle="支持收藏、稍后看、标签筛选、时间戳笔记和错题本，配合弹幕与可视化播放器提供完整的学习闭环。"
    />
    <Card
      title="时间戳笔记与错题本"
      tag="教学案例 · 学习闭环"
      body="在观看教学案例时，可以给关键时刻添加时间戳笔记，并一键加入错题本。之后可以按时间点跳转回视频，或让智能体基于笔记生成同类型练习题。"
    />
  </AbsoluteFill>
);

// Scene 7: DevTools
const SceneDevtools: React.FC = () => (
  <AbsoluteFill
    style={{
      background: theme.bgBody,
      padding: "3.5rem 8%",
      color: theme.textMain,
      fontFamily: theme.fontFamily,
    }}
  >
    <SectionTitle
      label="开发者工具：云端 Manim 工作台"
      subtitle="在浏览器里直接编写、运行和管理 Manim 脚本，配合智能体完成代码编辑与课件包装。"
    />
    <Card
      title="AI 编辑与组件化脚本"
      tag="开发者工具 · Manim"
      body="在云端代码工作台中，可以用自然语言让智能体修改 Manim 脚本、一键预览关键帧，并将脚本保存为可复用的组件卡片，方便在别的题目或课件中载入。"
    />
  </AbsoluteFill>
);

// Scene 8: Outro
const SceneOutro: React.FC = () => (
  <AbsoluteFill
    style={{
      background: theme.introBgGradient,
      alignItems: "center",
      justifyContent: "center",
      color: theme.textMain,
      fontFamily: theme.fontFamily,
    }}
  >
    <div style={{ textAlign: "center" }}>
      <h2
        style={{
          fontSize: 42,
          marginBottom: 16,
        }}
      >
        准备好一起「看见」数学了吗？
      </h2>
      <p
        style={{
          fontSize: 20,
          color: theme.textSecondary,
        }}
      >
        打开智算视界，用智能体、动态计算和教学案例
        <br />
        重新体验一遍数学世界。
      </p>
    </div>
  </AbsoluteFill>
);

export const SiteOverviewComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.introBgGradient }}>
      <Sequence from={0} durationInFrames={DUR.intro * FPS}>
        <SceneIntro />
      </Sequence>
      <Sequence from={DUR.intro * FPS} durationInFrames={DUR.overview * FPS}>
        <SceneOverview />
      </Sequence>
      <Sequence
        from={(DUR.intro + DUR.overview) * FPS}
        durationInFrames={DUR.agent * FPS}
      >
        <SceneAgent />
      </Sequence>
      <Sequence
        from={(DUR.intro + DUR.overview + DUR.agent) * FPS}
        durationInFrames={DUR.detect * FPS}
      >
        <SceneDetect />
      </Sequence>
      <Sequence
        from={(DUR.intro + DUR.overview + DUR.agent + DUR.detect) * FPS}
        durationInFrames={DUR.calculate * FPS}
      >
        <SceneCalculate />
      </Sequence>
      <Sequence
        from={
          (DUR.intro + DUR.overview + DUR.agent + DUR.detect + DUR.calculate) *
          FPS
        }
        durationInFrames={DUR.examples * FPS}
      >
        <SceneExamples />
      </Sequence>
      <Sequence
        from={
          (DUR.intro +
            DUR.overview +
            DUR.agent +
            DUR.detect +
            DUR.calculate +
            DUR.examples) *
          FPS
        }
        durationInFrames={DUR.devtools * FPS}
      >
        <SceneDevtools />
      </Sequence>
      <Sequence
        from={
          (DUR.intro +
            DUR.overview +
            DUR.agent +
            DUR.detect +
            DUR.calculate +
            DUR.examples +
            DUR.devtools) *
          FPS
        }
        durationInFrames={DUR.outro * FPS}
      >
        <SceneOutro />
      </Sequence>
    </AbsoluteFill>
  );
};

