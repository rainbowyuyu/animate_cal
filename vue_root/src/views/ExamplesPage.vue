<template>
  <section id="examples" class="section">
    <!-- 文档锚点：供 update.md 中 #section-examples 使用 -->
    <div id="section-examples"></div>
    <h2 class="section-title">精选教学案例</h2>
    <p class="section-subtitle">
      点击卡片即可全屏观看，体验公式推演与可视化演示
    </p>
    <div class="examples-toolbar" id="examples-filter">
      <!-- 文档锚点：供 update.md 中 #section-examples-filter 使用 -->
      <div id="section-examples-filter"></div>
      <div class="examples-filter-tabs">
        <button
          type="button"
          class="examples-filter-tab active"
          data-filter="all"
        >
          全部
        </button>
        <button
          type="button"
          class="examples-filter-tab"
          data-filter="favorites"
          title="登录后可用"
        >
          <i class="fa-regular fa-star"></i>
          收藏
        </button>
        <button
          type="button"
          class="examples-filter-tab"
          data-filter="watch_later"
          title="登录后可用"
        >
          <i class="fa-regular fa-clock"></i>
          稍后看
        </button>
        <button
          type="button"
          class="examples-filter-tab"
          data-filter="courseware"
          title="教师：我的课件包"
        >
          <i class="fa-solid fa-chalkboard-user"></i>
          我的课件
        </button>
      </div>
      <button
        type="button"
        class="action-btn secondary examples-create-course-btn"
        id="examples-create-course-btn"
        title="创建课包功能开发中，敬请期待"
        disabled
      >
        <i class="fa-solid fa-folder-plus"></i>
        创建课包
      </button>
      <div class="examples-tag-filter">
        <span class="examples-tag-label">标签</span>
        <select id="examples-tag-select" class="examples-tag-select">
          <option value="">全部</option>
        </select>
      </div>
    </div>
    <div id="examples-grid" class="video-grid">
      <!-- JS 动态加载 -->
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

<template>
  <section id="examples" class="section">
    <div class="placeholder-section">
      <h2>教学案例</h2>
      <p>这里将迁移为 Vue 化的教学案例与演示页面。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

