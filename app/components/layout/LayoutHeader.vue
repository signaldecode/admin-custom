<script setup>
/**
 * Layout Header
 * 상단 헤더 컴포넌트
 * - 로고/타이틀
 * - 테넌트 스위처 (멀티테넌트 대비)
 * - 유저 메뉴
 * - 모바일 메뉴 버튼
 */
import { useUiStore } from '~/stores/ui'
import { useAuthStore } from '~/stores/auth'

const uiStore = useUiStore()
const authStore = useAuthStore()

// 브레이크포인트
const { isMobile } = useBreakpoint()

// 유저 메뉴 상태
const isUserMenuOpen = ref(false)

// 사이드바 토글
const toggleSidebar = () => {
  uiStore.toggleSidebar()
}

// 유저 메뉴 토글
const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

// 유저 메뉴 닫기 (외부 클릭)
const closeUserMenu = () => {
  isUserMenuOpen.value = false
}

// 로그아웃
const handleLogout = async () => {
  closeUserMenu()
  await authStore.logout()
}
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 h-header bg-white border-b border-neutral-200 z-sticky"
  >
    <div class="flex items-center justify-between h-full px-4">
      <!-- Left Section -->
      <div class="flex items-center gap-3">
        <!-- Menu Button (Mobile) / Collapse Button (Desktop) -->
        <button
          type="button"
          class="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          :aria-label="isMobile ? '메뉴 열기' : '사이드바 토글'"
          @click="toggleSidebar"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <!-- Logo / Title -->
        <NuxtLink
          to="/admin"
          class="flex items-center gap-2"
        >
          <span class="text-lg font-bold text-primary-700">Admin</span>
        </NuxtLink>
      </div>

      <!-- Right Section -->
      <div class="flex items-center gap-2">
        <!-- Tenant Switcher (멀티테넌트 대비) -->
        <LayoutTenantSwitcher />

        <!-- User Menu -->
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            :aria-expanded="isUserMenuOpen"
            aria-haspopup="true"
            @click="toggleUserMenu"
          >
            <!-- Avatar -->
            <div
              class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium"
            >
              {{ authStore.userName?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <!-- Name (Desktop only) -->
            <span class="hidden md:block text-sm text-neutral-700">
              {{ authStore.userName || '사용자' }}
            </span>
            <!-- Dropdown Arrow -->
            <svg
              class="w-4 h-4 text-neutral-500"
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

          <!-- User Dropdown Menu -->
          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="isUserMenuOpen"
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-dropdown"
            >
              <!-- User Info -->
              <div class="px-4 py-2 border-b border-neutral-100">
                <p class="text-sm font-medium text-neutral-900">
                  {{ authStore.userName }}
                </p>
                <p class="text-xs text-neutral-500">
                  {{ authStore.userEmail }}
                </p>
              </div>

              <!-- Menu Items -->
              <NuxtLink
                to="/admin/profile"
                class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                @click="closeUserMenu"
              >
                내 정보
              </NuxtLink>

              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50"
                @click="handleLogout"
              >
                로그아웃
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Click Outside Handler -->
    <div
      v-if="isUserMenuOpen"
      class="fixed inset-0 z-[-1]"
      @click="closeUserMenu"
    />
  </header>
</template>
