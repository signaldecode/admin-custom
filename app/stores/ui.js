/**
 * UI Store
 * 전역 UI 상태 관리
 * - Sidebar/Drawer 상태
 * - 모바일 메뉴 상태
 * - Toast/Modal 상태
 * - 테마 설정 (추후 확장)
 */
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    // 사이드바 상태
    sidebar: {
      isOpen: true,           // 사이드바 펼침 여부
      isCollapsed: false,     // 사이드바 접힘 여부 (아이콘만 표시)
    },
    // 모바일 드로어 상태
    drawer: {
      isOpen: false,
      component: null,        // 동적 드로어 컴포넌트
      props: {},
    },
    // 모달 상태
    modal: {
      isOpen: false,
      component: null,
      props: {},
    },
    // 토스트 메시지 큐
    toasts: [],
    // 로딩 오버레이
    isGlobalLoading: false,
    // 브레이크포인트 (반응형)
    breakpoint: 'lg',
    // 모바일 여부
    isMobile: false,
  }),

  getters: {
    /**
     * 사이드바 표시 여부
     */
    showSidebar: (state) => {
      // 모바일에서는 drawer로 전환
      if (state.isMobile) return false
      return state.sidebar.isOpen
    },

    /**
     * 사이드바 너비 클래스
     */
    sidebarWidthClass: (state) => {
      if (state.isMobile) return 'w-0'
      if (state.sidebar.isCollapsed) return 'w-[4.5rem]'
      return 'w-sidebar'
    },

    /**
     * 활성 토스트 목록
     */
    activeToasts: (state) => state.toasts.slice(0, 5),
  },

  actions: {
    /**
     * 사이드바 토글
     */
    toggleSidebar() {
      if (this.isMobile) {
        this.drawer.isOpen = !this.drawer.isOpen
      } else {
        this.sidebar.isOpen = !this.sidebar.isOpen
      }
    },

    /**
     * 사이드바 접기/펼치기 토글
     */
    toggleSidebarCollapse() {
      this.sidebar.isCollapsed = !this.sidebar.isCollapsed
    },

    /**
     * 사이드바 열기
     */
    openSidebar() {
      if (this.isMobile) {
        this.drawer.isOpen = true
      } else {
        this.sidebar.isOpen = true
      }
    },

    /**
     * 사이드바 닫기
     */
    closeSidebar() {
      if (this.isMobile) {
        this.drawer.isOpen = false
      } else {
        this.sidebar.isOpen = false
      }
    },

    /**
     * 드로어 열기
     * @param {Object} options - { component, props }
     */
    openDrawer(options = {}) {
      this.drawer.isOpen = true
      this.drawer.component = options.component || null
      this.drawer.props = options.props || {}
    },

    /**
     * 드로어 닫기
     */
    closeDrawer() {
      this.drawer.isOpen = false
      // 애니메이션 후 컴포넌트 정리
      setTimeout(() => {
        this.drawer.component = null
        this.drawer.props = {}
      }, 300)
    },

    /**
     * 모든 드로어 닫기
     */
    closeAllDrawers() {
      this.drawer.isOpen = false
      this.drawer.component = null
      this.drawer.props = {}
    },

    /**
     * 모달 열기
     * @param {Object} options - { component, props }
     */
    openModal(options = {}) {
      this.modal.isOpen = true
      this.modal.component = options.component || null
      this.modal.props = options.props || {}
    },

    /**
     * 모달 닫기
     */
    closeModal() {
      this.modal.isOpen = false
      setTimeout(() => {
        this.modal.component = null
        this.modal.props = {}
      }, 200)
    },

    /**
     * 토스트 메시지 표시
     * @param {Object} toast - { type, message, duration }
     */
    showToast(toast) {
      const id = Date.now() + Math.random()
      const newToast = {
        id,
        type: toast.type || 'info', // success, error, warning, info
        message: toast.message,
        duration: toast.duration || 3000,
      }

      this.toasts.push(newToast)

      // 자동 제거
      setTimeout(() => {
        this.removeToast(id)
      }, newToast.duration)
    },

    /**
     * 토스트 제거
     * @param {number} id
     */
    removeToast(id) {
      const index = this.toasts.findIndex((t) => t.id === id)
      if (index > -1) {
        this.toasts.splice(index, 1)
      }
    },

    /**
     * 전역 로딩 시작
     */
    startLoading() {
      this.isGlobalLoading = true
    },

    /**
     * 전역 로딩 종료
     */
    stopLoading() {
      this.isGlobalLoading = false
    },

    /**
     * 브레이크포인트 업데이트
     * @param {string} breakpoint
     */
    updateBreakpoint(breakpoint) {
      this.breakpoint = breakpoint
      this.isMobile = ['xs', 'sm'].includes(breakpoint)

      // 모바일로 전환 시 사이드바 닫기
      if (this.isMobile && this.sidebar.isOpen) {
        this.sidebar.isOpen = false
      }
    },
  },
})
