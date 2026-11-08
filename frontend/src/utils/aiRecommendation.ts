import type { ItemListQuery } from '@/types/api'

export type RecommendationCategory = 'outer' | 'top' | 'bottom' | 'dress' | 'shoes' | 'acc' | 'bag'

export interface AiRecommendResult {
  keywords: string[]
  description: string
  category?: RecommendationCategory
}

const categoryParams: Record<RecommendationCategory, Pick<ItemListQuery, 'majorCategory' | 'middleCategory'>> = {
  outer: { middleCategory: 'OUTER' },
  top: { middleCategory: 'TOP' },
  bottom: { middleCategory: 'BOTTOM' },
  dress: { middleCategory: 'DRESS' },
  shoes: { majorCategory: 'SHOES' },
  acc: { majorCategory: 'ACCESSORIES' },
  bag: { majorCategory: 'BAGS' },
}

export const getRecommendationCategoryParams = (category?: RecommendationCategory) =>
  category ? categoryParams[category] : {}

export const getRecommendationSearchParams = (result: AiRecommendResult, matchedTitle = '') => {
  const params = new URLSearchParams()
  const matchingKeyword = result.keywords.find((keyword) =>
    matchedTitle.toLowerCase().includes(keyword.toLowerCase())) || result.keywords[0]
  if (matchingKeyword) params.set('searchTerm', matchingKeyword)
  for (const [key, value] of Object.entries(getRecommendationCategoryParams(result.category))) {
    params.set(key, value)
  }
  return params
}

/** An error/apology string is not a recommendation. Only accept a usable structured result. */
export const parseRecommendationContent = (content: unknown): AiRecommendResult => {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 추천 응답이 비어 있습니다. 다시 시도해 주세요.')
  }

  let value: unknown
  try {
    value = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
  } catch {
    throw new Error('AI 추천 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AI 추천 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.')
  }

  const result = value as Record<string, unknown>
  const keywords = Array.isArray(result.keywords)
    ? [...new Set(result.keywords.filter((keyword): keyword is string =>
      typeof keyword === 'string' && keyword.trim().length > 0)
      .map((keyword) => keyword.trim()))].slice(0, 8)
    : []
  const categoryValue = typeof result.category === 'string' ? result.category.trim().toLowerCase() : ''
  const category = Object.prototype.hasOwnProperty.call(categoryParams, categoryValue)
    ? categoryValue as RecommendationCategory
    : undefined
  const description = typeof result.description === 'string' ? result.description.trim() : ''

  if (!description || (!keywords.length && !category)) {
    throw new Error('AI가 유효한 추천 조건을 반환하지 않았습니다. 요청을 조금 더 구체적으로 입력해 주세요.')
  }
  return { keywords, description, category }
}

export const parseRecommendationResponse = (data: unknown): AiRecommendResult => {
  const response = data && typeof data === 'object' ? data as Record<string, unknown> : {}
  if (response.success !== true) {
    throw new Error(typeof response.message === 'string' ? response.message : 'AI 서비스 요청에 실패했습니다.')
  }
  const result = response.result && typeof response.result === 'object'
    ? response.result as Record<string, unknown> : {}
  return parseRecommendationContent(result.content)
}
