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

// 6. Xóa user (chỉ admin)
app.delete('/api/users/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
    const userId = req.params.id;
    
    // Không cho phép xóa chính mình
    if (parseInt(userId) === req.user.userId) {
        return res.status(400).json({ message: 'Không thể xóa chính mình' });
    }
    
    const sql = 'UPDATE users SET is_active = FALSE WHERE id = ?';
    
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('Lỗi khi xóa user:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
        res.json({ message: 'Xóa user thành công' });
    });
});

// ==================== LINK PERMISSIONS API ====================

// 7. Lấy permissions của link
app.get('/api/links/:id/permissions', authenticateToken, (req, res) => {
    const linkId = req.params.id;
    
    console.log(`[GET /api/links/${linkId}/permissions] Request from user:`, req.user.username, req.user.role);
    
    const sql = `
        SELECT 
            lp.allowed_roles,
            lp.allow_manager_preview,
            lp.allow_employee_preview,
            lp.created_at,
            lp.updated_at,
            u.name as created_by_name
        FROM link_permissions lp
        LEFT JOIN users u ON lp.created_by = u.id
        WHERE lp.link_id = ?
    `;
    
    db.query(sql, [linkId], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy permissions:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        console.log(`[GET /api/links/${linkId}/permissions] Query results:`, results);
        
        if (results.length === 0) {
            console.log(`[GET /api/links/${linkId}/permissions] No permissions found, returning default`);
            // Trả về permissions mặc định an toàn nếu chưa có
            return res.json({
                allowed_roles: ['admin', 'director'],
                allow_manager_preview: false,
                allow_employee_preview: false,
                created_at: null,
                updated_at: null,
                created_by_name: null
            });
        }
        
        console.log(`[GET /api/links/${linkId}/permissions] Returning permissions:`, results[0]);
        res.json(results[0]);
    });
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
        updated_at = NOW()
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

// 9. Kiểm tra quyền truy cập link
app.get('/api/links/:id/access', authenticateToken, (req, res) => {
    const linkId = req.params.id;
    const userId = req.user.userId;
    
    const sql = 'CALL CheckLinkAccess(?, ?, @has_access, @can_preview)';
    
    db.query(sql, [userId, linkId], (err, results) => {
        if (err) {
            console.error('Lỗi khi kiểm tra quyền truy cập:', err);
            return res.status(500).json({ message: 'Lỗi hệ thống' });
        }
        
        // Lấy kết quả từ stored procedure
        db.query('SELECT @has_access as has_access, @can_preview as can_preview', (err, results) => {
            if (err) {
                console.error('Lỗi khi lấy kết quả:', err);
                return res.status(500).json({ message: 'Lỗi hệ thống' });
            }
            
            res.json({
                has_access: Boolean(results[0].has_access),
                can_preview: Boolean(results[0].can_preview)
            });
        });
    });
});

// ==================== GOOGLE LINKS API (giữ nguyên) ====================

// 1. Lấy tất cả links
app.get('/api/links', (req, res) => {
    const { department, type, search, favorite } = req.query;
    
    let sql = 'SELECT * FROM google_links WHERE is_active = 1';
    const params = [];
    
    // Lọc theo phòng ban
    if (department && department !== 'all') {
        sql += ' AND department = ?';
        params.push(department);
    }
    
    // Lọc theo loại
    if (type && type !== 'all') {
        sql += ' AND type = ?';
        params.push(type);
    }
    
    // Tìm kiếm theo tiêu đề hoặc mô tả
    if (search) {
        sql += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    // Lọc theo yêu thích
    if (favorite === 'true') {
        sql += ' AND is_favorite = 1';
    }
    
    sql += ' ORDER BY created_at DESC';
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy danh sách links:', err);
            res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: err.message });
        } else {
            res.json(results);
        }
    });
});

// 2. Lấy link theo ID
app.get('/api/links/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM google_links WHERE id = ? AND is_active = 1';
    
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy link:', err);
            res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: err.message });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'Không tìm thấy link' });
        } else {
            res.json(results[0]);
        }
    });
});

// 3. Thêm link mới
app.post('/api/links', (req, res) => {
    const { title, url, department, type, description, created_by } = req.body;
    
    // Validation
    if (!title || !url || !department || !type) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    
    const sql = `INSERT INTO google_links 
                 (title, url, department, type, description, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [title, url, department, type, description, created_by], (err, result) => {
        if (err) {
            console.error('Lỗi khi thêm link:', err);
            res.status(500).json({ message: 'Lỗi khi thêm link', error: err.message });
        } else {
            res.status(201).json({ 
                message: 'Thêm link thành công', 
                id: result.insertId 
            });
        }
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
});
