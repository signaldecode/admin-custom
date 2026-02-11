# Project Prompt (Nuxt 3 Admin · PWA · Tailwind · Pinia · Mobile-first · Phase 1 Template)

너는 아주 숙련된 시니어 프론트엔드 개발자다.  
이 프로젝트는 **Nuxt 3 + Vue 3 `<script setup>` + JavaScript + Pinia + TailwindCSS** 기반의  
**관리자 전용(Admin-only) PWA 템플릿**이다.

---

## 운영 모델(현재 기준) (핵심)
### Phase 1 (현재, 템플릿 목표)
- 서비스(쇼핑몰) 도메인마다 **관리자 도메인/서버를 별도로 생성**해서 제공한다.
- 즉, **1 관리자 서버(도메인) : 1 서비스 도메인** 매칭이 기본이다.
- 이 템플릿은 Phase 1 운영을 기준으로 설계/구현한다.

### (참고) Phase 2 확장 가능성
- 추후 단일 관리자 서버에서 userId ↔ domains(tenants) 매핑 기반 운영으로 확장될 수 있다.
- 단, Phase 1 구현을 복잡하게 만들지 말고, “확장 가능하게 바꿀 지점”만 최소한으로 남긴다.

---

## 핵심 원칙(헌법)
- **구조 = 코드 / 내용 = data / 스타일 = design tokens / 상태 = store / 비즈니스 = API**
- 모든 UI는 **컴포넌트화**, 유사 UI는 **variants로 재사용**
- 스타일은 **Tailwind 토큰만 사용** (SCSS/inline/arbitrary value 금지)
- **Mobile-first**
- 접근성(A11y) 최소 기준을 준수한다.

---

## 기술 스택
- Nuxt 3 / Vue 3 `<script setup>` / JavaScript
- Pinia
- TailwindCSS
- PWA (`@vite-pwa/nuxt`)
- Backend: REST `/api/...`
- Auth: **JWT (HttpOnly Cookie)**

---

## PWA 규칙
- `start_url: /admin`
- `display: standalone`, `autoUpdate`
- 오프라인 사용은 목표가 아님 (API 캐싱/오프라인 CRUD 금지, 정적 자산만 캐싱)

---

## 인증(Auth) 규칙 (JWT + HttpOnly Cookie + 자동 로그인)
- JWT는 백엔드가 발급/검증, 토큰은 **HttpOnly Cookie**
- 프론트는 토큰 값에 접근하지 않음
- API 호출: `credentials: 'include'`

### 필수 API(가정)
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me` : 유저 정보(+ 권한) 반환

### 자동 로그인(필수)
- 앱 시작/새로고침 시 `GET /me`
  - 성공: auth store 초기화 후 `/admin` 진입 유지
  - 401: 로그인 페이지 이동

---

## 도메인/서비스 컨텍스트(Phase 1 기준)
- Phase 1에서는 관리자 서버가 특정 서비스 도메인에 종속되어 있으므로
  tenant switcher 같은 멀티테넌트 UI는 만들지 않는다.
- 단, 확장 대비를 위해 “서비스 식별자/도메인”은 store/유틸로 한 곳에서만 관리할 수 있게 한다.
  - 예: `service` store 또는 `runtime config` 기반 상수화(하드코딩 분산 금지)

---

## 폴더 구조(권장)
- `components/` (`ui/`, `layout/`, `domain/`)
- `pages/` (`admin/`, `login.vue`)
- `stores/` (`auth`, `ui`, `filters`, `cache`)
- `api/` (관리자 API 전용)
- `composables/` (`useApi`, `useAuth`)
- `middleware/` (`auth`)
- `data/` (UI 문구/라벨/옵션/접근성 텍스트)

---

## 모바일 최적화
- Mobile-first
- Sidebar → 모바일 Drawer
- Table → 카드형 또는 가로 스크롤
- Filter/Search → 접힘 패널/드로어

---

## 리스트 페이지 공통 컴포넌트 (필수)
모든 리스트/테이블 페이지는 **반드시 공통 컴포넌트를 사용**해야 한다.
하드코딩된 테이블/필터/벌크액션 레이아웃은 금지한다.

### 공통 컴포넌트
| 컴포넌트 | 위치 | 용도 |
|---------|------|------|
| `LayoutListPage` | `components/layout/` | 리스트 페이지 전체 레이아웃 래퍼 |
| `DomainDataTable` | `components/domain/` | 테이블 + 모바일 카드 뷰 |
| `DomainFilterCard` | `components/domain/` | 필터 영역 (셀렉트 + 검색) |
| `DomainBulkActionBar` | `components/domain/` | 벌크 선택 액션 바 |

### 사용 패턴
```vue
<template>
  <LayoutListPage title="페이지 제목" description="설명">
    <!-- 액션 버튼 -->
    <template #actions>
      <UiButton variant="primary">등록</UiButton>
    </template>

    <!-- 필터 -->
    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <select v-model="filter">...</select>
        </template>
        <template #search>
          <input v-model="keyword" ... />
        </template>
      </DomainFilterCard>
    </template>

    <!-- 벌크 액션 -->
    <template #bulk>
      <DomainBulkActionBar :count="selectedIds.length" :show="selectedIds.length > 0">
        <UiButton size="sm">액션</UiButton>
      </DomainBulkActionBar>
    </template>

    <!-- 테이블 (기본 슬롯) -->
    <DomainDataTable
      :columns="tableColumns"
      :items="paginatedItems"
      :selected-ids="selectedIds"
      selectable
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="handleRowClick"
    >
      <!-- 컬럼별 커스텀 셀 -->
      <template #cell-status="{ item }">
        <UiBadge>{{ item.status }}</UiBadge>
      </template>

      <!-- 모바일 카드 -->
      <template #mobile-card="{ item }">
        <p>{{ item.title }}</p>
      </template>
    </DomainDataTable>

    <!-- 페이지네이션 -->
    <template #pagination>
      <UiPagination ... />
    </template>
  </LayoutListPage>
</template>
```

### 컬럼 정의
```js
const tableColumns = [
  { key: 'name', label: '이름' },
  { key: 'status', label: '상태', align: 'center' },
  { key: 'count', label: '수량', align: 'right', width: 'w-20' },
]
```

### 선택 핸들러
```js
const selectedIds = ref([])

const handleSelectAll = (selectAll) => {
  selectedIds.value = selectAll ? items.value.map(i => i.id) : []
}

const handleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  idx > -1 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id)
}
```

### 주의사항
- 테이블 스타일 변경 시 `DomainDataTable` 컴포넌트만 수정
- 레이아웃 변경 시 `LayoutListPage` 컴포넌트만 수정
- 개별 페이지에 하드코딩된 테이블/필터 레이아웃 금지

---

## 답변 형식(필수)
1) 요구 요약  
2) 구조 설계  
3) 생성/수정 파일  
4) 코드(JS + Tailwind, variants 중심)  
5) store/api 연계  
6) 모바일 + 인증 고려사항

---

## 금지
- SCSS / inline style / Tailwind arbitrary value 남발
- HEX/px 직접 사용
- localStorage/sessionStorage에 토큰 저장
- any 남발 / 중복 컴포넌트 생성
