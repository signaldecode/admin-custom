<script setup>
/**
 * Tenant Switcher
 * 테넌트(서비스) 선택 드롭다운
 * - Phase 1: 단일 테넌트 표시 (스위칭 비활성화)
 * - Phase 2: 멀티테넌트 선택 가능
 */
import { useTenantStore } from '~/stores/tenant'

const tenantStore = useTenantStore()

// 드롭다운 상태
const isOpen = ref(false)

// 현재 테넌트
const currentTenant = computed(() => tenantStore.currentTenant)
const tenants = computed(() => tenantStore.tenants)
const canSwitch = computed(() => tenantStore.canSwitchTenant)

// 드롭다운 토글
const toggle = () => {
  if (canSwitch.value) {
    isOpen.value = !isOpen.value
  }
}

// 드롭다운 닫기
const close = () => {
  isOpen.value = false
}

// 테넌트 선택
const selectTenant = async (tenantId) => {
  if (tenantId === currentTenant.value?.id) {
    close()
    return
  }

  await tenantStore.switchTenant(tenantId)
  close()
}
</script>

<template>
  <div
    v-if="currentTenant"
    class="relative"
  >
    <button
      type="button"
      :class="[
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
        'border border-neutral-200',
        canSwitch
          ? 'hover:bg-neutral-50 cursor-pointer'
          : 'cursor-default',
      ]"
      :disabled="!canSwitch"
      @click="toggle"
    >
      <!-- Tenant Icon -->
      <span class="w-2 h-2 rounded-full bg-success-500" />

      <!-- Tenant Name -->
      <span class="text-neutral-700 font-medium max-w-32 truncate">
        {{ currentTenant.name }}
      </span>

      <!-- Dropdown Arrow (멀티테넌트인 경우만) -->
      <svg
        v-if="canSwitch"
        :class="[
          'w-4 h-4 text-neutral-400 transition-transform',
          { 'rotate-180': isOpen },
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

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen && canSwitch"
        class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-dropdown"
      >
        <div class="px-3 py-2 text-xs font-medium text-neutral-500 uppercase">
          서비스 선택
        </div>

        <button
          v-for="tenant in tenants"
          :key="tenant.id"
          type="button"
          :class="[
            'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
            'hover:bg-neutral-50 transition-colors',
            tenant.id === currentTenant.id
              ? 'text-primary-700 bg-primary-50'
              : 'text-neutral-700',
          ]"
          @click="selectTenant(tenant.id)"
        >
          <span
            :class="[
              'w-2 h-2 rounded-full',
              tenant.id === currentTenant.id ? 'bg-primary-500' : 'bg-neutral-300',
            ]"
          />
          <span class="truncate">{{ tenant.name }}</span>
          <svg
            v-if="tenant.id === currentTenant.id"
            class="w-4 h-4 ml-auto text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Click Outside -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[-1]"
      @click="close"
    />
  </div>
</template>
