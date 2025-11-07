const express = require('express');
const app = express();
app.use(express.json());
const port = 81;
const mysql = require('mysql2');
let db;
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT Secret - nên lưu trong environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const httpsoptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/axithcl.sytes.net/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/axithcl.sytes.net/fullchain.pem'),
};

app.use(cors());

function connectDatabase() {
    db = mysql.createConnection({
        host: 'localhost',
        user: 'myuser1',
        password: 'password',
        database: 'log_device'
    });

    db.connect(err => {
        if (err) {
            console.error('Lỗi kết nối MySQL:', err);
            setTimeout(connectDatabase, 2000);
        } else {
            console.log('Đã kết nối với MySQL.');
        }
    });

    db.on('error', err => {
        console.error('Lỗi MySQL:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            connectDatabase();
        } else {
            throw err;
        }
    });
}

connectDatabase();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ==================== MIDDLEWARE FUNCTIONS ====================

// Middleware để xác thực JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Thiếu token xác thực' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token không hợp lệ' });
        }
        req.user = user;
        next();
    });
}

// Middleware để kiểm tra quyền role
function authorizeRole(allowedRoles) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }
        next();
    };
}

// ==================== AUTHENTICATION API ====================

// 1. Đăng nhập
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Tên đăng nhập và mật khẩu không được để trống' 
        });
    }
    
    try {
        const sql = 'SELECT * FROM users WHERE username = ? AND is_active = TRUE';
        db.query(sql, [username], async (err, results) => {
            if (err) {
                console.error('Lỗi khi tìm user:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Lỗi hệ thống' 
                });
            }
            
            if (results.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
                });
            }
            
            const user = results[0];
            
            // Kiểm tra mật khẩu
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
                });
            }
            
            // Cập nhật last_login
            const updateLoginSql = 'UPDATE users SET last_login = NOW() WHERE id = ?';
            db.query(updateLoginSql, [user.id]);
            
            // Tạo JWT token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    username: user.username, 
                    role: user.role 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            // Trả về thông tin user (không bao gồm password)
            const { password: _, ...userWithoutPassword } = user;
            
            res.json({
                success: true,
                token,
                user: userWithoutPassword
            });
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống' 
        });
    }
});

// 2. Lấy thông tin user hiện tại
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const sql = 'SELECT id, username, name, role, department, email, phone, last_login FROM users WHERE id = ? AND is_active = TRUE';
    
    db.query(sql, [req.user.userId], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy thông tin user:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
        res.json({ user: results[0] });
    });
});

// 3. Đăng xuất (optional - có thể chỉ xóa token ở frontend)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // Có thể thêm logic để blacklist token nếu cần
    res.json({ success: true, message: 'Đăng xuất thành công' });
});

// ==================== USER MANAGEMENT API ====================

// 4. Lấy danh sách tất cả users (chỉ admin)
app.get('/api/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const sql = `
        SELECT 
            id, username, name, role, department, email, phone, 
            is_active, last_login, created_at, updated_at
        FROM users 
        WHERE is_active = TRUE
        ORDER BY created_at DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy danh sách users:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        res.json(results);
    });
});

