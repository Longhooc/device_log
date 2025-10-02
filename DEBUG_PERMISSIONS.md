# Hướng dẫn Debug Permissions

## Vấn đề: Employee không truy cập được link đã tick và lưu

### Bước 1: Kiểm tra Backend Logs

1. **Restart backend** với logging mới:
```bash
cd ~/wed_device
node backend_with_auth.js
```

2. **Đăng nhập với admin** → vào Admin Panel → Tab "Quyền truy cập link"

3. **Tick checkbox employee** cho 1 link cụ thể → Click "💾 Lưu tất cả thay đổi"

4. **Xem backend console**, bạn sẽ thấy:
```
[PUT /api/links/123/permissions] Update request: {
  user: 'admin',
  allowed_roles: [ 'admin', 'director', 'employee' ],
  allow_manager_preview: false,
  allow_employee_preview: true
}
[PUT /api/links/123/permissions] Storing allowed_roles as JSON: ["admin","director","employee"]
[PUT /api/links/123/permissions] Update successful: ...
```

### Bước 2: Verify Database

Kiểm tra xem permissions có được lưu vào database không:

```bash
mysql -u myuser1 -p log_device
```

```sql
-- Xem tất cả permissions
SELECT link_id, allowed_roles, allow_manager_preview, allow_employee_preview 
FROM link_permissions;

-- Xem chi tiết cho link cụ thể
SELECT * FROM link_permissions WHERE link_id = 123;

-- Kiểm tra format JSON
SELECT link_id, 
       allowed_roles,
       JSON_VALID(allowed_roles) as is_valid_json,
       JSON_EXTRACT(allowed_roles, '$') as parsed_json
FROM link_permissions;
```

**Expected output:**
```
link_id | allowed_roles                          | allow_manager_preview | allow_employee_preview
--------|----------------------------------------|-----------------------|-----------------------
123     | ["admin","director","employee"]        | 0                     | 1
```

### Bước 3: Test API Response

Sau khi lưu permissions, test API trực tiếp:

```bash
# Lấy token của employee
TOKEN="<employee_jwt_token>"

# Test lấy permissions
curl -H "Authorization: Bearer $TOKEN" \
     https://axithcl.sytes.net:7778/api/links/123/permissions
```

**Expected output:**
```json
{
  "allowed_roles": ["admin","director","employee"],
  "allow_manager_preview": false,
  "allow_employee_preview": true,
  "created_at": "2025-10-02T...",
  "updated_at": "2025-10-02T...",
  "created_by_name": "Admin"
}
```

### Bước 4: Check Frontend Console

1. **Đăng xuất** và đăng nhập với **employee**

2. **Mở Console** (F12) → Tab Console

3. **Refresh page** và xem logs:

```
[linksApi] Fetched permissions for link 123: {
  allowed_roles: "["admin","director","employee"]",  // <-- Nếu là STRING thì cần parse
  allow_manager_preview: 0,
  allow_employee_preview: 1
}

[LinkManager] Processing link "Example Link" (ID: 123): {
  rawPermissions: { ... },
  parsedPermissions: { ... }
}

[LinkManager] Parsed allowedRoles for link 123: ["admin", "director", "employee"]

[LinkManager] Final permissions for link "Example Link": {
  allowedRoles: ["admin", "director", "employee"],
  allowManagerPreview: false,
  allowEmployeePreview: true
}

[canAccessLink] Checking access: {
  userRole: "employee",
  username: "employee1",
  linkPermissions: {
    allowedRoles: ["admin", "director", "employee"],
    ...
  }
}

[canAccessLink] Role check result: {
  allowedRoles: ["admin", "director", "employee"],
  userRole: "employee",
  hasAccess: true  // <-- PHẢI LÀ TRUE!
}
```

### Bước 5: Các vấn đề thường gặp

#### ❌ Problem 1: `allowed_roles` là string thay vì array

**Symptom:**
```
allowedRoles: "["admin","director","employee"]"  // STRING!
```

**Solution:** Code đã có logic parse JSON string → array

#### ❌ Problem 2: Permissions không được lưu vào database

**Check:**
```sql
SELECT COUNT(*) FROM link_permissions;
```

Nếu = 0 → Kiểm tra:
- Admin có quyền UPDATE không?
- Table `link_permissions` có tồn tại không?
- Foreign key constraint có đúng không?

**Fix:** Run `database_auth_schema_simple.sql` lại

#### ❌ Problem 3: Frontend cache permissions cũ

**Solution:** Hard refresh
- Chrome: `Ctrl + Shift + R`
- Or clear localStorage: `localStorage.clear()`

#### ❌ Problem 4: `allowed_roles.includes(user.role)` return false

**Debug:**
```javascript
console.log('allowedRoles:', linkPermissions.allowedRoles);
console.log('Type:', typeof linkPermissions.allowedRoles);
console.log('Is array:', Array.isArray(linkPermissions.allowedRoles));
console.log('user.role:', user.role);
console.log('includes result:', linkPermissions.allowedRoles.includes(user.role));
```

### Bước 6: Quick Fix Test

Nếu vẫn không work, test với hard-coded permissions:

```javascript
// Temporary test trong authContext.js
const canAccessLink = (linkPermissions) => {
    // TEST: Cho phép employee truy cập tất cả
    if (user.role === 'employee') {
        console.log('[TEST] Employee access granted');
        return true;
    }
    // ... rest of code
};
```

Nếu vẫn không work → Vấn đề ở UI rendering
Nếu work → Vấn đề ở permissions data

### Kết quả mong đợi

Sau khi fix:
1. ✅ Employee đăng nhập → Thấy links đã được cấp quyền
2. ✅ Link KHÔNG bị khóa (không có 🔒)
3. ✅ Có thể click "Mở" và "Xem" nếu được cấp quyền preview
4. ✅ Backend logs show correct allowed_roles
5. ✅ Database có records trong `link_permissions`
6. ✅ Frontend console logs show `hasAccess: true`

## Next Steps

Sau khi chạy debug:
1. Copy tất cả console logs (frontend + backend)
2. Copy kết quả từ MySQL query
3. Gửi cho tôi để phân tích

