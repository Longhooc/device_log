# Hướng dẫn Fix Employee Access - Link 5 "Khảo sát khách hàng"

## Vấn đề hiện tại:
```
[LinkManager] No valid permissions for link 5, using default
[canAccessLink] Role check result: {allowedRoles: Array(2), userRole: 'employee', hasAccess: false}
```

**allowedRoles chỉ có 2 phần tử: `['admin', 'director']`**
→ Employee bị từ chối vì không nằm trong array này.

## Nguyên nhân:
Link ID 5 **CHƯA CÓ** permissions trong database, hoặc đã có nhưng **KHÔNG bao gồm 'employee'**.

---

## 🔧 Cách Fix (5 bước):

### Bước 1: Đăng nhập Admin
1. Đăng nhập với tài khoản **admin**
2. Vào **Admin Panel** (click button 👑)

### Bước 2: Vào Tab "Quyền truy cập link"
1. Click tab **"Quyền truy cập link"**
2. Tìm link **"Khảo sát khách hàng"** (ID: 5)

### Bước 3: Tick checkbox "Nhân viên"
1. Tìm dòng có **"Khảo sát khách hàng"**
2. Tick vào checkbox **"Nhân viên"** (employee)
3. Nếu muốn employee có thể preview, tick thêm **"Nhân viên (Xem)"**

### Bước 4: Click "💾 Lưu tất cả thay đổi"
1. Button sẽ highlight màu tím với animation
2. Click button **"💾 Lưu tất cả thay đổi"**
3. **MỞ CONSOLE** (F12) và xem logs:

**Logs mong đợi:**
```javascript
[AdminPanel] Saving permissions for all links: [...]

[AdminPanel] Updating link 5: {
  allowed_roles: ["admin", "director", "employee"],  // ← PHẢI CÓ "employee"
  allow_manager_preview: false,
  allow_employee_preview: true
}

// Backend logs (xem terminal Pi):
[PUT /api/links/5/permissions] Update request: {
  user: 'admin',
  allowed_roles: [ 'admin', 'director', 'employee' ],
  allow_manager_preview: false,
  allow_employee_preview: true
}
[PUT /api/links/5/permissions] Storing allowed_roles as JSON: ["admin","director","employee"]
[PUT /api/links/5/permissions] Update successful: ...

[AdminPanel] All permissions updated: [...]
[AdminPanel] Reloading permissions from API...
[AdminPanel] Permissions reloaded successfully
```

4. Đợi alert **"Đã lưu tất cả thay đổi quyền truy cập!"**

### Bước 5: Verify trong Database (trên Pi)
```bash
mysql -u myuser1 -p log_device
```

```sql
SELECT 
    lp.link_id, 
    gl.title, 
    lp.allowed_roles,
    JSON_EXTRACT(lp.allowed_roles, '$') as parsed_roles,
    lp.allow_employee_preview
FROM link_permissions lp
LEFT JOIN google_links gl ON lp.link_id = gl.id
WHERE lp.link_id = 5;
```

**Kết quả mong đợi:**
```
link_id | title              | allowed_roles                       | parsed_roles                        | allow_employee_preview
--------|--------------------|------------------------------------|-------------------------------------|----------------------
5       | Khảo sát khách hàng | ["admin","director","employee"]    | ["admin","director","employee"]    | 1
```

**Nếu kết quả EMPTY SET** → Permissions CHƯA được lưu vào database!

---

## 🧪 Test với Employee

### Bước 6: Đăng nhập Employee
1. **Đăng xuất** admin
2. **Đăng nhập** với tài khoản **employee** (username: Longrd)
3. **MỞ CONSOLE** (F12) ngay từ đầu

### Bước 7: Xem Console Logs
Refresh page và xem logs:

