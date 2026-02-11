/**
 * Auth Middleware
 * 인증이 필요한 페이지 보호
 * - 앱 시작 시 자동 로그인 (GET /me)
 * - 미인증 시 로그인 페이지로 리다이렉트
 */
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // 클라이언트에서만 실행
  if (import.meta.server) return

  const authStore = useAuthStore()

  // 이미 인증 확인이 완료된 경우
  if (authStore.isAuthChecked) {
    // 미인증 상태에서 보호된 페이지 접근 시
    if (!authStore.isAuthenticated && to.path.startsWith('/admin')) {
      return navigateTo('/login')
    }

    // 인증 상태에서 로그인 페이지 접근 시
    if (authStore.isAuthenticated && to.path === '/login') {
      return navigateTo('/admin')
    }

    return
  }

  // 인증 확인 (자동 로그인)
  try {
    const result = await authStore.fetchUser()

    if (result.success) {
      // 인증 성공
      if (to.path === '/login') {
        return navigateTo('/admin')
      }
    } else {
      // 인증 실패
      if (to.path.startsWith('/admin')) {
        return navigateTo('/login')
      }
    }
  } catch (error) {
    // 에러 발생 시 미인증 처리
    console.error('Auth check failed:', error)
    if (to.path.startsWith('/admin')) {
      return navigateTo('/login')
    }
  }
})
