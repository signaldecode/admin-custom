/**
 * useBreakpoint Composable
 * 반응형 브레이크포인트 감지
 * - Tailwind 브레이크포인트와 동기화
 * - UI 스토어와 연동
 */
import { useUiStore } from '~/stores/ui'

// Tailwind 브레이크포인트 값 (px)
const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

export function useBreakpoint() {
  const uiStore = useUiStore()

  const currentBreakpoint = ref('lg')
  const windowWidth = ref(0)

  /**
   * 현재 브레이크포인트 계산
   */
  const calculateBreakpoint = () => {
    const width = window.innerWidth
    windowWidth.value = width

    if (width >= BREAKPOINTS['2xl']) return '2xl'
    if (width >= BREAKPOINTS.xl) return 'xl'
    if (width >= BREAKPOINTS.lg) return 'lg'
    if (width >= BREAKPOINTS.md) return 'md'
    if (width >= BREAKPOINTS.sm) return 'sm'
    return 'xs'
  }

  /**
   * 리사이즈 핸들러
   */
  const handleResize = () => {
    const bp = calculateBreakpoint()
    currentBreakpoint.value = bp
    uiStore.updateBreakpoint(bp)
  }

  /**
   * 특정 브레이크포인트 이상인지 확인
   * @param {string} breakpoint
   */
  const isAbove = (breakpoint) => {
    return windowWidth.value >= BREAKPOINTS[breakpoint]
  }

  /**
   * 특정 브레이크포인트 이하인지 확인
   * @param {string} breakpoint
   */
  const isBelow = (breakpoint) => {
    return windowWidth.value < BREAKPOINTS[breakpoint]
  }

  /**
   * 모바일 여부 (sm 이하)
   */
  const isMobile = computed(() => isBelow('md'))

  /**
   * 태블릿 여부 (md~lg)
   */
  const isTablet = computed(() => isAbove('md') && isBelow('lg'))

  /**
   * 데스크탑 여부 (lg 이상)
   */
  const isDesktop = computed(() => isAbove('lg'))

  // 마운트 시 이벤트 리스너 등록
  onMounted(() => {
    handleResize()
    window.addEventListener('resize', handleResize, { passive: true })
  })

  // 언마운트 시 이벤트 리스너 제거
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    currentBreakpoint: computed(() => currentBreakpoint.value),
    windowWidth: computed(() => windowWidth.value),
    isAbove,
    isBelow,
    isMobile,
    isTablet,
    isDesktop,
  }
}
