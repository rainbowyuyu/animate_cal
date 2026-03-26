import { Composition } from "remotion";
import { HomePageThreeComposition } from "./HomePageThreeComposition";
import {
  SiteTrailerComposition,
  SITE_TRAILER_DURATION_IN_FRAMES,
} from "./SiteTrailerComposition";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot = () => {
  return (
    <>
      {/* 单独调试用：仅 3D 首页一屏 */}
      <Composition
        id="HomePage3D"
        component={HomePageThreeComposition}
        durationInFrames={SITE_TRAILER_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />

      {/* 主宣传片：站点 1:1 还原 + 全站巡游 */}
      <Composition
        id="SiteTrailer"
        component={SiteTrailerComposition}
        durationInFrames={SITE_TRAILER_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
    </>
  );
};
