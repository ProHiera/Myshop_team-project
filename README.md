# MyShop - 팀 프로젝트 쇼핑몰

> **KD 아카데미 컴퓨터학원** 협업 프로젝트

## 프로젝트 개요

**MyShop**은 Spring Boot와 React를 기반으로 한 풀스택 이커머스 플랫폼입니다. 소셜 로그인, AI 기반 상품 추천, 토스페이먼츠 결제 연동 등 실무에서 사용되는 기능들을 구현하였습니다.

### 개발 기간
- 2024년 ~ 2025년

### 기술 스택

| 분류 | 기술 |
|------|------|
| **Backend** | Spring Boot 3.5.8, Spring Security, Spring Data JPA, JWT |
| **Frontend** | React 18.3, TypeScript 5.6, Vite 5.4, Material-UI 6.1 |
| **Database** | MariaDB, H2 (테스트) |
| **외부 API** | OpenAI ChatGPT, 토스페이먼츠, Google OAuth2, Naver OAuth2 |
| **DevOps** | GitHub Actions, Nginx, Ubuntu Server |

---

## 팀 구성

| 역할 | 이름 | 담당 업무 |
|------|------|----------|
| **팀장** | 박지후 | 프로젝트 총괄 + 백엔드 전체 구현 |
| **팀원** | 이진용 | SNS 로그인 (Google, Naver OAuth2) |
| **팀원** | 오종혁 | 로컬 로그인 + 게시판/댓글 시스템 |
| **팀원** | 이나라 | 프론트엔드 UI/UX + AI 연동 |
| **팀원** | 이현우 | 데이터베이스 설계 및 ERD |

---

## 팀원별 구현 내용

### 박지후 (팀장) - 프로젝트 총괄 + 백엔드 전체

#### 담당 역할
프로젝트 전체 아키텍처 설계, 코드 리뷰, Git 브랜치 관리, CI/CD 파이프라인 구축 및 팀원들이 구현하지 못한 모든 백엔드 기능 개발

#### 구현 기능

**1. 상품 관리 시스템 (Item)**
```
backend/src/main/java/com/example/backend/
├── controller/ItemController.java
├── service/ItemService.java
├── repository/ItemRepository.java
└── entity/item/
    ├── Item.java
    ├── ItemImage.java
    ├── Color.java
    └── Size.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/item` | GET | 상품 목록 조회 (검색, 필터링, 페이지네이션) |
| `/api/item/{itemId}` | GET | 상품 상세 조회 |
| `/api/item/favorite` | GET | 찜 목록 조회 |
| `/api/item/cart` | GET | 장바구니 목록 조회 |
| `/api/item/favorite/{itemId}` | POST | 찜 토글 |
| `/api/item/cart/{itemId}` | POST | 장바구니 토글 |

- **고급 검색 기능**: 카테고리(대/중/소), 가격 범위, 색상, 사이즈, 키워드 필터링
- **IndexItemSpec.java**: JPA Specification을 활용한 동적 쿼리 생성
- **응답 DTO**: `IndexItemResponse`에 cartCount, reviewCount, reviewAverage 포함

**2. 주문 관리 시스템 (Order)**
```
controller/OrderController.java
service/OrderService.java
entity/order/
├── OrderItemList.java
└── OrderItem.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/order` | POST | 주문 생성 |
| `/api/order` | GET | 주문 목록 조회 (페이지네이션) |
| `/api/order/{orderId}` | GET | 주문 상세 조회 |

- 주문 생성 시 재고 검증 및 차감
- 주문 상태 관리 (PENDING, PAID, SHIPPING, DELIVERED, CANCELLED)
- 사용자별 주문 내역 분리

**3. 결제 연동 (Toss Payments)**
```
controller/PaymentController.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/payment/confirm` | POST | 결제 승인 |
| `/api/payment/cancel` | POST | 결제 취소 |

- 토스페이먼츠 API 연동
- Basic Auth 인증
- 주문 금액 검증 (위변조 방지)
- WebClient를 활용한 비동기 HTTP 통신

**4. 리뷰 시스템 (Review)**
```
controller/ReviewController.java
service/ReviewService.java
entity/review/Review.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/review/{itemId}` | GET | 상품 리뷰 목록 |
| `/api/review/{itemId}` | POST | 리뷰 작성 |
| `/api/review/{reviewId}` | PUT | 리뷰 수정 |
| `/api/review/{reviewId}` | DELETE | 리뷰 삭제 |

