// Danh sách phòng ban chung cho toàn bộ ứng dụng
export const DEPARTMENTS = [
    { value: 'all', label: 'Tất cả phòng ban' },
    { value: 'SALES', label: 'Sales' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'PROJECT', label: 'Dự Án' },
    { value: 'CUSTOMER', label: 'Chăm Sóc Khách Hàng' },
    { value: 'PURCHASE', label: 'Mua Hàng' },
    { value: 'ACCOUNTING', label: 'Kế Toán' },
    { value: 'HR', label: 'Hành Chính Nhân Sự' },
    { value: 'RD', label: 'R&D' },
    { value: 'SMARTPH_PROD', label: 'Sản Xuất SmartpH' },
    { value: 'BESTLAB_PROD', label: 'Sản xuất BestLab' },
    { value: 'SMARTPH_CONST', label: 'Công trình SmartpH' },
    { value: 'BESTLAB_CONST', label: 'Công trình BestLab' },
    { value: 'QCP', label: 'QCP' },
    { value: 'MECHANICAL', label: 'Cơ Khí' },
    { value: 'ISO', label: 'ISO' },
];

// Danh sách phòng ban cho form thêm người dùng (không có 'all')
export const USER_DEPARTMENTS = DEPARTMENTS.filter(dept => dept.value !== 'all');
