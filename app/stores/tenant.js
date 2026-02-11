/**
 * Tenant Store
 * 멀티테넌트 확장 가능 구조
 * - Phase 1: 단일 테넌트 (1 관리자 : 1 서비스)
 * - Phase 2: 멀티테넌트 (1 관리자 : N 서비스)
 *
 * 모든 API 요청, 캐시, 상태는 tenant 스코프에 종속됨
 */
import { defineStore } from 'pinia'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    // 현재 활성 테넌트
    currentTenant: null,
    // 유저가 접근 가능한 테넌트 목록 (Phase 2 대비)
    tenants: [],
    // 로딩 상태
    isLoading: false,
    // 에러
    error: null,
  }),

  getters: {
    /**
     * 현재 테넌트 ID
     */
    currentTenantId: (state) => state.currentTenant?.id || null,

    /**
     * 현재 테넌트 이름
     */
    currentTenantName: (state) => state.currentTenant?.name || '',

    /**
     * 테넌트 선택 가능 여부 (멀티테넌트인 경우)
     */
    canSwitchTenant: (state) => state.tenants.length > 1,

    /**
     * 테넌트 설정 완료 여부
     */
    isTenantReady: (state) => state.currentTenant !== null,

    /**
     * API 요청용 테넌트 헤더
     */
    tenantHeader: (state) => {
      return state.currentTenant?.id
        ? { 'X-Tenant-Id': state.currentTenant.id }
        : {}
    },
  },

  actions: {
    /**
     * 현재 테넌트 설정
     * @param {Object} tenant - { id, name, ... }
     */
    setCurrentTenant(tenant) {
      const previousTenantId = this.currentTenant?.id

      this.currentTenant = tenant

      // 테넌트 변경 시 관련 캐시/상태 초기화
      if (previousTenantId && previousTenantId !== tenant?.id) {
        this.onTenantChange()
      }
    },

    /**
     * 테넌트 목록 설정
     * @param {Array} tenants
     */
    setTenants(tenants) {
      this.tenants = tenants || []

      // Phase 1: 테넌트가 1개면 자동 선택
      if (this.tenants.length === 1 && !this.currentTenant) {
        this.setCurrentTenant(this.tenants[0])
      }
    },

    /**
     * 테넌트 전환 (Phase 2용)
     * @param {string} tenantId
     */
    async switchTenant(tenantId) {
      const tenant = this.tenants.find((t) => t.id === tenantId)

      if (!tenant) {
        this.error = '접근할 수 없는 테넌트입니다.'
        return { success: false, error: this.error }
      }

      this.isLoading = true
      this.error = null

      try {
        // 백엔드에 테넌트 전환 알림 (옵션)
        // await $api.post('/auth/switch-tenant', { tenantId })

        this.setCurrentTenant(tenant)

        return { success: true }
      } catch (error) {
        this.error = error.message || '테넌트 전환에 실패했습니다.'
        return { success: false, error: this.error }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 테넌트 변경 시 실행되는 콜백
     * - 페이지 상태/필터/캐시 초기화
     * - 라우터 리다이렉트 (필요시)
     */
    onTenantChange() {
      // UI 스토어 초기화
      const uiStore = useUiStore()
      uiStore.closeAllDrawers()

      // 필터/캐시 스토어 초기화 (존재하는 경우)
      // const filterStore = useFilterStore()
      // filterStore.reset()

      // 현재 페이지 데이터 리프레시 필요 알림
      // (각 페이지에서 watch로 감지하거나 이벤트 발행)
    },

    /**
     * 상태 초기화
     */
    reset() {
      this.currentTenant = null
      this.tenants = []
      this.error = null
    },
  },
})

// 순환 참조 방지
function useUiStore() {
  return useNuxtApp().$pinia.state.value.ui
    ? useNuxtApp().$pinia._s.get('ui')
    : { closeAllDrawers: () => {} }
}