- 1~5점 평점 시스템
- 작성자 본인만 수정/삭제 가능
- 상품별 평균 평점 계산

**5. 배송지 관리 (Address)**
```
controller/AddressController.java
service/AddressService.java
entity/Address.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/address` | GET | 배송지 목록 |
| `/api/address` | POST | 배송지 추가 |
| `/api/address/{addressId}` | PUT | 배송지 수정 |
| `/api/address/{addressId}` | DELETE | 배송지 삭제 |

- 다음 우편번호 API 연동 (프론트엔드)
- 기본 배송지 설정 기능

**6. 배너 관리 (Banner)**
```
controller/BannerController.java
service/BannerService.java
entity/Banner.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/banner` | GET | 배너 목록 |
| `/api/banner` | POST | 배너 생성 (Admin) |
| `/api/banner/{bannerId}` | PUT | 배너 수정 (Admin) |
| `/api/banner/{bannerId}` | DELETE | 배너 삭제 (Admin) |

**7. 관리자 기능 (Admin)**
```
controller/AdminController.java
service/AdminService.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/admin` | POST | 상품 등록 (이미지 업로드 포함) |
| `/api/admin/{itemId}` | PUT | 상품 수정 |
| `/api/admin/{itemId}` | DELETE | 상품 삭제 |

- `@PreAuthorize("hasRole('ADMIN')")` 권한 검증
- Multipart 파일 업로드 처리
- 상품 이미지 다중 업로드

**8. 파일 업로드 시스템**
- 업로드 경로: `./uploads/product`
- 최대 파일 크기: 10MB
- 허용 포맷: jpg, jpeg, png, gif, webp, pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip
- 파일 확장자 및 크기 검증

**9. 보안 설정 (SecurityConfig)**
```
config/SecurityConfig.java
```
- JWT 기반 Stateless 인증
- CORS 설정 (localhost:5173)
- 엔드포인트별 접근 권한 설정
- OAuth2 로그인 핸들러 연동

**10. CI/CD 파이프라인**
```
.github/workflows/deploy.yml
```
- GitHub Actions 자동 배포
- 프론트엔드: Vite 빌드 → Nginx 배포
- 백엔드: Gradle 빌드 → JAR 실행
- 환경 변수 GitHub Secrets 관리

---

### 이진용 - SNS 로그인 (Google, Naver OAuth2)

#### 구현 기능

**OAuth2 소셜 로그인**
```
backend/src/main/java/com/example/backend/
├── oauth/OAuth2SuccessHandler.java
├── controller/LoginController.java
└── resources/application.yaml (OAuth2 설정)
```

| API | Method | 설명 |
|-----|--------|------|
| `/oauth2/authorization/google` | GET | Google 로그인 리다이렉트 |
| `/oauth2/authorization/naver` | GET | Naver 로그인 리다이렉트 |
| `/api/login/oauth2/code/{provider}` | GET | OAuth2 콜백 |
| `/login/success` | GET | 로그인 성공 처리 |
| `/login/failure` | GET | 로그인 실패 처리 |
| `/user/info` | GET | 사용자 정보 조회 |

**구현 상세**

1. **OAuth2SuccessHandler.java**
   - OAuth2 인증 성공 시 호출되는 핸들러
   - Provider 감지 (Google vs Naver)
   - providerId 기반 사용자 조회/생성
   - JWT 토큰 발급 (Access + Refresh)
   - HttpOnly 쿠키에 토큰 저장
   - 프론트엔드로 리다이렉트 (`?result=success/failure`)

2. **application.yaml OAuth2 설정**
   ```yaml
   spring:
     security:
       oauth2:
         client:
           registration:
             google:
               client-id: ${GOOGLE_CLIENT_ID}
               client-secret: ${GOOGLE_CLIENT_SECRET}
               scope: profile, email
             naver:
               client-id: ${NAVER_CLIENT_ID}
               client-secret: ${NAVER_CLIENT_SECRET}
               scope: name, email, profile_image
           provider:
             naver:
               authorization-uri: https://nid.naver.com/oauth2.0/authorize
               token-uri: https://nid.naver.com/oauth2.0/token
               user-info-uri: https://openapi.naver.com/v1/nid/me
   ```

3. **프론트엔드 연동**
   - `LoginPage.tsx`에 소셜 로그인 버튼
   - OAuth2 리다이렉트 결과 처리
   - 토큰 쿠키 자동 저장

