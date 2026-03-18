<template>
  <section id="agent" class="section agent-section" :class="{ 'active-section': active }">
    <div id="agent-sidebar-overlay" class="agent-sidebar-overlay" @click="closeSidebarMobile"></div>
    <div class="agent-layout">
      <aside id="agent-sidebar" class="agent-sidebar">
        <div class="agent-sidebar-header">
          <button
            type="button"
            class="agent-sidebar-toggle"
            id="agent-sidebar-toggle"
            @click="toggleSidebar"
            title="折叠/展开侧边栏"
          >
            <i class="fa-solid fa-bars"></i>
          </button>
          <h2 class="agent-sidebar-title">智能体</h2>
        </div>
        <div class="agent-sidebar-content">
          <div class="agent-sidebar-section agent-section-examples-top">
            <button
              type="button"
              class="agent-features-examples-btn"
              id="agent-features-examples-btn"
              @click="toggleFeaturesExamples"
            >
              <i class="fa-solid fa-sparkles"></i> 打开功能与示例
            </button>
          </div>

          <div class="agent-sidebar-section">
            <span class="agent-badge">
              <i class="fa-solid fa-crown"></i>
              会员功能
            </span>
            <p class="agent-sidebar-desc">
              用自然语言描述你想做的事，智能体会自动调用识别、计算、动画、LaTeX 编辑等能力，一步到位完成复杂任务。
            </p>
          </div>

          <div class="agent-sidebar-section agent-section-features">
            <span class="agent-section-badge">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              功能
            </span>
            <h3 class="agent-sidebar-section-title">功能特性</h3>
            <ul class="agent-features-list">
              <li>
                <i class="fa-solid fa-check"></i>
                一句话生成动画、打开编辑器或识别公式
              </li>
              <li>
                <i class="fa-solid fa-check"></i>
                支持上传公式图片，自动识别并跳转计算
              </li>
              <li>
                <i class="fa-solid fa-check"></i>
                与本站所有功能无缝联动
              </li>
            </ul>
          </div>

          <div class="agent-sidebar-section">
            <h3 class="agent-sidebar-section-title">快捷操作</h3>
            <div class="agent-sidebar-actions">
              <button type="button" class="agent-sidebar-action-btn" @click="clearChat">
                <i class="fa-solid fa-trash"></i>
                清空对话
              </button>
              <button
                type="button"
                class="agent-sidebar-action-btn"
                @click="openSettings('agent')"
              >
                <i class="fa-solid fa-gear"></i>
                设置
              </button>
              <button
                type="button"
                class="agent-sidebar-action-btn"
                @click="openTemplatesModal"
              >
                <i class="fa-solid fa-bookmark"></i>
                从模板运行
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div class="agent-main">
        <div id="agent-gate" class="agent-gate" v-show="!loggedIn">
          <div class="agent-gate-card">
            <div class="agent-gate-icon">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <h3 class="agent-gate-title">登录后即可使用智能体</h3>
            <p class="agent-gate-desc">
              智能体为登录用户专属功能，登录后可享受一句话调度识别、计算与动画等全部能力。
            </p>
            <button type="button" class="agent-gate-btn" @click="toggleAuthModal(true)">
              <i class="fa-solid fa-right-to-bracket"></i>
              登录 / 注册
            </button>
          </div>
        </div>

        <div
          id="agent-workspace-wrap"
          class="agent-workspace-wrap agent-chat-wrap"
          v-show="loggedIn"
        >
          <button
            type="button"
            class="agent-mobile-menu-btn"
            @click="openSidebarMobile"
            title="打开侧边栏"
          >
            <i class="fa-solid fa-bars"></i>
          </button>
          <button
            type="button"
            class="agent-sidebar-open-btn"
            id="agent-sidebar-open-btn"
            @click="toggleSidebar"
            title="打开侧边栏"
          >
            <i class="fa-solid fa-bars"></i>
          </button>

          <div class="agent-chat-container">
            <div id="agent-messages" class="agent-messages">
              <TransitionGroup name="agent-msg-fade" tag="div">
                <div
                  v-for="(msg, index) in messages"
                  :key="index"
                  :class="[
                    'agent-message',
                    msg.role === 'user'
                      ? 'agent-message-user'
                      : 'agent-message-assistant'
                  ]"
                >
                  <div
                    :class="[
                      'agent-avatar',
                      msg.role === 'user'
                        ? 'agent-avatar-user'
                        : 'agent-avatar-bot'
                  ]"
                  >
                    <i
                      v-if="msg.role === 'user'"
                      class="fa-solid fa-user agent-avatar-fallback"
                    ></i>
                    <img
                      v-else
                      src="/static/assets/智算视界_avatar.svg"
                      alt="智算视界"
                      class="agent-avatar-logo"
                    />
                  </div>
                  <div
                    :class="[
                      'agent-bubble',
                      msg.role === 'user'
                        ? 'agent-bubble-user'
                        : 'agent-bubble-assistant'
                    ]"
                  >
                    <p v-if="msg.role === 'user'">{{ msg.raw || msg.html }}</p>
                    <div
                      v-else
                      class="agent-reply-content markdown-body"
                      v-html="msg.html"
                    ></div>
                  </div>
                </div>
              </TransitionGroup>
            </div>

            <div class="agent-input-bar">
              <div
                id="agent-image-preview-wrap"
                class="agent-image-preview-wrap"
                v-show="imagePreviewUrl"
              >
                <div class="agent-image-preview-container">
                  <img
                    id="agent-image-preview"
                    :src="imagePreviewUrl || undefined"
                    alt="预览"
                    class="agent-image-preview"
                    @click="openImageEditor"
                  />
                  <div class="agent-image-edit-hint">点击编辑</div>
                </div>
                <button
                  type="button"
                  class="agent-preview-remove"
                  @click="clearAttachedImage"
                  title="移除图片"
                >
                  <i class="fa-solid fa-times"></i>
                </button>
              </div>

              <div class="agent-input-row">
                <label
                  class="agent-upload-btn"
                  for="agent-image-upload"
                  title="上传或粘贴图片"
                >
                  <i class="fa-solid fa-image"></i>
                </label>
                <input
                  type="file"
                  id="agent-image-upload"
                  accept="image/*"
                  style="display: none"
                  @change="onFileChange"
                />
                <div class="agent-prompt-wrap">
                  <label for="agent-prompt" class="agent-input-label">
                    说说你想做什么
                  </label>
                  <textarea
                    id="agent-prompt"
                    class="agent-textarea agent-chat-input tech-input"
                    placeholder="例如：填入 sin(x)=1/2、识别这张图、把公式做成动画… 支持粘贴图片"
                    rows="1"
                    v-model="prompt"
                    @keydown.enter.exact.prevent="onSubmit"
                  ></textarea>
                </div>
                <button
                  type="button"
                  id="agent-submit-btn"
                  class="agent-send-btn"
                  :disabled="loading"
                  @click="onSubmit"
                  title="发送"
                >
                  <i class="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAgentChat } from "./useAgentChat";

