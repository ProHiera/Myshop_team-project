import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
import { Box, Button, Grid, Typography, CircularProgress, Stack, IconButton, TextField, Snackbar, Alert, Dialog, DialogContent, DialogActions } from '@mui/material'
import {
  AutoAwesome,
  KeyboardArrowUp,
  AcUnit,
  LocalOffer,
  Explore,
  LocalMall,
  Timer,
  LiveTv,
  EmojiEvents,
  Apps,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material'
import { Link, useNavigate } from 'react-router-dom'
import ProductCard from '@/components/common/ProductCard'
import { fetchItems } from '@/api/itemApi'
import type { ItemSummary } from '@/types/api'
import { fetchActiveBanners, type Banner } from '@/api/bannerApi'
import { useAiRecommend, type AiRecommendWithProduct } from '@/hooks/useAiRecommend'
import type { ProductSummary } from '@/types/product'
import { glassmorphism } from '@/theme/tokens'
import { getRecommendationSearchParams } from '@/utils/aiRecommendation'
import { FASHION_IMAGES, getFashionImage, getProductImage, handleProductImageError, isProductReferenceImage } from '@/utils/productImages'

// 히어로 섹션 캐러셀 카드 데이터 (회전용)
// 좌측: 남성 (1-3), 우측: 여성 (4-6)
const carouselCards = [
  { id: 1, image: '/images/carousel-man-1.jpg', title: 'STREET' },
  { id: 2, image: '/images/carousel-man-2.jpg', title: 'MINIMAL' },
  { id: 3, image: '/images/carousel-man-3.jpg', title: 'CASUAL' },
  { id: 4, image: '/images/carousel-woman-1.jpg', title: 'STREET' },
  { id: 5, image: '/images/carousel-woman-2.jpg', title: 'MINIMAL' },
  { id: 6, image: '/images/carousel-woman-3.jpg', title: 'CASUAL' },
]

// 기본 배너: 각 제목의 품목에 맞춰 고른 로컬 패션 사진
const defaultBannerSlides = [
  [
    { id: 1, image: FASHION_IMAGES.backpack, fallback: FASHION_IMAGES.backpack, label: 'DAILY\nBAG', brand: 'BACKPACK', title: '블랙 데일리 백팩', subtitle: '가볍게 완성하는 데일리룩', link: '/products?category=BAGS' },
    { id: 2, image: FASHION_IMAGES.sneakers, fallback: FASHION_IMAGES.sneakers, label: 'DAILY\nSHOES', brand: 'SNEAKERS', title: '화이트 스니커즈', subtitle: '매일 신기 좋은 클래식 스타일', link: '/products?category=SHOES' },
    { id: 3, image: FASHION_IMAGES.sweater, fallback: FASHION_IMAGES.sweater, label: 'SOFT\nKNIT', brand: 'KNITWEAR', title: '베이지 라운드 니트', subtitle: '부드러운 컬러의 니트웨어', link: '/products?middleCategory=TOP&searchTerm=니트' },
  ],
  [
    { id: 4, image: FASHION_IMAGES.hoodie, fallback: FASHION_IMAGES.hoodie, label: 'CASUAL\nESSENTIAL', brand: 'HOODIE', title: '화이트 데일리 후디', subtitle: '편안한 실루엣의 캐주얼웨어', link: '/products?middleCategory=TOP&searchTerm=후드' },
    { id: 5, image: FASHION_IMAGES.jacket, fallback: FASHION_IMAGES.jacket, label: 'LEATHER\nSTYLE', brand: 'JACKET', title: '브라운 레더 재킷', subtitle: '스타일에 깊이를 더하는 아우터', link: '/products?middleCategory=OUTER&searchTerm=재킷' },
    { id: 6, image: FASHION_IMAGES.shirt, fallback: FASHION_IMAGES.shirt, label: 'CLEAN\nSTYLE', brand: 'SHIRT', title: '화이트 클래식 셔츠', subtitle: '깔끔하게 완성하는 데일리 스타일', link: '/products?middleCategory=TOP&searchTerm=셔츠' },
  ],
  [
    { id: 7, image: FASHION_IMAGES.dress, fallback: FASHION_IMAGES.dress, label: 'SOFT\nSILHOUETTE', brand: 'DRESS', title: '베이지 롱 원피스', subtitle: '차분한 컬러와 여유로운 실루엣', link: '/products?middleCategory=DRESS' },
    { id: 8, image: FASHION_IMAGES.coat, fallback: FASHION_IMAGES.coat, label: 'OUTER\nCOLLECTION', brand: 'COAT', title: '카키 롱 코트', subtitle: '레이어드하기 좋은 롱 아우터', link: '/products?middleCategory=OUTER&searchTerm=코트' },
    { id: 9, image: FASHION_IMAGES.jeans, fallback: FASHION_IMAGES.jeans, label: 'DENIM\nEDIT', brand: 'DENIM', title: '데일리 데님 컬렉션', subtitle: '다양한 워싱으로 완성하는 캐주얼룩', link: '/products?middleCategory=BOTTOM&searchTerm=데님' },
  ],
]

// DB 배너를 슬라이드 형식으로 변환 (3개씩 그룹)
const convertBannersToSlides = (banners: Banner[]) => {
  if (banners.length === 0) return defaultBannerSlides

  const slides: Array<Array<{
    id: number
    image: string
    fallback: string
    label: string
    brand: string
    title: string
    subtitle: string
    link: string
  }>> = []

  for (let i = 0; i < banners.length; i += 3) {
    const group = banners.slice(i, i + 3).map((banner) => ({
      id: banner.id,
      image: getProductImage(banner.imageUrl, banner.title),
      fallback: getFashionImage(banner.title),
      label: '',
      brand: '',
      title: banner.title,
      subtitle: '',
      link: banner.linkUrl || '/products',
    }))
    slides.push(group)
  }

  return slides
}

const HomePage = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)

  // GSAP refs
  const heroRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLDivElement>(null)
  const heroSubtitleRef = useRef<HTMLDivElement>(null)
  const aiBoxRef = useRef<HTMLDivElement>(null)
  const quickMenuRef = useRef<HTMLDivElement>(null)
  const todayRecommendRef = useRef<HTMLDivElement>(null)
  const bestSectionRef = useRef<HTMLDivElement>(null)
  const newArrivalRef = useRef<HTMLDivElement>(null)
  const couponSectionRef = useRef<HTMLDivElement>(null)
  const coupon1Ref = useRef<HTMLButtonElement>(null)
  const coupon2Ref = useRef<HTMLButtonElement>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [bannerSlideIndex, setBannerSlideIndex] = useState(0)
  const [bannerSlides, setBannerSlides] = useState(defaultBannerSlides)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })
  const [productPreview, setProductPreview] = useState<{
    open: boolean
    product: ProductSummary | null
    aiResult: AiRecommendWithProduct | null
  }>({
    open: false,
    product: null,
    aiResult: null
  })
  const { getRecommendation, loading: isAiLoading } = useAiRecommend()

  // GSAP 애니메이션
  useEffect(() => {
    // 히어로 섹션 초기 애니메이션
    const ctx = gsap.context(() => {
      // 타이틀 페이드인
      if (heroTitleRef.current) {
        gsap.fromTo(heroTitleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
        )
      }
      // 서브타이틀 페이드인 (딜레이)
      if (heroSubtitleRef.current) {
        gsap.fromTo(heroSubtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' }
        )
      }
      // AI 박스 페이드인 (딜레이)
      if (aiBoxRef.current) {
        gsap.fromTo(aiBoxRef.current,
          { opacity: 0, y: 40, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, delay: 0.4, ease: 'power3.out' }
        )
      }
      // 퀵메뉴 아이템들 순차적 등장
      if (quickMenuRef.current) {
        gsap.fromTo(quickMenuRef.current.children,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out',
            scrollTrigger: {
              trigger: quickMenuRef.current,
              start: 'top 85%',
            }
          }
        )
      }
      // 오늘의 추천 섹션
      if (todayRecommendRef.current) {
        gsap.fromTo(todayRecommendRef.current.querySelectorAll('.product-card'),
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
            scrollTrigger: {
              trigger: todayRecommendRef.current,
              start: 'top 80%',
            }
          }
        )
      }
      // 베스트 섹션
      if (bestSectionRef.current) {
        gsap.fromTo(bestSectionRef.current.querySelectorAll('.product-card'),
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out',
            scrollTrigger: {
              trigger: bestSectionRef.current,
              start: 'top 80%',
            }
          }
        )
      }
      // 신상품 섹션
      if (newArrivalRef.current) {
        gsap.fromTo(newArrivalRef.current.querySelectorAll('.product-card'),
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
            scrollTrigger: {
              trigger: newArrivalRef.current,
              start: 'top 80%',
            }
          }
        )
      }
      // 쿠폰 섹션 애니메이션
      if (couponSectionRef.current) {
        // 섹션 전체 페이드인
        gsap.fromTo(couponSectionRef.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
            scrollTrigger: {
              trigger: couponSectionRef.current,
              start: 'top 85%',
            }
          }
        )
      }
      // 쿠폰1 플로팅 애니메이션
      if (coupon1Ref.current) {
        gsap.to(coupon1Ref.current, {
          y: -8,
          duration: 1.5,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: -1,
        })
      }
      // 쿠폰2 플로팅 애니메이션 (약간 딜레이)
      if (coupon2Ref.current) {
        gsap.to(coupon2Ref.current, {
          y: -8,
          duration: 1.5,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.3,
        })
      }
    }, heroRef)

    return () => ctx.revert()
  }, [loading])

  // 캐러셀 자동 회전 (requestAnimationFrame 기반)
  useEffect(() => {
    let animationId: number
    let lastTime = performance.now()
    const intervalMs = 3000 // 3초

    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= intervalMs) {
        setCarouselIndex((prev) => (prev + 1) % carouselCards.length)
        lastTime = currentTime
      }
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  // 배너 슬라이더 자동 회전 (requestAnimationFrame 기반)
  useEffect(() => {
    let animationId: number
    let lastTime = performance.now()
    const intervalMs = 5000 // 5초

    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= intervalMs) {
        setBannerSlideIndex((prev) => (prev + 1) % bannerSlides.length)
        lastTime = currentTime
      }
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [bannerSlides.length])

  // DB에서 배너 데이터 로드
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const banners = await fetchActiveBanners()
        if (banners && banners.length > 0) {
          const slides = convertBannersToSlides(banners)
          setBannerSlides(slides)
        }
      } catch (err) {
        console.error('배너 로드 실패, 기본 배너 사용:', err)
        // 에러 시 기본 배너 유지
      }
    }
    loadBanners()
  }, [])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // 홈페이지에 더 많은 상품을 가져와서 BEST 8개 + NEW ARRIVALS 8개 + 오늘의 추천 4개 = 20개
        const response = await fetchItems({ page: 0, size: 24 })
        // 재고가 0인 상품은 필터링하여 표시하지 않음 (판매중지 상품)
        const availableItems = (response.content || []).filter((item: ItemSummary) => (item.stock ?? 1) > 0)
        const mapped: ProductSummary[] = availableItems.slice(0, 20).map((item: ItemSummary) => ({
          id: item.id,
          title: item.title,
          brand: item.brand || 'MyShop',
          price: item.price,
          discountPercent: item.discountPercent,
          mainImage: getProductImage(item.mainImageUrl, item.title),
        }))
        setProducts(mapped)
      } catch (err) {
        console.error('상품 로드 실패:', err)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim() || isAiLoading) return

    try {
      const result = await getRecommendation(aiPrompt)
      if (result.matchedProduct) {
        setProductPreview({ open: true, product: result.matchedProduct, aiResult: result })
      } else {
        const searchParams = getRecommendationSearchParams(result)
        setSnackbar({
          open: true,
          message: '추천 조건에 맞는 판매 중 상품을 찾지 못했습니다. 검색 조건을 확인해 주세요.',
          severity: 'error',
        })
        navigate(`/products?${searchParams.toString()}`)
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'AI 추천 중 오류가 발생했습니다. 다시 시도해주세요.',
        severity: 'error',
      })
    }
  }

  // 상품 미리보기에서 상품 페이지로 이동
  const handleGoToProduct = () => {
    if (productPreview.product) {
      setProductPreview({ open: false, product: null, aiResult: null })
      navigate(`/products/${productPreview.product.id}`)
    }
  }

  // 미리보기 닫고 검색 결과로 이동
  const handleGoToSearch = () => {
    if (productPreview.aiResult) {
      const searchParams = getRecommendationSearchParams(
        productPreview.aiResult, productPreview.product?.title,
      )
      setProductPreview({ open: false, product: null, aiResult: null })
      navigate(`/products?${searchParams.toString()}`)
    }
  }

  // 미리보기 닫기
  const handleClosePreview = () => {
    setProductPreview({ open: false, product: null, aiResult: null })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // 좌측 카드 (펼쳐진 스택 형태)
  const renderLeftCard = (card: typeof carouselCards[0], index: number) => {
    // 0, 1, 2번 카드만 좌측에 표시
    const adjustedIndex = (index - carouselIndex + carouselCards.length) % carouselCards.length
    if (adjustedIndex >= 3) return null

    // 부채꼴 모양 - 위에서 아래로 내려가면서 펼침
    const positions = [
      { x: -100, y: 60, rotate: -18, scale: 0.75, zIndex: 1, opacity: 0.5 },
      { x: -45, y: 25, rotate: -9, scale: 0.88, zIndex: 2, opacity: 0.75 },
      { x: 0, y: 0, rotate: 0, scale: 1, zIndex: 3, opacity: 1 },
    ]
    const style = positions[adjustedIndex]

    return (
      <Box
        key={card.id}
        sx={{
          position: 'absolute',
          width: { xs: 100, sm: 130, md: 160 },
          height: { xs: 140, sm: 170, md: 210 },
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translate(${style.x}%, ${style.y}%) rotate(${style.rotate}deg) scale(${style.scale})`,
          zIndex: style.zIndex,
          opacity: style.opacity,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          right: '100%',
          mr: { xs: 1, md: 2 },
          top: '50%',
          marginTop: { xs: '-70px', sm: '-85px', md: '-105px' },
        }}
      >
        <Box
          component="img"
          src={card.image}
          alt={card.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            p: 1.2,
            pr: 2,
            textAlign: 'right',
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '0.65rem', md: '0.8rem' } }}>
            {card.title}
          </Typography>
        </Box>
      </Box>
    )
  }

  // 우측 카드 (좌측과 대칭되는 펼쳐진 스택)
  const renderRightCard = (card: typeof carouselCards[0], index: number) => {
    // 3, 4, 5번 카드만 우측에 표시
    const adjustedIndex = (index - carouselIndex + carouselCards.length) % carouselCards.length
    if (adjustedIndex < 3) return null

    const posIndex = adjustedIndex - 3
    // 좌측과 대칭 - 부채꼴 모양 위에서 아래로 내려가면서 펼침
    const positions = [
      { x: 0, y: 0, rotate: 0, scale: 1, zIndex: 3, opacity: 1 },
      { x: 45, y: 25, rotate: 9, scale: 0.88, zIndex: 2, opacity: 0.75 },
      { x: 100, y: 60, rotate: 18, scale: 0.75, zIndex: 1, opacity: 0.5 },
    ]
    const style = positions[posIndex]

    return (
      <Box
        key={card.id}
        sx={{
          position: 'absolute',
          width: { xs: 100, sm: 130, md: 160 },
          height: { xs: 140, sm: 170, md: 210 },
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translate(${style.x}%, ${style.y}%) rotate(${style.rotate}deg) scale(${style.scale})`,
          zIndex: style.zIndex,
          opacity: style.opacity,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          left: '100%',
          ml: { xs: 1, md: 2 },
          top: '50%',
          marginTop: { xs: '-70px', sm: '-85px', md: '-105px' },
        }}
      >
        <Box
          component="img"
          src={card.image}
          alt={card.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            p: 1.2,
            pl: 2,
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '0.65rem', md: '0.8rem' } }}>
            {card.title}
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box ref={heroRef} sx={{ bgcolor: '#fff' }}>
      {/* 히어로 섹션 - 회전 캐러셀 + AI 프롬프트 */}
      <Box sx={{ position: 'relative', bgcolor: '#f5f5f5', py: { xs: 6, md: 10 }, overflow: 'hidden' }}>
        {/* 상단 어필 문구 */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 5 } }}>
          <Typography
            ref={heroTitleRef}
            sx={{
              color: '#1a1a1a',
              fontSize: { xs: '1.3rem', md: '1.8rem' },
              fontWeight: 700,
              mb: 1,
            }}
          >
            원하는 스타일을 말해주세요!
          </Typography>
          <Typography
            ref={heroSubtitleRef}
            sx={{
              color: '#666',
              fontSize: { xs: '0.9rem', md: '1rem' },
            }}
          >
            AI가 당신만의 완벽한 코디를 추천해드릴게요
          </Typography>
        </Box>

        {/* 중앙 AI 입력창 + 양옆 회전 캐러셀 */}
        <Box
          sx={{
            position: 'relative',
            mx: 'auto',
            width: { xs: '90%', sm: '70%', md: '40%' },
            maxWidth: 500,
          }}
        >
          {/* 좌측 회전 캐러셀 - 부채꼴 세로 배치 */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {carouselCards.map((card, index) => renderLeftCard(card, index))}
          </Box>

          {/* AI 프롬프트 입력창 */}
          <Box
            ref={aiBoxRef}
            sx={{
              position: 'relative',
              zIndex: 10,
              bgcolor: glassmorphism.light.background,
              backdropFilter: glassmorphism.light.backdropFilter,
              border: glassmorphism.light.border,
              borderRadius: 3,
              p: 2.5,
              mx: { xs: 2, sm: 3 },
              boxShadow: glassmorphism.light.boxShadow,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            {/* 상단 AI 라벨 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
              <AutoAwesome sx={{ color: '#6366F1', fontSize: 16 }} />
              <Typography sx={{ color: '#1a1a1a', fontSize: '0.8rem', fontWeight: 600 }}>
                MyShop AI
              </Typography>
            </Box>

            {/* 텍스트 입력 영역 */}
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="예: 데이트룩 추천해줘, 출근할 때 입을 깔끔한 코디, 겨울에 따뜻한 캐주얼 스타일..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value.slice(0, 1000))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAiSubmit()
                }
              }}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  },
                },
              }}
              sx={{
                '& .MuiInputBase-input::placeholder': {
                  color: '#999',
                  opacity: 1,
                },
              }}
            />

            {/* 하단 영역: 글자수 + 전송버튼 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
              <Typography sx={{ color: '#bbb', fontSize: '0.75rem' }}>
                {aiPrompt.length} / 1000
              </Typography>
              <IconButton
                onClick={handleAiSubmit}
                disabled={isAiLoading || !aiPrompt.trim()}
                size="small"
                sx={{
                  bgcolor: aiPrompt.trim() ? '#6366F1' : '#e0e0e0',
                  color: aiPrompt.trim() ? 'white' : '#999',
                  width: 32,
                  height: 32,
                  transition: 'all 0.2s ease',
                  cursor: aiPrompt.trim() ? 'pointer' : 'not-allowed',
                  '&:hover': {
                    bgcolor: aiPrompt.trim() ? '#4F46E5' : '#d0d0d0',
                    transform: aiPrompt.trim() ? 'scale(1.05)' : 'none',
                  },
                  '&.Mui-disabled': {
                    color: '#999',
                    bgcolor: '#e0e0e0',
                    pointerEvents: 'auto',
                  },
                }}
              >
                {isAiLoading ? <CircularProgress size={16} color="inherit" /> : <KeyboardArrowUp sx={{ fontSize: 20 }} />}
              </IconButton>
            </Box>
          </Box>

          {/* 우측 회전 캐러셀 - 가로로 펼침 */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {carouselCards.map((card, index) => renderRightCard(card, index))}
          </Box>
        </Box>

        {/* 하단 안내 태그들 */}
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
          sx={{ mt: 4, px: 2, gap: 1 }}
        >
          {['#캐주얼', '#오피스룩', '#데이트', '#스트릿', '#미니멀'].map((tag) => (
            <Box
              key={tag}
              onClick={() => setAiPrompt(prev => prev + ' ' + tag.replace('#', ''))}
              sx={{
                px: 2,
                py: 0.8,
                bgcolor: glassmorphism.subtle.background,
                backdropFilter: glassmorphism.subtle.backdropFilter,
                border: glassmorphism.subtle.border,
                borderRadius: 5,
                fontSize: '0.8rem',
                color: '#666',
                cursor: 'pointer',
                boxShadow: glassmorphism.subtle.boxShadow,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(99, 102, 241, 0.9)',
                  color: 'white',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                },
              }}
            >
              {tag}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* 메인 배너 슬라이더 (좌우 슬라이드) */}
      <Box sx={{ bgcolor: '#1a1a1a', py: { xs: 2, md: 3 }, position: 'relative' }}>
        {/* 좌측 화살표 - 화면 끝 */}
        <IconButton
          onClick={() => setBannerSlideIndex((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)}
          sx={{
            position: 'absolute',
            left: { xs: 8, md: 24 },
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            bgcolor: 'rgba(255,255,255,0.9)',
            '&:hover': { bgcolor: 'white' },
            boxShadow: 2,
            width: { xs: 36, md: 48 },
            height: { xs: 36, md: 48 },
          }}
        >
          <ChevronLeft sx={{ fontSize: { xs: 24, md: 32 } }} />
        </IconButton>

        {/* 우측 화살표 - 화면 끝 */}
        <IconButton
          onClick={() => setBannerSlideIndex((prev) => (prev + 1) % bannerSlides.length)}
          sx={{
            position: 'absolute',
            right: { xs: 8, md: 24 },
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            bgcolor: 'rgba(255,255,255,0.9)',
            '&:hover': { bgcolor: 'white' },
            boxShadow: 2,
            width: { xs: 36, md: 48 },
            height: { xs: 36, md: 48 },
          }}
        >
          <ChevronRight sx={{ fontSize: { xs: 24, md: 32 } }} />
        </IconButton>

        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, md: 4 } }}>

          {/* 배너 카드들 */}
          <Box sx={{ overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'flex',
                transition: 'transform 0.5s ease-in-out',
                transform: `translateX(-${bannerSlideIndex * 100}%)`,
              }}
            >
              {bannerSlides.map((slideGroup, groupIndex) => (
                <Box
                  key={groupIndex}
                  sx={{
                    minWidth: '100%',
                    display: 'flex',
                    gap: 1.5,
                    px: 0.5,
                  }}
                >
                  {slideGroup.map((banner) => (
                    <Box
                      key={banner.id}
                      component={Link}
                      to={banner.link}
                      sx={{
                        flex: 1,
                        display: 'block',
                        position: 'relative',
                        height: { xs: 320, md: 480 },
                        borderRadius: 1,
                        overflow: 'hidden',
                        textDecoration: 'none',
                        '&:hover img': { transform: 'scale(1.03)' },
                      }}
                    >
                      <Box
                        component="img"
                        src={banner.image}
                        alt={banner.title}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s ease',
                          bgcolor: '#2a2a2a',
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.src = banner.fallback
                        }}
                      />
                      {/* 좌상단 라벨 */}
                      <Box sx={{ position: 'absolute', top: 20, left: 20, color: 'white' }}>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                          {banner.label}
                        </Typography>
                      </Box>
                      {/* 우상단 브랜드 */}
                      {banner.brand && (
                        <Typography
                          sx={{
                            position: 'absolute',
                            top: 20,
                            right: 20,
                            color: 'white',
                            fontSize: '1.2rem',
                            fontWeight: 300,
                            fontStyle: 'italic',
                          }}
                        >
                          {banner.brand}
                        </Typography>
                      )}
                      {/* 하단 텍스트 */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                          p: 2.5,
                          pt: 6,
                        }}
                      >
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
                          {banner.title}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                          {banner.subtitle}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>

          {/* 인디케이터 점 */}
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            {bannerSlides.map((_, index) => (
              <Box
                key={index}
                onClick={() => setBannerSlideIndex(index)}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: index === bannerSlideIndex ? 'white' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Box>

      {/* 퀵 메뉴 - 심플한 아이콘 */}
      <Box sx={{ bgcolor: '#fff', py: 3, borderBottom: '1px solid #eee' }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 } }}>
          <Stack
            ref={quickMenuRef}
            direction="row"
            spacing={{ xs: 2, md: 4 }}
            alignItems="flex-start"
            justifyContent="center"
            sx={{
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {[
              { icon: AcUnit, label: '겨울 컬렉션', path: '/products?middleCategory=OUTER' },
              { icon: LocalOffer, label: '특가', path: '/products?sort=sale' },
              { icon: Explore, label: '신상품', path: '/products?sort=new' },
              { icon: LocalMall, label: '베스트', path: '/products?sort=best' },
              { icon: Timer, label: '타임세일', path: '/products?timesale=true' },
              { icon: LiveTv, label: '라이브', path: '/live' },
              { icon: EmojiEvents, label: '랭킹', path: '/products?sort=rank' },
              { icon: Apps, label: '전체', path: '/products' },
            ].map((item) => {
              const IconComponent = item.icon
              return (
                <Box
                  key={item.label}
                  component={Link}
                  to={item.path}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 60,
                    textDecoration: 'none',
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      mb: 1,
                      bgcolor: glassmorphism.button.background,
                      backdropFilter: glassmorphism.button.backdropFilter,
                      border: glassmorphism.button.border,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: glassmorphism.button.boxShadow,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                        transform: 'translateY(-2px)',
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                      },
                    }}
                  >
                    <IconComponent sx={{ fontSize: 24, color: '#333' }} />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: '#555',
                      textAlign: 'center',
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              )
            })}
          </Stack>
        </Box>
      </Box>

      {/* 오늘의 추천 */}
      <Box ref={todayRecommendRef} sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 3 } }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
              오늘의 추천
            </Typography>
            <Typography sx={{ color: '#888', fontSize: '0.85rem', mt: 0.5 }}>
              당신을 위한 큐레이션
            </Typography>
          </Box>
          <Button component={Link} to="/products" sx={{ color: '#1a1a1a', fontWeight: 600, fontSize: '0.85rem' }}>
            전체보기 &rarr;
          </Button>
        </Box>
        <Grid container spacing={{ xs: 1, md: 2 }}>
          {products.slice(0, 4).map((product) => (
            <Grid item xs={6} md={3} key={product.id} className="product-card">
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 셀프 웨딩 비디오 섹션 */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: 400, md: 500 },
          overflow: 'hidden',
        }}
      >
        {/* 배경 비디오 */}
        <Box
          component="video"
          autoPlay
          loop
          muted
          playsInline
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'cover',
          }}
        >
          <source src="/videos/wedding.mp4" type="video/mp4" />
        </Box>

        {/* 오버레이 */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)',
          }}
        />

        {/* 콘텐츠 */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { xs: 3, md: 10 },
            maxWidth: 1400,
            mx: 'auto',
          }}
        >
          {/* 태그 */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              px: 2,
              py: 0.8,
              borderRadius: 5,
              width: 'fit-content',
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: '#f472b6',
              }}
            />
            <Typography sx={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              WEDDING COLLECTION
            </Typography>
          </Box>

          {/* 메인 타이틀 */}
          <Typography
            sx={{
              color: 'white',
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3.5rem' },
              lineHeight: 1.2,
              mb: 2,
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            셀프 웨딩도<br />
            마이샵에서 준비하세요!
          </Typography>

          {/* 서브 타이틀 */}
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: { xs: '1rem', md: '1.2rem' },
              mb: 1,
              maxWidth: 500,
            }}
          >
            드레스부터 악세서리까지 전 품목 최대 50% 할인
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: { xs: '0.9rem', md: '1rem' },
              mb: 4,
            }}
          >
            특별한 날을 위한 완벽한 준비, 지금 시작하세요
          </Typography>

          {/* CTA 버튼 */}
          <Stack direction="row" spacing={2}>
            <Button
              component={Link}
              to="/products?category=wedding"
              variant="contained"
              sx={{
                bgcolor: 'white',
                color: '#1a1a1a',
                px: 4,
                py: 1.5,
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: 2,
                '&:hover': {
                  bgcolor: '#f0f0f0',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              웨딩 컬렉션 보기
            </Button>
            <Button
              component={Link}
              to="/products?category=wedding&sort=best"
              variant="outlined"
              sx={{
                borderColor: 'rgba(255,255,255,0.5)',
                color: 'white',
                px: 3,
                py: 1.5,
                fontWeight: 600,
                fontSize: '0.95rem',
                borderRadius: 2,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              베스트 아이템
            </Button>
          </Stack>

          {/* 하단 혜택 정보 */}
          <Stack
            direction="row"
            spacing={4}
            sx={{ mt: 5, flexWrap: 'wrap', gap: 2 }}
          >
            {[
              { label: '무료 배송', icon: '🚚' },
              { label: '무료 수선', icon: '✂️' },
              { label: '30일 반품', icon: '📦' },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '1.2rem' }}>{item.icon}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', fontWeight: 500 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
      {/* 다크 섹션 - 카테고리 쇼케이스 (풀폭으로 임팩트) */}
      <Box sx={{ bgcolor: '#1a1a1a', py: { xs: 8, md: 12 }, px: { xs: 2, md: 8 } }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box
              component={Link}
              to="/products?middleCategory=OUTER"
              sx={{
                display: 'block',
                position: 'relative',
                height: { xs: 280, md: 400 },
                borderRadius: 2,
                overflow: 'hidden',
                textDecoration: 'none',
                '&:hover img': { transform: 'scale(1.05)' },
              }}
            >
              <Box
                component="img"
                src={FASHION_IMAGES.coat}
                alt="Outer"
                loading="lazy"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.5s ease',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                }}
              />
              <Box sx={{ position: 'absolute', bottom: 30, left: 30, color: 'white' }}>
                <Typography sx={{ fontSize: '0.85rem', opacity: 0.8, mb: 1, letterSpacing: '0.1em' }}>
                  LAYERED ESSENTIAL
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  OUTER COLLECTION
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', opacity: 0.9, mt: 1 }}>
                  카키 코트로 완성하는 레이어드 스타일
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Box
                component={Link}
                to="/products?middleCategory=TOP&searchTerm=니트"
                sx={{
                  display: 'block',
                  position: 'relative',
                  height: { xs: 180, md: 188 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  '&:hover img': { transform: 'scale(1.05)' },
                }}
              >
                <Box
                  component="img"
                  src={FASHION_IMAGES.sweater}
                  alt="Knit"
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 70%)',
                  }}
                />
                <Box sx={{ position: 'absolute', top: '50%', left: 25, transform: 'translateY(-50%)', color: 'white' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
                    KNIT & SWEATER
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', opacity: 0.9, mt: 0.5 }}>
                    베이지 라운드넥 니트웨어
                  </Typography>
                </Box>
              </Box>
              <Box
                component={Link}
                to="/products?middleCategory=BOTTOM"
                sx={{
                  display: 'block',
                  position: 'relative',
                  height: { xs: 180, md: 188 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  '&:hover img': { transform: 'scale(1.05)' },
                }}
              >
                <Box
                  component="img"
                  src={FASHION_IMAGES.trousers}
                  alt="Bottom"
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 70%)',
                  }}
                />
                <Box sx={{ position: 'absolute', top: '50%', left: 25, transform: 'translateY(-50%)', color: 'white' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
                    PANTS COLLECTION
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', opacity: 0.9, mt: 0.5 }}>
                    베이지 데일리 팬츠
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* 베스트 상품 */}
      <Box ref={bestSectionRef} sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 3 } }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
              BEST
            </Typography>
            <Typography sx={{ color: '#888', fontSize: '0.85rem', mt: 0.5 }}>
              가장 많이 사랑받는 아이템
            </Typography>
          </Box>
          <Button component={Link} to="/products?sort=best" sx={{ color: '#1a1a1a', fontWeight: 600, fontSize: '0.85rem' }}>
            전체보기 &rarr;
          </Button>
        </Box>
        <Grid container spacing={{ xs: 1, md: 2 }}>
          {products.slice(0, 8).map((product, index) => (
            <Grid item xs={3} md={1.5} key={product.id} className="product-card">
              <Box sx={{ position: 'relative' }}>
                {index < 3 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      zIndex: 1,
                      bgcolor: index === 0 ? '#ff4444' : '#1a1a1a',
                      color: 'white',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </Box>
                )}
                <ProductCard product={product} compact />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 타임세일 배너 + 쿠폰 */}
      <Box
        sx={{
          py: 6,
          px: { xs: 2, md: 4 },
        }}
      >
        <Box
          ref={couponSectionRef}
          sx={{
            maxWidth: 900,
            mx: 'auto',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
            borderRadius: 1,
            p: { xs: 3, md: 4 },
          }}
        >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={3}
        >
          {/* 왼쪽: 텍스트 영역 */}
          <Box sx={{ textAlign: { xs: 'center', lg: 'left' }, flex: '0 0 auto' }}>
            <Box
              sx={{
                display: 'inline-block',
                bgcolor: 'rgba(255,255,255,0.15)',
                px: 2,
                py: 0.5,
                borderRadius: 5,
                mb: 2,
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                SPECIAL OFFER
              </Typography>
            </Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>
              첫구매 할인 쿠폰
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', mt: 1 }}>
              최대 78% 할인 + 추가 쿠폰 혜택
            </Typography>
            <Button
              component={Link}
              to="/products?sort=sale"
              variant="contained"
              sx={{
                mt: 3,
                bgcolor: '#fff',
                color: '#1a1a1a',
                px: 5,
                py: 1.5,
                fontWeight: 700,
                fontSize: '1rem',
                '&:hover': { bgcolor: '#f0f0f0' },
              }}
            >
              쇼핑하러 가기
            </Button>
          </Box>

          {/* 오른쪽: 쿠폰 이미지 2장 */}
          <Stack
            direction="row"
            spacing={2}
            sx={{ flex: '0 0 auto' }}
          >
            {/* VIP 50% 골드 쿠폰 */}
            <Box
              ref={coupon1Ref}
              component="button"
              onClick={() => {
                setSnackbar({ open: true, message: 'VIP 50% 할인 쿠폰이 발급되었습니다!', severity: 'success' })
              }}
              sx={{
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
                width: { xs: 140, sm: 180, md: 200 },
                transition: 'box-shadow 0.3s ease',
                '&:hover img': {
                  boxShadow: '0 12px 30px rgba(255,255,255,0.3)',
                },
              }}
            >
              <Box
                component="img"
                src="/images/coupon-vip-gold.png"
                alt="VIP 50% 할인 쿠폰"
                sx={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 2,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  transition: 'box-shadow 0.3s ease',
                }}
              />
            </Box>

            {/* SPECIAL 25% 실버 쿠폰 */}
            <Box
              ref={coupon2Ref}
              component="button"
              onClick={() => {
                setSnackbar({ open: true, message: 'SPECIAL 25% 할인 쿠폰이 발급되었습니다!', severity: 'success' })
              }}
              sx={{
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
                width: { xs: 140, sm: 180, md: 200 },
                transition: 'box-shadow 0.3s ease',
                '&:hover img': {
                  boxShadow: '0 12px 30px rgba(255,255,255,0.3)',
                },
              }}
            >
              <Box
                component="img"
                src="/images/coupon-special-silver.png"
                alt="SPECIAL 25% 할인 쿠폰"
                sx={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 2,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  transition: 'box-shadow 0.3s ease',
                }}
              />
            </Box>
          </Stack>
        </Stack>
        </Box>
      </Box>

      {/* 신상품 */}
      <Box ref={newArrivalRef} sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 3 } }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
              NEW ARRIVALS
            </Typography>
            <Typography sx={{ color: '#888', fontSize: '0.85rem', mt: 0.5 }}>
              방금 도착한 신상품
            </Typography>
          </Box>
          <Button component={Link} to="/products?sort=new" sx={{ color: '#1a1a1a', fontWeight: 600, fontSize: '0.85rem' }}>
            전체보기 &rarr;
          </Button>
        </Box>
        <Grid container spacing={{ xs: 1, md: 2 }}>
          {products.slice(8, 16).map((product) => (
            <Grid item xs={3} md={1.5} key={product.id} className="product-card">
              <ProductCard product={product} compact />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 브랜드 스토리 섹션 - 넓은 패딩으로 고급스럽게 */}
      <Box sx={{ bgcolor: '#1a1a1a', py: { xs: 8, md: 12 }, px: { xs: 3, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            BRAND STORY
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
            당신의 스타일을 완성하는 브랜드
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {[
            { title: 'OUTER', desc: '카키 롱 코트', img: FASHION_IMAGES.coat },
            { title: 'DRESS', desc: '베이지 롱 원피스', img: FASHION_IMAGES.dress },
            { title: 'SHIRT', desc: '화이트 클래식 셔츠', img: FASHION_IMAGES.shirt },
          ].map((item, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Box
                component={Link}
                to="/products"
                sx={{
                  display: 'block',
                  position: 'relative',
                  height: { xs: 200, md: 280 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  '&:hover img': { transform: 'scale(1.05)' },
                }}
              >
                <Box
                  component="img"
                  src={item.img}
                  alt={item.title}
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    transition: 'background-color 0.3s',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.2rem', md: '1.5rem' }, letterSpacing: '0.1em' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', opacity: 0.85, mt: 0.5 }}>
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* AI 추천 상품 미리보기 다이얼로그 */}
      <Dialog
        open={productPreview.open}
        onClose={handleClosePreview}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {productPreview.product && (
            <Box>
              {/* 상품 이미지 */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: { xs: 280, sm: 350 },
                  bgcolor: '#f5f5f5',
                }}
              >
                <Box
                  component="img"
                  src={getProductImage(productPreview.product.mainImage, productPreview.product.title)}
                  alt={productPreview.product.title}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    handleProductImageError(e, productPreview.product!.title)
                  }}
                />
                {isProductReferenceImage(productPreview.product.mainImage, productPreview.product.title) && (
                  <Typography sx={{ position: 'absolute', bottom: 12, left: 12, px: 1, py: 0.5, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.9)', color: '#666', fontSize: '0.75rem' }}>
                    품목 참고 이미지
                  </Typography>
                )}
                {/* AI 추천 배지 */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: 'rgba(99, 102, 241, 0.95)',
                    color: 'white',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 5,
                  }}
                >
                  <AutoAwesome sx={{ fontSize: 16 }} />
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    AI 추천
                  </Typography>
                </Box>
                {/* 할인율 배지 */}
                {productPreview.product.discountPercent && productPreview.product.discountPercent > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      bgcolor: '#ff4444',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    {productPreview.product.discountPercent}% OFF
                  </Box>
                )}
              </Box>

              {/* 상품 정보 */}
              <Box sx={{ p: 3 }}>
                {/* AI 설명 */}
                {productPreview.aiResult?.description && (
                  <Box
                    sx={{
                      bgcolor: '#f8f8ff',
                      border: '1px solid #e8e8ff',
                      borderRadius: 2,
                      p: 2,
                      mb: 2,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.6 }}>
                      {productPreview.aiResult.description}
                    </Typography>
                  </Box>
                )}

                <Typography sx={{ fontSize: '0.85rem', color: '#888', mb: 0.5 }}>
                  {productPreview.product.brand}
                </Typography>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: '#1a1a1a', mb: 1.5 }}>
                  {productPreview.product.title}
                </Typography>

                {/* 가격 */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  {productPreview.product.discountPercent && productPreview.product.discountPercent > 0 ? (
                    <>
                      <Typography
                        sx={{
                          fontSize: '1.3rem',
                          fontWeight: 700,
                          color: '#ff4444',
                        }}
                      >
                        {Math.round(productPreview.product.price * (1 - productPreview.product.discountPercent / 100)).toLocaleString()}원
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.95rem',
                          color: '#aaa',
                          textDecoration: 'line-through',
                        }}
                      >
                        {productPreview.product.price.toLocaleString()}원
                      </Typography>
                    </>
                  ) : (
                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a1a1a' }}>
                      {productPreview.product.price.toLocaleString()}원
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
          <Button
            onClick={handleGoToSearch}
            variant="outlined"
            sx={{
              flex: 1,
              py: 1.5,
              borderColor: '#ddd',
              color: '#666',
              '&:hover': {
                borderColor: '#bbb',
                bgcolor: '#f5f5f5',
              },
            }}
          >
            다른 상품 더보기
          </Button>
          <Button
            onClick={handleGoToProduct}
            variant="contained"
            sx={{
              flex: 1,
              py: 1.5,
              bgcolor: '#6366F1',
              '&:hover': {
                bgcolor: '#4F46E5',
              },
            }}
          >
            이 상품 보러가기
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI 추천 결과 알림 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default HomePage
