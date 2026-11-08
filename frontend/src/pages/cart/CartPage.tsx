import { getProductImage, handleProductImageError } from '@/utils/productImages'
import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Checkbox,
  TextField,
  Divider,
  Grid,
  Card,
  CardContent,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useCart, type CartItem } from '@/hooks/useCart'

// 선택 상태가 추가된 CartItem
interface SelectableCartItem extends CartItem {
  selected: boolean
  stock: number
}

// 할인된 가격 계산 함수
const getDiscountedPrice = (price: number, discountRate?: number) => {
  const rate = discountRate || 0
  return Math.floor(price * (1 - rate / 100))
}

const CartPage: React.FC = () => {
  const navigate = useNavigate()
  const { cartItems: hookCartItems, loading, removeFromCart, updateQuantity, clearCart } = useCart()
  
  // 선택 상태를 로컬에서 관리
  const [selectableItems, setSelectableItems] = useState<SelectableCartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectAll, setSelectAll] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  // hookCartItems가 변경되면 selectableItems 업데이트
  useEffect(() => {
    const items: SelectableCartItem[] = hookCartItems.map(item => ({
      ...item,
      selected: true,
      stock: 99, // 기본 재고
    }))
    setSelectableItems(items)
    setSelectAll(items.length > 0)
  }, [hookCartItems])

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    setSelectableItems((items) => items.map((item) => ({ ...item, selected: checked })))
  }

  const handleSelectItem = (productId: string, checked: boolean) => {
    setSelectableItems((items) =>
      items.map((item) =>
        item.productId === productId ? { ...item, selected: checked } : item
      )
    )
    const updatedItems = selectableItems.map((item) =>
      item.productId === productId ? { ...item, selected: checked } : item
    )
    setSelectAll(updatedItems.every((item) => item.selected))
  }

  const handleQuantityChange = (productId: string, newQuantity: number, color?: string, size?: string) => {
    const item = selectableItems.find((i) => i.productId === productId)
    if (!item) return

    if (newQuantity < 1) newQuantity = 1
    if (newQuantity > item.stock) {
      setError(`재고가 부족합니다. (최대 ${item.stock}개)`)
      return
    }

    updateQuantity(productId, newQuantity, color, size)
    setSelectableItems((items) =>
      items.map((i) =>
        i.productId === productId ? { ...i, quantity: newQuantity } : i
      )
    )
  }

  const handleDeleteClick = (productId: string) => {
    setItemToDelete(productId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (itemToDelete === null) return

    const item = selectableItems.find(i => i.productId === itemToDelete)
    await removeFromCart(itemToDelete, item?.color, item?.size)
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const handleDeleteSelected = async () => {
    const selected = selectableItems.filter((item) => item.selected)
    if (selected.length === 0) {
      setError('선택된 상품이 없습니다.')
      return
    }

    for (const item of selected) {
      await removeFromCart(item.productId, item.color, item.size)
    }
  }

  const handleOrder = () => {
    const selectedItems = selectableItems.filter((item) => item.selected)
    if (selectedItems.length === 0) {
      setError('주문할 상품을 선택해주세요.')
      return
    }
    // Navigate to order page with selected items
    navigate('/order', { state: { cartItems: selectedItems } })
  }

  const selectedItems = selectableItems.filter((item) => item.selected)
  // 원가 합계
  const originalTotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  // 할인 적용된 합계
  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + getDiscountedPrice(item.price, item.discountRate) * item.quantity,
    0
  )
  // 총 할인 금액
  const totalDiscount = originalTotal - totalPrice
  const deliveryFee = totalPrice >= 50000 ? 0 : 3000
  const finalPrice = totalPrice + deliveryFee

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR') + '원'
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>로딩 중...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <CartIcon fontSize="large" />
        장바구니
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {selectableItems.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CartIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            장바구니가 비어있습니다
          </Typography>
          <Button variant="contained" onClick={() => navigate('/products')} sx={{ mt: 2 }}>
            쇼핑하러 가기
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: 'grey.50',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <Typography>
                    전체 선택 ({selectedItems.length}/{selectableItems.length})
                  </Typography>
                </Box>
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteSelected}
                  disabled={selectedItems.length === 0}
                >
                  선택 삭제
                </Button>
                <Button
                  color="warning"
                  variant="outlined"
                  onClick={async () => {
                    await clearCart()
                    setSelectableItems([])
                  }}
                  disabled={selectableItems.length === 0}
                >
                  전체 비우기
                </Button>
              </Box>
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>상품 정보</TableCell>
                      <TableCell align="center">수량</TableCell>
                      <TableCell align="right">가격</TableCell>
                      <TableCell align="center">삭제</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectableItems.map((item) => (
                      <TableRow key={item.productId} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={item.selected}
                            onChange={(e) =>
                              handleSelectItem(item.productId, e.target.checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              component="img"
                              src={getProductImage(item.productImage, item.productName)}
                              alt={item.productName}
                              onError={(event) => handleProductImageError(event, item.productName)}
                              sx={{
                                width: 80,
                                height: 80,
                                objectFit: 'cover',
                                borderRadius: 1,
                                cursor: 'pointer',
                              }}
                              onClick={() => navigate(`/products/${item.productId}`)}
                            />
                            <Box>
                              <Typography
                                variant="subtitle1"
                                fontWeight="medium"
                                sx={{
                                  cursor: 'pointer',
                                  '&:hover': { color: 'primary.main' },
                                }}
                                onClick={() => navigate(`/products/${item.productId}`)}
                              >
                                {item.productName}
                              </Typography>
                              {item.discountRate && item.discountRate > 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                                    {formatPrice(item.price)}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                    {item.discountRate}%
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {formatPrice(item.price)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleQuantityChange(item.productId, item.quantity - 1, item.color, item.size)
                              }
                              disabled={item.quantity <= 1}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <TextField
                              size="small"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value)
                                if (!isNaN(val))
                                  handleQuantityChange(item.productId, val, item.color, item.size)
                              }}
                              inputProps={{
                                style: { textAlign: 'center', width: 40 },
                                min: 1,
                                max: item.stock,
                              }}
                              sx={{ mx: 1 }}
                            />
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleQuantityChange(item.productId, item.quantity + 1, item.color, item.size)
                              }
                              disabled={item.quantity >= item.stock}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {item.discountRate && item.discountRate > 0 ? (
                            <Box>
                              <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                                {formatPrice(item.price * item.quantity)}
                              </Typography>
                              <Typography fontWeight="bold" color="primary">
                                {formatPrice(getDiscountedPrice(item.price, item.discountRate) * item.quantity)}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography fontWeight="bold">
                              {formatPrice(item.price * item.quantity)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(item.productId)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

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
                    <Typography>{formatPrice(originalTotal)}</Typography>
                  </Box>
                  {totalDiscount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="error.main">할인 금액</Typography>
                      <Typography color="error.main" fontWeight="bold">
                        -{formatPrice(totalDiscount)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">배송비</Typography>
                    <Typography>
                      {deliveryFee === 0 ? (
                        <Box component="span" sx={{ color: 'success.main' }}>
                          무료
                        </Box>
                      ) : (
                        formatPrice(deliveryFee)
                      )}
                    </Typography>
                  </Box>
                  {deliveryFee > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      * 50,000원 이상 구매 시 무료배송
                    </Typography>
                  )}
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight="bold">
                      총 결제 금액
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {formatPrice(finalPrice)}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ mt: 3, py: 1.5 }}
                  onClick={handleOrder}
                  disabled={selectedItems.length === 0}
                >
                  {selectedItems.length > 0
                    ? `${selectedItems.length}개 상품 주문하기`
                    : '상품을 선택해주세요'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>상품 삭제</DialogTitle>
        <DialogContent>
          <Typography>이 상품을 장바구니에서 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default CartPage

