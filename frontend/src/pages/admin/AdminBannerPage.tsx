import { getProductImage, handleProductImageError } from '@/utils/productImages'
import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControlLabel,
  Alert,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Chip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material'
import {
  fetchAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  type Banner,
  type BannerRequest,
} from '@/api/bannerApi'

const AdminBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState<BannerRequest>({
    title: '',
    imageUrl: '',
    linkUrl: '',
    displayOrder: 1,
    isActive: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      setLoading(true)
      const data = await fetchAllBanners()
      // displayOrder 기준 정렬
      const sorted = [...data].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      setBanners(sorted)
    } catch (err) {
      console.error('배너 로드 실패:', err)
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (banner?: Banner, defaultOrder?: number) => {
    if (banner) {
      setEditingBanner(banner)
      setFormData({
        title: banner.title,
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl,
        displayOrder: banner.displayOrder,
        isActive: banner.isActive,
      })
      setImagePreview(banner.imageUrl)
    } else {
      setEditingBanner(null)
      setFormData({
        title: '',
        imageUrl: '',
        linkUrl: '',
        displayOrder: defaultOrder || banners.length + 1,
        isActive: true,
      })
      setImagePreview('')
    }
    setSelectedImage(null)
    setError(null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingBanner(null)
    setError(null)
    setSelectedImage(null)
    setImagePreview('')
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!formData.title) {
      setError('제목은 필수입니다.')
      return
    }

    if (!selectedImage && !formData.imageUrl) {
      setError('이미지를 업로드하거나 URL을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      if (editingBanner) {
        await updateBanner(editingBanner.id, formData, selectedImage || undefined)
      } else {
        await createBanner(formData, selectedImage || undefined)
      }
      await loadBanners()
      handleCloseDialog()
    } catch (err) {
      console.error('배너 저장 실패:', err)
      setError('배너 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    try {
      await deleteBanner(id)
      await loadBanners()
    } catch (err) {
      console.error('배너 삭제 실패:', err)
      alert('배너 삭제에 실패했습니다.')
    }
  }

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateBanner(banner.id, {
        ...banner,
        isActive: !banner.isActive,
      })
      await loadBanners()
    } catch (err) {
      console.error('배너 상태 변경 실패:', err)
    }
  }

  // 슬라이드 그룹으로 배너 나누기 (3개씩)
  const getSlideGroups = () => {
    const groups: (Banner | null)[][] = []
    // 9개 슬롯을 3개씩 3그룹으로 나누기
    for (let groupIndex = 0; groupIndex < 3; groupIndex++) {
      const group: (Banner | null)[] = []
      for (let slotIndex = 0; slotIndex < 3; slotIndex++) {
        const order = groupIndex * 3 + slotIndex + 1
        const banner = banners.find((b) => b.displayOrder === order) || null
        group.push(banner)
      }
      groups.push(group)
    }
    return groups
  }

  const slideGroups = getSlideGroups()

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>배너 로딩 중...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            배너 관리
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            홈페이지 메인 슬라이드 배너를 관리합니다. (3개씩 1세트, 총 9개 권장)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          배너 등록
        </Button>
      </Box>

      {/* 탭 메뉴 */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="슬라이드 미리보기" />
        <Tab label="전체 목록" />
      </Tabs>

      {/* 슬라이드 미리보기 탭 */}
      {tabValue === 0 && (
        <Box>
          {slideGroups.map((group, groupIndex) => {
            const filledCount = group.filter((b) => b !== null).length
            return (
              <Paper
                key={groupIndex}
                elevation={0}
                sx={{
                  mb: 4,
                  p: 3,
                  border: '1px solid #E5E7EB',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="600">
                    슬라이드 {groupIndex + 1}
                  </Typography>
                  <Chip
                    label={`${filledCount}/3`}
                    color={filledCount === 3 ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>

                <Grid container spacing={2}>
                  {group.map((banner, slotIndex) => {
                    const globalIndex = groupIndex * 3 + slotIndex + 1

                    return (
                      <Grid item xs={12} md={4} key={slotIndex}>
                        {banner ? (
                          <Card
                            sx={{
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              opacity: banner.isActive ? 1 : 0.5,
                              transition: 'opacity 0.3s',
                            }}
                          >
                            <Box sx={{ position: 'relative' }}>
                              <CardMedia
                                component="img"
                                height="200"
                                image={getProductImage(banner.imageUrl, banner.title)}
                                alt={banner.title}
                                sx={{ objectFit: 'cover' }}
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                  handleProductImageError(e, banner.title)
                                }}
                              />
                              {/* 순서 배지 */}
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8,
                                  bgcolor: 'rgba(0,0,0,0.7)',
                                  color: 'white',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                }}
                              >
                                #{globalIndex}
                              </Box>
                              {/* 활성화 상태 */}
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleActive(banner)}
                                  sx={{
                                    bgcolor: 'rgba(255,255,255,0.9)',
                                    '&:hover': { bgcolor: 'white' },
                                  }}
                                >
                                  {banner.isActive ? (
                                    <VisibilityIcon fontSize="small" color="success" />
                                  ) : (
                                    <VisibilityOffIcon fontSize="small" color="disabled" />
                                  )}
                                </IconButton>
                              </Box>
                            </Box>
                            <CardContent sx={{ flexGrow: 1, py: 1.5 }}>
                              <Typography variant="subtitle1" fontWeight="600" noWrap>
                                {banner.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {banner.linkUrl || '링크 없음'}
                              </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handleOpenDialog(banner)}
                              >
                                수정
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDelete(banner.id)}
                              >
                                삭제
                              </Button>
                            </CardActions>
                          </Card>
                        ) : (
                          <Card
                            sx={{
                              height: '100%',
                              minHeight: 280,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px dashed #ddd',
                              bgcolor: '#fafafa',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                borderColor: '#6366F1',
                                bgcolor: '#f8f8ff',
                              },
                            }}
                            onClick={() => handleOpenDialog(undefined, globalIndex)}
                          >
                            <AddIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                            <Typography color="text.secondary">
                              배너 #{globalIndex} 추가
                            </Typography>
                          </Card>
                        )}
                      </Grid>
                    )
                  })}
                </Grid>
              </Paper>
            )
          })}

          {/* 안내 메시지 */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>권장사항:</strong> 홈페이지에서 배너는 3개씩 1세트로 슬라이드됩니다.
              9개의 배너를 등록하면 3개의 슬라이드 세트가 자동으로 순환됩니다.
              <br />
              <strong>이미지 크기:</strong> 600x800px 또는 3:4 비율 권장
            </Typography>
          </Alert>
        </Box>
      )}

      {/* 전체 목록 탭 */}
      {tabValue === 1 && (
        <Paper elevation={0} sx={{ border: '1px solid #E5E7EB' }}>
          <Box sx={{ p: 2 }}>
            {banners.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary">등록된 배너가 없습니다.</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{ mt: 2 }}
                >
                  첫 배너 등록하기
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {banners.map((banner) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={banner.id}>
                    <Card
                      sx={{
                        height: '100%',
                        opacity: banner.isActive ? 1 : 0.6,
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="150"
                          image={getProductImage(banner.imageUrl, banner.title)}
                          alt={banner.title}
                          sx={{ objectFit: 'cover' }}
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            handleProductImageError(e, banner.title)
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            bgcolor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            px: 1,
                            py: 0.3,
                            borderRadius: 0.5,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          #{banner.displayOrder}
                        </Box>
                        <Chip
                          label={banner.isActive ? '활성' : '비활성'}
                          size="small"
                          color={banner.isActive ? 'success' : 'default'}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                          }}
                        />
                      </Box>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight="600" noWrap>
                          {banner.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {banner.linkUrl || '-'}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={banner.isActive}
                              onChange={() => handleToggleActive(banner)}
                              size="small"
                            />
                          }
                          label=""
                          sx={{ m: 0 }}
                        />
                        <Box>
                          <IconButton size="small" onClick={() => handleOpenDialog(banner)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(banner.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Paper>
      )}

      {/* 배너 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBanner ? '배너 수정' : '배너 등록'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="제목"
                fullWidth
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 겨울 신상품 20% 할인"
              />
            </Grid>

            {/* 이미지 업로드 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                이미지
              </Typography>
              <Box
                sx={{
                  border: '2px dashed #ddd',
                  borderRadius: 2,
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#6366F1',
                    bgcolor: '#f8f8ff',
                  },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                />
                {imagePreview ? (
                  <Box>
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Preview"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: 200,
                        objectFit: 'contain',
                        borderRadius: 1,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      클릭하여 이미지 변경
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <CloudUploadIcon sx={{ fontSize: 48, color: '#ccc' }} />
                    <Typography color="text.secondary">
                      클릭하여 이미지 업로드
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      권장 크기: 600x800px (3:4 비율)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="이미지 URL (직접 입력)"
                fullWidth
                value={formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value })
                  if (e.target.value && !selectedImage) {
                    setImagePreview(e.target.value)
                  }
                }}
                helperText="이미지 파일 업로드 또는 URL 중 하나만 입력"
                disabled={!!selectedImage}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="링크 URL"
                fullWidth
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="/products?category=outer"
                helperText="배너 클릭 시 이동할 경로"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="순서"
                type="number"
                fullWidth
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })
                }
                inputProps={{ min: 1, max: 9 }}
                helperText="1~3: 슬라이드1, 4~6: 슬라이드2, 7~9: 슬라이드3"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="활성화"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            취소
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editingBanner ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default AdminBannerPage
