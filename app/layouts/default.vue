<script setup>
/**
 * Default Layout
 * Admin 페이지용 기본 레이아웃
 * - Header + Sidebar + Main Content
 * - Mobile: Header + Drawer
 */
import { useUiStore } from '~/stores/ui'

const uiStore = useUiStore()

// 브레이크포인트 감지
const { isMobile } = useBreakpoint()

// 사이드바 상태
const showSidebar = computed(() => uiStore.showSidebar)
const isCollapsed = computed(() => uiStore.sidebar.isCollapsed)

// 메인 컨텐츠 마진 클래스
const mainMarginClass = computed(() => {
  if (isMobile.value) return 'ml-0'
  // 사이드바 숨김 시 컨텐츠 전체 너비 사용
  if (!showSidebar.value) return 'ml-0'
  if (isCollapsed.value) return 'ml-[4.5rem]'
  return 'ml-sidebar'
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Skip Link (접근성) -->
    <a
      href="#main-content"
      class="skip-link"
    >
      본문으로 바로가기
    </a>

    <!-- Header -->
    <LayoutHeader />

    <!-- Sidebar (Desktop) -->
    <LayoutSidebar v-if="showSidebar" />

    <!-- Mobile Drawer -->
    <LayoutDrawer v-if="isMobile" />

    <!-- Main Content -->
    <main
      id="main-content"
      :class="[
        'h-screen pt-header transition-all duration-300 flex flex-col overflow-hidden',
        mainMarginClass,
      ]"
    >
      <div class="flex-1 min-h-0 flex flex-col p-4 md:p-6 overflow-hidden">
        <slot />
      </div>
    </main>

    <!-- Toast Container -->
    <LayoutToastContainer />

    <!-- Global Loading -->
    <LayoutLoadingOverlay v-if="uiStore.isGlobalLoading" />
  </div>
</template>