#### 결과
- Google, Naver 계정으로 원클릭 로그인
- 기존 회원과 소셜 회원 통합 관리
- Provider별 사용자 정보 자동 매핑

---

### 오종혁 - 로컬 로그인 + 게시판/댓글 시스템

#### 구현 기능

**1. 로컬 로그인 (JWT 인증)**
```
backend/src/main/java/com/example/backend/
├── controller/AuthController.java
├── service/AuthService.java
├── security/
│   ├── JwtTokenProvider.java
│   └── JwtAuthenticationFilter.java
└── dto/auth/
    ├── LoginRequest.java
    ├── SignupRequest.java
    └── TokenResponse.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/auth/signup` | POST | 회원가입 |
| `/api/auth/login` | POST | 로그인 |
| `/api/auth/refresh` | POST | 토큰 갱신 |
| `/api/auth/logout` | POST | 로그아웃 |
| `/api/auth/check-email` | GET | 이메일 중복 확인 |
| `/api/auth/me` | GET | 내 정보 조회 |
| `/api/auth/me` | PUT | 내 정보 수정 |
| `/api/auth/password` | PUT | 비밀번호 변경 |

**JWT 토큰 관리**
- Access Token: 1시간 유효
- Refresh Token: 7일 유효
- HttpOnly 쿠키 저장 (XSS 방지)
- BCrypt 비밀번호 암호화

**2. 게시판 시스템 (Board)**
```
backend/src/main/java/com/example/backend/
├── controller/BoardController.java
├── service/BoardServiceImpl.java
├── entity/board/
│   ├── Board.java
│   └── BoardFile.java
└── dto/board/
    ├── BoardListResponse.java
    ├── BoardDetailResponse.java
    └── BoardWriteRequest.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/board/list` | GET | 게시글 목록 (검색, 카테고리, 페이징) |
| `/api/board/write` | POST | 게시글 작성 (파일 업로드) |
| `/api/board/{boardNo}` | GET | 게시글 상세 |
| `/api/board/{boardNo}` | PUT | 게시글 수정 |
| `/api/board/{boardNo}` | DELETE | 게시글 삭제 |
| `/api/board/file/{fileNo}` | GET | 파일 다운로드 |
| `/api/board/image/{fileNo}` | GET | 이미지 미리보기 |

**게시판 기능**
- 카테고리: 공지사항(notice), 이벤트(event), QnA(qna)
- 비밀글 기능 (secretYn)
- 파일 첨부 (10MB, 다중 업로드)
- 조회수 카운트
- Soft Delete (delYn)
- 작성자/관리자만 수정/삭제

**3. 댓글 시스템 (Comment)**
```
backend/src/main/java/com/example/backend/
├── controller/CommentController.java
├── service/CommentService.java
├── entity/comment/Comment.java
└── dto/comment/
    ├── CommentResponse.java
    └── CommentRequest.java
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/comments/board/{boardNo}` | GET | 댓글 목록 |
| `/api/comments/board/{boardNo}` | POST | 댓글 작성 |
| `/api/comments/{coNo}` | PUT | 댓글 수정 |
| `/api/comments/{coNo}` | DELETE | 댓글 삭제 |

**댓글 기능**
- 비밀 댓글 지원
- 작성자/관리자만 수정/삭제
- Soft Delete 패턴

**프론트엔드 페이지**
```
frontend/src/pages/
├── auth/
│   ├── LoginPage.tsx
│   └── SignupPage.tsx
└── board/
    ├── BoardListPage.tsx
    ├── BoardWritePage.tsx
    ├── BoardDetailPage.tsx
    └── BoardEditPage.tsx
```

#### 결과
- 이메일/비밀번호 기반 회원가입 및 로그인
- JWT 토큰 자동 갱신
- 카테고리별 게시판 운영
- 파일 첨부 및 다운로드
- 댓글 CRUD

---

### 이나라 - 프론트엔드 UI/UX + AI 연동

#### 구현 기능

**1. AI 상품 추천 (ChatGPT 연동)**
```
backend/src/main/java/com/example/backend/
├── controller/AiProxyController.java
└── service/AiProxyService.java

frontend/src/
├── hooks/useAiRecommend.ts
└── components/support/SupportChatWidget.tsx
```

| API | Method | 설명 |
|-----|--------|------|
| `/api/ai/proxy` | POST | AI 추천 프록시 |

