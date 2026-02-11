<script setup>
/**
 * Layout Drawer
 * 모바일용 슬라이드 드로어
 * - 사이드바 메뉴 (모바일)
 * - 동적 컨텐츠 지원
 */
import { useUiStore } from '~/stores/ui'
import { navigationItems } from '~/data/navigation'

const uiStore = useUiStore()
const route = useRoute()

// 드로어 상태
const isOpen = computed(() => uiStore.drawer.isOpen)

// 현재 활성 메뉴 체크 (클레임에서 진입한 주문 상세는 교환/반품/취소 메뉴 활성화)
const isActive = (path) => {
  if (route.query.from === 'claims' && path === '/admin/orders/claims') {
    return true
  }
  if (route.query.from === 'claims' && path === '/admin/orders') {
    return false
  }
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}

// 열린 서브메뉴
const openSubmenus = ref([])

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

// 드로어 닫기
const closeDrawer = () => {
  uiStore.closeDrawer()
}

// 메뉴 클릭 시 드로어 닫기
const handleMenuClick = () => {
  closeDrawer()
}

// ESC 키로 닫기
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    closeDrawer()
  }
}

// 드로어 열릴 때 ESC 이벤트 리스너
watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-neutral-900/50 z-drawer"
        aria-hidden="true"
        @click="closeDrawer"
      />
    </Transition>

    <!-- Drawer Panel -->
    <Transition
      enter-active-class="transition-transform duration-300"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="isOpen"
        class="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white z-drawer shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
      >
        <!-- Header -->
        <div class="flex items-center justify-between h-header px-4 border-b border-neutral-200">
          <span class="text-lg font-bold text-primary-700">Admin</span>
          <button
            type="button"
            class="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="메뉴 닫기"
            @click="closeDrawer"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Navigation -->
        <nav
          class="h-[calc(100%-4rem)] overflow-y-auto"
          aria-label="모바일 메뉴"
        >
          <ul class="py-2">
            <li
              v-for="item in navigationItems"
              :key="item.id"
            >
              <!-- Menu with Children -->
              <template v-if="item.children?.length">
                <button
                  type="button"
                  class="w-full flex items-center gap-3 px-4 py-3 text-left text-neutral-600 hover:bg-neutral-50"
                  :aria-expanded="isSubmenuOpen(item.id)"
                  @click="toggleSubmenu(item.id)"
                >
                  <span
                    class="w-5 h-5"
                    v-html="item.icon"
                  />
                  <span class="flex-1 text-sm font-medium">{{ item.label }}</span>
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
                </button>

                <!-- Submenu -->
                <ul
                  v-if="isSubmenuOpen(item.id)"
                  class="bg-neutral-50"
                >
                  <li
                    v-for="child in item.children"
                    :key="child.id"
                  >
                    <NuxtLink
                      :to="child.to"
                      :class="[
                        'block pl-12 pr-4 py-2 text-sm',
                        isActive(child.to)
                          ? 'text-primary-700 font-medium bg-primary-50'
                          : 'text-neutral-500 hover:text-neutral-900',
                      ]"
                      @click="handleMenuClick"
                    >
                      {{ child.label }}
                    </NuxtLink>
                  </li>
                </ul>
              </template>

              <!-- Menu without Children -->
              <template v-else>
                <NuxtLink
                  :to="item.to"
                  :class="[
                    'flex items-center gap-3 px-4 py-3',
                    isActive(item.to)
                      ? 'text-primary-700 bg-primary-50 font-medium'
                      : 'text-neutral-600 hover:bg-neutral-50',
                  ]"
                  @click="handleMenuClick"
                >
                  <span
                    class="w-5 h-5"
                    v-html="item.icon"
                  />
                  <span class="text-sm font-medium">{{ item.label }}</span>
                </NuxtLink>
              </template>
            </li>
          </ul>
        </nav>
      </aside>
    </Transition>
  </Teleport>
</template>
