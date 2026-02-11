/**
 * useTenant Composable
 * 테넌트(서비스 도메인) 관련 로직
 * - 현재 테넌트 정보
 * - 테넌트 전환 (Phase 2)
 * - 테넌트 스코프 데이터 관리
 */
import { useTenantStore } from '~/stores/tenant'

export function useTenant() {
  const tenantStore = useTenantStore()

  /**
   * 현재 테넌트
   */
  const currentTenant = computed(() => tenantStore.currentTenant)

  /**
   * 현재 테넌트 ID
   */
  const currentTenantId = computed(() => tenantStore.currentTenantId)

  /**
   * 현재 테넌트 이름
   */
  const currentTenantName = computed(() => tenantStore.currentTenantName)

  /**
   * 접근 가능한 테넌트 목록
   */
  const tenants = computed(() => tenantStore.tenants)

  /**
   * 테넌트 전환 가능 여부
   */
  const canSwitchTenant = computed(() => tenantStore.canSwitchTenant)

  /**
   * 테넌트 준비 완료 여부
   */
  const isTenantReady = computed(() => tenantStore.isTenantReady)

  /**
   * 로딩 상태
   */
  const isLoading = computed(() => tenantStore.isLoading)

  /**
   * 테넌트 전환
   * @param {string} tenantId
   */
  const switchTenant = async (tenantId) => {
    return await tenantStore.switchTenant(tenantId)
  }

  /**
   * 테넌트 변경 감지 (데이터 리프레시용)
   * @param {Function} callback
   */
  const onTenantChange = (callback) => {
    return watch(currentTenantId, (newId, oldId) => {
      if (oldId && newId !== oldId) {
        callback(newId, oldId)
      }
    })
  }

  return {
    // State
    currentTenant,
    currentTenantId,
    currentTenantName,
    tenants,
    canSwitchTenant,
    isTenantReady,
    isLoading,

    // Actions
    switchTenant,
    onTenantChange,
  }
}
