import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring } from "remotion";
import { theme } from "./theme";
import { SceneHomeDark } from "./scenes/SceneHomeDark";

/** 首页 1:1 深色模式 + Three 设备框 */
export const HomePageThreeComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 镜头缓慢移动（轻微轨道+推拉），配合景深感
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 90,
  });

  const subtleLoop = Math.sin(frame * 0.02) * 0.5;

  // 控制 3D 视角：略有推近，但保证页面不超出设备框
  const rotateX = interpolate(progress, [0, 1], [17, 9]) + subtleLoop * 0.4;
  const rotateY = interpolate(progress, [0, 1], [-8, -20]) + subtleLoop * 0.6;
  const translateY = interpolate(progress, [0, 1], [20, -6]);
  const scale = interpolate(progress, [0, 1], [1.02, 1.12]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bgBody,
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.45), transparent 55%)," +
          "radial-gradient(circle at 80% 100%, rgba(56,189,248,0.28), transparent 60%)," +
          "radial-gradient(circle at 20% 100%, rgba(15,23,42,0.9), transparent 65%)," +
          "linear-gradient(135deg, #020617, #020617)",
      }}
    >
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          padding: 32, // 给设备框留呼吸空间，避免超出画面
        }}
      >
        <div
          style={{
            width: 1520,
            height: 860,
            borderRadius: 40,
            border: "1px solid rgba(148,163,184,0.5)",
            // 设备周围的蓝紫赛博渐变光影
            background:
              "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.35), transparent 55%)," +
              "radial-gradient(circle at 100% 100%, rgba(124,58,237,0.32), transparent 60%)," +
              "linear-gradient(145deg, #020617, #020617)",
            boxShadow:
              "0 40px 90px rgba(0,0,0,0.85), 0 0 0 1px rgba(15,23,42,0.9)," +
              "0 0 45px rgba(59,130,246,0.45), 0 0 80px rgba(129,140,248,0.35)",
            position: "relative",
            transform: `perspective(2200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${translateY}px) scale(${scale})`,
            transformOrigin: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 14,
              borderRadius: 26,
              overflow: "hidden", // 保证内容始终被设备屏幕裁剪
              backgroundColor: theme.bgSurface,
              boxShadow:
                "inset 0 0 60px rgba(0,0,0,0.45), 0 0 40px rgba(15,23,42,0.6)",
            }}
          >
            <div
              style={{
                position: "absolute",
                // 稍微放大一点，但尽量贴合 1:1 页面，不让顶部/底部被裁掉
                inset: "-3% -3%",
                transform: "scale(1.04) translateY(-6px)",
                transformOrigin: "center top",
              }}
            >
              {/* 近景层：中部区域清晰 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  // 将清晰区域中心稍微向左上移动，对准首页 Hero 区域
                  maskImage:
                    "radial-gradient(circle at 32% 40%, black 0%, black 52%, transparent 78%)",
                  WebkitMaskImage:
                    "radial-gradient(circle at 32% 40%, black 0%, black 52%, transparent 78%)",
                }}
              >
                <SceneHomeDark />
              </div>

              {/* 远景层：整体稍模糊，制造远处虚焦 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  filter: "blur(4px)",
                  opacity: 0.72,
                }}
              >
                <SceneHomeDark />
              </div>

              {/* 顶部和远端额外景深遮罩，拉开前后层次 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(circle at 15% 0%, rgba(15,23,42,0.75), transparent 40%)," +
                    "radial-gradient(circle at 95% 15%, rgba(15,23,42,0.8), transparent 45%)," +
                    "radial-gradient(circle at 90% 90%, rgba(15,23,42,0.9), transparent 50%)",
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

