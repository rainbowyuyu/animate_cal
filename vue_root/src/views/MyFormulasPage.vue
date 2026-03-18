<template>
  <section id="my-formulas" class="section">
    <h2 class="section-title">我的算式库</h2>
    <div class="container formulas-container" style="max-width: 1000px">
      <div class="formulas-sub-nav">
        <button
          type="button"
          class="formulas-sub-tab"
          :class="{ active: activeTab === 'formulas' }"
          @click="activeTab = 'formulas'"
        >
          算式库
        </button>
        <button
          type="button"
          class="formulas-sub-tab"
          :class="{ active: activeTab === 'scripts' }"
          @click="activeTab = 'scripts'"
        >
          动画脚本库
        </button>
        <button
          type="button"
          class="formulas-sub-tab"
          :class="{ active: activeTab === 'templates' }"
          @click="activeTab = 'templates'"
        >
          智能体模板
        </button>
      </div>

      <!-- 算式库面板（Vue 化渲染） -->
      <div
        v-show="activeTab === 'formulas'"
        class="formulas-panel glass-panel"
      >
        <div class="formulas-panel-header">
          <h3 class="formulas-panel-title">已保存的公式</h3>
          <button
            class="action-btn secondary formulas-refresh-btn"
            :disabled="loading"
            @click="reload"
          >
            <i class="fa-solid fa-rotate"></i>
            {{ loading ? "加载中…" : "刷新列表" }}
          </button>
        </div>

        <div class="formula-grid">
          <div
            class="formula-card add-new-card"
            style="
              justify-content: center;
              align-items: center;
              border: 2px dashed #cbd5e1;
              cursor: pointer;
              min-height: 180px;
            "
            @click="goToDetect"
          >
            <div
              style="
                font-size: 2.5rem;
                color: var(--primary-color);
                margin-bottom: 0.5rem;
              "
            >
              <i class="fa-solid fa-circle-plus"></i>
            </div>
            <div
              style="
                font-size: 1rem;
                color: var(--text-secondary);
                font-weight: 600;
              "
            >
              新建算式
            </div>
          </div>

          <div
            v-if="loading"
            class="empty-state"
            style="grid-column: 1 / -1; padding-top: 1rem"
          >
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>正在同步云端数据...</p>
          </div>
          <div
            v-else-if="error"
            class="empty-state"
            style="grid-column: 1 / -1; padding-top: 1rem"
          >
            <p>{{ error }}</p>
          </div>
          <div
            v-else-if="isEmpty"
            class="empty-state"
            style="grid-column: 1 / -1; padding-top: 1rem"
          >
            <p>暂无保存的算式，点击上方卡片去识别添加吧！</p>
          </div>

          <div
            v-for="f in items"
            :key="f.id"
            class="formula-card"
          >
            <div class="formula-preview">
              \\[ {{ f.latex }} \\]
            </div>
            <div class="formula-meta">
              <span class="formula-note" :title="f.note || '未命名'">
                {{ f.note || "未命名" }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 其余两个 Tab 暂时仍保留占位，后续按计划 Vue 化 -->
      <div
        v-show="activeTab === 'scripts'"
        class="formulas-panel glass-panel"
      >
        <div class="placeholder-section">
          <h2>动画脚本库</h2>
          <p>后续将把脚本列表与 Monaco 编辑器迁移为 Vue 组件。</p>
        </div>
      </div>

      <div
        v-show="activeTab === 'templates'"
        class="formulas-panel glass-panel"
      >
        <div class="placeholder-section">
          <h2>智能体模板</h2>
          <p>后续将把模板列表与「一键运行」入口迁移为 Vue 组件。</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useFormulasStore } from "../composables/useFormulasStore";

type TabId = "formulas" | "scripts" | "templates";

const activeTab = ref<TabId>("formulas");
const router = useRouter();

const { items, loading, error, isEmpty, reload } = useFormulasStore();

function goToDetect() {
  router.push("/detect");
}

onMounted(() => {
  reload();
});
</script>
