-- Tạo bảng quản lý links Google Docs/Sheets
CREATE TABLE IF NOT EXISTS google_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT 'Tiêu đề của link',
    url TEXT NOT NULL COMMENT 'URL của Google Form/Sheet/Doc',
    department ENUM('hr', 'it', 'finance', 'marketing', 'sales', 'admin') NOT NULL COMMENT 'Phòng ban sở hữu',
    type ENUM('form', 'sheet', 'doc') NOT NULL COMMENT 'Loại tài liệu',
    description TEXT COMMENT 'Mô tả chi tiết',
    is_favorite BOOLEAN DEFAULT FALSE COMMENT 'Đánh dấu yêu thích',
    access_count INT DEFAULT 0 COMMENT 'Số lần truy cập',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Ngày cập nhật',
    created_by VARCHAR(100) COMMENT 'Người tạo',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Trạng thái hoạt động'
);

-- Tạo index để tối ưu tìm kiếm
CREATE INDEX idx_department ON google_links(department);
CREATE INDEX idx_type ON google_links(type);
CREATE INDEX idx_title ON google_links(title);
CREATE INDEX idx_is_favorite ON google_links(is_favorite);
CREATE INDEX idx_is_active ON google_links(is_active);

-- Thêm dữ liệu mẫu
INSERT INTO google_links (title, url, department, type, description, created_by) VALUES
('Báo cáo công việc hàng ngày', 'https://docs.google.com/forms/d/1234567890/edit', 'hr', 'form', 'Form báo cáo công việc hàng ngày cho nhân viên', 'admin'),
('Danh sách thiết bị phòng IT', 'https://docs.google.com/spreadsheets/d/abcdef123456/edit', 'it', 'sheet', 'Bảng tính quản lý thiết bị IT', 'admin'),
('Quy trình xin phép', 'https://docs.google.com/document/d/xyz789/edit', 'hr', 'doc', 'Tài liệu hướng dẫn quy trình xin phép', 'admin'),
('Báo cáo tài chính tháng', 'https://docs.google.com/spreadsheets/d/finance123/edit', 'finance', 'sheet', 'Báo cáo tài chính hàng tháng', 'admin'),
('Khảo sát khách hàng', 'https://docs.google.com/forms/d/survey456/edit', 'marketing', 'form', 'Form khảo sát ý kiến khách hàng', 'admin');
