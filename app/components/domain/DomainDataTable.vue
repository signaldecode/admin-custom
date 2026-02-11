<script setup>
/**
 * Domain Data Table
 * 리스트 페이지 공통 테이블 컴포넌트
 * - 데스크탑: 테이블 뷰 (sticky header)
 * - 모바일: 카드 뷰
 * - 빈 상태 처리
 */

const props = defineProps({
  columns: {
    type: Array,
    required: true,
    // [{ key: 'name', label: '이름', align: 'left', width: 'w-40' }]
  },
  items: {
    type: Array,
    required: true,
  },
  selectedIds: {
    type: Array,
    default: () => [],
  },
  selectable: {
    type: Boolean,
    default: false,
  },
  idKey: {
    type: String,
    default: 'id',
  },
  emptyTitle: {
    type: String,
    default: '데이터가 없습니다',
  },
  emptyDescription: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select', 'select-all', 'row-click'])

// 전체 선택 상태
const isAllSelected = computed(() => {
  return props.items.length > 0 && props.selectedIds.length === props.items.length
})

const isPartialSelected = computed(() => {
  return props.selectedIds.length > 0 && props.selectedIds.length < props.items.length
})

// 아이템 ID 가져오기
const getItemId = (item) => item[props.idKey]

// 행 선택 여부
const isSelected = (item) => props.selectedIds.includes(getItemId(item))

// 전체 선택/해제
const toggleSelectAll = () => {
  emit('select-all', !isAllSelected.value)
}

// 개별 선택
const toggleSelect = (item) => {
  emit('select', getItemId(item))
}

// 행 클릭
const handleRowClick = (item) => {
  emit('row-click', item)
}

// 정렬 클래스
const getAlignClass = (align) => {
  switch (align) {
    case 'center': return 'text-center'
    case 'right': return 'text-right'
    default: return 'text-left'
  }
}
</script>

<template>
  <div class="flex-1 min-h-0 flex flex-col overflow-hidden bg-white rounded-lg border border-neutral-200 shadow-sm">
    <!-- Desktop Table -->
    <div class="hidden md:flex flex-col flex-1 min-h-0 overflow-auto">
      <table class="w-full">
        <thead class="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
          <tr>
            <!-- Checkbox Column -->
            <th v-if="selectable" class="px-4 py-3 text-left w-12">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isPartialSelected"
                class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                @change="toggleSelectAll"
              >
            </th>
            <!-- Dynamic Columns -->
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'px-4 py-3 text-xs font-medium text-neutral-500 uppercase',
                getAlignClass(col.align),
                col.width || '',
              ]"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100">
          <tr
            v-for="item in items"
            :key="getItemId(item)"
            :class="[
              'hover:bg-neutral-50 transition-colors',
              isSelected(item) ? 'bg-primary-50' : '',
            ]"
          >
            <!-- Checkbox Cell -->
            <td v-if="selectable" class="px-4 py-3" @click.stop>
              <input
                type="checkbox"
                :checked="isSelected(item)"
                class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                @change="toggleSelect(item)"
              >
            </td>
            <!-- Dynamic Cells -->
            <td
              v-for="col in columns"
              :key="col.key"
              :class="['px-4 py-3', getAlignClass(col.align)]"
              @click="handleRowClick(item)"
            >
              <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
                <span class="text-sm text-neutral-600">{{ item[col.key] }}</span>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden flex flex-col flex-1 min-h-0 overflow-auto divide-y divide-neutral-100">
      <div
        v-for="item in items"
        :key="getItemId(item)"
        :class="[
          'p-4 transition-colors',
          isSelected(item) ? 'bg-primary-50' : '',
        ]"
      >
        <div class="flex items-start gap-3">
          <!-- Checkbox -->
          <input
            v-if="selectable"
            type="checkbox"
            :checked="isSelected(item)"
            class="mt-1 w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            @change="toggleSelect(item)"
          >
          <!-- Card Content -->
          <div class="flex-1 min-w-0" @click="handleRowClick(item)">
            <slot name="mobile-card" :item="item">
              <!-- 기본 모바일 카드 레이아웃 -->
              <div class="text-sm font-medium text-neutral-900">
                {{ item[columns[0]?.key] }}
              </div>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <UiEmpty
      v-if="items.length === 0"
      :title="emptyTitle"
      :description="emptyDescription"
    >
      <template v-if="$slots.empty" #action>
        <slot name="empty" />
      </template>
    </UiEmpty>
  </div>
</template>
