<script setup>
/**
 * 정보 표시용 Description List 컴포넌트
 * - 라벨(dt) + 값(dd) 형태의 정보 목록
 * - 라벨 너비 조절 가능
 * - 슬롯을 통한 커스텀 값 렌더링 지원
 */

const props = defineProps({
  // 표시할 아이템 배열 [{ key, label, value, show }]
  items: {
    type: Array,
    default: () => [],
  },
  // 라벨 너비 (Tailwind width class)
  labelWidth: {
    type: String,
    default: 'w-24',
  },
  // 행 간격 (Tailwind space-y class)
  spacing: {
    type: String,
    default: 'space-y-3',
  },
})

// show 조건이 없거나 true인 아이템만 필터링
const visibleItems = computed(() => {
  return props.items.filter(item => item.show !== false)
})
</script>

<template>
  <dl :class="spacing">
    <div
      v-for="item in visibleItems"
      :key="item.key || item.label"
      class="flex"
    >
      <dt :class="[labelWidth, 'text-sm text-neutral-500 flex-shrink-0']">
        {{ item.label }}
      </dt>
      <dd class="text-sm text-neutral-900">
        <!-- 슬롯이 있으면 슬롯 사용, 없으면 value 표시 -->
        <slot :name="`value-${item.key}`" :item="item">
          {{ item.value }}
        </slot>
      </dd>
    </div>
    <!-- 추가 슬롯 (동적 아이템 외 추가 항목) -->
    <slot />
  </dl>
</template>
