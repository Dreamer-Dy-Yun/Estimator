# Product Drawer Image Contract

Last updated: 2026-06-25

## Goal

1차 상품 드로워의 큰 상품 이미지 영역은 리스트/후보군 썸네일과 다른 계약을 사용한다. 프론트는 운영 이미지 URL을 상품명, 품번, 색상코드로 합성하지 않고 백엔드가 내려준 URL만 표시한다.

## API Contract

Endpoint:

- `GET /products/{skuGroupKey}/drawer-bundle`

Response owner:

- `ProductDrawerBundle.summary`

Required field:

```ts
interface ProductPrimarySummary {
  skuGroupKey: string
  productUuid?: string | null
  productName: string
  brand: string
  category: string
  code: string
  colorCode: string
  imageUrl: string | null
  price: number
  qty: number
  availableStock: number
  monthlySalesTrend?: MonthlySalesPoint[]
}
```

## Field Meaning

- `imageUrl`: 1차 드로워의 큰 상품 이미지 URL.
- `null`: 저장된 대표 이미지가 없다는 뜻. 프론트는 이미지 없음 상태를 표시한다.
- `thumbnailUrl`: 분석 리스트, 후보군 리스트 등 작은 셀 이미지 전용 필드. 1차 드로워 큰 이미지에는 사용하지 않는다.

## Frontend Rules

- `ProductPrimaryDrawer`는 `summary.imageUrl`만 큰 이미지로 표시한다.
- `imageUrl`이 없으면 프론트는 placeholder URL을 만들지 않는다.
- mock은 `src/api/mock/mockProductImage.ts`에서 큰 이미지용 fixture를 생성한다.
- list/candidate mock thumbnail 생성기는 `mockProductThumbnail.ts`에 남긴다.

## Backend Notes

- 백엔드는 `ProductDrawerBundle.summary.imageUrl`을 항상 포함해 반환한다.
- 대표 이미지가 없으면 빈 문자열 대신 `null`을 반환한다.
- `imageUrl`과 `thumbnailUrl`을 같은 의미로 취급하지 않는다.
- CDN/asset URL 형식은 백엔드 저장소 정책에 따른다. 프론트는 URL을 해석하거나 재구성하지 않는다.

## Related Docs

- `MD/backend-api/dashboard-api-contract-catalog.md`
- `MD/backend-api/backend-api-spec.md`
- `MD/dashboard-app/boundaries/product-drawer.md`
- `MD/dashboard-app/source-boundary-map.md`