// 5. Thêm user mới (chỉ admin)
app.post('/api/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { username, password, name, role, department, email, phone } = req.body;
    
    if (!username || !password || !name || !role) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    
    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const sql = `
            INSERT INTO users (username, password, name, role, department, email, phone) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(sql, [username, hashedPassword, name, role, department, email, phone], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
                }
                console.error('Lỗi khi thêm user:', err);
                return res.status(500).json({ message: 'Lỗi hệ thống' });
            }
            
            res.status(201).json({ 
                message: 'Thêm user thành công', 
                id: result.insertId 
            });
        });
    } catch (error) {
        console.error('Lỗi hash password:', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
});

// 6. Xóa user (chỉ admin) - Hard delete: xóa hoàn toàn khỏi database
app.delete('/api/users/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const userId = req.params.id;
    
    // Không cho phép xóa chính mình
    if (parseInt(userId) === req.user.userId) {
        return res.status(400).json({ message: 'Không thể xóa chính mình' });
    }
    
    // Transaction: xóa tất cả dữ liệu liên quan đến user
    db.beginTransaction(err => {
        if (err) {
            console.error('Lỗi khi bắt đầu transaction:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        // 1. Xóa permissions trong link_user_permissions
        db.query('DELETE FROM link_user_permissions WHERE user_id = ?', [userId], (err) => {
            if (err) {
                console.error('Lỗi khi xóa link_user_permissions:', err);
                return db.rollback(() => {
                    res.status(500).json({ message: 'Lỗi hệ thống' });
                });
            }
            
            // 2. Xóa permissions trong smartph_link_user_permissions
            db.query('DELETE FROM smartph_link_user_permissions WHERE user_id = ?', [userId], (err) => {
                if (err) {
                    console.error('Lỗi khi xóa smartph_link_user_permissions:', err);
                    return db.rollback(() => {
                        res.status(500).json({ message: 'Lỗi hệ thống' });
                    });
                }
                
                // 3. Xóa permissions trong bestlab_link_user_permissions
                db.query('DELETE FROM bestlab_link_user_permissions WHERE user_id = ?', [userId], (err) => {
                    if (err) {
                        console.error('Lỗi khi xóa bestlab_link_user_permissions:', err);
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Lỗi hệ thống' });
                        });
                    }
                    
                    // 4. Xóa user khỏi bảng users
                    db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
                        if (err) {
                            console.error('Lỗi khi xóa user:', err);
                            return db.rollback(() => {
                                res.status(500).json({ message: 'Lỗi hệ thống' });
                            });
                        }
                        
                        if (result.affectedRows === 0) {
                            return db.rollback(() => {
                                res.status(404).json({ message: 'Không tìm thấy user' });
                            });
                        }
                        
                        // Commit transaction
                        db.commit(commitErr => {
                            if (commitErr) {
                                console.error('Lỗi khi commit transaction:', commitErr);
                                return db.rollback(() => {
                                    res.status(500).json({ message: 'Lỗi hệ thống' });
                                });
                            }
                            
                            console.log(`User ${userId} đã được xóa hoàn toàn khỏi database`);
                            res.json({ message: 'Xóa user thành công (đã xóa hoàn toàn khỏi database)' });
                        });
                    });
                });
            });
        });
    });
});

// ==================== LINK PERMISSIONS API ====================

// 7. Legacy: trả về payload tối giản, khuyến nghị dùng /permissions/users
app.get('/api/links/:id/permissions', authenticateToken, (req, res) => {
    return res.json({ allowed_roles: [], legacy: true });
});

// 8. Cập nhật permissions của link (chỉ admin)
app.put('/api/links/:id/permissions', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const linkId = req.params.id;
    const { allowed_roles, allow_manager_preview, allow_employee_preview } = req.body;
    
    console.log(`[PUT /api/links/${linkId}/permissions] Update request:`, {
        user: req.user.username,
        allowed_roles,
        allow_manager_preview,
        allow_employee_preview
    });
    
    if (!allowed_roles || !Array.isArray(allowed_roles)) {
        return res.status(400).json({ message: 'allowed_roles phải là array' });
    }
    
    const allowedRolesJson = JSON.stringify(allowed_roles);
    console.log(`[PUT /api/links/${linkId}/permissions] Storing allowed_roles as JSON:`, allowedRolesJson);
    
    const sql = `
        INSERT INTO link_permissions 
        (link_id, allowed_roles, allow_manager_preview, allow_employee_preview, created_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        allowed_roles = VALUES(allowed_roles),
        allow_manager_preview = VALUES(allow_manager_preview),
        allow_employee_preview = VALUES(allow_employee_preview),
        created_at = NOW()
    `;
    
    db.query(sql, [linkId, allowedRolesJson, allow_manager_preview, allow_employee_preview, req.user.userId], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật permissions:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        console.log(`[PUT /api/links/${linkId}/permissions] Update successful:`, result);
        res.json({ message: 'Cập nhật permissions thành công' });
    });
});

// 8.1. Thêm user vào permissions của link (chỉ admin)
app.post('/api/links/:id/permissions/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const linkId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ message: 'Thiếu user_id' });
    }
    
    console.log(`[POST /api/links/${linkId}/permissions/users] Adding user ${user_id}`);
    
    const sql = `
        INSERT INTO link_user_permissions (link_id, user_id, created_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        created_at = NOW()
    `;
    
    db.query(sql, [linkId, user_id, req.user.userId], (err, result) => {
        if (err) {
            console.error('Lỗi khi thêm user vào permissions:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        console.log(`[POST /api/links/${linkId}/permissions/users] User added successfully:`, result);
        res.json({ message: 'Thêm user vào permissions thành công' });
    });
});

// 8.2. Xóa user khỏi permissions của link (chỉ admin)
app.delete('/api/links/:id/permissions/users/:userId', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const linkId = req.params.id;
    const userId = req.params.userId;
    
    console.log(`[DELETE /api/links/${linkId}/permissions/users/${userId}] Removing user`);
    
    const sql = 'DELETE FROM link_user_permissions WHERE link_id = ? AND user_id = ?';
    
    db.query(sql, [linkId, userId], (err, result) => {
        if (err) {
            console.error('Lỗi khi xóa user khỏi permissions:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy permission' });
        }
        
        console.log(`[DELETE /api/links/${linkId}/permissions/users/${userId}] User removed successfully:`, result);
        res.json({ message: 'Xóa user khỏi permissions thành công' });
    });
});

// 8.3. Lấy danh sách users có quyền truy cập link
app.get('/api/links/:id/permissions/users', authenticateToken, (req, res) => {
    const linkId = req.params.id;
    
    console.log(`[GET /api/links/${linkId}/permissions/users] Getting users with access`);
    
    const sql = `
        SELECT 
            u.id,
            u.username,
            u.name,
            u.role,
            u.department,
            u.email,
            lup.created_at as permission_granted_at
        FROM link_user_permissions lup
        JOIN users u ON lup.user_id = u.id
        WHERE lup.link_id = ? AND u.is_active = TRUE
        ORDER BY lup.created_at DESC
    `;
    
    db.query(sql, [linkId], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy danh sách users:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        console.log(`[GET /api/links/${linkId}/permissions/users] Found ${results.length} users`);
        res.json(results);
    });
});

// 9. Kiểm tra quyền truy cập link
app.get('/api/links/:id/access', authenticateToken, (req, res) => {
    const linkId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole === 'admin') {
        return res.json({ has_access: true, can_preview: true });
    }

    const sql = 'SELECT 1 FROM link_user_permissions WHERE link_id = ? AND user_id = ? LIMIT 1';

    db.query(sql, [linkId, userId], (err, results) => {
        if (err) {
            console.error('Lỗi khi kiểm tra quyền truy cập:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        const hasAccess = results.length > 0;
        return res.json({ has_access: hasAccess, can_preview: hasAccess });
    });
});

// ==================== GOOGLE LINKS API (với Permission Security) ====================

/**
 * Helper function: Check if user has access to link based on permissions
 */
function checkUserAccess(userRole, userId, allowedRoles, linkId) {
    // Admin luôn có quyền
    if (userRole === 'admin') return true;
    
    // Parse allowed_roles nếu là JSON string
    let roles = allowedRoles;
    if (typeof allowedRoles === 'string') {
        try {
            roles = JSON.parse(allowedRoles);
        } catch (e) {
            console.error('Error parsing allowed_roles:', e);
            return false;
        }
    }
    
    // Kiểm tra role có trong danh sách không
    const hasRoleAccess = Array.isArray(roles) && roles.includes(userRole);
    
    // Kiểm tra user có trong danh sách permissions cụ thể không
    // TODO: Implement user-specific permission check
    // const hasUserAccess = checkUserSpecificAccess(userId, linkId);
    
    return hasRoleAccess;
}

// 1. Lấy tất cả links với account-based permission filtering
app.get('/api/links', authenticateToken, (req, res) => {
    const { department, type, search, favorite } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    console.log(`\n[GET /api/links] Request from user: ${req.user.username} (${userRole})`);
    
    // Query: include user-specific permission join
    let sql = `
        SELECT 
            gl.id,
            gl.title,
            gl.url,
            gl.department,
            gl.type,
            gl.description,
            gl.created_at,
            gl.created_by,
            gl.is_active,
            CASE WHEN lup.user_id IS NULL THEN 0 ELSE 1 END AS has_user_access
        FROM google_links gl
        LEFT JOIN link_user_permissions lup 
            ON gl.id = lup.link_id AND lup.user_id = ?
        WHERE gl.is_active = 1
    `;
    const params = [userId];
    
    // Lọc theo phòng ban
    if (department && department !== 'all') {
        sql += ' AND gl.department = ?';
        params.push(department);
    }
    
    // Lọc theo loại
    if (type && type !== 'all') {
        sql += ' AND gl.type = ?';
        params.push(type);
    }
    
    // Tìm kiếm theo tiêu đề hoặc mô tả
    if (search) {
        sql += ' AND (gl.title LIKE ? OR gl.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    // Lọc theo yêu thích
    if (favorite === 'true') {
        sql += ' AND gl.is_favorite = 1';
    }
    
    sql += ' ORDER BY gl.created_at DESC';
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy danh sách links:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: err.message });
        }
        
        console.log(`[GET /api/links] Found ${results.length} links in database`);
        
        // Filter URL based on account-based permissions only
        const filteredResults = results.map(link => {
            const hasAccess = userRole === 'admin' || Boolean(link.has_user_access);
            
            // Nếu không có quyền: MASK URL = null
            if (!hasAccess) {
                console.log(`  ❌ User (${userId}) NO ACCESS to link ${link.id}: ${link.title} - URL masked`);
                return {
                    ...link,
                    url: null, // MASK URL cho links không có quyền
                    _restricted: true // Flag để frontend biết
                };
            } else {
                console.log(`  ✅ User (${userId}) HAS ACCESS to link ${link.id}: ${link.title}`);
                return {
                    ...link,
                    _restricted: false
                };
            }
        });
        
        console.log(`[GET /api/links] Returning ${filteredResults.length} links (${filteredResults.filter(l => !l._restricted).length} accessible, ${filteredResults.filter(l => l._restricted).length} restricted)`);
        
        res.json(filteredResults);
    });
});

// 2. Lấy link theo ID với account-based permission filtering
app.get('/api/links/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    const sql = `
        SELECT 
            gl.id,
            gl.title,
            gl.url,
            gl.department,
            gl.type,
            gl.description,
            gl.created_at,
            gl.created_by,
            gl.is_active,
            CASE WHEN lup.user_id IS NULL THEN 0 ELSE 1 END AS has_user_access
        FROM google_links gl
        LEFT JOIN link_user_permissions lup 
            ON gl.id = lup.link_id AND lup.user_id = ?
        WHERE gl.id = ? AND gl.is_active = 1
    `;
    
    db.query(sql, [userId, id], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy link:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy link' });
        }
        
        const link = results[0];
        const hasAccess = userRole === 'admin' || Boolean(link.has_user_access);
        
        // Nếu không có quyền: MASK URL
        if (!hasAccess) {
            console.log(`[GET /api/links/${id}] User (${req.user.userId}) NO ACCESS - URL masked`);
            return res.json({
                ...link,
                url: null,
                _restricted: true
            });
        }
        
        console.log(`[GET /api/links/${id}] User (${req.user.userId}) HAS ACCESS`);
        res.json({
            ...link,
            _restricted: false
        });
    });
});

// 3. Thêm link mới
app.post('/api/links', authenticateToken, (req, res) => {
    const { title, url, department, type, description } = req.body;
    const createdById = req.user && req.user.userId ? req.user.userId : null;

    // Validation
    if (!title || !url || !department || !type) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Transaction: insert link, then auto-grant permissions to all users in department
    db.beginTransaction(err => {
        if (err) {
            console.error('Lỗi khi bắt đầu transaction:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }

        const insertLinkSql = `INSERT INTO google_links 
                               (title, url, department, type, description, created_by) 
                               VALUES (?, ?, ?, ?, ?, ?)`;

        db.query(insertLinkSql, [title, url, department, type, description, createdById], (err, result) => {
            if (err) {
                console.error('Lỗi khi thêm link:', err);
                return db.rollback(() => {
                    res.status(500).json({ message: 'Lỗi khi thêm link', error: err.message });
                });
            }

            const linkId = result.insertId;

            // Auto grant: all active users in the same department get access
            const selectUsersSql = `SELECT id FROM users WHERE is_active = TRUE AND department = ?`;

            db.query(selectUsersSql, [department], (err, users) => {
                if (err) {
                    console.error('Lỗi khi lấy danh sách user theo phòng ban:', err);
                    return db.rollback(() => {
                        res.status(500).json({ message: 'Lỗi hệ thống' });
                    });
                }

                if (!users || users.length === 0) {
                    // No users to grant, just commit
                    return db.commit(commitErr => {
                        if (commitErr) {
                            console.error('Lỗi khi commit transaction:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ message: 'Lỗi hệ thống' });
                            });
                        }
                        res.status(201).json({ message: 'Thêm link thành công', id: linkId });
                    });
                }

                const values = users.map(u => [linkId, u.id, createdById || u.id]);
                const insertPermSql = `INSERT INTO link_user_permissions (link_id, user_id, created_by)
                                       VALUES ?
                                       ON DUPLICATE KEY UPDATE created_at = NOW()`;

                db.query(insertPermSql, [values], (err) => {
                    if (err) {
                        console.error('Lỗi khi cấp quyền mặc định cho user:', err);
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Lỗi hệ thống' });
                        });
                    }

                    db.commit(commitErr => {
                        if (commitErr) {
                            console.error('Lỗi khi commit transaction:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ message: 'Lỗi hệ thống' });
                            });
                        }

                        res.status(201).json({ 
                            message: 'Thêm link thành công (đã cấp quyền cho phòng ban)', 
                            id: linkId 
                        });
                    });
                });
            });
        });
    });
});

// 4. Cập nhật link
app.put('/api/links/:id', (req, res) => {
    const id = req.params.id;
    const { title, url, department, type, description } = req.body;
    
    // Validation
    if (!title || !url || !department || !type) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    
    const sql = `UPDATE google_links 
                 SET title = ?, url = ?, department = ?, type = ?, description = ?, updated_at = NOW()
                 WHERE id = ? AND is_active = 1`;
    
    db.query(sql, [title, url, department, type, description, id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật link:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật link', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy link' });
        } else {
            res.json({ message: 'Cập nhật link thành công' });
        }
    });
});

// 5. Xóa link (soft delete)
app.delete('/api/links/:id', (req, res) => {
    const id = req.params.id;
    const { authCode } = req.body;
    
    // Kiểm tra mã xác thực
    const correctCode = "***4";
    if (authCode !== correctCode) {
        return res.status(401).json({ message: 'Mã xác thực không đúng' });
    }
    
    const sql = 'UPDATE google_links SET is_active = 0 WHERE id = ?';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Lỗi khi xóa link:', err);
            res.status(500).json({ message: 'Lỗi khi xóa link', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy link' });
        } else {
            res.json({ message: 'Xóa link thành công' });
        }
    });
});

// 6. Toggle favorite
app.patch('/api/links/:id/favorite', (req, res) => {
    const id = req.params.id;
    const { is_favorite } = req.body;
    
    const sql = 'UPDATE google_links SET is_favorite = ? WHERE id = ? AND is_active = 1';
    
    db.query(sql, [is_favorite ? 1 : 0, id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật favorite:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy link' });
        } else {
            res.json({ message: 'Cập nhật favorite thành công' });
        }
    });
});

// 7. Tăng access count
app.patch('/api/links/:id/access', (req, res) => {
    const id = req.params.id;
    
    const sql = 'UPDATE google_links SET access_count = access_count + 1 WHERE id = ? AND is_active = 1';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật access count:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy link' });
        } else {
            res.json({ message: 'Cập nhật access count thành công' });
        }
    });
});

// 8. Thống kê
app.get('/api/links/stats', (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_links,
            SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as favorite_links,
            SUM(access_count) as total_access,
            department,
            type,
            COUNT(*) as count
        FROM google_links 
        WHERE is_active = 1 
        GROUP BY department, type
        ORDER BY department, type
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy thống kê:', err);
            res.status(500).json({ message: 'Lỗi khi lấy thống kê', error: err.message });
        } else {
            res.json(results);
        }
    });
});

// ==================== SMART PHONE LINKS API ====================

// 1. Lấy tất cả SmartPH links với permission filtering
app.get('/api/smartph/links', authenticateToken, (req, res) => {
    const { department, type, search, favorite } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    console.log(`\n[GET /api/smartph/links] Request from user: ${req.user.username} (${userRole})`);
    
    let sql = `
        SELECT 
            sl.id,
            sl.title,
            sl.url,
            sl.department,
            sl.type,
            sl.description,
            sl.created_at,
            sl.created_by,
            sl.is_active,
            sl.is_favorite,
            sl.access_count,
            CASE WHEN slup.user_id IS NULL THEN 0 ELSE 1 END AS has_user_access
        FROM smartph_links sl
        LEFT JOIN smartph_link_user_permissions slup 
            ON sl.id = slup.link_id AND slup.user_id = ?
        WHERE sl.is_active = 1
    `;
    const params = [userId];
    
    // Lọc theo phòng ban
    if (department && department !== 'all') {
        sql += ' AND sl.department = ?';
        params.push(department);
    }
    
    // Lọc theo loại
    if (type && type !== 'all') {
        sql += ' AND sl.type = ?';
        params.push(type);
    }
    
    // Tìm kiếm theo tiêu đề hoặc mô tả
    if (search) {
        sql += ' AND (sl.title LIKE ? OR sl.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    // Lọc theo yêu thích
    if (favorite === 'true') {
        sql += ' AND sl.is_favorite = 1';
    }
    
    sql += ' ORDER BY sl.created_at DESC';
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy danh sách SmartPH links:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: err.message });
        }
        
        console.log(`[GET /api/smartph/links] Found ${results.length} SmartPH links in database`);
        
        // Filter URL based on permissions
        const filteredResults = results.map(link => {
            const hasAccess = userRole === 'admin' || Boolean(link.has_user_access);
            
            if (!hasAccess) {
                console.log(`  ❌ User (${userId}) NO ACCESS to SmartPH link ${link.id}: ${link.title} - URL masked`);
                return {
                    ...link,
                    url: null,
                    _restricted: true
                };
            } else {
                console.log(`  ✅ User (${userId}) HAS ACCESS to SmartPH link ${link.id}: ${link.title}`);
                return {
                    ...link,
                    _restricted: false
                };
            }
        });
        
        console.log(`[GET /api/smartph/links] Returning ${filteredResults.length} SmartPH links (${filteredResults.filter(l => !l._restricted).length} accessible, ${filteredResults.filter(l => l._restricted).length} restricted)`);
        
        res.json(filteredResults);
    });
});

// 2. Lấy SmartPH link theo ID
app.get('/api/smartph/links/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    const sql = `
        SELECT 
            sl.id,
            sl.title,
            sl.url,
            sl.department,
            sl.type,
            sl.description,
            sl.created_at,
            sl.created_by,
            sl.is_active,
            sl.is_favorite,
            sl.access_count,
            CASE WHEN slup.user_id IS NULL THEN 0 ELSE 1 END AS has_user_access
        FROM smartph_links sl
        LEFT JOIN smartph_link_user_permissions slup 
            ON sl.id = slup.link_id AND slup.user_id = ?
        WHERE sl.id = ? AND sl.is_active = 1
    `;
    
    db.query(sql, [userId, id], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy SmartPH link:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy SmartPH link' });
        }
        
        const link = results[0];
        const hasAccess = userRole === 'admin' || Boolean(link.has_user_access);
        
        if (!hasAccess) {
            console.log(`[GET /api/smartph/links/${id}] User (${req.user.userId}) NO ACCESS - URL masked`);
            return res.json({
                ...link,
                url: null,
                _restricted: true
            });
        }
        
        console.log(`[GET /api/smartph/links/${id}] User (${req.user.userId}) HAS ACCESS`);
        res.json({
            ...link,
            _restricted: false
        });
    });
});

// 3. Thêm SmartPH link mới
app.post('/api/smartph/links', authenticateToken, (req, res) => {
    const { title, url, department, type, description } = req.body;
    const createdById = req.user && req.user.userId ? req.user.userId : null;

    if (!title || !url || !department || !type) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Transaction: insert link, then auto-grant permissions to all users in department
    db.beginTransaction(err => {
        if (err) {
            console.error('Lỗi khi bắt đầu transaction:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }

        const insertLinkSql = `INSERT INTO smartph_links 
                               (title, url, department, type, description, created_by) 
                               VALUES (?, ?, ?, ?, ?, ?)`;

        db.query(insertLinkSql, [title, url, department, type, description, createdById], (err, result) => {
            if (err) {
                console.error('Lỗi khi thêm SmartPH link:', err);
                return db.rollback(() => {
                    res.status(500).json({ message: 'Lỗi khi thêm SmartPH link', error: err.message });
                });
            }

            const linkId = result.insertId;

            // Auto grant: all active users in the same department get access
            const selectUsersSql = `SELECT id FROM users WHERE is_active = TRUE AND department = ?`;

            db.query(selectUsersSql, [department], (err, users) => {
                if (err) {
                    console.error('Lỗi khi lấy danh sách user theo phòng ban:', err);
                    return db.rollback(() => {
                        res.status(500).json({ message: 'Lỗi hệ thống' });
                    });
                }

                if (!users || users.length === 0) {
                    return db.commit(commitErr => {
                        if (commitErr) {
                            console.error('Lỗi khi commit transaction:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ message: 'Lỗi hệ thống' });
                            });
                        }
                        res.status(201).json({ message: 'Thêm SmartPH link thành công', id: linkId });
                    });
                }

                const values = users.map(u => [linkId, u.id, createdById || u.id]);
                const insertPermSql = `INSERT INTO smartph_link_user_permissions (link_id, user_id, created_by)
                                       VALUES ?
                                       ON DUPLICATE KEY UPDATE created_at = NOW()`;

                db.query(insertPermSql, [values], (err) => {
                    if (err) {
                        console.error('Lỗi khi cấp quyền mặc định cho user:', err);
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Lỗi hệ thống' });
                        });
                    }

                    db.commit(commitErr => {
                        if (commitErr) {
                            console.error('Lỗi khi commit transaction:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ message: 'Lỗi hệ thống' });
                            });
                        }

                        res.status(201).json({ 
                            message: 'Thêm SmartPH link thành công (đã cấp quyền cho phòng ban)', 
                            id: linkId 
                        });
                    });
                });
            });
        });
    });
});

// 4. Cập nhật SmartPH link
app.put('/api/smartph/links/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { title, url, department, type, description } = req.body;
    
    if (!title || !url || !department || !type) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    
    const sql = `UPDATE smartph_links 
                 SET title = ?, url = ?, department = ?, type = ?, description = ?, updated_at = NOW()
                 WHERE id = ? AND is_active = 1`;
    
    db.query(sql, [title, url, department, type, description, id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật SmartPH link:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật SmartPH link', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy SmartPH link' });
        } else {
            res.json({ message: 'Cập nhật SmartPH link thành công' });
        }
    });
});

// 5. Xóa SmartPH link (soft delete)
app.delete('/api/smartph/links/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { authCode } = req.body;
    
    const correctCode = "***4";
    if (authCode !== correctCode) {
        return res.status(401).json({ message: 'Mã xác thực không đúng' });
    }
    
    const sql = 'UPDATE smartph_links SET is_active = 0 WHERE id = ?';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Lỗi khi xóa SmartPH link:', err);
            res.status(500).json({ message: 'Lỗi khi xóa SmartPH link', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy SmartPH link' });
        } else {
            res.json({ message: 'Xóa SmartPH link thành công' });
        }
    });
});

// 6. Toggle favorite cho SmartPH link
app.patch('/api/smartph/links/:id/favorite', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { is_favorite } = req.body;
    
    const sql = 'UPDATE smartph_links SET is_favorite = ? WHERE id = ? AND is_active = 1';
    
    db.query(sql, [is_favorite ? 1 : 0, id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật favorite SmartPH link:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy SmartPH link' });
        } else {
            res.json({ message: 'Cập nhật favorite SmartPH link thành công' });
        }
    });
});

// 7. Tăng access count cho SmartPH link
app.patch('/api/smartph/links/:id/access', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    const sql = 'UPDATE smartph_links SET access_count = access_count + 1 WHERE id = ? AND is_active = 1';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật access count SmartPH link:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy SmartPH link' });
        } else {
            res.json({ message: 'Cập nhật access count SmartPH link thành công' });
        }
    });
});

// 8. Thống kê SmartPH links
app.get('/api/smartph/links/stats', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_links,
            SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as favorite_links,
            SUM(access_count) as total_access,
            department,
            type,
            COUNT(*) as count
        FROM smartph_links 
        WHERE is_active = 1 
        GROUP BY department, type
        ORDER BY department, type
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy thống kê SmartPH links:', err);
            res.status(500).json({ message: 'Lỗi khi lấy thống kê', error: err.message });
        } else {
            res.json(results);
        }
    });
});

// ==================== SMART PHONE PERMISSIONS API ====================

// 9. Thêm user vào permissions của SmartPH link (chỉ admin)
app.post('/api/smartph/links/:id/permissions/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const linkId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ message: 'Thiếu user_id' });
    }
    
    console.log(`[POST /api/smartph/links/${linkId}/permissions/users] Adding user ${user_id}`);
    
    const sql = `
        INSERT INTO smartph_link_user_permissions (link_id, user_id, created_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        created_at = NOW()
    `;
    
    db.query(sql, [linkId, user_id, req.user.userId], (err, result) => {
        if (err) {
            console.error('Lỗi khi thêm user vào SmartPH permissions:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        console.log(`[POST /api/smartph/links/${linkId}/permissions/users] User added successfully:`, result);
        res.json({ message: 'Thêm user vào SmartPH permissions thành công' });
    });
});

// 10. Xóa user khỏi permissions của SmartPH link (chỉ admin)
app.delete('/api/smartph/links/:id/permissions/users/:userId', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const linkId = req.params.id;
    const userId = req.params.userId;
    
    console.log(`[DELETE /api/smartph/links/${linkId}/permissions/users/${userId}] Removing user`);
    
    const sql = 'DELETE FROM smartph_link_user_permissions WHERE link_id = ? AND user_id = ?';
    
    db.query(sql, [linkId, userId], (err, result) => {
        if (err) {
            console.error('Lỗi khi xóa user khỏi SmartPH permissions:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy SmartPH permission' });
        }
        
        console.log(`[DELETE /api/smartph/links/${linkId}/permissions/users/${userId}] User removed successfully:`, result);
        res.json({ message: 'Xóa user khỏi SmartPH permissions thành công' });
    });
});

// 11. Lấy danh sách users có quyền truy cập SmartPH link
app.get('/api/smartph/links/:id/permissions/users', authenticateToken, (req, res) => {
    const linkId = req.params.id;
    
    console.log(`[GET /api/smartph/links/${linkId}/permissions/users] Getting users with access`);
    
    const sql = `
        SELECT 
            u.id,
            u.username,
            u.name,
            u.role,
            u.department,
            u.email,
            slup.created_at as permission_granted_at
        FROM smartph_link_user_permissions slup
        JOIN users u ON slup.user_id = u.id
        WHERE slup.link_id = ? AND u.is_active = TRUE
        ORDER BY slup.created_at DESC
    `;
    
    db.query(sql, [linkId], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy danh sách SmartPH users:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        console.log(`[GET /api/smartph/links/${linkId}/permissions/users] Found ${results.length} users`);
        res.json(results);
    });
});

// ==================== BEST LAB LINKS API ====================

// 1. Lấy tất cả BestLab links với permission filtering
app.get('/api/bestlab/links', authenticateToken, (req, res) => {
    const { department, type, search, favorite } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    console.log(`\n[GET /api/bestlab/links] Request from user: ${req.user.username} (${userRole})`);
    
    let sql = `
        SELECT 
            bl.id,
            bl.title,
            bl.url,
            bl.department,
            bl.type,
            bl.description,
            bl.created_at,
            bl.created_by,
            bl.is_active,
            bl.is_favorite,
            bl.access_count,
            CASE WHEN blup.user_id IS NULL THEN 0 ELSE 1 END AS has_user_access
        FROM bestlab_links bl
        LEFT JOIN bestlab_link_user_permissions blup 
            ON bl.id = blup.link_id AND blup.user_id = ?
        WHERE bl.is_active = 1
    `;
    const params = [userId];
    
    // Lọc theo phòng ban
    if (department && department !== 'all') {
        sql += ' AND bl.department = ?';
        params.push(department);
    }
    
    // Lọc theo loại
    if (type && type !== 'all') {
        sql += ' AND bl.type = ?';
        params.push(type);
    }
    
    // Tìm kiếm theo tiêu đề hoặc mô tả
    if (search) {
        sql += ' AND (bl.title LIKE ? OR bl.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    // Lọc theo yêu thích
    if (favorite === 'true') {
        sql += ' AND bl.is_favorite = 1';
    }
    
    sql += ' ORDER BY bl.created_at DESC';
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy danh sách BestLab links:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: err.message });
        }
        
        console.log(`[GET /api/bestlab/links] Found ${results.length} BestLab links in database`);
        
        // Filter URL based on permissions
        const filteredResults = results.map(link => {
            const hasAccess = userRole === 'admin' || Boolean(link.has_user_access);
            
            if (!hasAccess) {
                console.log(`  ❌ User (${userId}) NO ACCESS to BestLab link ${link.id}: ${link.title} - URL masked`);
                return {
                    ...link,
                    url: null,
                    _restricted: true
                };
            } else {
                console.log(`  ✅ User (${userId}) HAS ACCESS to BestLab link ${link.id}: ${link.title}`);
                return {
                    ...link,
                    _restricted: false
                };
            }
        });
        
        console.log(`[GET /api/bestlab/links] Returning ${filteredResults.length} BestLab links (${filteredResults.filter(l => !l._restricted).length} accessible, ${filteredResults.filter(l => l._restricted).length} restricted)`);
        
        res.json(filteredResults);
    });
});

// 2. Lấy BestLab link theo ID
app.get('/api/bestlab/links/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    const sql = `
        SELECT 
            bl.id,
            bl.title,
            bl.url,
            bl.department,
            bl.type,
            bl.description,
            bl.created_at,
            bl.created_by,
            bl.is_active,
            bl.is_favorite,
            bl.access_count,
            CASE WHEN blup.user_id IS NULL THEN 0 ELSE 1 END AS has_user_access
        FROM bestlab_links bl
        LEFT JOIN bestlab_link_user_permissions blup 
            ON bl.id = blup.link_id AND blup.user_id = ?
        WHERE bl.id = ? AND bl.is_active = 1
    `;
    
    db.query(sql, [userId, id], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy BestLab link:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy BestLab link' });
        }
        
        const link = results[0];
        const hasAccess = userRole === 'admin' || Boolean(link.has_user_access);
        
        if (!hasAccess) {
            console.log(`[GET /api/bestlab/links/${id}] User (${req.user.userId}) NO ACCESS - URL masked`);
            return res.json({
                ...link,
                url: null,
                _restricted: true
            });
        }
        
        console.log(`[GET /api/bestlab/links/${id}] User (${req.user.userId}) HAS ACCESS`);
        res.json({
            ...link,
            _restricted: false
        });
    });
});

// 3. Thêm BestLab link mới
app.post('/api/bestlab/links', authenticateToken, (req, res) => {
    const { title, url, department, type, description } = req.body;
    const createdById = req.user && req.user.userId ? req.user.userId : null;

    if (!title || !url || !department || !type) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Transaction: insert link, then auto-grant permissions to all users in department
    db.beginTransaction(err => {
        if (err) {
            console.error('Lỗi khi bắt đầu transaction:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }

        const insertLinkSql = `INSERT INTO bestlab_links 
                               (title, url, department, type, description, created_by) 
                               VALUES (?, ?, ?, ?, ?, ?)`;

        db.query(insertLinkSql, [title, url, department, type, description, createdById], (err, result) => {
            if (err) {
                console.error('Lỗi khi thêm BestLab link:', err);
                return db.rollback(() => {
                    res.status(500).json({ message: 'Lỗi khi thêm BestLab link', error: err.message });
                });
            }

            const linkId = result.insertId;

            // Auto grant: all active users in the same department get access
            const selectUsersSql = `SELECT id FROM users WHERE is_active = TRUE AND department = ?`;

            db.query(selectUsersSql, [department], (err, users) => {
                if (err) {
                    console.error('Lỗi khi lấy danh sách user theo phòng ban:', err);
                    return db.rollback(() => {
                        res.status(500).json({ message: 'Lỗi hệ thống' });
                    });
                }

                if (!users || users.length === 0) {
                    return db.commit(commitErr => {
                        if (commitErr) {
                            console.error('Lỗi khi commit transaction:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ message: 'Lỗi hệ thống' });
                            });
                        }
                        res.status(201).json({ message: 'Thêm BestLab link thành công', id: linkId });
                    });
                }

                const values = users.map(u => [linkId, u.id, createdById || u.id]);
                const insertPermSql = `INSERT INTO bestlab_link_user_permissions (link_id, user_id, created_by)
                                       VALUES ?
                                       ON DUPLICATE KEY UPDATE created_at = NOW()`;

                db.query(insertPermSql, [values], (err) => {
                    if (err) {
                        console.error('Lỗi khi cấp quyền mặc định cho user:', err);
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Lỗi hệ thống' });
                        });
                    }

                    db.commit(commitErr => {
                        if (commitErr) {
                            console.error('Lỗi khi commit transaction:', commitErr);
                            return db.rollback(() => {
                                res.status(500).json({ message: 'Lỗi hệ thống' });
                            });
                        }

                        res.status(201).json({ 
                            message: 'Thêm BestLab link thành công (đã cấp quyền cho phòng ban)', 
                            id: linkId 
                        });
                    });
                });
            });
        });
    });
});

// 4. Cập nhật BestLab link
app.put('/api/bestlab/links/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { title, url, department, type, description } = req.body;
    
    if (!title || !url || !department || !type) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    
    const sql = `UPDATE bestlab_links 
                 SET title = ?, url = ?, department = ?, type = ?, description = ?, updated_at = NOW()
                 WHERE id = ? AND is_active = 1`;
    
    db.query(sql, [title, url, department, type, description, id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật BestLab link:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật BestLab link', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy BestLab link' });
        } else {
            res.json({ message: 'Cập nhật BestLab link thành công' });
        }
    });
});

// 5. Xóa BestLab link (soft delete)
app.delete('/api/bestlab/links/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { authCode } = req.body;
    
    const correctCode = "***4";
    if (authCode !== correctCode) {
        return res.status(401).json({ message: 'Mã xác thực không đúng' });
    }
    
    const sql = 'UPDATE bestlab_links SET is_active = 0 WHERE id = ?';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Lỗi khi xóa BestLab link:', err);
            res.status(500).json({ message: 'Lỗi khi xóa BestLab link', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy BestLab link' });
        } else {
            res.json({ message: 'Xóa BestLab link thành công' });
        }
    });
});

// 6. Toggle favorite cho BestLab link
app.patch('/api/bestlab/links/:id/favorite', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { is_favorite } = req.body;
    
    const sql = 'UPDATE bestlab_links SET is_favorite = ? WHERE id = ? AND is_active = 1';
    
    db.query(sql, [is_favorite ? 1 : 0, id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật favorite BestLab link:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy BestLab link' });
        } else {
            res.json({ message: 'Cập nhật favorite BestLab link thành công' });
        }
    });
});

// 7. Tăng access count cho BestLab link
app.patch('/api/bestlab/links/:id/access', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    const sql = 'UPDATE bestlab_links SET access_count = access_count + 1 WHERE id = ? AND is_active = 1';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật access count BestLab link:', err);
            res.status(500).json({ message: 'Lỗi khi cập nhật', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Không tìm thấy BestLab link' });
        } else {
            res.json({ message: 'Cập nhật access count BestLab link thành công' });
        }
    });
});

// 8. Thống kê BestLab links
app.get('/api/bestlab/links/stats', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_links,
            SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as favorite_links,
            SUM(access_count) as total_access,
            department,
            type,
            COUNT(*) as count
        FROM bestlab_links 
        WHERE is_active = 1 
        GROUP BY department, type
        ORDER BY department, type
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy thống kê BestLab links:', err);
            res.status(500).json({ message: 'Lỗi khi lấy thống kê', error: err.message });
        } else {
            res.json(results);
        }
    });
});

// ==================== BEST LAB PERMISSIONS API ====================

// 9. Thêm user vào permissions của BestLab link (chỉ admin)
app.post('/api/bestlab/links/:id/permissions/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const linkId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ message: 'Thiếu user_id' });
    }
    
    console.log(`[POST /api/bestlab/links/${linkId}/permissions/users] Adding user ${user_id}`);
    
    const sql = `
        INSERT INTO bestlab_link_user_permissions (link_id, user_id, created_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        created_at = NOW()
    `;
    
    db.query(sql, [linkId, user_id, req.user.userId], (err, result) => {
        if (err) {
            console.error('Lỗi khi thêm user vào BestLab permissions:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        console.log(`[POST /api/bestlab/links/${linkId}/permissions/users] User added successfully:`, result);
        res.json({ message: 'Thêm user vào BestLab permissions thành công' });
    });
});

// 10. Xóa user khỏi permissions của BestLab link (chỉ admin)
app.delete('/api/bestlab/links/:id/permissions/users/:userId', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const linkId = req.params.id;
    const userId = req.params.userId;
    
    console.log(`[DELETE /api/bestlab/links/${linkId}/permissions/users/${userId}] Removing user`);
    
    const sql = 'DELETE FROM bestlab_link_user_permissions WHERE link_id = ? AND user_id = ?';
    
    db.query(sql, [linkId, userId], (err, result) => {
        if (err) {
            console.error('Lỗi khi xóa user khỏi BestLab permissions:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy BestLab permission' });
        }
        
        console.log(`[DELETE /api/bestlab/links/${linkId}/permissions/users/${userId}] User removed successfully:`, result);
        res.json({ message: 'Xóa user khỏi BestLab permissions thành công' });
    });
});

// 11. Lấy danh sách users có quyền truy cập BestLab link
app.get('/api/bestlab/links/:id/permissions/users', authenticateToken, (req, res) => {
    const linkId = req.params.id;
    
    console.log(`[GET /api/bestlab/links/${linkId}/permissions/users] Getting users with access`);
    
    const sql = `
        SELECT 
            u.id,
            u.username,
            u.name,
            u.role,
            u.department,
            u.email,
            blup.created_at as permission_granted_at
        FROM bestlab_link_user_permissions blup
        JOIN users u ON blup.user_id = u.id
        WHERE blup.link_id = ? AND u.is_active = TRUE
        ORDER BY blup.created_at DESC
    `;
    
    db.query(sql, [linkId], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy danh sách BestLab users:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        console.log(`[GET /api/bestlab/links/${linkId}/permissions/users] Found ${results.length} users`);
        res.json(results);
    });
});

// ==================== AI CUSTOMER SUPPORT API ====================

// Cào dữ liệu HTML từ tài liệu (không dùng Google Docs API)
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));

/**
 * Helper function: Extract document ID from Google Docs URL
 */
function extractDocumentId(url) {
    const patterns = [
        /\/document\/d\/([a-zA-Z0-9-_]+)/, // Google Docs
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/, // Google Sheets
        /\/presentation\/d\/([a-zA-Z0-9-_]+)/, // Google Slides
        /\/forms\/d\/([a-zA-Z0-9-_]+)/ // Google Forms
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Helper function: Extract text from Google Docs document
 */
function extractTextFromDocument(document) {
    let text = '';
    
    function extractTextFromElement(element) {
        if (element.textRun) {
            text += element.textRun.content;
        }
        
        if (element.paragraph) {
            element.paragraph.elements?.forEach(extractTextFromElement);
            text += '\n';
        }
        
        if (element.table) {
            element.table.tableRows?.forEach(row => {
                row.tableCells?.forEach(cell => {
                    cell.content?.forEach(extractTextFromElement);
                    text += '\t';
                });
                text += '\n';
            });
        }
    }
    
    document.body?.content?.forEach(extractTextFromElement);
    return text.trim();
}

/**
 * Helper function: Determine document type from URL
 */
function getDocumentType(url) {
    if (url.includes('/document/d/')) return 'docs';
    if (url.includes('/spreadsheets/d/')) return 'sheets';
    if (url.includes('/presentation/d/')) return 'slides';
    if (url.includes('/forms/d/')) return 'forms';
    return 'docs'; // default
}

/**
 * Helper: Extract text from raw HTML
 */
function extractTextFromHTML(html) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// API cào dữ liệu HTML từ URL
app.post('/api/ai/scrape-document', authenticateToken, async (req, res) => {
    const { documentUrl } = req.body;
    if (!documentUrl) {
        return res.status(400).json({ success: false, message: 'URL tài liệu không được để trống' });
    }
    try {
        console.log(`[AI] Scrape document: ${documentUrl}`);
        const response = await fetch(documentUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
            }
        });
        if (!response.ok) {
            return res.status(response.status).json({ success: false, message: `Fetch failed: ${response.statusText}` });
        }
        const html = await response.text();
        const text = extractTextFromHTML(html);
        if (!text) {
            return res.status(400).json({ success: false, message: 'Không thể trích xuất nội dung' });
        }
        res.json({
            success: true,
            data: { documentUrl, content: text, contentLength: text.length, scrapedAt: new Date().toISOString() },
            message: 'Cào dữ liệu tài liệu thành công'
        });
    } catch (error) {
        console.error('[AI] Error scraping document:', error);
        res.status(500).json({ success: false, message: `Lỗi khi cào dữ liệu: ${error.message}` });
    }
});

// ==================== EXISTING API (giữ nguyên) ====================

// Endpoint export data theo name
app.get('/fetch', (req, res) => {
    const seri = req.query.seri;
    console.log("Yêu cầu đến từ:", req.originalUrl);
    console.log("Tên check được:", seri);

    const sql = 'SELECT * FROM orders WHERE seri = ?';

    db.query(sql, [seri], (err, results) => {
        if (err) {
            console.error('Lỗi khi truy xuất dữ liệu từ MySQL:', err.message);
            res.status(500).json({ message: 'Lỗi khi truy xuất dữ liệu', error: err.message });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'Không tìm thấy thông tin cho tên này.' });
        } else {
            res.json(results);
        }
    });
});

app.get('/fetchAll', (req, res) => {
    console.log("Yêu cầu đến từ:", req.originalUrl);

    const sql = 'SELECT * FROM orders';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi khi truy xuất dữ liệu từ MySQL:', err.message);
            res.status(500).json({ message: 'Lỗi khi truy xuất dữ liệu', error: err.message });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'Không có dữ liệu trong bảng orders.' });
        } else {
            res.json(results);
        }
    });
});

app.delete('/delete/:id', (req, res) => {
    const id = req.params.id;
    const { code } = req.body;

    const correctCode = "1234";
    if (code !== correctCode) {
        return res.status(403).json({ error: "Mã xác nhận không đúng." });
    }

    const sql = "DELETE FROM orders WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Lỗi khi xóa dữ liệu:", err);
            return res.status(500).json({ error: "Lỗi khi xóa dữ liệu." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy thiết bị." });
        }
        res.status(200).json({ message: "Xóa thành công." });
    });
});

// Endpoint page /1, /2, /3...
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = __dirname + `/public/${page}.html`;
    res.sendFile(filePath, err => {
        if (err) {
            console.log("Yêu cầu đến từ:", req.originalUrl);
            res.status(404).send('Trang không tồn tại');
        }
    });
});

app.use('/img', express.static('img'));

// Endpoint handler request POST from form
app.post('/submit', (req, res) => {
    const { name_device, seri, action, note, authCode } = req.body;
    const correctCode = "***4";
    if (authCode !== correctCode) {
        return res.status(401).json({ message: 'Authentication code is incorrect.' });
    }
    
    const sql = 'INSERT INTO orders (name_device, seri, action, note, created_at) VALUES (?, ?, ?, ?, NOW())';
    db.query(sql, [name_device, seri, action, note], (err, result) => {
        if (err) {
            console.error('Lỗi khi lưu dữ liệu vào MySQL:', err);
            res.status(500).json({ message: 'Lỗi khi lưu dữ liệu' });
        } else {
            console.log('Dữ liệu đã được lưu:', { name_device, seri, action, note });
            res.json({ message: 'Dữ liệu đã được lưu thành công', status: 'success' });
        }
    });
});

// Run server
https.createServer(httpsoptions, app).listen(port, () => {
    console.log(`HTTPS Server running at https://localhost:${port}`);
    console.log('Authentication API endpoints:');
    console.log('  POST   /api/auth/login - Đăng nhập');
    console.log('  GET    /api/auth/me - Lấy thông tin user hiện tại');
    console.log('  POST   /api/auth/logout - Đăng xuất');
    console.log('  GET    /api/users - Lấy danh sách users (admin)');
    console.log('  POST   /api/users - Thêm user mới (admin)');
    console.log('  DELETE /api/users/:id - Xóa user (admin)');
    console.log('  GET    /api/links/:id/permissions - Lấy permissions của link');
    console.log('  PUT    /api/links/:id/permissions - Cập nhật permissions (admin)');
    console.log('  GET    /api/links/:id/access - Kiểm tra quyền truy cập');
    console.log('Google Links API endpoints:');
    console.log('  GET    /api/links - Lấy danh sách links');
    console.log('  GET    /api/links/:id - Lấy link theo ID');
    console.log('  POST   /api/links - Thêm link mới');
    console.log('  PUT    /api/links/:id - Cập nhật link');
    console.log('  DELETE /api/links/:id - Xóa link');
    console.log('  PATCH  /api/links/:id/favorite - Toggle favorite');
    console.log('  PATCH  /api/links/:id/access - Tăng access count');
    console.log('  GET    /api/links/stats - Thống kê');
    console.log('SmartPH Links API endpoints:');
    console.log('  GET    /api/smartph/links - Lấy danh sách SmartPH links');
    console.log('  GET    /api/smartph/links/:id - Lấy SmartPH link theo ID');
    console.log('  POST   /api/smartph/links - Thêm SmartPH link mới');
    console.log('  PUT    /api/smartph/links/:id - Cập nhật SmartPH link');
    console.log('  DELETE /api/smartph/links/:id - Xóa SmartPH link');
    console.log('  PATCH  /api/smartph/links/:id/favorite - Toggle favorite');
    console.log('  PATCH  /api/smartph/links/:id/access - Tăng access count');
    console.log('  GET    /api/smartph/links/stats - Thống kê SmartPH links');
    console.log('BestLab Links API endpoints:');
    console.log('  GET    /api/bestlab/links - Lấy danh sách BestLab links');
    console.log('  GET    /api/bestlab/links/:id - Lấy BestLab link theo ID');
    console.log('  POST   /api/bestlab/links - Thêm BestLab link mới');
    console.log('  PUT    /api/bestlab/links/:id - Cập nhật BestLab link');
    console.log('  DELETE /api/bestlab/links/:id - Xóa BestLab link');
    console.log('  PATCH  /api/bestlab/links/:id/favorite - Toggle favorite');
    console.log('  PATCH  /api/bestlab/links/:id/access - Tăng access count');
    console.log('  GET    /api/bestlab/links/stats - Thống kê BestLab links');
    console.log('AI Customer Support API endpoints:');
    console.log('  POST   /api/ai/scrape-document - Cào dữ liệu HTML từ URL');
});
