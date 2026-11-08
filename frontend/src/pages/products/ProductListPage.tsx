import { getProductImage, handleProductImageError, isProductReferenceImage } from '@/utils/productImages'
import {
  Box,
  Button,
  Chip,
  Container,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material'
import {
  AccessTime as TimeIcon,
  FavoriteBorder as HeartIcon,
  Favorite as HeartFilledIcon,
  ShoppingCart as CartIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from '@mui/icons-material'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Pagination from '@/components/common/Pagination'
import { fetchItems } from '@/api/itemApi'
import type { ProductSummary } from '@/types/product'
import { COLORS, COLOR_ORDER } from '@/types/colors'

type SortOption = 'popular' | 'latest' | 'price-low' | 'price-high' | 'review'



// 사이즈 옵션
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE'] as const

// 가격 범위 옵션
const PRICE_RANGES = [
  { label: '전체', min: 0, max: null },
  { label: '~5만원', min: 0, max: 50000 },
  { label: '5~10만원', min: 50000, max: 100000 },
  { label: '10~20만원', min: 100000, max: 200000 },
  { label: '20~30만원', min: 200000, max: 300000 },
  { label: '30만원~', min: 300000, max: null },
] as const

// 대분류 (MajorCategoryEnum)
const mainCategories = [
  { id: 'all', label: '전체' },
  { id: 'WOMEN', label: '여성' },
  { id: 'MEN', label: '남성' },
  { id: 'KIDS', label: '키즈' },
  { id: 'SHOES', label: '슈즈' },
  { id: 'BAGS', label: '가방' },
  { id: 'ACCESSORIES', label: '액세서리' },
]

// 중분류 (MiddleCategoryEnum)
const subCategories: Record<string, { id: string; label: string }[]> = {
  all: [],
  WOMEN: [
    { id: 'all', label: '전체' },
    { id: 'TOP', label: '상의' },
    { id: 'BOTTOM', label: '하의' },
    { id: 'OUTER', label: '아우터' },
    { id: 'DRESS', label: '원피스' },
    { id: 'SUIT', label: '정장' },
    { id: 'UNDERWEAR', label: '언더웨어' },
    { id: 'SPORTSWEAR', label: '스포츠웨어' },
  ],
  MEN: [
    { id: 'all', label: '전체' },
    { id: 'TOP', label: '상의' },
    { id: 'BOTTOM', label: '하의' },
    { id: 'OUTER', label: '아우터' },
    { id: 'SUIT', label: '정장' },
    { id: 'UNDERWEAR', label: '언더웨어' },
    { id: 'SPORTSWEAR', label: '스포츠웨어' },
  ],
  KIDS: [
    { id: 'all', label: '전체' },
    { id: 'TOP', label: '상의' },
    { id: 'BOTTOM', label: '하의' },
    { id: 'OUTER', label: '아우터' },
    { id: 'DRESS', label: '원피스' },
  ],
  SHOES: [
    { id: 'all', label: '전체' },
    { id: 'SNEAKERS', label: '스니커즈' },
    { id: 'BOOTS', label: '부츠' },
    { id: 'SANDALS', label: '샌들' },
    { id: 'LOAFERS', label: '로퍼' },
    { id: 'HEELS', label: '힐' },
  ],
  BAGS: [
    { id: 'all', label: '전체' },
    { id: 'BACKPACK', label: '백팩' },
    { id: 'CROSSBODY', label: '크로스백' },
    { id: 'TOTE', label: '토트백' },
    { id: 'CLUTCH', label: '클러치' },
    { id: 'WALLET', label: '지갑' },
  ],
  ACCESSORIES: [
    { id: 'all', label: '전체' },
    { id: 'HAT', label: '모자' },
    { id: 'SCARF', label: '스카프' },
    { id: 'BELT', label: '벨트' },
    { id: 'JEWELRY', label: '주얼리' },
    { id: 'WATCH', label: '시계' },
    { id: 'SUNGLASSES', label: '선글라스' },
  ],
}

// 페이지 타이틀 매핑
const pageTitles: Record<string, { text: string }> = {
  best: { text: '베스트' },
  sale: { text: '세일' },
  new: { text: '신상' },
  WOMEN: { text: '여성' },
  MEN: { text: '남성' },
  KIDS: { text: '키즈' },
  SHOES: { text: '슈즈' },
  BAGS: { text: '가방' },
  ACCESSORIES: { text: '액세서리' },
}

const ProductListPage = () => {
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category')
  const majorCategoryParam = searchParams.get('majorCategory') || categoryParam
  const middleCategoryParam = searchParams.get('middleCategory')
  const sortParam = searchParams.get('sort')
  const searchTerm = searchParams.get('searchTerm')

  // 페이지 타이틀 결정
  const titleKey = sortParam || categoryParam || ''
  const titleData = pageTitles[titleKey]

  const [products, setProducts] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [mainCategory, setMainCategory] = useState('all')
  const [subCategory, setSubCategory] = useState('all')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000])
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const latestRequest = useRef(0)

  const itemsPerPage = 12

  // AI 추천 검색도 API와 동일한 major/middle category 필드를 사용합니다.
  useEffect(() => {
    setMainCategory(majorCategoryParam && mainCategories.some(cat => cat.id === majorCategoryParam)
      ? majorCategoryParam : 'all')
    const validMiddleCategory = Object.values(subCategories).some((categories) =>
      categories.some((category) => category.id === middleCategoryParam))
    setSubCategory(validMiddleCategory && middleCategoryParam ? middleCategoryParam : 'all')
    setCurrentPage(1)
  }, [majorCategoryParam, middleCategoryParam])

  // 현재 시간 표시
  const currentTime = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const getSortParams = (sort: SortOption) => {
    switch (sort) {
      case 'latest':
        return { sort: 'createdAt,desc' }
      case 'price-low':
        return { sort: 'price,asc' }
      case 'price-high':
        return { sort: 'price,desc' }
      case 'review':
        return { sort: 'reviewCount,desc' }
      case 'popular':
      default:
        return { sort: 'likeCount,desc' }
    }
  }

  const loadProducts = useCallback(async () => {
    const requestId = ++latestRequest.current
    setLoading(true)

    try {
      const sortParams = getSortParams(sortBy)

      // 필터 파라미터 구성
      const filterParams: Record<string, string | number | string[] | undefined> = {
        page: currentPage - 1,
        size: itemsPerPage,
        searchTerm: searchTerm || undefined,
        ...sortParams,
      }

      // 카테고리 필터
      if (mainCategory !== 'all') {
        filterParams.majorCategory = mainCategory
      }
      if (subCategory !== 'all') {
        filterParams.middleCategory = subCategory
      }

      // 색상 필터 (다수의 색상 필터링 지원)
      if (selectedColors.length > 0) {
        filterParams.colors = selectedColors
      }

      // 사이즈 필터 (다수의 사이즈 필터링 지원)
      // 주의: 'size'는 Spring Pageable의 페이지 크기 파라미터와 충돌하므로 'itemSizes' 사용
      if (selectedSizes.length > 0) {
        filterParams.itemSizes = selectedSizes
      }

      // 가격 필터
      if (priceRange[0] > 0) {
        filterParams.minPrice = priceRange[0]
      }
      if (priceRange[1] < 500000) {
        filterParams.maxPrice = priceRange[1]
      }

      // 판매중만 보기 필터
      if (showOnlyAvailable) {
        filterParams.status = 'active'
      }

      const response = await fetchItems(filterParams)
      if (requestId !== latestRequest.current) return

      // 백엔드 응답 필드명: id, title, brand, price, discountPercent, realPrice, mainImageUrl, favorite, cart, stock
      // 재고가 0인 상품은 필터링하여 표시하지 않음 (판매중지 상품)
      const availableItems = (response.content || []).filter((item) => (item.stock ?? 1) > 0)

      const mappedProducts: ProductSummary[] = availableItems.map((item) => ({
        id: item.id,
        title: item.title || '상품명',
        brand: item.brand || '',
        price: item.price,
        discountPercent: item.discountPercent,
        mainImage: getProductImage(item.mainImageUrl, item.title),
        favorite: item.favorite,
        cart: item.cart,
        reviewCount: item.reviewCount ?? 0,
        scoreAverage: item.reviewAverage ?? 0,
        likeCount: item.likeCount ?? 0,
      }))

      setProducts(mappedProducts)
      // 필터링된 상품 수를 반영 (전체 개수는 백엔드에서 오는 값 사용)
      setTotalCount(response.totalElements || 0)
    } catch (err) {
      if (requestId !== latestRequest.current) return
      console.error('상품 목록 로드 실패:', err)
      setProducts([])
      setTotalCount(0)
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }, [currentPage, sortBy, searchTerm, mainCategory, subCategory, selectedColors, selectedSizes, priceRange, showOnlyAvailable])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const getDiscountedPrice = (price: number, discountPercent?: number) => {
    if (!discountPercent) return price
    return Math.floor(price * (1 - discountPercent / 100))
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 페이지 타이틀 */}
      <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>
        {searchTerm ? (
          `"${searchTerm}" 검색 결과`
        ) : titleData ? (
          <>
            <Box component="span" sx={{ color: '#1a1a1a' }}>{titleData.text}</Box>
          </>
        ) : (
          '전체 상품'
        )}
      </Typography>

      {/* 모바일 필터 버튼 */}
      <Button
        variant="outlined"
        startIcon={<FilterIcon />}
        onClick={() => setMobileFilterOpen(true)}
        sx={{
          display: { xs: 'flex', md: 'none' },
          mb: 2,
          borderColor: '#ddd',
          color: '#333',
        }}
      >
        필터
      </Button>

      {/* 모바일 필터 드로어 */}
      <Drawer
        anchor="left"
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <Box sx={{ width: 280, p: 3 }}>
          {/* 드로어 헤더 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>필터</Typography>
            <IconButton onClick={() => setMobileFilterOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* 메인 카테고리 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            카테고리
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 4 }}>
            {mainCategories.map((cat) => (
              <Typography
                key={cat.id}
                onClick={() => {
                  setMainCategory(cat.id)
                  setSubCategory('all')
                  setCurrentPage(1)
                }}
                sx={{
                  cursor: 'pointer',
                  py: 0.5,
                  fontSize: '0.9rem',
                  fontWeight: mainCategory === cat.id ? 600 : 400,
                  color: mainCategory === cat.id ? '#1a1a1a' : '#666',
                  '&:hover': { color: '#1a1a1a' },
                }}
              >
                {cat.label}
              </Typography>
            ))}
          </Stack>

          {/* 서브 카테고리 */}
          {subCategories[mainCategory]?.length > 0 && (
            <>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                세부 카테고리
              </Typography>
              <Stack spacing={0.5} sx={{ mb: 4 }}>
                {subCategories[mainCategory].map((sub) => (
                  <Typography
                    key={sub.id}
                    onClick={() => {
                      setSubCategory(sub.id)
                      setCurrentPage(1)
                    }}
                    sx={{
                      cursor: 'pointer',
                      py: 0.5,
                      fontSize: '0.9rem',
                      fontWeight: subCategory === sub.id ? 600 : 400,
                      color: subCategory === sub.id ? '#1a1a1a' : '#666',
                      '&:hover': { color: '#1a1a1a' },
                    }}
                  >
                    {sub.label}
                  </Typography>
                ))}
              </Stack>
            </>
          )}

          {/* 색상 필터 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            색상
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 1.5,
              justifyItems: 'center',
              mb: 4,
            }}
          >
            {COLOR_ORDER.map((colorKey) => {
              const color = COLORS[colorKey]
              const isSelected = selectedColors.includes(colorKey)
              const isLight = ['WHITE', 'IVORY', 'BEIGE', 'YELLOW', 'PINK'].includes(colorKey)
              return (
                <Box
                  key={colorKey}
                  onClick={() => {
                    setSelectedColors(prev =>
                      isSelected
                        ? prev.filter(c => c !== colorKey)
                        : [...prev, colorKey]
                    )
                    setCurrentPage(1)
                  }}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: color.hex,
                    border: isLight ? '1px solid #ddd' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.15)',
                    },
                  }}
                  title={color.name}
                >
                  {isSelected && (
                    <CheckIcon sx={{ fontSize: 18, color: isLight ? '#000' : '#fff' }} />
                  )}
                </Box>
              )
            })}
          </Box>

          {/* 사이즈 필터 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            사이즈
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
            {SIZES.map((size) => {
              const isSelected = selectedSizes.includes(size)
              return (
                <Chip
                  key={size}
                  label={size}
                  onClick={() => {
                    setSelectedSizes(prev =>
                      isSelected
                        ? prev.filter(s => s !== size)
                        : [...prev, size]
                    )
                    setCurrentPage(1)
                  }}
                  sx={{
                    borderRadius: '4px',
                    fontWeight: isSelected ? 600 : 400,
                    bgcolor: isSelected ? '#1a1a1a' : '#fff',
                    color: isSelected ? '#fff' : '#666',
                    border: '1px solid',
                    borderColor: isSelected ? '#1a1a1a' : '#ddd',
                  }}
                />
              )
            })}
          </Box>

          {/* 가격 필터 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            가격
          </Typography>
          <Box sx={{ px: 1, mb: 4 }}>
            <Slider
              value={priceRange}
              onChange={(_, newValue) => setPriceRange(newValue as [number, number])}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${(value / 10000).toFixed(0)}만원`}
              min={0}
              max={500000}
              step={10000}
              sx={{ color: '#1a1a1a' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {(priceRange[0] / 10000).toFixed(0)}만원
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(priceRange[1] / 10000).toFixed(0)}만원
              </Typography>
            </Box>
          </Box>

          {/* 상태 필터 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            상품 상태
          </Typography>
          <Box sx={{ mb: 4 }}>
            <Chip
              label="판매중만 보기"
              onClick={() => {
                setShowOnlyAvailable(!showOnlyAvailable)
                setCurrentPage(1)
              }}
              sx={{
                fontWeight: showOnlyAvailable ? 600 : 400,
                bgcolor: showOnlyAvailable ? '#4caf50' : '#fff',
                color: showOnlyAvailable ? '#fff' : '#666',
                border: '1px solid',
                borderColor: showOnlyAvailable ? '#4caf50' : '#ddd',
              }}
            />
          </Box>

          {/* 적용 버튼 */}
          <Button
            variant="contained"
            fullWidth
            onClick={() => setMobileFilterOpen(false)}
            sx={{ mt: 4, bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#333' } }}
          >
            적용하기
          </Button>
        </Box>
      </Drawer>

      {/* 좌측 사이드바 + 우측 상품 그리드 레이아웃 */}
      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* 좌측 사이드바 */}
        <Box
          sx={{
            width: 200,
            flexShrink: 0,
            display: { xs: 'none', md: 'block' },
          }}
        >
          {/* 메인 카테고리 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            카테고리
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 4 }}>
            {mainCategories.map((cat) => (
              <Typography
                key={cat.id}
                onClick={() => {
                  setMainCategory(cat.id)
                  setSubCategory('all')
                  setCurrentPage(1)
                }}
                sx={{
                  cursor: 'pointer',
                  py: 0.5,
                  fontSize: '0.9rem',
                  fontWeight: mainCategory === cat.id ? 600 : 400,
                  color: mainCategory === cat.id ? '#1a1a1a' : '#666',
                  '&:hover': { color: '#1a1a1a' },
                }}
              >
                {cat.label}
              </Typography>
            ))}
          </Stack>

          {/* 서브 카테고리 */}
          {subCategories[mainCategory]?.length > 0 && (
            <>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                세부 카테고리
              </Typography>
              <Stack spacing={0.5} sx={{ mb: 4 }}>
                {subCategories[mainCategory].map((sub) => (
                  <Typography
                    key={sub.id}
                    onClick={() => {
                      setSubCategory(sub.id)
                      setCurrentPage(1)
                    }}
                    sx={{
                      cursor: 'pointer',
                      py: 0.5,
                      fontSize: '0.9rem',
                      fontWeight: subCategory === sub.id ? 600 : 400,
                      color: subCategory === sub.id ? '#1a1a1a' : '#666',
                      '&:hover': { color: '#1a1a1a' },
                    }}
                  >
                    {sub.label}
                  </Typography>
                ))}
              </Stack>
            </>
          )}

          {/* 색상 필터 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            색상
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 1.5,
              justifyItems: 'center',
              mb: 4,
            }}
          >
            {COLOR_ORDER.map((colorKey) => {
              const color = COLORS[colorKey]
              const isSelected = selectedColors.includes(colorKey)
              const isLight = ['WHITE', 'IVORY', 'BEIGE', 'YELLOW', 'PINK'].includes(colorKey)
              return (
                <Box
                  key={colorKey}
                  onClick={() => {
                    setSelectedColors(prev =>
                      isSelected
                        ? prev.filter(c => c !== colorKey)
                        : [...prev, colorKey]
                    )
                    setCurrentPage(1)
                  }}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: color.hex,
                    border: isLight ? '1px solid #ddd' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.15)',
                    },
                  }}
                  title={color.name}
                >
                  {isSelected && (
                    <CheckIcon sx={{ fontSize: 18, color: isLight ? '#000' : '#fff' }} />
                  )}
                </Box>
              )
            })}
          </Box>

          {/* 사이즈 필터 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            사이즈
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
            {SIZES.map((size) => {
              const isSelected = selectedSizes.includes(size)
              return (
                <Chip
                  key={size}
                  label={size}
                  onClick={() => {
                    setSelectedSizes(prev =>
                      isSelected
                        ? prev.filter(s => s !== size)
                        : [...prev, size]
                    )
                    setCurrentPage(1)
                  }}
                  sx={{
                    borderRadius: '4px',
                    fontWeight: isSelected ? 600 : 400,
                    bgcolor: isSelected ? '#1a1a1a' : '#fff',
                    color: isSelected ? '#fff' : '#666',
                    border: '1px solid',
                    borderColor: isSelected ? '#1a1a1a' : '#ddd',
                    '&:hover': {
                      bgcolor: isSelected ? '#333' : '#f5f5f5',
                    },
                  }}
                />
              )
            })}
          </Box>

          {/* 가격 필터 */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            가격
          </Typography>
          <Box sx={{ px: 1, mb: 2 }}>
            <Slider
              value={priceRange}
              onChange={(_, newValue) => setPriceRange(newValue as [number, number])}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${(value / 10000).toFixed(0)}만원`}
              min={0}
              max={500000}
              step={10000}
              sx={{
                color: '#1a1a1a',
                '& .MuiSlider-thumb': {
                  bgcolor: '#fff',
                  border: '2px solid #1a1a1a',
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {(priceRange[0] / 10000).toFixed(0)}만원
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(priceRange[1] / 10000).toFixed(0)}만원
              </Typography>
            </Box>
          </Box>
          <Stack spacing={0.5} sx={{ mb: 4 }}>
            {PRICE_RANGES.map((range, idx) => (
              <Typography
                key={idx}
                onClick={() => {
                  setPriceRange([range.min, range.max ?? 500000])
                  setCurrentPage(1)
                }}
                sx={{
                  cursor: 'pointer',
                  py: 0.5,
                  fontSize: '0.85rem',
                  color: '#666',
                  '&:hover': { color: '#1a1a1a' },
                }}
              >
                {range.label}
              </Typography>
            ))}
          </Stack>

        </Box>

        {/* 우측 상품 영역 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* 상단 정보 바 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              pb: 2,
              borderBottom: '1px solid #eee',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <TimeIcon sx={{ fontSize: 18, color: '#888' }} />
              <Typography variant="body2" color="text.secondary">
                {currentTime} 기준
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                총 {totalCount.toLocaleString()}개
              </Typography>
            </Stack>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                sx={{ fontSize: '0.875rem' }}
              >
                <MenuItem value="popular">인기순</MenuItem>
                <MenuItem value="latest">최신순</MenuItem>
                <MenuItem value="price-low">낮은 가격순</MenuItem>
                <MenuItem value="price-high">높은 가격순</MenuItem>
                <MenuItem value="review">리뷰 많은순</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 상품 그리드 */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : products.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">
                상품이 없습니다.
              </Typography>
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                {products.map((product, index) => (
                  <Grid item xs={6} sm={4} md={4} lg={3} key={product.id}>
                    <Box
                      component={Link}
                      to={`/products/${product.id}`}
                      sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      {/* 상품 이미지 */}
                      <Box sx={{ position: 'relative', mb: 1.5 }}>
                        {/* 순위 배지 */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            width: 28,
                            height: 28,
                            bgcolor: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            zIndex: 1,
                          }}
                        >
                          {index + 1 + (currentPage - 1) * itemsPerPage}
                        </Box>

                        {/* 이미지 */}
                        <Box
                          component="img"
                          src={getProductImage(product.mainImage, product.title)}
                          alt={product.title}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            aspectRatio: '3/4',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            bgcolor: '#f5f5f5',
                          }}
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            handleProductImageError(e, product.title)
                          }}
                        />

                        {isProductReferenceImage(product.mainImage, product.title) && (
                          <Typography sx={{ position: 'absolute', bottom: 8, left: 8, px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: 'rgba(255,255,255,0.9)', color: '#666', fontSize: '0.65rem' }}>
                            품목 참고 이미지
                          </Typography>
                        )}
                        {/* 장바구니에 있는 상품 표시 */}
                        {product.cart && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              color: '#1976d2',
                              bgcolor: 'rgba(255,255,255,0.9)',
                              borderRadius: '50%',
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <CartIcon sx={{ fontSize: 18 }} />
                          </Box>
                        )}
                      </Box>

                      {/* 홀리데이 태그 */}
                      {(sortParam === 'best' || categoryParam === 'holiday') && (
                        <Chip
                          label="홀리데이"
                          size="small"
                          sx={{
                            bgcolor: '#ff6b00',
                            color: '#fff',
                            fontSize: '0.7rem',
                            height: 20,
                            mb: 0.5,
                          }}
                        />
                      )}

                      {/* 브랜드명 + 찜 버튼 */}
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ px: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {product.brand || 'MyShop'}
                          </Typography>

                          {/* 상품명 */}
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              mb: 0.5,
                            }}
                          >
                            {product.title}
                          </Typography>
                        </Box>

                        {/* 찜 버튼 + 좋아요 수 (우측) */}
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            ml: 1,
                          }}
                        >
                          <Box
                            sx={{
                              color: product.favorite ? '#ff4444' : '#999',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {product.favorite ? (
                              <HeartFilledIcon sx={{ fontSize: 22 }} />
                            ) : (
                              <HeartIcon sx={{ fontSize: 22 }} />
                            )}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              color: '#999',
                            }}
                          >
                            {(product.likeCount ?? 0) >= 9999 ? '9,999+' : (product.likeCount ?? 0).toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>

                      {/* 가격 */}
                      <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" sx={{ px: 1 }}>
                        {product.discountPercent && product.discountPercent > 0 && (
                          <>
                            <Typography
                              variant="caption"
                              sx={{ textDecoration: 'line-through', color: '#999' }}
                            >
                              {formatPrice(product.price)}
                            </Typography>
                            <Typography variant="body2" fontWeight={700} color="error">
                              {product.discountPercent}%
                            </Typography>
                          </>
                        )}
                        <Typography variant="body1" fontWeight={700}>
                          {formatPrice(getDiscountedPrice(product.price, product.discountPercent))}
                        </Typography>
                      </Stack>

                      {/* 평점 */}
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5, px: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          ★ {(product.scoreAverage ?? 0).toFixed(1)} ({product.reviewCount ?? 0})
                        </Typography>
                      </Stack>

                      {/* 뱃지들 */}
                      <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5, px: 1 }}>
                        <Chip label="쿠폰" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                        {index % 3 === 0 && (
                          <Chip label="단독" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                        )}
                        {index % 4 === 0 && (
                          <Chip label="오늘출발" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18, color: '#2196f3', borderColor: '#2196f3' }} />
                        )}
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </Box>
      </Box>
    </Container>
  )
}

export default ProductListPage
