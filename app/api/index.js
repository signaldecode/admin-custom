/**
 * API Endpoints
 * 관리자 API 엔드포인트 정의
 * - 테넌트 스코프 기반
 */

/**
 * Auth API
 */
export const authApi = {
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/me',
}

/**
 * Orders API
 */
export const ordersApi = {
  list: '/orders',
  detail: (id) => `/orders/${id}`,
  updateStatus: (id) => `/orders/${id}/status`,
}

/**
 * Products API
 */
export const productsApi = {
  list: '/products',
  detail: (id) => `/products/${id}`,
  create: '/products',
  update: (id) => `/products/${id}`,
  delete: (id) => `/products/${id}`,
}

/**
 * Users API
 */
export const usersApi = {
  list: '/users',
  detail: (id) => `/users/${id}`,
  update: (id) => `/users/${id}`,
}

/**
 * Contents API
 */
export const contentsApi = {
  banners: {
    list: '/contents/banners',
    detail: (id) => `/contents/banners/${id}`,
  },
  notices: {
    list: '/contents/notices',
    detail: (id) => `/contents/notices/${id}`,
  },
}

/**
 * Statistics API
 */
export const statisticsApi = {
  dashboard: '/statistics/dashboard',
  sales: '/statistics/sales',
  orders: '/statistics/orders',
}