**Logs mong đợi:**
```javascript
// 1. API fetch permissions
[linksApi] Fetched permissions for link 5: {
  allowed_roles: "["admin","director","employee"]",  // ← JSON string
  allow_manager_preview: 0,
  allow_employee_preview: 1
}

// 2. LinkManager parse permissions
[LinkManager] Processing link "Khảo sát khách hàng" (ID: 5): {
  rawPermissions: { allowed_roles: "["admin","director","employee"]", ... },
  rawPermissionsType: "object",
  hasAllowedRoles: "["admin","director","employee"]",
  allowedRolesType: "string",  // ← Là STRING, cần parse!
  parsedPermissions: { ... }
}

[LinkManager] Parsed allowedRoles for link 5: ["admin", "director", "employee"]  // ← Array sau khi parse

[LinkManager] Final permissions for link "Khảo sát khách hàng": {
  allowedRoles: ["admin", "director", "employee"],  // ← PHẢI CÓ "employee"
  allowManagerPreview: false,
  allowEmployeePreview: true
}

// 3. Check access
[canAccessLink] Checking access: {
  userRole: "employee",
  username: "Longrd",
  linkPermissions: {
    allowedRoles: ["admin", "director", "employee"]
  },
  allowedRolesDetail: {
    value: ["admin", "director", "employee"],
    type: "object",
    isArray: true,  // ← PHẢI LÀ TRUE!
    length: 3       // ← PHẢI LÀ 3!
  }
}

[canAccessLink] Role check result: {
  allowedRoles: ["admin", "director", "employee"],
  userRole: "employee",
  hasAccess: true  // ← PHẢI LÀ TRUE!
}
```

### Bước 8: Verify UI
- ✅ Link "Khảo sát khách hàng" **KHÔNG có icon 🔒**
- ✅ **KHÔNG có text** "⚠️ Không có quyền truy cập"
- ✅ Button **"Mở"** có thể click (không disabled)
- ✅ Button **"Xem"** có thể click (nếu allow_employee_preview = true)

---

## ⚠️ Nếu vẫn không work:

### Tình huống 1: allowedRoles vẫn là `['admin', 'director']`
**Nguyên nhân:** Permissions chưa được lưu vào database

**Fix:**
1. Check backend logs khi click "Lưu" - có lỗi không?
2. Check MySQL permissions - user `myuser1` có quyền UPDATE `link_permissions` không?
3. Thử query trực tiếp:
```sql
INSERT INTO link_permissions 
(link_id, allowed_roles, allow_manager_preview, allow_employee_preview, created_by)
VALUES (5, '["admin","director","employee"]', 0, 1, 1)
ON DUPLICATE KEY UPDATE
allowed_roles = '["admin","director","employee"]',
allow_employee_preview = 1;
```

### Tình huống 2: allowedRoles là string thay vì array
**Logs:**
```
allowedRolesType: "string"
isArray: false
```

**Fix:** Code đã có logic parse JSON string → array. Nếu vẫn không work, check console có lỗi JSON parse không.

### Tình huống 3: Database có permissions nhưng API không trả về
**Fix:** 
1. Test API trực tiếp:
```bash
TOKEN="<your_jwt_token>"
curl -H "Authorization: Bearer $TOKEN" \
     https://axithcl.sytes.net:7778/api/links/5/permissions
```

2. Check backend logs:
```
[GET /api/links/5/permissions] Request from user: ...
[GET /api/links/5/permissions] Query results: [...]
[GET /api/links/5/permissions] Returning permissions: {...}
```

---

## 📋 Checklist

Sau khi làm theo hướng dẫn, verify:

- [ ] Admin Panel: Checkbox "Nhân viên" được tick cho link 5
- [ ] Admin Panel: Click "Lưu" thành công, có alert
- [ ] Console (Admin): Thấy logs `[AdminPanel] Updating link 5` với `allowed_roles` có "employee"
- [ ] Backend (Pi): Thấy logs `[PUT /api/links/5/permissions]` thành công
- [ ] MySQL: Query có kết quả, `allowed_roles` = `["admin","director","employee"]`
- [ ] Console (Employee): `allowedRoles` là array có 3 phần tử
- [ ] Console (Employee): `hasAccess: true`
- [ ] UI (Employee): Link không bị khóa, có thể mở

Nếu tất cả đều ✅ → Employee có quyền truy cập link 5!
Nếu có bước nào ❌ → Gửi logs của bước đó cho tôi để debug.