**AI 추천 로직**
1. 사용자 프롬프트 수신
2. OpenAI ChatGPT API 호출
3. 키워드 추출 및 분석
4. 카테고리 기반 상품 필터링
5. 매칭 상품 반환

**useAiRecommend.ts Hook**
```typescript
const { getRecommendation, findMatchingProduct } = useAiRecommend()
// AI 스타일 추천 받기
const result = await getRecommendation(userMessage)
// 추천 키워드로 상품 매칭
const products = await findMatchingProduct(keywords)
```

**2. 고객 지원 채팅 위젯**
```
frontend/src/components/support/SupportChatWidget.tsx
```

**기능**
- Glassmorphism UI 디자인
- FAQ 카테고리: 배송, 반품, 사이즈, 리워드
- 실시간 채팅 인터페이스
- 메시지 히스토리 자동 스크롤
- ESC 키 단축키 지원

**3. 프론트엔드 UI/UX**

**페이지 구현 (24개)**
```
frontend/src/pages/
├── HomePage.tsx              # 메인 페이지
├── ProductListPage.tsx       # 상품 목록
├── ProductDetailPage.tsx     # 상품 상세
├── CartPage.tsx              # 장바구니
├── WishlistPage.tsx          # 찜 목록
├── OrderPage.tsx             # 주문/결제
├── OrderSuccessPage.tsx      # 주문 성공
├── OrderFailPage.tsx         # 주문 실패
├── OrderCompletePage.tsx     # 주문 완료
├── auth/
│   ├── LoginPage.tsx         # 로그인
│   └── SignupPage.tsx        # 회원가입
├── board/
│   ├── BoardListPage.tsx     # 게시판 목록
│   ├── BoardWritePage.tsx    # 게시글 작성
│   ├── BoardDetailPage.tsx   # 게시글 상세
│   └── BoardEditPage.tsx     # 게시글 수정
├── mypage/
│   ├── MyProfilePage.tsx     # 내 프로필
│   ├── MyOrdersPage.tsx      # 주문 내역
│   ├── MyPostsPage.tsx       # 내 게시글
│   └── WithdrawCompletePage.tsx
└── admin/
    ├── AdminDashboardPage.tsx    # 관리자 대시보드
    ├── AdminProductListPage.tsx  # 상품 관리
    ├── AdminBoardPage.tsx        # 게시판 관리
    ├── AdminBannerPage.tsx       # 배너 관리
    └── AdminMemberListPage.tsx   # 회원 관리
```

**컴포넌트 구현**
```
frontend/src/components/
├── common/
│   ├── Header.tsx           # 헤더 (검색, 네비게이션)
│   ├── Footer.tsx           # 푸터
│   ├── ProductCard.tsx      # 상품 카드
│   ├── AppImage.tsx         # 이미지 컴포넌트
│   ├── LoadingScreen.tsx    # 로딩 화면
│   └── AuthGuard.tsx        # 인증 가드
├── home/
│   ├── MainBanner.tsx       # 메인 배너 캐러셀
│   └── ProductSection.tsx   # 상품 섹션
├── product/
│   ├── CategoryFilter.tsx   # 카테고리 필터
│   └── ReviewSection.tsx    # 리뷰 섹션
└── support/
    └── SupportChatWidget.tsx # AI 지원 채팅
```

**Custom Hooks**
```
frontend/src/hooks/
├── useAuth.ts              # 인증 상태 관리
├── useCart.ts              # 장바구니 관리
├── useLike.ts              # 찜 관리
├── useAiRecommend.ts       # AI 추천
└── useDaumPostcode.ts      # 다음 우편번호
```

**스타일링**
```
frontend/src/theme/
└── tokens.ts               # 브랜드 컬러, Glassmorphism
```

- Material-UI 6.1 컴포넌트
- Emotion CSS-in-JS
- GSAP 애니메이션
- 반응형 디자인

#### 결과
- ChatGPT 기반 스타일 추천
- Glassmorphism 디자인 적용
- 24개 페이지 완성
- 사용자 친화적 UI/UX

---

### 이현우 - 데이터베이스 설계

#### 구현 기능

