<script setup>
/**
 * Layout Sidebar
 * 데스크탑용 사이드바 네비게이션
 * - 접힘/펼침 상태 지원
 * - 다단계 메뉴 지원
 * - 권한 기반 메뉴 필터링
 */
import { useUiStore } from '~/stores/ui'
import { navigationItems } from '~/data/navigation'

const uiStore = useUiStore()
const route = useRoute()

// 사이드바 접힘 상태
const isCollapsed = computed(() => uiStore.sidebar.isCollapsed)

// 모든 메뉴의 경로 목록 (정확한 매칭용)
const allMenuPaths = computed(() => {
  const paths = []
  navigationItems.forEach(item => {
    if (item.to) paths.push(item.to)
    if (item.children) {
      item.children.forEach(child => {
        if (child.to) paths.push(child.to)
      })
    }
  })
  return paths.sort((a, b) => b.length - a.length) // 긴 경로부터 정렬
})

// 현재 경로가 어떤 메뉴에 속하는지 찾기
const findMatchingMenuPath = (currentPath) => {
  // 정확히 일치하는 메뉴 먼저 찾기
  const exactMatch = allMenuPaths.value.find(p => p === currentPath)
  if (exactMatch) return exactMatch

  // 현재 경로가 메뉴 경로로 시작하는지 확인 (긴 경로부터)
  for (const menuPath of allMenuPaths.value) {
    if (currentPath.startsWith(menuPath + '/')) {
      return menuPath
    }
  }
  return null
}

// 현재 활성 메뉴 경로 (클레임에서 진입한 주문 상세는 교환/반품/취소 메뉴 활성화)
const activeMenuPath = computed(() => {
  if (route.query.from === 'claims') {
    return '/admin/orders/claims'
  }
  return findMatchingMenuPath(route.path)
})

// 메뉴 아이템이 활성 상태인지 체크
const isActive = (path) => {
  return activeMenuPath.value === path
}

// 부모 메뉴가 활성 자식을 가지는지 체크
const hasActiveChild = (item) => {
  if (!item.children) return false
  return item.children.some(child => isActive(child.to))
}

// 열린 서브메뉴 관리
const openSubmenus = ref([])

// 현재 경로에 맞는 부모 메뉴 자동 펼침
const initOpenSubmenus = () => {
  navigationItems.forEach(item => {
    if (item.children && hasActiveChild(item)) {
      if (!openSubmenus.value.includes(item.id)) {
        openSubmenus.value.push(item.id)
      }
    }
  })
}

// 라우트 변경 시 자동 펼침
watch(() => route.path, () => {
  initOpenSubmenus()
}, { immediate: true })

const toggleSubmenu = (menuId) => {
  const index = openSubmenus.value.indexOf(menuId)
  if (index > -1) {
    openSubmenus.value.splice(index, 1)
  } else {
    openSubmenus.value.push(menuId)
  }
}

const isSubmenuOpen = (menuId) => {
  return openSubmenus.value.includes(menuId)
}

// 접힘 토글
const toggleCollapse = () => {
  uiStore.toggleSidebarCollapse()
}
</script>

<template>
  <aside
    :class="[
      'fixed top-header left-0 bottom-0 bg-white border-r border-neutral-200 z-sticky',
      'transition-all duration-300 overflow-hidden',
      isCollapsed ? 'w-[4.5rem]' : 'w-sidebar',
    ]"
  >
    <nav
      class="h-full flex flex-col"
      aria-label="메인 네비게이션"
    >
      <!-- Navigation Items -->
      <ul class="flex-1 py-4 overflow-y-auto scrollbar-hidden">
        <li
          v-for="item in navigationItems"
          :key="item.id"
        >
          <!-- Menu Item with Children -->
          <template v-if="item.children?.length">
            <button
              type="button"
              :class="[
                'w-full flex items-center gap-3 px-4 py-3 text-left',
                'transition-colors',
                { 'justify-center': isCollapsed },
                hasActiveChild(item)
                  ? 'text-primary-700 bg-primary-50 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
              ]"
              :aria-expanded="isSubmenuOpen(item.id)"
              @click="toggleSubmenu(item.id)"
            >
              <!-- Icon -->
              <span
                class="w-5 h-5 flex-shrink-0"
                v-html="item.icon"
              />

              <!-- Label & Arrow (펼침 상태만) -->
              <template v-if="!isCollapsed">
                <span class="flex-1 text-sm">{{ item.label }}</span>
                <svg
                  :class="[
                    'w-4 h-4 transition-transform',
                    { 'rotate-180': isSubmenuOpen(item.id) },
                  ]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </template>
            </button>

            <!-- Submenu -->
            <ul
              v-show="isSubmenuOpen(item.id) && !isCollapsed"
              class="overflow-hidden"
            >
              <li
                v-for="child in item.children"
                :key="child.id"
              >
                <NuxtLink
                  :to="child.to"
                  :class="[
                    'flex items-center gap-3 pl-12 pr-4 py-2.5',
                    'text-sm transition-colors',
                    isActive(child.to)
                      ? 'text-primary-700 bg-primary-100 font-medium border-r-2 border-primary-600'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50',
                  ]"
                >
                  {{ child.label }}
                </NuxtLink>
              </li>
            </ul>
          </template>

          <!-- Menu Item without Children -->
          <template v-else>
            <NuxtLink
              :to="item.to"
              :class="[
                'flex items-center gap-3 px-4 py-3',
                'transition-colors',
                { 'justify-center': isCollapsed },
                isActive(item.to)
                  ? 'text-primary-700 bg-primary-100 font-medium border-r-2 border-primary-600'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
              ]"
              :title="isCollapsed ? item.label : undefined"
            >
              <!-- Icon -->
              <span
                class="w-5 h-5 flex-shrink-0"
                v-html="item.icon"
              />

              <!-- Label (펼침 상태만) -->
              <span
                v-if="!isCollapsed"
                class="text-sm"
              >
                {{ item.label }}
              </span>
            </NuxtLink>
          </template>
        </li>
      </ul>

      <!-- Collapse Toggle Button -->
      <div class="border-t border-neutral-200 p-2">
        <button
          type="button"
          :class="[
            'w-full flex items-center gap-2 p-2 rounded-lg',
            'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700',
            'transition-colors',
            { 'justify-center': isCollapsed },
          ]"
          :aria-label="isCollapsed ? '사이드바 펼치기' : '사이드바 접기'"
          @click="toggleCollapse"
        >
          <svg
            :class="[
              'w-5 h-5 transition-transform',
              { 'rotate-180': isCollapsed },
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
          <span
            v-if="!isCollapsed"
            class="text-sm"
          >접기</span>
        </button>
      </div>
    </nav>
  </aside>
</template>
