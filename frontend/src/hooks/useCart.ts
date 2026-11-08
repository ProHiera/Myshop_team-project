import { getProductImage } from '@/utils/productImages'
import { useState, useEffect, useCallback } from 'react'
import { fetchCartItems, toggleCartItem } from '@/api/itemApi'

export interface CartItem {
  productId: string
  productName: string
  productImage: string
  price: number
  quantity: number
  option?: string
  color?: string
  size?: string
  discountRate?: number
}

// API 응답 아이템 타입
interface CartApiItem {
  id: number
  title: string
  brand: string
  price: number
  discountPercent: number
  realPrice: number
  mainImageUrl: string
  favorite: boolean
  cart: boolean
  quantity?: number
  option?: string
  color?: string
  size?: string
}

const CART_STORAGE_KEY = 'myshop_cart'

// 로그인 상태 확인 (useAuth와 동일한 방식)
const isUserLoggedIn = (): boolean => {
  try {
    const userId = localStorage.getItem('userId')
    const email = localStorage.getItem('email')
    return !!(userId && email)
  } catch {
    return false
  }
}

// CartItem 유효성 검증
const isValidCartItem = (item: unknown): item is CartItem => {
  if (typeof item !== 'object' || item === null) return false
  const obj = item as Record<string, unknown>
  return (
    typeof obj.productId === 'string' &&
    typeof obj.productName === 'string' &&
    typeof obj.price === 'number' &&
    typeof obj.quantity === 'number'
  )
}

// 로컬 스토리지에서 장바구니 파싱
const getLocalCart = (): CartItem[] => {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(CART_STORAGE_KEY)
      return []
    }
    return parsed.filter(isValidCartItem)
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY)
    return []
  }
}

// 로컬 스토리지에 장바구니 저장
const setLocalCart = (items: CartItem[]) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // 저장 실패 무시
  }
}

// 로컬 스토리지 장바구니 비우기
const clearLocalCart = () => {
  try {
    localStorage.removeItem(CART_STORAGE_KEY)
  } catch {
    // 삭제 실패 무시
  }
}

/**
 * 장바구니 훅 - 일반 쇼핑몰 방식
 * - 비로그인: 로컬 스토리지만 사용
 * - 로그인: 백엔드 API 사용
 * - 로그인 시 로컬 장바구니 → 서버로 병합
 */
