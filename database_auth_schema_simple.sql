-- Database schema đơn giản cho hệ thống authentication và permissions
-- Sử dụng database: log_device

-- 1. Bảng users để lưu thông tin người dùng
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'director', 'manager', 'employee') NOT NULL DEFAULT 'employee',
    department VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng link_permissions để lưu quyền truy cập của từng link
CREATE TABLE IF NOT EXISTS link_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link_id INT NOT NULL,
    allowed_roles JSON NOT NULL, -- ['admin', 'director', 'manager']
    allow_manager_preview BOOLEAN DEFAULT TRUE,
    allow_employee_preview BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_link_permission (link_id)
);

-- 3. Bảng user_sessions để quản lý phiên đăng nhập (optional)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
);

-- 4. Cập nhật cột created_by trong bảng google_links để liên kết với users
-- Thêm cột user_id để liên kết với bảng users
ALTER TABLE google_links 
ADD COLUMN IF NOT EXISTS user_id INT;

-- 5. Thêm cột permissions_updated_at để theo dõi khi nào permissions được cập nhật
ALTER TABLE google_links 
ADD COLUMN IF NOT EXISTS permissions_updated_at TIMESTAMP NULL;

-- 6. Tạo indexes để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_link_permissions_link_id ON link_permissions(link_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 7. Insert dữ liệu mẫu cho users
INSERT INTO users (username, password, name, role, department, email) VALUES
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin', 'IT', 'admin@company.com'),
('director', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ban Giám Đốc', 'director', 'Management', 'director@company.com'),
('manager', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Quản Lý', 'manager', 'HR', 'manager@company.com'),
('employee', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Nhân Viên', 'employee', 'Sales', 'employee@company.com')
ON DUPLICATE KEY UPDATE 
    password = VALUES(password),
    name = VALUES(name),
    role = VALUES(role),
    department = VALUES(department),
    email = VALUES(email);

-- 8. Tạo permissions mặc định cho các links hiện có (chỉ nếu bảng google_links tồn tại)
INSERT INTO link_permissions (link_id, allowed_roles, allow_manager_preview, allow_employee_preview, created_by)
SELECT 
    gl.id,
    JSON_ARRAY('admin', 'director', 'manager', 'employee'),
    TRUE,
    TRUE,
    1 -- admin user id
FROM google_links gl
WHERE NOT EXISTS (
    SELECT 1 FROM link_permissions lp WHERE lp.link_id = gl.id
);

-- Cập nhật user_id cho các links hiện có (liên kết với admin user)
UPDATE google_links 
SET user_id = 1 
WHERE user_id IS NULL;

-- 9. Cập nhật permissions đặc biệt cho một số links
UPDATE link_permissions 
SET 
    allowed_roles = JSON_ARRAY('admin', 'director'),
    allow_manager_preview = FALSE,
    allow_employee_preview = FALSE
WHERE link_id IN (
    SELECT id FROM google_links 
    WHERE department IN ('finance', 'admin')
);

UPDATE link_permissions 
SET 
    allowed_roles = JSON_ARRAY('admin', 'director', 'manager'),
    allow_manager_preview = TRUE,
    allow_employee_preview = FALSE
WHERE link_id IN (
    SELECT id FROM google_links 
    WHERE department = 'hr' AND title LIKE '%nhân viên mới%'
);

-- 10. Tạo stored procedure để kiểm tra quyền truy cập link
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CheckLinkAccess(
    IN p_user_id INT,
    IN p_link_id INT,
    OUT p_has_access BOOLEAN,
    OUT p_can_preview BOOLEAN
)
BEGIN
    DECLARE user_role VARCHAR(20);
    DECLARE allowed_roles JSON;
    DECLARE allow_manager_preview_val BOOLEAN;
    DECLARE allow_employee_preview_val BOOLEAN;
    
    -- Lấy role của user
    SELECT role INTO user_role FROM users WHERE id = p_user_id AND is_active = TRUE;
    
    -- Lấy permissions của link
    SELECT 
        lp.allowed_roles,
        lp.allow_manager_preview,
        lp.allow_employee_preview
    INTO 
        allowed_roles,
        allow_manager_preview_val,
        allow_employee_preview_val
    FROM link_permissions lp
    WHERE lp.link_id = p_link_id;
    
    -- Kiểm tra quyền truy cập
    SET p_has_access = FALSE;
    SET p_can_preview = FALSE;
    
    IF user_role = 'admin' THEN
        SET p_has_access = TRUE;
        SET p_can_preview = TRUE;
    ELSEIF JSON_CONTAINS(allowed_roles, JSON_QUOTE(user_role)) THEN
        SET p_has_access = TRUE;
        
        -- Kiểm tra quyền preview
        IF user_role = 'director' THEN
            SET p_can_preview = TRUE;
        ELSEIF user_role = 'manager' AND allow_manager_preview_val = TRUE THEN
            SET p_can_preview = TRUE;
        ELSEIF user_role = 'employee' AND allow_employee_preview_val = TRUE THEN
            SET p_can_preview = TRUE;
        END IF;
    END IF;
END //
DELIMITER ;

-- 11. Tạo view để dễ dàng query thông tin user và permissions
CREATE OR REPLACE VIEW user_link_permissions AS
SELECT 
    u.id as user_id,
    u.username,
    u.name as user_name,
    u.role,
    u.department as user_department,
    gl.id as link_id,
    gl.title as link_title,
    gl.url,
    gl.department as link_department,
    gl.type,
    gl.created_by as link_created_by,
    gl.user_id as link_user_id,
    lp.allowed_roles,
    lp.allow_manager_preview,
    lp.allow_employee_preview,
    CASE 
        WHEN u.role = 'admin' THEN TRUE
        WHEN JSON_CONTAINS(lp.allowed_roles, JSON_QUOTE(u.role)) THEN TRUE
        ELSE FALSE
    END as has_access,
    CASE 
        WHEN u.role = 'admin' THEN TRUE
        WHEN u.role = 'director' THEN TRUE
        WHEN u.role = 'manager' AND lp.allow_manager_preview = TRUE THEN TRUE
        WHEN u.role = 'employee' AND lp.allow_employee_preview = TRUE THEN TRUE
        ELSE FALSE
    END as can_preview
FROM users u
CROSS JOIN google_links gl
LEFT JOIN link_permissions lp ON gl.id = lp.link_id
WHERE u.is_active = TRUE AND gl.is_active = TRUE;

-- 12. Tạo trigger để tự động tạo permissions mặc định khi thêm link mới
DELIMITER //
CREATE TRIGGER IF NOT EXISTS tr_create_default_permissions
AFTER INSERT ON google_links
FOR EACH ROW
BEGIN
    INSERT INTO link_permissions (
        link_id, 
        allowed_roles, 
        allow_manager_preview, 
        allow_employee_preview, 
        created_by
    ) VALUES (
        NEW.id,
        JSON_ARRAY('admin', 'director', 'manager', 'employee'),
        TRUE,
        TRUE,
        COALESCE(NEW.user_id, 1) -- Default to admin if not specified
    );
END //
DELIMITER ;
