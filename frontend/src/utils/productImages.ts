import type { SyntheticEvent } from 'react'

// Curated, locally served photos. Source pages and credits are in public/images/fashion/SOURCES.md.
export const FASHION_IMAGES = {
  hoodie: '/images/fashion/hoodie.webp',
  sweater: '/images/fashion/sweater.webp',
  trousers: '/images/fashion/trousers.webp',
  jeans: '/images/fashion/jeans.webp',
  tshirt: '/images/fashion/tshirt.webp',
  dress: '/images/fashion/dress.webp',
  jacket: '/images/fashion/jacket.webp',
  coat: '/images/fashion/coat.webp',
  shirt: '/images/fashion/shirt.webp',
  backpack: '/images/fashion/backpack.webp',
  sneakers: '/images/fashion/sneakers.webp',
  clothing: '/images/fashion/clothing.webp',
}

type FashionImageKey = keyof typeof FASHION_IMAGES

// Specific garment names take priority over broad categories (e.g. a coat over "winter").
const titleRules: [RegExp, FashionImageKey][] = [
  [/백팩|배낭|backpack/i, 'backpack'],
  [/신발|운동화|스니커즈|러닝화|슈즈|shoes?|sneakers?|trainers?/i, 'sneakers'],
  [/원피스|드레스|dress/i, 'dress'],
  [/코트|트렌치|coat|trench/i, 'coat'],
  [/재킷|자켓|점퍼|패딩|블레이저|아우터|jacket|blazer|parka|puffer|outer/i, 'jacket'],
  [/후드|후디|hoodie|hooded/i, 'hoodie'],
  [/니트|스웨터|가디건|카디건|knit|sweater|cardigan|pullover/i, 'sweater'],
  [/청바지|데님|jeans?|denim/i, 'jeans'],
  [/슬랙스|팬츠|바지|하의|trousers?|pants?|bottom/i, 'trousers'],
  [/티셔츠|티셔트|반팔|긴팔티|맨투맨|스웨트셔츠|t[ -]?shirt|sweatshirt|tee/i, 'tshirt'],
  [/셔츠|블라우스|shirt|blouse/i, 'shirt'],
]

export const getFashionImage = (title = '', category = ''): string => {
  const titleMatch = titleRules.find(([pattern]) => pattern.test(title))
  if (titleMatch) return FASHION_IMAGES[titleMatch[1]]

  const categoryMatch = titleRules.find(([pattern]) => pattern.test(category))
  if (categoryMatch) return FASHION_IMAGES[categoryMatch[1]]
  if (/가방|bag|acc/i.test(category)) return FASHION_IMAGES.backpack
  if (/상의|top/i.test(category)) return FASHION_IMAGES.shirt
  return FASHION_IMAGES.clothing
}

const isPlaceholder = (url: string) =>
  /(?:picsum\.photos|placehold\.co|placeholder\.com)(?:\/|$)/i.test(url) ||
  /(?:^|\/)placeholder\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(url)

/** Keep real uploaded product photos; replace missing/random placeholders by garment title. */
export const getProductImage = (url?: string | null, title = '', category = ''): string => {
  const source = url?.trim()
  if (!source || isPlaceholder(source)) return getFashionImage(title, category)
  if (/^(?:https?:|data:|blob:|\/)/i.test(source)) return source
  return `/${source}`
}

export const isProductReferenceImage = (url?: string | null, title = '', category = '') =>
  getProductImage(url, title, category).startsWith('/images/fashion/')

export const handleProductImageError = (
  event: SyntheticEvent<HTMLImageElement>,
  title = '',
  category = '',
) => {
  const fallback = getFashionImage(title, category)
  // Avoid a repeated error if a local asset is unavailable.
  if (event.currentTarget.getAttribute('src') !== fallback) {
    event.currentTarget.src = fallback
  }
}
