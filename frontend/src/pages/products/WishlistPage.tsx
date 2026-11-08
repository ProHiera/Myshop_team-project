import { getProductImage, handleProductImageError, isProductReferenceImage } from '@/utils/productImages'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Button,
  Checkbox,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material'
import { fetchFavoriteItems, toggleFavoriteItem, toggleCartItem } from '@/api/itemApi'
import type { ItemSummary } from '@/types/api'
import { brandColors } from '@/theme/tokens'

/**
 * 즐겨찾기(위시리스트) 페이지
 * - 찜한 상품 목록 조회
 * - 선택 삭제
 * - 장바구니 담기
 */
const WishlistPage = () => {
  const navigate = useNavigate()
  const [wishlistItems, setWishlistItems] = useState<ItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // 즐겨찾기 목록 조회
  useEffect(() => {
    loadWishlist()
  }, [])

  const loadWishlist = async () => {
    try {
      setLoading(true)
      const data = await fetchFavoriteItems({ page: 0, size: 100 })
      setWishlistItems(data.content || [])
    } catch (error) {
      console.error('즐겨찾기 목록 로드 실패:', error)
      setWishlistItems([])
    } finally {
      setLoading(false)
    }
  }

  // 개별 선택 토글
  const handleSelectItem = (itemId: number) => {
    const idStr = String(itemId)
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(idStr)) {
        newSet.delete(idStr)
      } else {
        newSet.add(idStr)
      }
      return newSet
    })
  }

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedItems.size === wishlistItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(wishlistItems.map((item) => String(item.id))))
    }
  }

  // 즐겨찾기에서 삭제
  const handleRemoveItem = async (itemId: number) => {
    const idStr = String(itemId)
    try {
      await toggleFavoriteItem(idStr)
      setWishlistItems((prev) => prev.filter((item) => item.id !== itemId))
      setSelectedItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(idStr)
        return newSet
      })
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  // 선택 상품 삭제
  const handleRemoveSelected = async () => {
    if (selectedItems.size === 0) {
      alert('삭제할 상품을 선택해주세요.')
      return
    }
    if (!window.confirm(`선택한 ${selectedItems.size}개 상품을 삭제하시겠습니까?`)) return

    try {
      await Promise.all(Array.from(selectedItems).map((id) => toggleFavoriteItem(id)))
      setWishlistItems((prev) => prev.filter((item) => !selectedItems.has(String(item.id))))
      setSelectedItems(new Set())
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('일부 상품 삭제에 실패했습니다.')
    }
  }

  // 장바구니에 담기
  const handleAddToCart = async (itemId: string) => {
    try {
      await toggleCartItem(itemId)
      alert('장바구니에 담았습니다.')
    } catch (error) {
      console.error('장바구니 담기 실패:', error)
      alert('장바구니 담기에 실패했습니다.')
    }
  }

  // 선택 상품 장바구니 담기
  const handleAddSelectedToCart = async () => {
    if (selectedItems.size === 0) {
      alert('장바구니에 담을 상품을 선택해주세요.')
      return
    }

    try {
      await Promise.all(Array.from(selectedItems).map((id) => toggleCartItem(id)))
      alert(`${selectedItems.size}개 상품을 장바구니에 담았습니다.`)
    } catch (error) {
      console.error('장바구니 담기 실패:', error)
      alert('일부 상품 담기에 실패했습니다.')
    }
  }

  // 할인가 계산
  const getDiscountedPrice = (item: ItemSummary) => {
    if ((item.discountPercent ?? 0) > 0) {
      return item.price * (1 - (item.discountPercent ?? 0) / 100)
    }
    return item.price
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <FavoriteIcon sx={{ color: 'error.main' }} />
          <Typography variant="h4" fontWeight={700}>
            찜한 상품
          </Typography>
        </Stack>
        <Typography color="text.secondary">
          총 {wishlistItems.length}개의 상품이 있습니다.
        </Typography>
      </Box>

      {wishlistItems.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 12,
            bgcolor: '#F9FAFB',
            borderRadius: 2,
          }}
        >
          <FavoriteIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            찜한 상품이 없습니다.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/products')}
            sx={{
              mt: 2,
              bgcolor: brandColors.primary,
              '&:hover': { bgcolor: '#374151' },
            }}
          >
            상품 둘러보기
          </Button>
        </Box>
      ) : (
        <>
          {/* 선택 영역 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
              p: 2,
              bgcolor: '#F9FAFB',
              borderRadius: 1,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox
                checked={selectedItems.size === wishlistItems.length && wishlistItems.length > 0}
                indeterminate={selectedItems.size > 0 && selectedItems.size < wishlistItems.length}
                onChange={handleSelectAll}
              />
              <Typography>
                전체 선택 ({selectedItems.size}/{wishlistItems.length})
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleRemoveSelected}
                disabled={selectedItems.size === 0}
              >
                선택 삭제
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<ShoppingCartIcon />}
                onClick={handleAddSelectedToCart}
                disabled={selectedItems.size === 0}
                sx={{
                  bgcolor: brandColors.primary,
                  '&:hover': { bgcolor: '#374151' },
                }}
              >
                선택 상품 장바구니 담기
              </Button>
            </Stack>
          </Box>

          {/* 상품 목록 */}
          <Grid container spacing={3}>
            {wishlistItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: selectedItems.has(String(item.id))
                      ? `2px solid ${brandColors.primary}`
                      : '1px solid #E5E7EB',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                >
                  {/* 선택 체크박스 */}
                  <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
                    <Checkbox
                      checked={selectedItems.has(String(item.id))}
                      onChange={() => handleSelectItem(item.id)}
                      sx={{ bgcolor: 'white', borderRadius: 1 }}
                    />
                  </Box>

                  {/* 삭제 버튼 */}
                  <IconButton
                    onClick={() => handleRemoveItem(item.id)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'white',
                      '&:hover': { bgcolor: 'error.light', color: 'white' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>

                  {/* 할인 뱃지 */}
                  {(item.discountPercent ?? 0) > 0 && (
                    <Chip
                      label={`${item.discountPercent}%`}
                      color="error"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 48,
                        right: 8,
                        fontWeight: 700,
                      }}
                    />
                  )}

                  {/* 상품 이미지 */}
                  <CardMedia
                    component="img"
                    height={200}
                    image={getProductImage(item.mainImageUrl, item.title)}
                    alt={item.title}
                    onError={(event) => handleProductImageError(event, item.title)}
                    onClick={() => navigate(`/products/${item.id}`)}
                    sx={{ cursor: 'pointer', objectFit: 'cover' }}
                  />

                  {isProductReferenceImage(item.mainImageUrl, item.title) && (
                    <Typography variant="caption" sx={{ color: '#666', px: 2, pt: 0.5 }}>품목 참고 이미지</Typography>
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* 브랜드 */}
                    {item.brand && (
                      <Typography variant="caption" color="text.secondary">
                        {item.brand}
                      </Typography>
                    )}

                    {/* 상품명 */}
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      onClick={() => navigate(`/products/${item.id}`)}
                      sx={{
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: 48,
                        '&:hover': { color: brandColors.primary },
                      }}
                    >
                      {item.title}
                    </Typography>

                    {/* 가격 */}
                    <Box sx={{ mt: 1 }}>
                      {(item.discountPercent ?? 0) > 0 && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textDecoration: 'line-through' }}
                        >
                          {item.price.toLocaleString()}원
                        </Typography>
                      )}
                      <Typography variant="h6" fontWeight={700} color="primary">
                        {getDiscountedPrice(item).toLocaleString()}원
                      </Typography>
                    </Box>
                  </CardContent>

                  {/* 장바구니 담기 버튼 */}
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ShoppingCartIcon />}
                      onClick={() => handleAddToCart(String(item.id))}
                      sx={{
                        borderColor: brandColors.primary,
                        color: brandColors.primary,
                        '&:hover': {
                          bgcolor: brandColors.primary,
                          color: 'white',
                        },
                      }}
                    >
                      장바구니 담기
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  )
}

export default WishlistPage
