import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { theme } from "./theme";
import { HomePageThreeComposition } from "./HomePageThreeComposition";
import { SiteOverviewComposition } from "./SiteOverviewComposition";

const FPS = 30;

// 片头 / 首页特写 / 功能逻辑串联 / 收尾
const DUR = {
  intro: 45, // 1.5s
  home: 240, // 8s
  flow: 420, // 14s
  outro: 135, // 4.5s
} as const;

export const SITE_TRAILER_DURATION_IN_FRAMES =
  (DUR.intro + DUR.home + DUR.flow + DUR.outro);

const TrailerIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: DUR.intro,
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: theme.introBgGradient,
        fontFamily: theme.fontFamily,
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(appear, [0, 1], [0.9, 1])})`,
          opacity: appear,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.03em",
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
            marginTop: 18,
            fontSize: 22,
            color: theme.textSecondary,
            lineHeight: 1.6,
          }}
        >
          让数学计算
          <br />
          看得见、摸得着。
        </p>
      </div>
    </AbsoluteFill>
  );
};

// 使用 3D 主页作为大片级整页特写
const TrailerHome: React.FC = () => {
  return <HomePageThreeComposition />;
};

// 使用文字 + 2D SiteOverview 场景，串联具体使用逻辑
const TrailerFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, DUR.flow], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bgBody,
      }}
    >
      {/* 下层放 SiteOverview 作为功能总览背景 */}
      <AbsoluteFill
        style={{
          opacity: 0.85,
        }}
      >
        <SiteOverviewComposition />
      </AbsoluteFill>

      {/* 上层用渐变遮罩 + 文案，串联一条真实使用路径 */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 10% 0%, rgba(15,23,42,0.95), transparent 55%)," +
            "radial-gradient(circle at 90% 100%, rgba(15,23,42,0.9), transparent 55%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "2.5rem 8%",
          fontFamily: theme.fontFamily,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            transform: `translateY(${interpolate(
              progress,
              [0, 1],
              [20, 0]
            )}px)`,
            opacity: interpolate(progress, [0, 0.15], [0, 1], {
              extrapolateLeft: "clamp",
            }),
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(148,163,184,0.6)",
              marginBottom: 12,
              fontSize: 13,
              color: theme.textSecondary,
            }}
          >
            <span>使用流程一览</span>
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: theme.textMain,
            }}
          >
            从一句话，到整套动画课件
          </h2>
          <p
            style={{
              marginTop: 14,
              marginBottom: 20,
              fontSize: 18,
              lineHeight: 1.7,
              color: theme.textSecondary,
            }}
          >
            1. 在首页点击「试试智能体」，说出你的需求。
            <br />
            2. 智能体自动在「智能识别」「动态计算」「教学案例」「开发者工具」之间调度。
            <br />
            3. 把结果保存到「我的算式」与课件包，下次一键复用。
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TrailerOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({
    frame,
    fps,
    config: { damping: 180 },
    durationInFrames: DUR.outro,
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: theme.introBgGradient,
        fontFamily: theme.fontFamily,
      }}
    >
      <div
        style={{
          textAlign: "center",
          opacity: appear,
          transform: `translateY(${interpolate(appear, [0, 1], [16, 0])}px)`,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 42,
            marginBottom: 16,
          }}
        >
          准备好一起「看见」数学了吗？
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 20,
            color: theme.textSecondary,
            lineHeight: 1.7,
          }}
        >
          打开智算视界，用智能体、智能识别、动态计算和教学案例，
          <br />
          重新体验一遍数学世界。
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const SiteTrailerComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bgBody }}>
      <Sequence from={0} durationInFrames={DUR.intro}>
        <TrailerIntro />
      </Sequence>
      <Sequence from={DUR.intro} durationInFrames={DUR.home}>
        <TrailerHome />
      </Sequence>
      <Sequence from={DUR.intro + DUR.home} durationInFrames={DUR.flow}>
        <TrailerFlow />
      </Sequence>
      <Sequence
        from={DUR.intro + DUR.home + DUR.flow}
        durationInFrames={DUR.outro}
      >
        <TrailerOutro />
      </Sequence>
    </AbsoluteFill>
  );
};

