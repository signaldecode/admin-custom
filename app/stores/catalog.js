import { defineStore } from 'pinia'

export const useCatalogStore = defineStore('catalog', () => {
  // 상태
  const categories = ref([])
  const tags = ref([])
  const carriers = ref([]) // 택배사 목록
  const grades = ref([]) // 회원 등급 목록
  const isLoading = ref(false)
  const isLoaded = ref(false)

  /**
   * 카테고리, 태그, 택배사 데이터 로드
   * 로그인 후 한 번만 호출됨 (force=true로 강제 리로드 가능)
   */
  const fetchCatalogData = async ($api, force = false) => {
    // 이미 로드된 경우 스킵 (강제가 아니면)
    if (!force && isLoaded.value) {
      return
    }

    isLoading.value = true
    try {
      // Promise.all로 병렬 요청
      const [categoriesRes, tagsRes, carriersRes, gradesRes] = await Promise.all([
        $api.get('/admin/categories'),
        $api.get('/admin/tags'),
        $api.get('/admin/delivery/carriers'),
        $api.get('/admin/users/grades'),
      ])

      // 응답 데이터 저장
      categories.value = categoriesRes.data || categoriesRes
      tags.value = tagsRes.data || tagsRes
      carriers.value = carriersRes.data || carriersRes
      grades.value = gradesRes.data || gradesRes
      isLoaded.value = true

      console.log('[CatalogStore] 데이터 로드 완료:', {
        categoriesCount: categories.value.length,
        tagsCount: tags.value.length,
        carriersCount: carriers.value.length,
        gradesCount: grades.value.length,
      })
    } catch (error) {
      console.error('[CatalogStore] 데이터 로드 실패:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 카테고리만 리로드
   */
  const refreshCategories = async ($api) => {
    try {
      const response = await $api.get('/admin/categories')
      categories.value = response.data || response
      console.log('[CatalogStore] 카테고리 갱신 완료')
    } catch (error) {
      console.error('[CatalogStore] 카테고리 갱신 실패:', error)
      throw error
    }
  }

  /**
   * 태그만 리로드
   */
  const refreshTags = async ($api) => {
    try {
      const response = await $api.get('/admin/tags')
      tags.value = response.data || response
      console.log('[CatalogStore] 태그 갱신 완료')
    } catch (error) {
      console.error('[CatalogStore] 태그 갱신 실패:', error)
      throw error
    }
  }

  /**
   * 회원 등급만 리로드
   */
  const refreshGrades = async ($api) => {
    try {
      const response = await $api.get('/admin/users/grades')
      grades.value = response.data || response
      console.log('[CatalogStore] 회원 등급 갱신 완료')
    } catch (error) {
      console.error('[CatalogStore] 회원 등급 갱신 실패:', error)
      throw error
    }
  }

  /**
   * 카테고리를 플랫하게 변환 (셀렉트 옵션용)
   * @returns {Array<{id, name, isParent?, parentId?}>}
   */
  const getCategoryOptions = () => {
    const options = []
    categories.value.forEach((parent) => {
      options.push({ id: parent.id, name: parent.name, isParent: true })
      if (parent.children) {
        parent.children.forEach((child) => {
          options.push({ id: child.id, name: `  ${child.name}`, parentId: parent.id })
        })
      }
    })
    return options
  }

  /**
   * 카테고리 ID로 이름 찾기
   */
  const getCategoryNameById = (id) => {
    for (const parent of categories.value) {
      if (parent.id === id) return parent.name
      if (parent.children) {
        const child = parent.children.find((c) => c.id === id)
        if (child) return child.name
      }
    }
    return null
  }

  /**
   * 카테고리 ID로 전체 경로 찾기 (대분류 > 소분류)
   */
  const getCategoryPathById = (id) => {
    for (const parent of categories.value) {
      if (parent.id === id) return parent.name
      if (parent.children) {
        const child = parent.children.find((c) => c.id === id)
        if (child) return `${parent.name} > ${child.name}`
      }
    }
    return null
  }

  /**
   * 특정 태그명으로 태그 찾기
   */
  const getTagByName = (name) => {
    return tags.value.find((tag) => tag.name === name)
  }

  /**
   * 태그 ID로 태그 찾기
   */
  const getTagById = (id) => {
    return tags.value.find((tag) => tag.id === id)
  }

  /**
   * 택배사 ID로 이름 찾기
   */
  const getCarrierNameById = (id) => {
    const carrier = carriers.value.find((c) => c.id === id)
    return carrier?.name || null
  }

  /**
   * 회원 등급 ID로 찾기
   */
  const getGradeById = (id) => {
    return grades.value.find((g) => g.grade_id === id)
  }

  /**
   * 회원 등급 ID로 이름 찾기
   */
  const getGradeNameById = (id) => {
    const grade = grades.value.find((g) => g.grade_id === id)
    return grade?.name || null
  }

  /**
   * 스토어 초기화 (로그아웃 시)
   */
  const reset = () => {
    categories.value = []
    tags.value = []
    carriers.value = []
    grades.value = []
    isLoaded.value = false
  }

  return {
    // 상태
    categories,
    tags,
    carriers,
    grades,
    isLoading,
    isLoaded,
    // 액션
    fetchCatalogData,
    refreshCategories,
    refreshTags,
    refreshGrades,
    reset,
    // 헬퍼
    getCategoryOptions,
    getCategoryNameById,
    getCategoryPathById,
    getTagByName,
    getTagById,
    getCarrierNameById,
    getGradeById,
    getGradeNameById,
  }
}, {
  // localStorage에 저장 (새로고침 시에도 유지)
  persist: {
    key: 'catalog',
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    pick: ['categories', 'tags', 'carriers', 'grades', 'isLoaded'], // 저장할 상태만 선택
  },
})
