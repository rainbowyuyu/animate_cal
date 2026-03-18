<template>
  <section id="help" class="section">
    <h2 class="section-title">常见问题与指南</h2>
    <div class="help-container" style="max-width: 800px; margin: 0 auto">
      <!-- 帮助内搜索：实时过滤下方问答 -->
      <div class="help-search-bar">
        <div class="help-search-inner">
          <i class="fa-solid fa-magnifying-glass help-search-icon"></i>
          <input
            id="help-search-input"
            type="search"
            placeholder="在帮助中搜索，例如：智能体 / 教学案例 / 动画超时…"
            autocomplete="off"
          />
        </div>
        <p class="help-search-hint">
          输入关键字后，将自动筛选下方问题，并展开包含该关键字的问答。
        </p>
      </div>

      <!-- 智能体入口 -->
      <div class="tutorial-banner agent-help-banner" @click="goToAgent">
        <div class="banner-icon">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="banner-content">
          <h3>智能体</h3>
          <p>
            用自然语言描述需求，自动跳转到识别、计算或开发者工具并执行对应任务。
          </p>
        </div>
        <div class="banner-action">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          去使用
        </div>
      </div>

      <div class="tutorial-banner" @click="startTutorial">
        <div class="banner-icon">
          <i class="fa-solid fa-graduation-cap"></i>
        </div>
        <div class="banner-content">
          <h3>新手入门指南</h3>
          <p>点击这里开启交互式教学，30 秒掌握核心功能。</p>
        </div>
        <div class="banner-action">
          <i class="fa-solid fa-circle-play"></i>
          观看
        </div>
      </div>

      <!-- 以下 details 内容保持与原 HTML 基本一致 -->
      <details open>
        <summary>智能体 &amp; 按角色快速开始怎么用？</summary>
        <p>
          <b>智能体</b>
          是本站的“一句话调度”入口。你只需用自然语言描述想做的事（或上传一张公式/题目图片），系统会理解意图并自动：
          <br />· 跳转到【智能识别 / 动态计算 / 开发者工具 / 我的算式 / 教学案例】等页面；
          <br />· 预填识别到的 LaTeX 公式，或填入 Manim 代码，必要时自动点击「生成可视化动画」等按钮；
          <br />· 对整道题目先给出
          <b>文字版解题步骤</b>
          ，再生成可视化演示。
        </p>
        <p>
          <b>按角色快速开始</b>
          位于首页 Hero 下方，提供 学生 / 教师 / 内容创作者 / 开发者 四种入口：
          <br />· 点击「用智能体执行」：为该角色预填推荐提示词，一键唤起智能体完成整条路径（例如教师从识别→工作台→课包，创作者从脚本→成片→发布包）；
          <br />· 点击「观看操作流程」：不调用智能体，只通过交互式教程演示完整操作步骤，你可以跟着自己点。
        </p>
        <p>💡 顶部导航、首页卡片与帮助页 Banner 都可以直接进入智能体。</p>
      </details>

      <details>
        <summary>系统支持哪些手写格式和数学内容？</summary>
        <p>
          目前系统针对
          <b>线性代数</b>
          进行了深度优化。
          <br />✅
          <b>完美支持：</b>
          矩阵（方阵、列向量、稀疏矩阵）、行列式、基础代数运算（加减乘除）、微积分符号（积分、极限）等。
          <br />💡
          <b>建议：</b>
          书写时请尽量保持字符间距，避免连笔；使用黑色或深蓝色墨水在白纸上书写效果最佳。
        </p>
      </details>

      <details>
        <summary>识别结果不准确怎么办？</summary>
        <p>
          AI 识别可能受光线、角度或字迹潦草程度影响。如果识别有误，您无需重新上传，可以直接使用我们内置的
          <b>双向编辑功能</b>
          ：
          <br />1.
          <b>可视化修改：</b>
          直接点击“识别结果”区域的公式，像在 Word 中一样修改数字。
          <br />2.
          <b>代码修改：</b>
          点击右上角的“查看源码”，直接修改 LaTeX 代码，结果会实时同步。
        </p>
      </details>

      <details>
        <summary>上传图片有什么要求？</summary>
        <p>
          支持 JPG, PNG 格式。建议图片清晰、光线均匀、无阴影遮挡。尽量让公式位于图片中心，且背景干净（避免复杂的格纹或背景图案干扰 AI 识别）。
        </p>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
function goToAgent() {
  (window as any).showSection?.("agent");
}

function startTutorial() {
  (window as any).startTutorial?.();
}
</script>

<template>
  <section id="help" class="section">
    <div class="placeholder-section">
      <h2>帮助中心</h2>
      <p>这里将迁移为 Vue 化的帮助与文档页面。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