**Entity 설계 (27개)**
```
backend/src/main/java/com/example/backend/entity/
├── user/
│   ├── User.java            # 사용자
│   ├── Address.java         # 배송지
│   └── Role.java            # 역할 (USER, ADMIN)
├── item/
│   ├── Item.java            # 상품
│   ├── ItemImage.java       # 상품 이미지
│   ├── Color.java           # 색상 옵션
│   ├── Size.java            # 사이즈 옵션
│   ├── CartItem.java        # 장바구니
│   ├── FavoriteItem.java    # 찜
│   ├── ViewedItem.java      # 최근 본 상품
│   └── enums/               # 카테고리, 색상, 사이즈 Enum
├── order/
│   ├── OrderItemList.java   # 주문
│   └── OrderItem.java       # 주문 상품
├── review/
│   └── Review.java          # 리뷰
├── board/
│   ├── Board.java           # 게시글
│   └── BoardFile.java       # 첨부파일
├── comment/
│   └── Comment.java         # 댓글
├── banner/
│   └── Banner.java          # 배너
└── BaseEntity.java          # 공통 필드 (createdAt, updatedAt)
```

**ERD 주요 관계**
```
User (1) ──── (N) Address           # 사용자 - 배송지
User (1) ──── (N) Board             # 사용자 - 게시글
User (1) ──── (N) Comment           # 사용자 - 댓글
User (1) ──── (N) Review            # 사용자 - 리뷰
User (1) ──── (N) CartItem          # 사용자 - 장바구니
User (1) ──── (N) FavoriteItem      # 사용자 - 찜
User (1) ──── (N) OrderItemList     # 사용자 - 주문

Item (1) ──── (N) ItemImage         # 상품 - 이미지
Item (1) ──── (N) Color             # 상품 - 색상
Item (1) ──── (N) Size              # 상품 - 사이즈
Item (1) ──── (N) Review            # 상품 - 리뷰
Item (1) ──── (N) CartItem          # 상품 - 장바구니
Item (1) ──── (N) FavoriteItem      # 상품 - 찜
Item (1) ──── (N) OrderItem         # 상품 - 주문상품

Board (1) ──── (N) BoardFile        # 게시글 - 첨부파일
Board (1) ──── (N) Comment          # 게시글 - 댓글

OrderItemList (1) ──── (N) OrderItem # 주문 - 주문상품
```

**핵심 설계 패턴**

1. **Soft Delete 패턴**
   ```java
   @Column(name = "del_yn", length = 1)
   private String delYn = "N";  // 삭제 여부
   ```

2. **Timestamp 자동 관리**
   ```java
   @CreationTimestamp
   private LocalDateTime createdAt;

   @UpdateTimestamp
   private LocalDateTime updatedAt;
   ```

3. **Cascade 삭제**
   ```java
   @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
   private List<Review> reviews;
   ```

4. **Enum 기반 카테고리**
   ```java
   public enum MajorCategoryEnum { MEN, WOMEN, KIDS, ACCESSORIES }
   public enum MiddleCategoryEnum { TOP, BOTTOM, OUTER, SHOES, ... }
   public enum SubcategoryEnum { T_SHIRT, JEANS, JACKET, SNEAKERS, ... }
   ```

#### 결과
- 27개 Entity 설계
- JPA 연관관계 매핑
- 데이터 무결성 보장
- 확장 가능한 구조

---

## 에러슈팅 내역

### 1. TypeScript 빌드 오류

**문제**: 프론트엔드 빌드 시 타입 오류 발생
```
error TS2305: Module '"@/types/api"' has no exported member 'BoardUpdateRequest'
error TS1484: 'ImgHTMLAttributes' is a type and must be imported using a type-only import
error TS2322: Type 'string | undefined' is not assignable to type 'string'
```

**해결**:
```typescript
// 1. 사용하지 않는 import 제거
- import { BoardUpdateRequest } from '@/types/api'

// 2. type import 명시
- import { ImgHTMLAttributes } from 'react'
+ import type { ImgHTMLAttributes } from 'react'

// 3. 타입 정의 수정
- src?: string
+ src?: string | undefined
```

### 2. OrderListItem 타입 불일치

**문제**: 백엔드 응답(camelCase)과 프론트엔드 타입(snake_case) 불일치
```typescript
// 프론트엔드 타입 (잘못됨)
type OrderListItem = {
  order_id: number
  total_price: number
}

// 백엔드 응답 (실제)
{
  "orderId": 1,
  "totalPrice": 50000
}
```

**해결**:
```typescript
// frontend/src/types/api.ts
export type OrderListItem = {
  orderId?: number
  title?: string
  mainImgUrl?: string
  totalPrice?: number
  status?: string
  createdAt?: string
}
```

