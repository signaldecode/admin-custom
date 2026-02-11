/**
 * Global Auth Middleware
 * 모든 페이지에서 실행되는 인증 미들웨어
 * - 앱 시작 시 자동 로그인 체크
 * - 라우트별 인증 요구사항 처리
 * - 카탈로그 데이터 (카테고리, 태그) 로드
 */
import { useAuthStore } from '~/stores/auth'
import { useCatalogStore } from '~/stores/catalog'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // 서버 사이드에서는 실행하지 않음
  if (import.meta.server) return

  const { $api } = useNuxtApp()
  const authStore = useAuthStore()
  const catalogStore = useCatalogStore()

  // 인증 체크가 필요 없는 페이지
  const publicPaths = ['/login']
  const isPublicPage = publicPaths.some((path) => to.path === path)

  // 루트 경로 처리
  if (to.path === '/') {
    // 인증 확인이 안된 경우 먼저 확인
    if (!authStore.isAuthChecked) {
      try {
        await authStore.fetchUser()
      } catch {
        // 에러 무시
      }
    }

    // 인증 상태에 따라 리다이렉트
    return navigateTo(authStore.isAuthenticated ? '/admin' : '/login')
  }

  // 이미 인증 확인이 완료된 경우
  if (authStore.isAuthChecked) {
    // 미인증 상태에서 보호된 페이지 접근
    if (!authStore.isAuthenticated && !isPublicPage) {
      return navigateTo('/login')
    }

    // 인증 상태에서 로그인 페이지 접근
    if (authStore.isAuthenticated && to.path === '/login') {
      return navigateTo('/admin')
    }

    return
  }

  // 최초 인증 확인 (자동 로그인)
  try {
    const result = await authStore.fetchUser()

    if (result.success) {
      // 인증 성공 - 카탈로그 데이터 로드
      if (catalogStore.categories.length === 0) {
        await catalogStore.fetchCatalogData($api)
      }

      // 로그인 페이지면 admin으로
      if (to.path === '/login') {
        return navigateTo('/admin')
      }
    } else {
      // 인증 실패 - 보호된 페이지면 로그인으로
      if (!isPublicPage) {
        return navigateTo('/login')
      }
    }
  } catch (error) {
    console.error('Auth check error:', error)

    // 에러 발생 시 보호된 페이지는 로그인으로
    if (!isPublicPage) {
      return navigateTo('/login')
    }
  }
})