const props = defineProps<{
  activeSection: string;
  loggedIn: boolean;
}>();

const emits = defineEmits<{
  (e: "request-open-settings", section?: string): void;
}>();

const active = computed(() => props.activeSection === "agent");
const loggedIn = computed(() => props.loggedIn);
const prompt = ref("");

const {
  messages,
  loading,
  attachedImage,
  imagePreviewUrl,
  sidebarCollapsed,
  setSidebarCollapsed,
  setAttachedImage,
  clearChat: clearChatInner,
  execute: executeInner
} = useAgentChat();

function toggleSidebar() {
  setSidebarCollapsed(!sidebarCollapsed.value);
}

function openSidebarMobile() {
  setSidebarCollapsed(false);
}

function closeSidebarMobile() {
  setSidebarCollapsed(true);
}

function toggleFeaturesExamples() {
  (window as any).Agent?.toggleFeaturesExamples?.();
}

function clearChat() {
  clearChatInner();
}

function openSettings(section?: string) {
  emits("request-open-settings", section);
  if (typeof (window as any).openSettings === "function") {
    (window as any).openSettings(section);
  }
}

function openTemplatesModal() {
  (window as any).Agent?.openTemplatesModal?.();
}

function toggleAuthModal(show: boolean) {
  (window as any).toggleAuthModal?.(show);
}

function openImageEditor() {
  (window as any).ImageEditor?.openEditor?.("agent-image-preview", "agent");
}

function clearAttachedImage() {
  setAttachedImage(null);
}

async function onSubmit() {
  await executeInner(prompt.value);
  prompt.value = "";
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files && target.files[0];
  setAttachedImage(file || null);
}

onMounted(() => {
  // 兼容旧逻辑：若外层仍有 window.Agent.clearChat 等调用，可以在这里挂载简单转发（可选）
});
</script>

