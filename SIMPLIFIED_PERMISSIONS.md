# ✨ Hệ thống Permissions Đã Đơn Giản Hóa

## 🎯 Thay đổi chính

### **TRƯỚC ĐÂY (Phức tạp):**
- 2 loại quyền: **Access** (Mở) và **Preview** (Xem)
- Admin Panel có nhiều checkbox: "Nhân viên", "Nhân viên (Xem)", "Quản lý (Xem)"
- Logic phức tạp, dễ nhầm lẫn

### **BÂY GIỜ (Đơn giản):**
- **CHỈ 1 LOẠI QUYỀN**: Tick role = Có quyền **MỞ & XEM**
- Admin Panel chỉ có checkbox cho từng role: Admin, Giám đốc, Quản lý, Nhân viên
- Logic đơn giản: `hasAccess = canPreview`

---

## 📋 Cách sử dụng Admin Panel

### **Bước 1: Vào Admin Panel**
Click button **👑** → Tab **"Quyền truy cập link"**

### **Bước 2: Cấu hình quyền**
Mỗi link có 4 checkbox:
- ☑️ **Admin** - Quản trị viên
- ☑️ **Giám đốc** - Ban giám đốc  
- ☑️ **Quản lý** - Quản lý
- ☑️ **Nhân viên** - Nhân viên

**Tick checkbox = Cho phép role đó:**
- ✅ **Mở** link (button "🔗 Mở")
- ✅ **Xem** link (button "👁️ Xem")
- ✅ **Không thấy** icon 🔒
- ✅ **Không thấy** warning "Không có quyền truy cập"

**Không tick = Khóa hoàn toàn:**
- ❌ Không mở được
- ❌ Không xem được
- 🔒 Icon khóa
- ⚠️ Warning "Không có quyền truy cập"

### **Bước 3: Lưu**
Click **"💾 Lưu tất cả thay đổi"**

---

## 💻 Ví dụ cụ thể

### **Ví dụ 1: Link công khai (tất cả mọi người)**
```
Link: "Danh sách thiết bị phòng IT"
☑️ Admin
☑️ Giám đốc
☑️ Quản lý
☑️ Nhân viên
```
→ **Tất cả** đều có quyền mở & xem

### **Ví dụ 2: Link bí mật (chỉ leadership)**
```
Link: "Báo cáo tài chính"
☑️ Admin
☑️ Giám đốc
☐ Quản lý
☐ Nhân viên
```
→ **Chỉ Admin & Giám đốc** có quyền, còn lại bị khóa 🔒

### **Ví dụ 3: Link cho management**
```
Link: "Kế hoạch tuyển dụng"
☑️ Admin
☑️ Giám đốc
☑️ Quản lý
☐ Nhân viên
```
→ **Admin, Giám đốc, Quản lý** có quyền, Nhân viên bị khóa 🔒

---

## 🔧 Code Changes

### **1. `src/auth/authContext.js`**
```javascript
// ĐƠN GIẢN HÓA: canPreview = canAccess
const canPreviewLink = (linkPermissions) => {
    return canAccessLink(linkPermissions);
};
```

### **2. `src/pages/LinkManager.jsx`**
- ✅ Loại bỏ `allowManagerPreview`, `allowEmployeePreview`
- ✅ Chỉ parse `allowedRoles`
- ✅ Giảm logging, chỉ giữ essential logs

### **3. `src/components/AdminPanel.jsx`**
- ✅ Loại bỏ cột "Preview Manager", "Preview Employee"
- ✅ Thêm checkbox cho từng role
- ✅ Simplified save logic

### **4. `src/components/LinkCard.jsx`**
- ✅ Không thay đổi (đã đơn giản từ trước)
- Button "Xem" và "Mở" dùng chung logic `canAccessLink`

---

## 📊 Database

### **Trước:**
```sql
allowed_roles: ["admin","director"]
allow_manager_preview: 0 or 1
allow_employee_preview: 0 or 1
```

### **Bây giờ:**
```sql
allowed_roles: ["admin","director","manager","employee"]
allow_manager_preview: 1  (luôn là 1, không quan trọng)
allow_employee_preview: 1  (luôn là 1, không quan trọng)
```

**Chỉ có `allowed_roles` quyết định quyền truy cập!**

---

## ✅ Testing

### **Test Case 1: Employee có quyền**
```
Link ID 5: "Khảo sát khách hàng"
allowed_roles: ["admin","director","manager","employee"]
```

**Với Employee:**
- ✅ Button "Mở" clickable
- ✅ Button "Xem" clickable
- ✅ Không có icon 🔒
- ✅ Không có warning

### **Test Case 2: Employee không có quyền**
```
Link ID 6: "Phiếu yêu cầu mua"
allowed_roles: ["admin","director"]
```

**Với Employee:**
- ❌ Button "Mở" disabled + gray
- ❌ Button "Xem" disabled + gray
- 🔒 Có icon khóa
- ⚠️ Có warning "Không có quyền truy cập"

---

## 🎨 UI Changes

### **Admin Panel - Tab "Quyền truy cập link"**

**Trước:**
```
| Link              | Vai trò      | Preview Manager | Preview Employee |
|-------------------|--------------|-----------------|------------------|
| Khảo sát KH       | Admin, Dir   | ☑               | ☐                |
```

**Bây giờ:**
```
| Link              | Vai trò được phép truy cập (Mở & Xem)              |
|-------------------|----------------------------------------------------|
| Khảo sát KH       | ☑ Admin  ☑ Giám đốc  ☑ Quản lý  ☐ Nhân viên      |
```

---

## 🚀 Lợi ích

1. **Đơn giản hơn**: Chỉ 1 loại quyền thay vì 2
2. **Dễ hiểu hơn**: Tick = có quyền, không tick = khóa
3. **Ít lỗi hơn**: Không còn nhầm lẫn giữa "access" và "preview"
4. **Code gọn hơn**: Loại bỏ 30% logic không cần thiết
5. **UI sạch hơn**: Bảng permissions dễ nhìn và sử dụng

---

## 📝 Notes

- **Admin** luôn có quyền truy cập tất cả links (hardcoded)
- Default permissions (nếu chưa config): `['admin', 'director']`
- Logging chỉ hiện trong development mode
- Preview và Open dùng chung logic, không phân biệt

---

## 🔄 Migration

Không cần migrate database! 

Code vẫn tương thích với:
- `allow_manager_preview`
- `allow_employee_preview`

Nhưng những field này không còn ảnh hưởng đến quyền truy cập nữa.
Chỉ có `allowed_roles` là quan trọng!

