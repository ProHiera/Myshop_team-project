import { getProductImage, handleProductImageError, isProductReferenceImage } from '@/utils/productImages'
import { useEffect, useState, useCallback, useRef } from 'react'
import gsap from 'gsap'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Link,
  Rating,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  FavoriteBorder,
  Favorite,
  ShoppingCartOutlined,
  LocalShipping,
} from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { fetchItemDetail, fetchItems, toggleFavoriteItem } from '@/api/itemApi'
import ProductCard from '@/components/common/ProductCard'
import { useCart } from '@/hooks/useCart'
import ReviewSection from '@/components/review/ReviewSection'
import type { ItemDetail, ItemSummary, ReviewListItem } from '@/types/api'
import { COLORS, type ColorKey } from '@/types/colors'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 4 }}>
    {value === index && children}
  </Box>
)

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // 장바구니 훅
  const { addToCart } = useCart()

  // GSAP refs
  const imageRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)

  // 상품 상세 데이터
  const [product, setProduct] = useState<ItemDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 선택된 옵션
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)

  // 이미지 슬라이더
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // 탭 상태
  const [tabValue, setTabValue] = useState(0)

  // 즐겨찾기 상태
  const [isFavorite, setIsFavorite] = useState(false)

  // 리뷰 목록 (ReviewSection에서 변경 시 갱신)
  const [reviews, setReviews] = useState<ReviewListItem[]>([])

  // 상품 상세 조회 API 호출
  const loadProduct = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await fetchItemDetail(id)
      setProduct(data)
      setIsFavorite(data.savedInLikes ?? false)
      // reviewList를 ReviewListItem 형태로 변환
      setReviews(
        (data.reviewList || []).map((r, idx) => ({
          review_no: String(idx),
          writer_id: 'user',
          score: r.score,
          content: r.content,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }))
      )
      
      // 기본 옵션 선택
      if (data.colorList?.length > 0) {
        setSelectedColor(data.colorList[0])
      }
      if (data.sizeList?.length > 0) {
        setSelectedSize(data.sizeList[0])
      }
    } catch (err) {
      console.error('상품 로드 실패:', err)
      setError('상품 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  useEffect(() => {
    let active = true
    setRelatedProducts([])
    if (!product) return

    fetchItems({ page: 0, size: 5, searchField: 'brand', searchTerm: product.brand || undefined })
      .then((response) => {
        if (active) {
          setRelatedProducts((response.content || [])
            .filter((item) => item.id !== product.id && (item.stock ?? 0) > 0)
            .slice(0, 4))
        }
      })
      .catch(() => {
        if (active) setRelatedProducts([])
      })

    return () => { active = false }
  }, [product])

  // GSAP 애니메이션
  useEffect(() => {
    if (!loading && product) {
      // 이미지 영역 페이드인
      if (imageRef.current) {
        gsap.fromTo(imageRef.current,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }
        )
      }
      // 상품 정보 영역 페이드인
      if (infoRef.current) {
        gsap.fromTo(infoRef.current,
          { opacity: 0, x: 30 },
          { opacity: 1, x: 0, duration: 0.6, delay: 0.15, ease: 'power2.out' }
        )
      }
    }
  }, [loading, product])

  // 리뷰 변경 시 재로드
  const handleReviewChange = () => {
    loadProduct()
  }

  // 수량 변경 핸들러
  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta))
  }

  // 즐겨찾기 토글
  const handleToggleFavorite = async () => {
    if (!id) return
    try {
      await toggleFavoriteItem(id)
      setIsFavorite((prev) => !prev)
    } catch (err) {
      console.error('즐겨찾기 처리 실패:', err)
    }
  }

  // 장바구니 담기
  const handleAddToCart = async () => {
    if (!id || !product) return
    // 옵션이 있는 경우에만 선택 체크
    const hasColorOption = product?.colorList && product.colorList.length > 0
    const hasSizeOption = product?.sizeList && product.sizeList.length > 0

    if (hasColorOption && !selectedColor) {
      alert('색상을 선택해주세요.')
      return
    }
    if (hasSizeOption && !selectedSize) {
      alert('사이즈를 선택해주세요.')
      return
    }
    try {
      // useCart 훅을 사용하여 장바구니에 추가
      const cartItem = {
        productId: id,
        productName: product.title,
        productImage: getProductImage(product.imageList?.[0] || product.mainImageUrl, product.title),
        price: product.price ?? 0,
        quantity: quantity,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        discountRate: product.discount_percent ?? 0,
      }
      await addToCart(cartItem)
      alert('장바구니에 담았습니다.')
    } catch (err) {
      console.error('장바구니 담기 실패:', err)
      alert('장바구니 담기에 실패했습니다.')
    }
  }

  // 바로구매: 장바구니에 담고 /cart로 이동
  const handleBuyNow = async () => {
    if (!id || !product) return
    // 옵션이 있는 경우에만 선택 체크
    const hasColorOption = product?.colorList && product.colorList.length > 0
    const hasSizeOption = product?.sizeList && product.sizeList.length > 0

    if (hasColorOption && !selectedColor) {
      alert('색상을 선택해주세요.')
      return
    }
    if (hasSizeOption && !selectedSize) {
      alert('사이즈를 선택해주세요.')
      return
    }
    try {
      // useCart 훅을 사용하여 장바구니에 추가 후 이동
      const cartItem = {
        productId: id,
        productName: product.title,
        productImage: getProductImage(product.imageList?.[0] || product.mainImageUrl, product.title),
        price: product.price ?? 0,
        quantity: quantity,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        discountRate: product.discount_percent ?? 0,
      }
      await addToCart(cartItem)
      navigate('/cart')
    } catch (err) {
      console.error('바로구매 실패:', err)
      alert('처리에 실패했습니다.')
    }
  }

  // 로딩 또는 product가 없는 경우 early return
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={6}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rectangular" width={80} height={80} />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="text" width="30%" height={30} />
            <Skeleton variant="text" width="80%" height={50} sx={{ mt: 1 }} />
            <Skeleton variant="text" width="50%" height={40} sx={{ mt: 2 }} />
            <Skeleton variant="rectangular" height={56} sx={{ mt: 4 }} />
            <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
          </Grid>
        </Grid>
      </Container>
    )
  }

  // 에러 상태 또는 상품 없음 - product가 null/undefined인 경우
  if (error || !product) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error || '상품을 찾을 수 없습니다.'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/products')} sx={{ mt: 2 }}>
          상품 목록으로 돌아가기
        </Button>
      </Container>
    )
  }

  // 여기서 product는 확실히 존재 - 가격 계산
  const productPrice = product.price ?? 0
  const discountPercent = product.discountPercent ?? product.discount_percent ?? 0
  const finalPrice = product.realPrice ?? (discountPercent > 0
    ? productPrice * (1 - discountPercent / 100)
    : productPrice)

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs 네비게이션 */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link component={RouterLink} to="/" color="inherit" underline="hover">
          홈
        </Link>
        <Link component={RouterLink} to="/products" color="inherit" underline="hover">
          상품
        </Link>
        <Typography color="text.primary">{product.title}</Typography>
      </Breadcrumbs>

      <Grid container spacing={6}>
        {/* 좌측: 상품 이미지 슬라이더 */}
        <Grid item xs={12} md={6} ref={imageRef}>
          {/* 메인 이미지 */}
          <Box
            sx={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'grey.100',
            }}
          >
            <Box
              component="img"
              src={getProductImage(product.imageList?.[selectedImageIndex] || product.mainImageUrl, product.title)}
              alt={product.title}
              onError={(event) => handleProductImageError(event, product.title)}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {isProductReferenceImage(product.imageList?.[selectedImageIndex] || product.mainImageUrl, product.title) && (
              <Typography sx={{ position: 'absolute', bottom: 12, left: 12, px: 1, py: 0.5, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.9)', color: '#666', fontSize: '0.75rem' }}>
                품목 참고 이미지
              </Typography>
            )}
            {/* 할인 뱃지 */}
            {discountPercent > 0 && (
              <Chip
                label={`${discountPercent}% OFF`}
                color="error"
                size="small"
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  fontWeight: 700,
                }}
              />
            )}
          </Box>

          {/* 썸네일 리스트 */}
          <Stack direction="row" spacing={1} sx={{ mt: 2, overflowX: 'auto' }}>
            {product.imageList?.map((img, index) => (
              <Box
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: selectedImageIndex === index ? '2px solid' : '1px solid',
                  borderColor: selectedImageIndex === index ? 'primary.main' : 'grey.300',
                  opacity: selectedImageIndex === index ? 1 : 0.7,
                  transition: 'all 0.2s',
                  '&:hover': { opacity: 1 },
                }}
              >
                <Box
                  component="img"
                  src={getProductImage(img, product.title)}
                  alt={`${product.title} ${index + 1}`}
                  onError={(event) => handleProductImageError(event, product.title)}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ))}
          </Stack>
        </Grid>

        {/* 우측: 상품 정보 영역 */}
        <Grid item xs={12} md={6} ref={infoRef}>
          {/* 브랜드 */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {product.brand}
          </Typography>

          {/* 상품명 */}
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {product.title}
          </Typography>

          {/* 리뷰 평점 */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Rating
              value={product.reviewAverage ?? 0}
              precision={0.5}
              readOnly
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              {(product.reviewAverage ?? 0).toFixed(1)} ({product.reviewCount ?? 0}개 리뷰)
            </Typography>
          </Stack>

          {/* 가격 */}
          <Box sx={{ mb: 3 }}>
            {discountPercent > 0 && (
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ textDecoration: 'line-through' }}
                >
                  {productPrice.toLocaleString()}원
                </Typography>
                <Chip
                  label={`${discountPercent}%`}
                  color="error"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            )}
            <Typography variant="h4" fontWeight={800} color="primary">
              {finalPrice.toLocaleString()}원
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 옵션 선택: 색상 */}
          {product.colorList && product.colorList.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                색상 {selectedColor && (
                  <Typography component="span" fontWeight={600} color="text.primary">
                    : {COLORS[selectedColor as ColorKey]?.name || selectedColor}
                  </Typography>
                )}
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {product.colorList.map((color) => {
                  const colorInfo = COLORS[color as ColorKey]
                  const isSelected = selectedColor === color
                  const lightColors = ['#FFFFF0', '#FFFF00', '#F5F5DC', '#FFC0CB', '#FFA500', '#C3B091']
                  const isLightColor = lightColors.includes(colorInfo?.hex || '')
                  return (
                    <Box
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: colorInfo?.hex || '#ccc',
                        cursor: 'pointer',
                        border: isSelected ? '3px solid' : '2px solid',
                        borderColor: isSelected ? 'primary.main' : 'grey.300',
                        boxShadow: isSelected ? '0 0 0 2px #fff, 0 0 0 4px #1976d2' : 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          borderColor: isSelected ? 'primary.main' : 'grey.500',
                        },
                      }}
                      title={colorInfo?.name || color}
                    >
                      {isSelected && (
                        <Typography
                          sx={{
                            color: isLightColor ? '#000' : '#fff',
                            fontWeight: 700,
                            fontSize: '1.2rem',
                            lineHeight: 1,
                          }}
                        >
                          ✓
                        </Typography>
                      )}
                    </Box>
                  )
                })}
              </Stack>
            </Box>
          )}

          {/* 옵션 선택: 사이즈 */}
          {product.sizeList && product.sizeList.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                사이즈 {selectedSize && (
                  <Typography component="span" fontWeight={600} color="text.primary">
                    : {selectedSize}
                  </Typography>
                )}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {product.sizeList.map((size) => {
                  const isSelected = selectedSize === size
                  return (
                    <Box
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      sx={{
                        minWidth: 48,
                        height: 48,
                        px: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: isSelected ? 'primary.main' : 'grey.300',
                        backgroundColor: isSelected ? 'primary.main' : 'transparent',
                        color: isSelected ? 'white' : 'text.primary',
                        fontWeight: isSelected ? 700 : 500,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: isSelected ? 'primary.dark' : 'grey.500',
                          backgroundColor: isSelected ? 'primary.dark' : 'grey.100',
                        },
                      }}
                    >
                      {size}
                    </Box>
                  )
                })}
              </Stack>
            </Box>
          )}

          {/* 수량 선택 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              수량
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                sx={{ border: '1px solid', borderColor: 'grey.300' }}
              >
                <RemoveIcon />
              </IconButton>
              <Typography
                sx={{
                  minWidth: 50,
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                }}
              >
                {quantity}
              </Typography>
              <IconButton
                onClick={() => handleQuantityChange(1)}
                sx={{ border: '1px solid', borderColor: 'grey.300' }}
              >
                <AddIcon />
              </IconButton>
            </Stack>
          </Box>

          {/* 총 금액 */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body1">총 상품금액</Typography>
              <Typography variant="h5" fontWeight={800} color="primary">
                {(finalPrice * quantity).toLocaleString()}원
              </Typography>
            </Stack>
          </Box>

          {/* 액션 버튼 */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            {/* 즐겨찾기 버튼 */}
            <IconButton
              onClick={handleToggleFavorite}
              sx={{
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 2,
                p: 1.5,
              }}
            >
              {isFavorite ? (
                <Favorite sx={{ color: 'error.main' }} />
              ) : (
                <FavoriteBorder />
              )}
            </IconButton>

            {/* 장바구니 담기 버튼 */}
            <Button
              variant="outlined"
              size="large"
              startIcon={<ShoppingCartOutlined />}
              onClick={handleAddToCart}
              sx={{ flex: 1, py: 1.5 }}
            >
              장바구니 담기
            </Button>

            {/* 바로구매 버튼 - SPEC: 장바구니에 담고 /cart로 이동 */}
            <Button
              variant="contained"
              size="large"
              onClick={handleBuyNow}
              sx={{ flex: 1, py: 1.5 }}
            >
              바로구매
            </Button>
          </Stack>

          {/* 배송 안내 */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
            <LocalShipping fontSize="small" />
            <Typography variant="body2">무료배송 | 오늘 출발</Typography>
          </Stack>
        </Grid>
      </Grid>

      {/* 탭 영역: 상세설명, 리뷰, Q&A */}
      <Box sx={{ mt: 8, borderTop: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="상세설명" />
          <Tab
            label={
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <span>리뷰</span>
                <Chip
                  label={product.reviewList?.length || 0}
                  size="small"
                  color="primary"
                  sx={{ height: 20, fontSize: '0.75rem' }}
                />
              </Stack>
            }
          />
          <Tab label="Q&A" />
        </Tabs>

        {/* 상세설명 탭 */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ minHeight: 300 }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {product.description || '상품 상세 설명이 없습니다.'}
            </Typography>
          </Box>
        </TabPanel>

        {/* 리뷰 탭 */}
        <TabPanel value={tabValue} index={1}>
          <ReviewSection
            itemId={id!}
            reviews={reviews}
            onReviewChange={handleReviewChange}
          />
        </TabPanel>

        {/* Q&A 탭 */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ minHeight: 300, textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">
              상품 관련 문의는 게시판을 이용해주세요.
            </Typography>
            <Button
              component={RouterLink}
              to="/board/qna"
              variant="outlined"
              sx={{ mt: 2 }}
            >
              Q&A 게시판 바로가기
            </Button>
          </Box>
        </TabPanel>
      </Box>

      {/* 실제 API 상품만 표시하며, 상품 목록을 읽을 수 없으면 생략합니다. */}
      {relatedProducts.length > 0 && (
        <Box sx={{ mt: 8 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            함께 둘러볼 상품
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {relatedProducts.map((item) => (
              <Grid item xs={6} sm={3} key={item.id}>
                <ProductCard product={{
                  id: item.id,
                  title: item.title,
                  brand: item.brand,
                  price: item.price,
                  discountPercent: item.discountPercent,
                  mainImage: getProductImage(item.mainImageUrl, item.title),
                }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  )
}

export default ProductDetailPage