export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => getLocalCart())
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => isUserLoggedIn())

  // 로그인 상태 변경 감지
  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(isUserLoggedIn())
    }

    window.addEventListener('auth:login', handleAuthChange)
    window.addEventListener('auth:logout', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    return () => {
      window.removeEventListener('auth:login', handleAuthChange)
      window.removeEventListener('auth:logout', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [])

  // 백엔드에서 장바구니 로드
  const loadFromBackend = useCallback(async (): Promise<CartItem[]> => {
    try {
      const response = await fetchCartItems()
      return (response.content || []).map((item: CartApiItem) => ({
        productId: String(item.id),
        productName: item.title || '상품명',
        productImage: getProductImage(item.mainImageUrl, item.title),
        price: item.price || 0,
        quantity: item.quantity || 1,
        option: item.option,
        color: item.color,
        size: item.size,
        discountRate: item.discountPercent || 0,
      }))
    } catch {
      return []
    }
  }, [])

  // 로컬 장바구니를 서버로 병합
  const mergeLocalToServer = useCallback(async (localItems: CartItem[]) => {
    for (const item of localItems) {
      try {
        // 서버에 아이템 추가 (toggle이므로 이미 있으면 제거될 수 있음 - 주의 필요)
        await toggleCartItem(item.productId)
      } catch {
        // 개별 아이템 추가 실패 무시
      }
    }
  }, [])

  // 장바구니 로드
  const loadCart = useCallback(async () => {
    setLoading(true)

    if (isLoggedIn) {
      // 로그인 상태: 백엔드에서 로드
      const localItems = getLocalCart()

      // 로컬에 아이템이 있으면 서버로 병합
      if (localItems.length > 0) {
        await mergeLocalToServer(localItems)
        clearLocalCart() // 병합 후 로컬 비우기
      }

      const backendItems = await loadFromBackend()
      setCartItems(backendItems)
    } else {
      // 비로그인 상태: 로컬 스토리지에서 로드
      setCartItems(getLocalCart())
    }

    setLoading(false)
  }, [isLoggedIn, loadFromBackend, mergeLocalToServer])

  // 장바구니에 상품 추가
  const addToCart = useCallback(async (item: CartItem): Promise<boolean> => {
    if (isLoggedIn) {
      // 로그인: 백엔드 API 호출
      try {
        await toggleCartItem(item.productId)
        // 추가 후 다시 로드
        const backendItems = await loadFromBackend()
        setCartItems(backendItems)
        return true
      } catch {
        return false
      }
    } else {
      // 비로그인: 로컬 스토리지에 저장
      const currentItems = getLocalCart()
      const existingIndex = currentItems.findIndex(
        (i) => i.productId === item.productId && i.color === item.color && i.size === item.size
      )

      if (existingIndex >= 0) {
        currentItems[existingIndex].quantity += item.quantity
      } else {
        currentItems.push(item)
      }

      setLocalCart(currentItems)
      setCartItems(currentItems)
      return true
    }
  }, [isLoggedIn, loadFromBackend])

  // 장바구니에서 상품 제거
  const removeFromCart = useCallback(async (productId: string, color?: string, size?: string): Promise<boolean> => {
    if (isLoggedIn) {
      // 로그인: 백엔드 API 호출
      try {
        await toggleCartItem(productId)
        const backendItems = await loadFromBackend()
        setCartItems(backendItems)
        return true
      } catch {
        return false
      }
    } else {
      // 비로그인: 로컬 스토리지에서 제거
      const currentItems = getLocalCart()
      const filteredItems = currentItems.filter(
        (i) => !(i.productId === productId && i.color === color && i.size === size)
      )
      setLocalCart(filteredItems)
      setCartItems(filteredItems)
      return true
    }
  }, [isLoggedIn, loadFromBackend])

  // 장바구니 수량 변경
  const updateQuantity = useCallback((productId: string, quantity: number, color?: string, size?: string) => {
    if (isLoggedIn) {
      // 로그인 시에는 백엔드에 수량 변경 API가 필요하지만, 현재 없으므로 로컬 상태만 변경
      setCartItems((items) =>
        items.map((item) =>
          item.productId === productId && item.color === color && item.size === size
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        )
      )
    } else {
      // 비로그인: 로컬 스토리지 업데이트
      const currentItems = getLocalCart()
      const updatedItems = currentItems.map((item) =>
        item.productId === productId && item.color === color && item.size === size
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
      setLocalCart(updatedItems)
      setCartItems(updatedItems)
    }
  }, [isLoggedIn])

  // 장바구니 비우기
  const clearCart = useCallback(async () => {
    if (isLoggedIn) {
      // 로그인: 백엔드의 모든 아이템 삭제
      for (const item of cartItems) {
        try {
          await toggleCartItem(item.productId)
        } catch {
          // 개별 삭제 실패 무시
        }
      }
      setCartItems([])
    } else {
      // 비로그인: 로컬 스토리지 비우기
      clearLocalCart()
      setCartItems([])
    }
  }, [isLoggedIn, cartItems])

  // 장바구니 총액 계산
  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [cartItems])

  // 장바구니 상품 수
  const getItemCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  }, [cartItems])

  // 초기 로드 및 로그인 상태 변경 시 다시 로드
  useEffect(() => {
    loadCart()
  }, [loadCart])

  return {
    cartItems,
    loading,
    isLoggedIn,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    loadCart,
    getTotalPrice,
    getItemCount,
  }
}

// 전역 장바구니 이벤트
export const CART_UPDATED_EVENT = 'cart:updated'

export const dispatchCartUpdate = () => {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}
