# 🚀 Hướng dẫn triển khai Google Links Management System

## 📋 Tổng quan
Hệ thống quản lý links Google Docs/Sheets với tích hợp AI Gemini, backend Node.js + MySQL, và frontend React.

## 🗄️ Cơ sở dữ liệu

### 1. Tạo bảng mới
```sql
-- Chạy file database_schema.sql trong MySQL
mysql -u myuser1 -p log_device < database_schema.sql
```

### 2. Cấu trúc bảng `google_links`
- `id`: Primary key, auto increment
- `title`: Tiêu đề link (VARCHAR 255)
- `url`: URL Google Form/Sheet/Doc (TEXT)
- `department`: Phòng ban (ENUM: hr, it, finance, marketing, sales, admin)
- `type`: Loại tài liệu (ENUM: form, sheet, doc)
- `description`: Mô tả chi tiết (TEXT)
- `is_favorite`: Đánh dấu yêu thích (BOOLEAN)
- `access_count`: Số lần truy cập (INT)
- `created_at`: Ngày tạo (TIMESTAMP)
- `updated_at`: Ngày cập nhật (TIMESTAMP)
- `created_by`: Người tạo (VARCHAR 100)
- `is_active`: Trạng thái hoạt động (BOOLEAN)

## 🔧 Backend Setup

### 1. Cài đặt dependencies
```bash
npm install express mysql2 cors https fs
```

### 2. Cấu hình SSL
- Đảm bảo có file SSL certificate tại:
  - `/etc/letsencrypt/live/axithcl.sytes.net/privkey.pem`
  - `/etc/letsencrypt/live/axithcl.sytes.net/fullchain.pem`

### 3. Chạy backend
```bash
node backend_links_api.js
```

### 4. API Endpoints
- `GET /api/links` - Lấy danh sách links
- `GET /api/links/:id` - Lấy link theo ID
- `POST /api/links` - Thêm link mới
- `PUT /api/links/:id` - Cập nhật link
- `DELETE /api/links/:id` - Xóa link (soft delete)
- `PATCH /api/links/:id/favorite` - Toggle favorite
- `PATCH /api/links/:id/access` - Tăng access count
- `GET /api/links/stats` - Thống kê

## ⚛️ Frontend Setup

### 1. Cấu hình environment
Tạo file `.env` trong thư mục gốc:
```bash
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
REACT_APP_API_URL=https://axithcl.sytes.net:81/api
```

### 2. Cài đặt dependencies
```bash
npm install @google/generative-ai
```

### 3. Chạy frontend
```bash
npm start
```

## 🔐 Bảo mật

### 1. Mã xác thực
- **Xóa links**: `***4` (có thể thay đổi trong backend)
- **Thêm device logs**: `***4` (có thể thay đổi trong backend)

### 2. CORS
- Backend đã cấu hình CORS cho tất cả origins
- Có thể giới hạn trong production

### 3. SSL/HTTPS
- Backend chạy trên HTTPS port 81
- Frontend cần truy cập qua HTTPS

## 📊 Tính năng chính

### 1. Quản lý Links
- ✅ Thêm/sửa/xóa links
- ✅ Phân loại theo phòng ban và loại
- ✅ Đánh dấu yêu thích
- ✅ Tìm kiếm thông minh
- ✅ Thống kê truy cập

### 2. AI Integration
- ✅ Gemini AI tra cứu links
- ✅ Tìm kiếm theo ngữ cảnh
- ✅ Gợi ý thông minh

### 3. UI/UX
- ✅ Responsive design
- ✅ Typing effect cho AI response
- ✅ URL highlighting và click tracking
- ✅ Loading states và error handling

## 🚀 Triển khai Production

### 1. Database
```sql
-- Backup database hiện tại
mysqldump -u myuser1 -p log_device > backup_$(date +%Y%m%d).sql

-- Import schema mới
mysql -u myuser1 -p log_device < database_schema.sql
```

### 2. Backend
```bash
# Sử dụng PM2 để quản lý process
npm install -g pm2
pm2 start backend_links_api.js --name "links-api"
pm2 save
pm2 startup
```

### 3. Frontend
```bash
# Build production
npm run build

# Serve static files (có thể dùng nginx)
# Copy build/ folder vào web server
```

## 🔍 Monitoring & Logs

### 1. Backend Logs
```bash
# Xem logs PM2
pm2 logs links-api

# Xem logs realtime
pm2 logs links-api --lines 100
```

### 2. Database Monitoring
```sql
-- Kiểm tra số lượng links
SELECT COUNT(*) as total_links FROM google_links WHERE is_active = 1;

-- Kiểm tra links được truy cập nhiều nhất
SELECT title, access_count FROM google_links 
WHERE is_active = 1 
ORDER BY access_count DESC 
LIMIT 10;
```

## 🐛 Troubleshooting

### 1. Lỗi kết nối database
- Kiểm tra MySQL service: `systemctl status mysql`
- Kiểm tra credentials trong backend
- Kiểm tra firewall port 3306

### 2. Lỗi SSL certificate
- Kiểm tra file certificate tồn tại
- Kiểm tra quyền đọc file
- Renew certificate nếu cần: `certbot renew`

### 3. Lỗi CORS
- Kiểm tra origin trong request
- Cấu hình CORS trong backend nếu cần

### 4. Lỗi Gemini API
- Kiểm tra API key trong .env
- Kiểm tra quota API
- Kiểm tra network connectivity

## 📈 Performance Optimization

### 1. Database
- Đã tạo indexes cho các trường thường query
- Sử dụng soft delete thay vì hard delete
- Pagination cho danh sách lớn (có thể thêm sau)

### 2. Frontend
- Lazy loading cho components
- Memoization cho expensive operations
- Debounce cho search input

### 3. Caching
- Có thể thêm Redis cho caching API responses
- Browser caching cho static assets

## 🔄 Backup & Recovery

### 1. Database Backup
```bash
# Daily backup
mysqldump -u myuser1 -p log_device > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Restore Database
```bash
# Restore từ backup
mysql -u myuser1 -p log_device < backup_file.sql
```

## 📞 Support

Nếu gặp vấn đề trong quá trình triển khai, vui lòng:
1. Kiểm tra logs backend và frontend
2. Kiểm tra database connectivity
3. Kiểm tra SSL certificate
4. Kiểm tra API keys và environment variables
