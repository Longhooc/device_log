# Hướng Dẫn Triển Khai Hệ Thống Authentication và Permissions

## Tổng Quan

Hệ thống đã được cập nhật để sử dụng API thực với authentication và permissions được lưu trữ trong database MySQL.

## Các Thành Phần Mới

### 1. Database Schema
- **File**: `database_auth_schema.sql`
- **Bảng mới**: `users`, `link_permissions`, `user_sessions`
- **Cập nhật**: Bảng `google_links` với cột `created_by`

### 2. Backend API Endpoints
- **File**: `backend_auth_endpoints.js`
- **Authentication**: JWT-based với bcrypt password hashing
- **Permissions**: Quản lý quyền truy cập link theo role

### 3. Frontend API Client
- **File**: `src/api/authApi.js`
- **Authentication**: Login/logout với token management
- **Permissions**: Kiểm tra quyền truy cập link

## Cài Đặt Backend

### 1. Cài đặt Dependencies
```bash
npm install bcrypt jsonwebtoken
```

### 2. Cập nhật Environment Variables
```bash
# Thêm vào .env hoặc environment
JWT_SECRET=your-super-secret-key-change-in-production
```

### 3. Cập nhật Server.js
Thêm vào file `server.js` hiện tại:

```javascript
// Import packages
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Thêm tất cả code từ backend_auth_endpoints.js
```

### 4. Chạy Database Schema
```bash
mysql -u myuser1 -p log_device < database_auth_schema.sql
```

## Cài Đặt Frontend

### 1. Cập nhật Environment Variables
```bash
# Thêm vào .env
REACT_APP_API_URL=https://axithcl.sytes.net:81
```

### 2. Các file đã được cập nhật:
- `src/auth/authContext.js` - Sử dụng API thực
- `src/api/authApi.js` - API client mới
- `src/api/linksApi.js` - Tích hợp authentication
- `src/components/LoginForm.jsx` - Cập nhật UI

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/logout` - Đăng xuất

### User Management (Admin only)
- `GET /api/users` - Lấy danh sách users
- `POST /api/users` - Thêm user mới
- `DELETE /api/users/:id` - Xóa user

### Link Permissions
- `GET /api/links/:id/permissions` - Lấy permissions của link
- `PUT /api/links/:id/permissions` - Cập nhật permissions (Admin only)
- `GET /api/links/:id/access` - Kiểm tra quyền truy cập

## Database Schema

### Bảng Users
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'director', 'manager', 'employee') NOT NULL,
    department VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Bảng Link Permissions
```sql
CREATE TABLE link_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link_id INT NOT NULL,
    allowed_roles JSON NOT NULL,
    allow_manager_preview BOOLEAN DEFAULT TRUE,
    allow_employee_preview BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES google_links(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

## Tài Khoản Mặc Định

Sau khi chạy database schema, các tài khoản sau sẽ được tạo:

| Username | Password | Role | Department |
|----------|----------|------|------------|
| admin | admin123 | admin | IT |
| director | director123 | director | Management |
| manager | manager123 | manager | HR |
| employee | employee123 | employee | Sales |

## Tính Năng Mới

### 1. JWT Authentication
- Token-based authentication
- Tự động refresh token
- Secure password hashing với bcrypt

### 2. Role-based Access Control
- 4 vai trò: admin, director, manager, employee
- Permissions được lưu trong database
- Kiểm tra quyền real-time

### 3. Link Permissions Management
- Admin có thể cấu hình quyền cho từng link
- Permissions được lưu trong database
- Tự động tạo permissions mặc định cho link mới

### 4. User Management
- Admin có thể thêm/xóa users
- Theo dõi last login
- Soft delete users

## Bảo Mật

### 1. Password Security
- Bcrypt hashing với salt rounds
- Không lưu plain text passwords

### 2. JWT Security
- Secret key được lưu trong environment variables
- Token expiration (24h)
- Secure headers

### 3. API Security
- Authentication middleware
- Role-based authorization
- Input validation

## Testing

### 1. Test Authentication
```bash
# Login
curl -X POST https://axithcl.sytes.net:81/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get current user
curl -X GET https://axithcl.sytes.net:81/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Permissions
```bash
# Get link permissions
curl -X GET https://axithcl.sytes.net:81/api/links/1/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check access
curl -X GET https://axithcl.sytes.net:81/api/links/1/access \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### 1. Database Connection Issues
- Kiểm tra MySQL connection
- Verify database schema đã được tạo
- Check user permissions

### 2. JWT Issues
- Verify JWT_SECRET được set
- Check token expiration
- Verify token format

### 3. Permission Issues
- Check user role trong database
- Verify link permissions
- Check API authorization headers

## Migration từ Mock Data

Hệ thống sẽ tự động:
1. Tạo permissions mặc định cho links hiện có
2. Migrate users từ mock data sang database
3. Preserve existing link data

## Production Considerations

### 1. Security
- Thay đổi JWT_SECRET
- Sử dụng HTTPS
- Implement rate limiting
- Add input sanitization

### 2. Performance
- Add database indexes
- Implement caching
- Optimize queries
- Add connection pooling

### 3. Monitoring
- Add logging
- Implement health checks
- Monitor authentication failures
- Track permission usage
