/**
 * Auth Store
 * JWT HttpOnly Cookie 기반 인증 상태 관리
 * - 프론트에서 토큰에 직접 접근하지 않음
 * - 인증 상태는 /auth/me API 응답으로 판단
 */
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // 유저 정보
    user: null,
    // 인증 상태 (null: 확인 전, true: 인증됨, false: 미인증)
    isAuthenticated: null,
    // 권한 목록
    permissions: [],
    // 로딩 상태
    isLoading: false,
    // 에러
    error: null,
  }),

  getters: {
    /**
     * 인증 확인 완료 여부
     */
    isAuthChecked: (state) => state.isAuthenticated !== null,

    /**
     * 유저 이름
     */
    userName: (state) => state.user?.name || '',

    /**
     * 유저 이메일
     */
    userEmail: (state) => state.user?.email || '',

    /**
     * 특정 권한 보유 여부
     */
    hasPermission: (state) => (permission) => {
      return state.permissions.includes(permission)
    },

    /**
     * 허용된 테넌트 목록 (멀티테넌트 확장 대비)
     */
    allowedTenants: (state) => state.user?.tenants || [],
  },

  actions: {
    /**
     * 로그인
     * @param {Object} credentials - { email, password }
     */
    async login(credentials) {
      this.isLoading = true
      this.error = null

      try {
        const { $api } = useNuxtApp()
        const loginResponse = await $api.post('/auth/login', credentials)

        console.log('Login response:', loginResponse)

        // Safari 쿠키 설정 대기
        await new Promise(resolve => setTimeout(resolve, 100))

        // 로그인 성공 후 유저 정보 조회
        await this.fetchUser()

        return { success: true }
      } catch (error) {
        this.error = error.data?.error?.message || error.data?.message || error.message || '로그인에 실패했습니다.'
        this.isAuthenticated = false
        return { success: false, error: this.error }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 로그아웃
     */
    async logout() {
      this.isLoading = true

      try {
        const { $api } = useNuxtApp()
        await $api.post('/auth/logout')
      } catch (error) {
        // 로그아웃 실패해도 클라이언트 상태는 초기화
        console.error('Logout error:', error)
      } finally {
        this.reset()
        this.isLoading = false

        // 로그인 페이지로 이동
        const router = useRouter()
        router.push('/login')
      }
    },

    /**
     * 현재 유저 정보 조회 (자동 로그인용)
     */
    async fetchUser() {
      this.isLoading = true
      this.error = null

      try {
        const { $api } = useNuxtApp()
        console.log('Fetching /auth/me...')
        console.log('Document cookies:', document.cookie)
        const response = await $api.get('/auth/me')
        console.log('Me response:', response)

        // API 응답: { success, data: MyInfoResponse, error, message }
        const userData = response.data
        this.user = userData
        this.permissions = userData?.permissions || []
        this.isAuthenticated = true

        // 테넌트 스토어 초기화 (멀티테넌트 확장 대비)
        const tenantStore = useTenantStore()
        if (userData?.currentTenant) {
          tenantStore.setCurrentTenant(userData.currentTenant)
        }
        if (userData?.tenants) {
          tenantStore.setTenants(userData.tenants)
        }

        return { success: true }
      } catch (error) {
        this.isAuthenticated = false
        this.error = error.data?.error?.message || error.data?.message || error.message

        // 401인 경우 로그인 페이지로
        if (error.status === 401 || error.statusCode === 401) {
          return { success: false, unauthorized: true }
        }

        return { success: false, error: this.error }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 상태 초기화
     */
    reset() {
      this.user = null
      this.isAuthenticated = false
      this.permissions = []
      this.error = null

      // 테넌트 스토어도 초기화
      const tenantStore = useTenantStore()
      tenantStore.reset()

      // 카탈로그 스토어도 초기화
      const catalogStore = useCatalogStore()
      catalogStore.reset()
    },
  },
})

// 순환 참조 방지를 위한 lazy import
function useTenantStore() {
  return useNuxtApp().$pinia.state.value.tenant
    ? useNuxtApp().$pinia._s.get('tenant')
    : { setCurrentTenant: () => {}, setTenants: () => {}, reset: () => {} }
}

function useCatalogStore() {
  return useNuxtApp().$pinia.state.value.catalog
    ? useNuxtApp().$pinia._s.get('catalog')
    : { reset: () => {} }
}
