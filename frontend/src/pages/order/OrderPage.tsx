import { getProductImage, handleProductImageError } from '@/utils/productImages'
import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Stack,
  Alert,
  Card,
  CardContent,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { createOrder } from '@/api/orderApi'
import { fetchUser } from '@/api/userApi'
import { useDaumPostcode } from '@/hooks/useDaumPostcode'
import { loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'

// 토스페이먼츠 결제위젯 클라이언트 키 (환경변수에서 로드)
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || ''

interface OrderItem {
  productId: number
  productName: string
  productImage: string
  price: number
  quantity: number
  option?: string
  discountRate?: number
  color?: string
  size?: string
}

interface ShippingInfo {
  name: string
  phone: string
  zipcode: string
  address: string
  addressDetail: string
  memo: string
}

const OrderPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { openPostcode } = useDaumPostcode()

  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    zipcode: '',
    address: '',
    addressDetail: '',
    memo: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 토스페이먼츠 위젯
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null)
  const [isWidgetReady, setIsWidgetReady] = useState(false)
  const paymentWidgetRef = useRef<HTMLDivElement>(null)
  const agreementWidgetRef = useRef<HTMLDivElement>(null)

  // 주문 ID 생성
  const generateOrderId = () => {
    const now = new Date()
    const timestamp = now.getTime()
    const random = Math.random().toString(36).substring(2, 8)
    return `ORDER_${timestamp}_${random}`
  }

  useEffect(() => {
    if (location.state?.cartItems && location.state.cartItems.length > 0) {
      setOrderItems(location.state.cartItems)
    }
    fetchUserInfo()
    setIsLoading(false)
  }, [location.state])

  // 토스페이먼츠 위젯 초기화
  useEffect(() => {
    const initTossPayments = async () => {
      try {
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY)

        // 회원 결제일 경우 customerKey 사용, 비회원이면 ANONYMOUS
        const userId = localStorage.getItem('userId')
        const customerKey = userId ? `customer_${userId}` : 'ANONYMOUS'

        const widgetsInstance = tossPayments.widgets({
          customerKey: customerKey === 'ANONYMOUS' ? customerKey : customerKey,
        })

        setWidgets(widgetsInstance)
      } catch {
        setError('결제 시스템 초기화에 실패했습니다.')
      }
    }

    if (orderItems.length > 0) {
      initTossPayments()
    }
  }, [orderItems])

  // 위젯 렌더링
  useEffect(() => {
    const renderWidgets = async () => {
      if (!widgets || orderItems.length === 0) return

      // 총 금액 계산
      const calcTotalPrice = () => {
        const originalSubtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const totalDiscount = orderItems.reduce((sum, item) => {
          const discountRate = item.discountRate || 0
          return sum + Math.floor(item.price * (discountRate / 100)) * item.quantity
        }, 0)
        const subtotal = originalSubtotal - totalDiscount
        const shippingFee = subtotal >= 50000 ? 0 : 3000
        return subtotal + shippingFee
      }

      try {
        // 금액 설정
        await widgets.setAmount({
          currency: 'KRW',
          value: calcTotalPrice(),
        })

        // 결제 수단 위젯 렌더링
        if (paymentWidgetRef.current) {
          await widgets.renderPaymentMethods({
            selector: '#payment-widget',
            variantKey: 'DEFAULT',
          })
        }

        // 약관 위젯 렌더링
        if (agreementWidgetRef.current) {
          await widgets.renderAgreement({
            selector: '#agreement-widget',
            variantKey: 'AGREEMENT',
          })
        }

        setIsWidgetReady(true)
      } catch {
        // 위젯 렌더링 실패 시 무시
      }
    }

    renderWidgets()
  }, [widgets, orderItems])

  const fetchUserInfo = async () => {
    try {
      const user = await fetchUser()
      setShippingInfo(prev => ({
        ...prev,
        name: user.username || '',
        phone: user.phone || '',
        zipcode: user.zipCode || '',
        address: user.addr || '',
      }))
    } catch {
      // 사용자 정보 없으면 빈 값 유지
    }
  }

  const handleInputChange = (field: keyof ShippingInfo) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setShippingInfo(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSearchAddress = () => {
    openPostcode((result) => {
      setShippingInfo(prev => ({
        ...prev,
        zipcode: result.zonecode,
        address: result.address,
      }))
    })
  }

  // 할인된 가격 계산 함수
  const getDiscountedPrice = (item: OrderItem) => {
    const discountRate = item.discountRate || 0
    return Math.floor(item.price * (1 - discountRate / 100))
  }

  const getDiscountAmount = (item: OrderItem) => {
    const discountRate = item.discountRate || 0
    return Math.floor(item.price * (discountRate / 100)) * item.quantity
  }

  // 원가 합계
  const originalSubtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  // 할인 금액 합계
  const totalDiscount = orderItems.reduce((sum, item) => sum + getDiscountAmount(item), 0)
  // 할인 적용된 상품 금액
  const subtotal = originalSubtotal - totalDiscount
  const shippingFee = subtotal >= 50000 ? 0 : 3000
  const totalPrice = subtotal + shippingFee

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR') + '원'
  }

  // 결제 요청
  const handleSubmit = async () => {
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      setError('배송 정보를 모두 입력해주세요.')
      return
    }

    if (!widgets || !isWidgetReady) {
      setError('결제 시스템이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const orderId = generateOrderId()
      const orderName = orderItems.length > 1
        ? `${orderItems[0].productName} 외 ${orderItems.length - 1}건`
        : orderItems[0].productName

      // 주문 정보 백엔드에 저장
      try {
        await createOrder({
          addr: shippingInfo.address + ' ' + shippingInfo.addressDetail,
          zipCode: shippingInfo.zipcode,
          username: shippingInfo.name,
          orderDetail: shippingInfo.memo,
          call: shippingInfo.phone,
        })
      } catch {
        // 주문 정보 저장 실패해도 결제 진행
      }

      // 토스페이먼츠 결제 요청
      await widgets.requestPayment({
        orderId: orderId,
        orderName: orderName,
        customerName: shippingInfo.name,
        customerMobilePhone: shippingInfo.phone.replace(/-/g, ''),
        successUrl: `${window.location.origin}/order/success`,
        failUrl: `${window.location.origin}/order/fail`,
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '결제 요청 중 오류가 발생했습니다.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>로딩 중...</Typography>
      </Container>
    )
  }

  if (orderItems.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            주문할 상품이 없습니다.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/cart')} sx={{ mt: 2 }}>
            장바구니로 이동
          </Button>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        주문/결제
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* 주문 상품 목록 */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                주문 상품 ({orderItems.length}개)
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                {orderItems.map((item, index) => (
                  <Box key={`${item.productId}-${index}`} sx={{ display: 'flex', gap: 2 }}>
                    <Box
                      component="img"
                      src={getProductImage(item.productImage, item.productName)}
                      alt={item.productName}
                      onError={(event) => handleProductImageError(event, item.productName)}
                      sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight="medium">{item.productName}</Typography>
                      {(item.color || item.size) && (
                        <Typography variant="body2" color="text.secondary">
                          옵션: {[item.color, item.size].filter(Boolean).join(' / ')}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        수량: {item.quantity}개
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.discountRate && item.discountRate > 0 ? (
                          <>
                            <Typography
                              variant="body2"
                              sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                            >
                              {formatPrice(item.price * item.quantity)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: 'error.main', fontWeight: 'bold' }}
                            >
                              {item.discountRate}%
                            </Typography>
                            <Typography fontWeight="bold" color="primary">
                              {formatPrice(getDiscountedPrice(item) * item.quantity)}
                            </Typography>
                          </>
                        ) : (
                          <Typography fontWeight="bold" color="primary">
                            {formatPrice(item.price * item.quantity)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>

            {/* 배송 정보 */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                배송 정보
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="수령인"
                    fullWidth
                    required
                    value={shippingInfo.name}
                    onChange={handleInputChange('name')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="연락처"
                    fullWidth
                    required
                    placeholder="010-0000-0000"
                    value={shippingInfo.phone}
                    onChange={handleInputChange('phone')}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="우편번호"
                    fullWidth
                    value={shippingInfo.zipcode}
                    InputProps={{ readOnly: true }}
                    placeholder="주소 검색을 해주세요"
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Button
                    variant="outlined"
                    sx={{ height: '56px' }}
                    startIcon={<SearchIcon />}
                    onClick={handleSearchAddress}
                  >
                    주소 검색
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="주소"
                    fullWidth
                    required
                    value={shippingInfo.address}
                    InputProps={{ readOnly: true }}
                    placeholder="주소 검색을 통해 입력해주세요"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="상세주소"
                    fullWidth
                    value={shippingInfo.addressDetail}
                    onChange={handleInputChange('addressDetail')}
                    placeholder="상세주소를 입력해주세요"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="배송 메모"
                    fullWidth
                    placeholder="배송 시 요청사항을 입력해주세요"
                    value={shippingInfo.memo}
                    onChange={handleInputChange('memo')}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* 토스페이먼츠 결제수단 위젯 */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                결제 수단
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box id="payment-widget" ref={paymentWidgetRef} />
            </Paper>

            {/* 토스페이먼츠 약관 위젯 */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                약관 동의
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box id="agreement-widget" ref={agreementWidgetRef} />
            </Paper>
          </Stack>
        </Grid>

        {/* 결제 정보 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                결제 정보
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">상품 금액</Typography>
                  <Typography fontWeight={600}>{formatPrice(originalSubtotal)}</Typography>
                </Box>
                {totalDiscount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="error.main">할인 금액</Typography>
                    <Typography fontWeight={600} color="error.main">
                      -{formatPrice(totalDiscount)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">배송비</Typography>
                  <Typography fontWeight={600}>
                    {shippingFee === 0 ? (
                      <Box component="span" sx={{ color: 'success.main' }}>무료</Box>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </Typography>
                </Box>
                {subtotal < 50000 && (
                  <Typography variant="caption" color="text.secondary">
                    * 5만원 이상 구매 시 무료배송
                  </Typography>
                )}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight="bold">총 결제 금액</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {formatPrice(totalPrice)}
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="contained"
                size="large"
                fullWidth
                sx={{ mt: 3, py: 1.5 }}
                onClick={handleSubmit}
                disabled={isSubmitting || !isWidgetReady}
              >
                {isSubmitting ? '처리 중...' : `${formatPrice(totalPrice)} 결제하기`}
              </Button>
              {!isWidgetReady && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                  결제 시스템 로딩 중...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}

export default OrderPage
