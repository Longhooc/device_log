# 🔗 Link Manager - Quản lý Link Google Docs/Sheets

## Tổng quan
Trang **Quản lý Link** giúp tập trung hóa tất cả các link Google Forms, Google Sheets, và Google Docs của các phòng ban trong công ty. Tích hợp **Gemini 1.5 Flash** AI để đưa ra gợi ý thông minh về cách tổ chức và quản lý links.

## Tính năng chính

### 📋 Quản lý Links
- ➕ **Thêm link mới**: Thêm link với thông tin chi tiết (tiêu đề, URL, phòng ban, loại, mô tả)
- 🔍 **Tìm kiếm và lọc**: Tìm kiếm theo tên hoặc mô tả, lọc theo phòng ban
- ⭐ **Yêu thích**: Đánh dấu các links quan trọng
- 🗑️ **Xóa link**: Xóa các links không cần thiết

### 🤖 Tích hợp Gemini AI
- **🤖 Phân tích tổng thể**: AI phân tích toàn bộ danh sách links và đưa ra gợi ý tối ưu hóa
- **❓ Hỏi nhanh**: Đặt câu hỏi cụ thể cho AI về quản lý links
- **📊 Gợi ý phân loại**: AI đề xuất cách phân loại và tổ chức links hiệu quả

### 📊 Thống kê
- Tổng số links
- Số links đang hiển thị sau khi lọc  
- Số phòng ban đang sử dụng

## Cài đặt Gemini API

### Bước 1: Lấy API Key
1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Đăng nhập với tài khoản Google
3. Tạo API key mới
4. Copy API key

### Bước 2: Cấu hình
1. Tạo file `.env` trong thư mục gốc của dự án
2. Thêm dòng sau:
```
REACT_APP_GEMINI_API_KEY=your_api_key_here
```
3. Thay `your_api_key_here` bằng API key thật

### Bước 3: Khởi động lại ứng dụng
```bash
npm start
```

## Cách sử dụng

### Thêm Link Mới
1. Click nút **"➕ Thêm Link"**
2. Điền thông tin:
   - **Tiêu đề**: Tên mô tả cho link
   - **URL**: Đường dẫn đến Google Form/Sheet/Doc
   - **Phòng ban**: Chọn phòng ban sở hữu
   - **Loại**: Form, Sheet, hoặc Doc
   - **Mô tả**: Thông tin bổ sung (tùy chọn)
3. Click **"✅ Thêm Link"**

### Tìm kiếm và Lọc
- **Tìm kiếm**: Nhập từ khóa vào ô "🔍 Tìm kiếm link..."
- **Lọc phòng ban**: Chọn phòng ban từ dropdown
- Kết quả sẽ được cập nhật tự động

### Sử dụng AI Gemini

#### Phân tích tổng thể
1. Click **"🤖 Phân tích tổng thể"**
2. AI sẽ phân tích toàn bộ danh sách và đưa ra gợi ý:
   - Cách tổ chức links hiệu quả
   - Cải thiện tìm kiếm
   - Quản lý người dùng
   - Bảo trì và cập nhật

#### Hỏi nhanh
1. Click **"❓ Hỏi nhanh"**
2. Nhập câu hỏi cụ thể
3. Ví dụ: "Làm thế nào để tổ chức links của phòng HR?"
4. Click **"🚀 Hỏi"** hoặc nhấn Enter

#### Gợi ý phân loại
1. Click **"📊 Gợi ý phân loại"**
2. AI sẽ đề xuất:
   - Cấu trúc thư mục
   - Hệ thống tags
   - Nhóm theo mục đích
   - Dashboard cho từng phòng ban

## Lưu trữ dữ liệu
- Links được lưu trong **localStorage** của trình duyệt
- Dữ liệu yêu thích cũng được lưu cục bộ
- Backup tự động khi thêm/xóa/sửa links

## Phòng ban được hỗ trợ
- 👥 Nhân sự (HR)
- 💻 Công nghệ thông tin (IT)
- 💰 Tài chính (Finance)
- 📈 Marketing
- 🤝 Kinh doanh (Sales)
- 📋 Hành chính (Admin)

## Loại links được hỗ trợ
- 📝 **Google Forms**: Các form khảo sát, đăng ký, báo cáo
- 📊 **Google Sheets**: Bảng tính, database, báo cáo
- 📄 **Google Docs**: Tài liệu, hướng dẫn, quy trình

## Troubleshooting

### Lỗi Gemini API
- **"API key is not configured"**: Chưa cấu hình API key trong file .env
- **"quota exceeded"**: Đã vượt giới hạn API, thử lại sau
- **"API error"**: Lỗi kết nối, kiểm tra internet và API key

### Dữ liệu bị mất
- Dữ liệu lưu trong localStorage, có thể bị xóa khi clear browser data
- Backup định kỳ bằng cách export danh sách
- Cân nhắc tích hợp database server cho dữ liệu lâu dài

## Roadmap
- 🔄 Sync với Google Drive API
- 📤 Export/Import danh sách links
- 👥 Phân quyền người dùng
- 📊 Analytics và reporting
- 🔔 Notification khi link hỏng
- 🏷️ Hệ thống tags nâng cao
