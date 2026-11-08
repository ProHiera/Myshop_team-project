import { useState, useCallback, type ImgHTMLAttributes } from 'react'
import { Box, Skeleton } from '@mui/material'
import { FASHION_IMAGES, getFashionImage, getProductImage } from '@/utils/productImages'

/**
 * 이미지 URL 처리 유틸리티
 * - 절대경로 (https://, http://) → 그대로 사용
 * - 상대경로 (/uploads/...) → 그대로 사용
 * - 상대경로 (uploads/...) → / 추가
 * - undefined/null/빈값 → fallback 이미지
 */
export const getImageSrc = (url?: string | null, fallback = FASHION_IMAGES.clothing): string => {
  if (!url || url.trim() === '') return fallback

  // 절대 URL (http:// 또는 https://)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // data URL (base64 이미지)
  if (url.startsWith('data:')) {
    return url
  }

  // 상대 경로 - 슬래시로 시작하면 그대로, 아니면 추가
  return url.startsWith('/') ? url : `/${url}`
}

/**
 * 기본 fallback 이미지 경로
 */
export const DEFAULT_FALLBACK = FASHION_IMAGES.clothing
export const PRODUCT_FALLBACK = FASHION_IMAGES.clothing
export const USER_FALLBACK = '/avatar-placeholder.png'

interface AppImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'src'> {
  /** 이미지 URL (절대/상대 모두 지원) */
  src?: string | null
  /** 대체 텍스트 */
  alt: string
  /** 로드 실패 시 대체 이미지 */
  fallback?: string
  /** 로딩 중 스켈레톤 표시 여부 */
  showSkeleton?: boolean
  /** 이미지 너비 */
  width?: number | string
  /** 이미지 높이 */
  height?: number | string
  /** object-fit 속성 */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** 추가 스타일 */
  sx?: object
}

/**
 * 이미지 컴포넌트
 * - URL 자동 처리 (절대/상대 경로)
 * - 로드 실패 시 fallback 이미지 표시
 * - 로딩 중 스켈레톤 표시 (옵션)
 */
const AppImage = ({
  src,
  alt,
  fallback = DEFAULT_FALLBACK,
  showSkeleton = false,
  width = '100%',
  height = 'auto',
  objectFit = 'cover',
  sx = {},
  style,
  ...rest
}: AppImageProps) => {
  const [isLoading, setIsLoading] = useState(showSkeleton)
  const [hasError, setHasError] = useState(false)

  // 실제 표시할 이미지 URL
  const resolvedFallback = fallback === DEFAULT_FALLBACK ? getFashionImage(alt) : fallback
  const imageSrc = hasError
    ? resolvedFallback
    : fallback === DEFAULT_FALLBACK ? getProductImage(src, alt) : getImageSrc(src, fallback)

  // 이미지 로드 완료
  const handleLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  // 이미지 로드 실패
  const handleError = useCallback(() => {
    setIsLoading(false)
    if (!hasError) {
      setHasError(true)
    }
  }, [hasError])

  // 스켈레톤 표시 모드
  if (showSkeleton && isLoading) {
    return (
      <Box sx={{ position: 'relative', width, height, ...sx }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
        />
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit,
            opacity: 0,
            ...style,
          }}
          {...rest}
        />
      </Box>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        objectFit,
        ...style,
      }}
      {...rest}
    />
  )
}

export default AppImage
