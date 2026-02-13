/**
 * Navigation Items
 * 사이드바/드로어 네비게이션 메뉴 데이터
 * - 권한 기반 필터링 가능
 * - 아이콘: Heroicons (SVG)
 */

export const navigationItems = [
  {
    id: 'dashboard',
    label: '대시보드',
    to: '/admin',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
    // permission: 'dashboard.view', // 권한 필터링 예시
  },
  {
    id: 'orders',
    label: '주문 관리',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>',
    children: [
      { id: 'orders-list', label: '주문 목록', to: '/admin/orders' },
      { id: 'orders-claims', label: '교환/반품/취소', to: '/admin/orders/claims' },
    ],
  },
  {
    id: 'products',
    label: '상품 관리',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
    children: [
      { id: 'products-new', label: '상품 등록', to: '/admin/products/new' },
      { id: 'products-list', label: '상품 목록', to: '/admin/products' },
      { id: 'products-categories', label: '카테고리', to: '/admin/products/categories' },
    ],
  },
  {
    id: 'users',
    label: '회원 관리',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
    children: [
      { id: 'users-list', label: '회원 목록', to: '/admin/users' },
      // { id: 'users-grades', label: '회원 등급', to: '/admin/users/grades' },
    ],
  },
  {
    id: 'contents',
    label: '콘텐츠 관리',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>',
    children: [
      { id: 'contents-header', label: '헤더 관리', to: '/admin/contents/header' },
      { id: 'contents-banners', label: '배너 관리', to: '/admin/contents/banners' },
      { id: 'contents-popups', label: '팝업 관리', to: '/admin/contents/popups' },
      { id: 'contents-notices', label: '공지사항', to: '/admin/contents/notices' },
      { id: 'contents-faq', label: 'FAQ', to: '/admin/contents/faq' },
      { id: 'contents-qna', label: 'Q&A', to: '/admin/contents/qna' },
      { id: 'contents-reviews', label: '리뷰 관리', to: '/admin/contents/reviews' },
    ],
  },
  {
    id: 'promotions',
    label: '프로모션 관리',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    children: [
      { id: 'promotions-discounts', label: '할인 관리', to: '/admin/promotions/discounts' },
      // { id: 'promotions-coupons', label: '쿠폰 관리', to: '/admin/promotions/coupons' },
    ],
  },
  // {
  //   id: 'statistics',
  //   label: '통계',
  //   to: '/admin/statistics',
  //   icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
  // },
  {
    id: 'settings',
    label: '설정',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
    children: [
      { id: 'settings-general', label: '기본 설정', to: '/admin/settings' },
      { id: 'settings-policies', label: '정책 설정', to: '/admin/settings/policies' },
      // { id: 'settings-admins', label: '관리자 계정', to: '/admin/settings/admins' },
    ],
  },
]

/**
 * 권한 기반 네비게이션 필터링
 * @param {string[]} permissions - 유저 권한 목록
 */
export function filterNavigationByPermission(permissions) {
  const filterItem = (item) => {
    // 권한 체크
    if (item.permission && !permissions.includes(item.permission)) {
      return null
    }

    // 자식 항목 필터링
    if (item.children) {
      const filteredChildren = item.children
        .map(filterItem)
        .filter(Boolean)

      if (filteredChildren.length === 0) {
        return null
      }

      return { ...item, children: filteredChildren }
    }

    return item
  }

  return navigationItems.map(filterItem).filter(Boolean)
}
