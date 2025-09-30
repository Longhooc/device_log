const express = require('express');
const app = express();
app.use(express.json());
const port = 81;
const mysql = require('mysql2');
let db;
const https = require('https');
const fs = require('fs');
const cors = require('cors');

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

// ==================== GOOGLE LINKS API ====================

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
