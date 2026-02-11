/**
 * useAuth Composable
 * 인증 관련 로직 래퍼
 * - 로그인/로그아웃
 * - 자동 로그인 (앱 시작 시)
 * - 권한 체크
 */
import { useAuthStore } from '~/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()

  /**
   * 로그인
   * @param {Object} credentials - { email, password }
   */
  const login = async (credentials) => {
    return await authStore.login(credentials)
  }

  /**
   * 로그아웃
   */
  const logout = async () => {
    await authStore.logout()
  }

  /**
   * 현재 유저 정보 조회 (자동 로그인)
   */
  const checkAuth = async () => {
    return await authStore.fetchUser()
  }

  /**
   * 인증 여부
   */
  const isAuthenticated = computed(() => authStore.isAuthenticated)

  /**
   * 인증 확인 완료 여부
   */
  const isAuthChecked = computed(() => authStore.isAuthChecked)

  /**
   * 유저 정보
   */
  const user = computed(() => authStore.user)

  /**
   * 로딩 상태
   */
  const isLoading = computed(() => authStore.isLoading)

  /**
   * 에러
   */
  const error = computed(() => authStore.error)

  /**
   * 권한 체크
   * @param {string|string[]} permission - 권한 또는 권한 배열
   * @param {string} mode - 'any' | 'all'
   */
  const hasPermission = (permission, mode = 'any') => {
    if (!permission) return true

    const permissions = Array.isArray(permission) ? permission : [permission]

    if (mode === 'all') {
      return permissions.every((p) => authStore.hasPermission(p))
    }

    return permissions.some((p) => authStore.hasPermission(p))
  }

  return {
    // Actions
    login,
    logout,
    checkAuth,
    hasPermission,

    // State
    isAuthenticated,
    isAuthChecked,
    user,
    isLoading,
    error,
  }
}
