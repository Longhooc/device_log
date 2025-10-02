# Hệ Thống Phân Quyền Tài Khoản

## Tổng Quan

Hệ thống phân quyền được thiết kế để kiểm soát quyền truy cập các link Google Docs/Sheets dựa trên vai trò người dùng. Hệ thống bao gồm 4 vai trò chính với các quyền hạn khác nhau.

## Các Vai Trò và Quyền Hạn

### 1. 👑 Admin (Quản trị viên)
- **Quyền cao nhất**: Có thể truy cập và quản lý tất cả
- **Quyền hạn**:
  - Xem tất cả links
  - Chỉnh sửa và xóa links
  - Quản lý người dùng
  - Cấu hình quyền truy cập
  - Truy cập Admin Panel
  - Preview tất cả links

### 2. 🎖️ Director (Ban giám đốc)
- **Quyền cao**: Có thể xem và preview hầu hết links
- **Quyền hạn**:
  - Xem tất cả links
  - Preview tất cả links
  - Không thể chỉnh sửa/xóa links
  - Không thể quản lý người dùng

### 3. 👔 Manager (Quản lý)
- **Quyền trung bình**: Có thể xem và preview một số links
- **Quyền hạn**:
  - Xem tất cả links
  - Preview links được phép (tùy theo cấu hình)
  - Không thể chỉnh sửa/xóa links
  - Không thể quản lý người dùng

### 4. 👤 Employee (Nhân viên)
- **Quyền cơ bản**: Chỉ có thể xem links được phép
- **Quyền hạn**:
  - Xem links được phép truy cập
  - Preview links được phép cụ thể
  - Không thể chỉnh sửa/xóa links
  - Không thể quản lý người dùng

## Cách Sử Dụng

### Đăng Nhập
1. Truy cập ứng dụng
2. Sử dụng một trong các tài khoản demo:
   - **Admin**: `admin` / `admin123`
   - **Ban Giám Đốc**: `director` / `director123`
   - **Quản Lý**: `manager` / `manager123`
   - **Nhân Viên**: `employee` / `employee123`

### Quản Lý Quyền Truy Cập (Admin)
1. Đăng nhập với tài khoản Admin
2. Click nút "👑 Admin Panel" ở góc phải header
3. Chuyển sang tab "🔐 Quyền truy cập link"
4. Cấu hình quyền cho từng link:
   - **Vai trò được phép**: Chọn các vai trò có thể truy cập link
   - **Preview Manager**: Cho phép Manager preview link
   - **Preview Employee**: Cho phép Employee preview link

### Hiển Thị Trạng Thái Quyền Truy Cập
- **Link bình thường**: Hiển thị đầy đủ với các nút "Xem" và "Mở"
- **Link bị hạn chế**: 
  - Hiển thị biểu tượng 🔒
  - Thông báo "Không có quyền truy cập"
  - Các nút bị vô hiệu hóa
  - Màu sắc nhạt hơn

## Cấu Trúc Dữ Liệu

### Link Object với Permissions
```javascript
{
  id: 1,
  title: "Form đăng ký nhân viên mới",
  url: "https://forms.google.com/example1",
  department: "hr",
  description: "Form đăng ký thông tin nhân viên mới vào công ty",
  type: "form",
  created_at: "2024-01-15",
  permissions: {
    allowedRoles: ["admin", "director", "manager"],
    allowManagerPreview: true,
    allowEmployeePreview: false
  }
}
```

### User Object
```javascript
{
  id: 1,
  username: "admin",
  name: "Administrator",
  role: "admin",
  department: "IT",
  lastLogin: "2024-01-15 10:30:00",
  status: "active"
}
```

## Tính Năng Chính

### 1. Xác Thực và Phân Quyền
- Đăng nhập/đăng xuất
- Kiểm tra quyền truy cập theo vai trò
- Bảo vệ routes và components

### 2. Quản Lý Người Dùng (Admin)
- Thêm/xóa người dùng
- Phân quyền vai trò
- Theo dõi trạng thái đăng nhập

### 3. Kiểm Soát Truy Cập Link
- Cấu hình quyền truy cập theo vai trò
- Kiểm soát quyền preview
- Hiển thị trạng thái quyền truy cập

### 4. Giao Diện Thân Thiện
- User profile với dropdown
- Admin panel với tabs
- Thông báo trạng thái quyền truy cập
- Responsive design

## Bảo Mật

### Frontend
- Kiểm tra quyền ở component level
- Ẩn/hiện các tính năng theo quyền
- Validate input và actions

### Backend (Cần triển khai)
- JWT authentication
- Role-based access control
- API endpoint protection
- Database permissions

## Mở Rộng

### Thêm Vai Trò Mới
1. Cập nhật `USER_ROLES` trong `authContext.js`
2. Thêm quyền hạn trong `ROLE_PERMISSIONS`
3. Cập nhật UI components
4. Thêm vào admin panel

### Thêm Quyền Mới
1. Cập nhật `ROLE_PERMISSIONS`
2. Thêm logic kiểm tra trong `useAuth`
3. Cập nhật components sử dụng quyền

## Lưu Ý

- Hệ thống hiện tại sử dụng mock data
- Cần tích hợp với backend thực tế
- Cần thêm validation và error handling
- Cần thêm logging và audit trail
- Cần thêm password encryption
