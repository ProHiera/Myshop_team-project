import { memo, useCallback } from 'react'
import FavoriteBorder from '@mui/icons-material/FavoriteBorder'
import Favorite from '@mui/icons-material/Favorite'
import Star from '@mui/icons-material/Star'
import { Box, Card, CardContent, CardMedia, Chip, IconButton, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { ProductSummary } from '@/types/product'
import { useLike } from '@/hooks/useLike'
import { brandColors, glassmorphism } from '@/theme/tokens'
import { getProductImage, handleProductImageError, isProductReferenceImage } from '@/utils/productImages'

interface ProductCardProps {
  product: ProductSummary
  compact?: boolean
}

const ProductCard = memo(({ product, compact = false }: ProductCardProps) => {
  const navigate = useNavigate()
  // 좋아요 훅 사용 (랜덤 숫자 + 토글)
  const { likeCount, isLiked, toggleLike } = useLike({
    initialCount: product.likeCount, // 기존 값이 있으면 사용
    initialLiked: false,
  })

  const discountedPrice = product.discountPercent
    ? product.price * (1 - product.discountPercent / 100)
    : product.price

  const handleCardClick = useCallback(() => {
    navigate(`/products/${product.id}`)
  }, [navigate, product.id])

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 전파 방지
    toggleLike()
  }, [toggleLike])

  return (
    <Card
      onClick={handleCardClick}
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        borderRadius: compact ? 1 : 2,
        bgcolor: glassmorphism.card.background,
        backdropFilter: glassmorphism.card.backdropFilter,
        border: glassmorphism.card.border,
        boxShadow: glassmorphism.card.boxShadow,
        transition: 'all 0.3s ease',
        p: compact ? 1 : 1.5,
        '&:hover': {
          transform: compact ? 'translateY(-4px)' : 'translateY(-8px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
        },
        '&:hover img': {
          transform: 'scale(1.03)',
        },
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: compact ? 0.5 : 1, bgcolor: '#f5f5f5' }}>
        <CardMedia
          component="img"
          sx={{
            height: compact ? { xs: 100, sm: 120, md: 140 } : { xs: 200, sm: 260, md: 320 },
            objectFit: 'cover',
            transition: 'transform 0.5s ease',
          }}
          image={getProductImage(product.mainImage, product.title)}
          alt={product.title}
          onError={(event) => handleProductImageError(event, product.title)}
        />
        {isProductReferenceImage(product.mainImage, product.title) && (
          <Typography sx={{ position: 'absolute', bottom: 8, left: 8, px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: 'rgba(255,255,255,0.9)', color: '#666', fontSize: '0.65rem' }}>
            품목 참고 이미지
          </Typography>
        )}
        {product.badges && product.badges.length > 0 && (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ position: 'absolute', top: 12, left: 12 }}
          >
            {product.badges.map((badge) => (
              <Chip
                key={badge}
                label={badge}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 24,
                  bgcolor: '#1a1a1a',
                  color: 'white',
                }}
              />
            ))}
          </Stack>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, px: compact ? 0.5 : 1.5, pt: compact ? 1 : 2, pb: compact ? 0.5 : 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {!compact && (
              <Typography
                variant="caption"
                sx={{ color: '#999', fontSize: '0.75rem', letterSpacing: '0.02em' }}
              >
                {product.brand}
              </Typography>
            )}
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: compact ? '0.7rem' : '0.95rem',
                mt: compact ? 0 : 0.5,
                mb: compact ? 0.5 : 1,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: compact ? 1 : 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {product.title}
            </Typography>
          </Box>
          {/* 좋아요 버튼 + 카운트 (우측) */}
          {!compact && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                ml: 1,
              }}
            >
              <IconButton
                onClick={handleFavoriteClick}
                size="small"
                aria-label={isLiked ? '찜 해제' : '찜하기'}
                sx={{
                  transition: 'all 0.2s ease',
                  p: 0.5,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                {isLiked ? (
                  <Favorite sx={{ fontSize: 22, color: '#ff4444' }} />
                ) : (
                  <FavoriteBorder sx={{ fontSize: 22, color: '#999' }} />
                )}
              </IconButton>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  color: brandColors.muted,
                }}
              >
                {likeCount}
              </Typography>
            </Box>
          )}
        </Stack>
        {!compact && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
            <Star sx={{ color: '#FFB800', fontSize: 16 }} />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {(product.scoreAverage ?? 0).toFixed(1)}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>
              ({product.reviewCount ?? 0})
            </Typography>
          </Stack>
        )}
        <Stack direction="row" alignItems="baseline" spacing={compact ? 0.5 : 1}>
          {product.discountPercent && (
            <Typography sx={{ color: '#ff4444', fontWeight: 700, fontSize: compact ? '0.7rem' : '1rem' }}>
              {product.discountPercent}%
            </Typography>
          )}
          <Typography sx={{ fontWeight: 700, fontSize: compact ? '0.75rem' : '1.1rem' }}>
            {discountedPrice.toLocaleString()}원
          </Typography>
        </Stack>
        {!compact && product.discountPercent && (
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: '#bbb',
              textDecoration: 'line-through',
              mt: 0.3,
            }}
          >
            {product.price.toLocaleString()}원
          </Typography>
        )}
      </CardContent>
    </Card>
  )
})

ProductCard.displayName = 'ProductCard'

export default ProductCard
