import { useState } from 'react'
import axiosClient from '@/api/axiosClient'
import { fetchItems } from '@/api/itemApi'
import type { ItemSummary } from '@/types/api'
import type { ProductSummary } from '@/types/product'
import { getProductImage } from '@/utils/productImages'
import {
  getRecommendationCategoryParams,
  parseRecommendationResponse,
  type AiRecommendResult,
  type RecommendationCategory,
} from '@/utils/aiRecommendation'

export interface AiRecommendWithProduct extends AiRecommendResult {
  matchedProduct?: ProductSummary
}

export const useAiRecommend = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const findMatchingProduct = async (
    keywords: string[],
    category?: RecommendationCategory,
  ): Promise<ProductSummary | undefined> => {
    const filters = getRecommendationCategoryParams(category)
    const candidates = new Map<number, ItemSummary>()
    // Search each actual AI keyword using the Spring API's supported fields.
    const responses = await Promise.all(keywords.slice(0, 5).map((keyword) =>
      fetchItems({ page: 0, size: 20, ...filters, searchField: 'title', searchTerm: keyword })))

    for (const response of responses) {
      for (const item of response.content || []) {
        if ((item.stock ?? 0) > 0) candidates.set(item.id, item)
      }
    }

    // A category match is useful when styling words are absent from product titles.
    // Without a keyword or category match, do not select an unrelated first product.
    if (!candidates.size && category) {
      const response = await fetchItems({ page: 0, size: 50, ...filters })
      for (const item of response.content || []) {
        if ((item.stock ?? 0) > 0) candidates.set(item.id, item)
      }
    }

    const score = (item: ItemSummary) => keywords.reduce((total, keyword) => {
      const term = keyword.toLowerCase()
      return total + ((item.title || '').toLowerCase().includes(term) ? 2 : 0)
        + ((item.brand || '').toLowerCase().includes(term) ? 1 : 0)
    }, 0)
    const matchedItem = [...candidates.values()].sort((a, b) => score(b) - score(a))[0]
    if (!matchedItem) return undefined

    return {
      id: matchedItem.id,
      title: matchedItem.title || '',
      brand: matchedItem.brand || 'MyShop',
      price: matchedItem.price,
      discountPercent: matchedItem.discountPercent,
      mainImage: getProductImage(matchedItem.mainImageUrl, matchedItem.title, category),
    }
  }

  const getRecommendation = async (prompt: string): Promise<AiRecommendWithProduct> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axiosClient.post<unknown>('/ai/proxy', {
        purpose: 'recommend',
        messages: [
          {
            role: 'system',
            content:
              '너는 패션 쇼핑몰 MyShop의 AI 스타일리스트이다. 사용자 요청을 분석해 실제 상품 제목에서 찾을 수 있는 구체적인 의류 키워드 배열, 간결한 한국어 설명, 카테고리(outer|top|bottom|dress|shoes|acc|bag 중 하나 또는 비우기)로 JSON만 반환해라. 예시: {"keywords":["코트","패딩"],"description":"겨울에는 따뜻한 코트나 패딩을 추천합니다.","category":"outer"}',
          },
          { role: 'user', content: prompt },
        ],
      })

      const recommendation = parseRecommendationResponse(data)
      const matchedProduct = await findMatchingProduct(recommendation.keywords, recommendation.category)
      return { ...recommendation, matchedProduct }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 추천 처리 중 오류가 발생했습니다.'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  return { getRecommendation, loading, error }
}