### 3. 찜 목록 전체 노출 버그

**문제**: 특정 사용자의 찜 목록 조회 시 모든 사용자의 찜이 노출됨

**원인**: Repository 쿼리에서 userId 필터링 누락

**해결**:
```java
// ItemRepository.java
@Query("SELECT f.item FROM FavoriteItem f WHERE f.user.userId = :userId")
List<Item> findFavoriteItemsByUserId(@Param("userId") Long userId);
```

### 4. OAuth2 로그인 후 토큰 미저장

**문제**: 소셜 로그인 성공 후 JWT 토큰이 저장되지 않음

**원인**: 쿠키 설정 누락

**해결**:
```java
// OAuth2SuccessHandler.java
ResponseCookie accessCookie = ResponseCookie.from("access_token", accessToken)
    .httpOnly(true)
    .secure(true)
    .sameSite("Lax")
    .path("/")
    .maxAge(3600)
    .build();
response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
```

### 5. 파일 업로드 용량 초과

**문제**: 10MB 이상 파일 업로드 시 500 에러

**해결**:
```yaml
# application.yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 50MB
```

### 6. CORS 에러

**문제**: 프론트엔드에서 API 호출 시 CORS 에러
```
Access to XMLHttpRequest at 'http://localhost:8080/api/...' has been blocked by CORS policy
```

**해결**:
```java
// SecurityConfig.java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("http://localhost:5173"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    // ...
}
```

### 7. Git 머지 충돌

**문제**: dev → main 머지 시 build.gradle, application.yaml 충돌

**해결**: 수동으로 충돌 해결 후 dev 브랜치 내용 선택
```bash
git checkout main
git merge dev
# 충돌 파일 수정
git add .
git commit -m "Merge branch 'dev' into main"
```

### 8. GitHub Actions 배포 실패

**문제**: main 브랜치 직접 푸시 거부
```
remote: - Changes must be made through a pull request.
```

**해결**: Pull Request를 통한 머지 프로세스 적용
```bash
gh pr create --base main --head dev --title "feat: 배포 환경 구성"
```

---

## 프로젝트 구조

```
Myshop/
├── backend/
│   ├── src/main/java/com/example/backend/
│   │   ├── controller/       # REST API 컨트롤러
│   │   ├── service/          # 비즈니스 로직
│   │   ├── repository/       # JPA Repository
│   │   ├── entity/           # JPA Entity
│   │   ├── dto/              # 요청/응답 DTO
│   │   ├── config/           # 설정 클래스
│   │   ├── security/         # JWT, 필터
│   │   └── oauth/            # OAuth2 핸들러
│   ├── src/main/resources/
│   │   ├── application.yaml
│   │   ├── application-dev.yaml
│   │   └── application-prod.yaml
│   └── build.gradle
├── frontend/
│   ├── src/
│   │   ├── api/              # API 클라이언트
│   │   ├── components/       # React 컴포넌트
│   │   ├── hooks/            # Custom Hooks
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── types/            # TypeScript 타입
│   │   └── theme/            # 스타일 토큰
│   ├── .env.development
│   ├── .env.production
│   ├── vite.config.ts
│   └── package.json
├── .github/workflows/
│   └── deploy.yml            # CI/CD 워크플로우
└── README.md
```

---

## 실행 방법

### 백엔드
```bash
cd backend
./gradlew bootRun
# http://localhost:8080
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### 환경 변수 설정
```bash
# backend
DB_URL=jdbc:mariadb://localhost:3306/teampr
DB_USERNAME=root
DB_PASSWORD=password
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
OPENAI_API_KEY=your-openai-api-key
TOSS_SECRET_KEY=your-toss-secret-key

# frontend
VITE_API_BASE_URL=http://localhost:8080/api
VITE_TOSS_CLIENT_KEY=your-toss-client-key
```

---

## 개발 순서 가이드라인

1. 이슈 생성
2. 개인 브랜치 커밋
3. dev 브랜치로 Pull Request
4. 코드 검토
5. 모든 기능 완성 후 관리자가 dev → main으로 Pull Request
6. 최종 검토 및 머지

---

## 라이센스

이 프로젝트는 KD 아카데미 컴퓨터학원 교육 목적으로 제작되었습니다.

---

**© 2024-2025 MyShop Team. All rights reserved.**
