# Quick Test - Verify JSON Parsing

## 🧪 Test 1: Browser Test (Local)

Mở file `test_json_parse.html` trong browser:

```bash
# Windows
start test_json_parse.html

# hoặc kéo thả vào Chrome/Edge
```

**Kết quả mong đợi:** Tất cả 5 tests đều **✅ PASSED**

Nếu có test nào **❌ FAILED** → JSON parsing bị lỗi!

---

## 🧪 Test 2: Console Test (Frontend)

1. **Đăng nhập với Employee**
2. **Mở Console** (F12)
3. **Refresh page**
4. **Tìm logs** cho link 5:

**Mong đợi thấy:**
```javascript
[linksApi] Fetched permissions for link 5: {
  allowed_roles: "[\"admin\",\"director\",\"manager\",\"employee\"]",  // STRING
  allow_manager_preview: 1,
  allow_employee_preview: 0
}

[LinkManager] Processing link "Khảo sát khách hàng" (ID: 5): {
  rawPermissions: {...},
  rawPermissionsType: "object",
  hasAllowedRoles: "[\"admin\",\"director\",\"manager\",\"employee\"]",  // STRING
  allowedRolesType: "string",  // ← Phải là "string"
  parsedPermissions: {...}
}

[LinkManager] ✅ Parsed allowedRoles string to array for link 5: ["admin", "director", "manager", "employee"]  // ← ARRAY!

[LinkManager] Final permissions for link "Khảo sát khách hàng": {
  allowedRoles: ["admin", "director", "manager", "employee"],  // ← ARRAY với 4 phần tử
  allowManagerPreview: true,
  allowEmployeePreview: false
}

[canAccessLink] Checking access: {
  userRole: "employee",
  username: "Longrd",
  linkPermissions: {...},
  allowedRolesDetail: {
    value: ["admin", "director", "manager", "employee"],
    type: "object",
    isArray: true,  // ← PHẢI LÀ TRUE
    length: 4       // ← PHẢI LÀ 4
  }
}

[canAccessLink] Role check result: {
  allowedRoles: ["admin", "director", "manager", "employee"],
  userRole: "employee",
  hasAccess: true  // ← PHẢI LÀ TRUE!!!
}
```

---

## ❌ Nếu vẫn thấy `hasAccess: false`

### Kiểm tra 1: allowedRoles có đúng là array không?
```javascript
// Console log phải show:
isArray: true
length: 4  // hoặc lớn hơn 2
```

**Nếu `isArray: false`** → Parsing bị lỗi!

### Kiểm tra 2: allowedRoles có chứa "employee" không?
Mở Console và chạy:

```javascript
// Copy permissions object từ log
const permissions = {"allowedRoles":["admin","director","manager","employee"]};

// Test
console.log('Is array:', Array.isArray(permissions.allowedRoles));
console.log('Includes employee:', permissions.allowedRoles.includes('employee'));
console.log('All roles:', permissions.allowedRoles);
```

**Kết quả mong đợi:**
```
Is array: true
Includes employee: true
All roles: ["admin", "director", "manager", "employee"]
```

### Kiểm tra 3: User role có đúng là "employee" không?
```javascript
// Check trong authContext
console.log('User:', user);
console.log('User role:', user.role);
console.log('Role type:', typeof user.role);
```

**Kết quả mong đợi:**
```
User: {id: ..., username: "Longrd", role: "employee", ...}
User role: "employee"
Role type: "string"
```

---

## 🔍 Debug Script

Nếu muốn test trực tiếp trong Console:

```javascript
// Test full flow
const testFlow = () => {
    // 1. Raw API response
    const apiResponse = {
        allowed_roles: "[\"admin\",\"director\",\"manager\",\"employee\"]",
        allow_manager_preview: 1,
        allow_employee_preview: 0
    };
    
    console.log('1. API Response:', apiResponse);
    console.log('   allowed_roles type:', typeof apiResponse.allowed_roles);
    
    // 2. Parse
    let allowedRoles = apiResponse.allowed_roles;
    if (typeof allowedRoles === 'string') {
        allowedRoles = JSON.parse(allowedRoles);
    }
    
    console.log('2. Parsed:', allowedRoles);
    console.log('   Is array:', Array.isArray(allowedRoles));
    console.log('   Length:', allowedRoles.length);
    
    // 3. Check access
    const userRole = 'employee';
    const hasAccess = allowedRoles.includes(userRole);
    
    console.log('3. Access Check:');
    console.log('   User role:', userRole);
    console.log('   Has access:', hasAccess);
    console.log('   Result:', hasAccess ? '✅ CAN ACCESS' : '❌ CANNOT ACCESS');
    
    return hasAccess;
};

// Run test
console.log('\n=== RUNNING TEST ===\n');
const result = testFlow();
console.log('\n=== FINAL RESULT:', result ? '✅ PASS' : '❌ FAIL', '===\n');
```

Copy đoạn code trên vào Console và chạy. Nếu:
- **✅ PASS** → Logic parsing đúng, vấn đề ở chỗ khác
- **❌ FAIL** → Logic parsing sai, cần fix

---

## 📝 Checklist

Sau khi chạy tests:

- [ ] `test_json_parse.html` - All tests pass ✅
- [ ] Console logs show `✅ Parsed allowedRoles string to array`
- [ ] `isArray: true` và `length: 4`
- [ ] `hasAccess: true` cho employee
- [ ] UI không show 🔒 cho link 5
- [ ] Button "Mở" không disabled

Nếu tất cả ✅ → Employee có thể access!
Nếu có ❌ → Copy logs và gửi cho tôi.

