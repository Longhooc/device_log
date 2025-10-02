import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://axithcl.sytes.net:7778';

/**
 * API client cho Authentication và User Management
 */

/**
 * Đăng nhập user
 * @param {string} username - Tên đăng nhập
 * @param {string} password - Mật khẩu
 * @returns {Promise<Object>} - Thông tin user và token
 */
export const loginUser = async (username, password) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username,
            password
        });
        
        if (response.data.success) {
            // Lưu token vào localStorage
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            return { success: true, user: response.data.user };
        } else {
            return { success: false, message: response.data.message };
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.response?.status === 401) {
            return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
        }
        return { success: false, message: 'Lỗi đăng nhập' };
    }
};

/**
 * Đăng xuất user
 */
export const logoutUser = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
};

/**
 * Lấy thông tin user hiện tại
 * @returns {Promise<Object>} - Thông tin user
 */
export const getCurrentUser = async () => {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return null;

        const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.data.user;
    } catch (error) {
        console.error('Get current user error:', error);
        // Token có thể đã hết hạn, xóa khỏi localStorage
        logoutUser();
        return null;
    }
};

/**
 * Lấy danh sách tất cả users (chỉ admin)
 * @returns {Promise<Array>} - Danh sách users
 */
export const getAllUsers = async () => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Get all users error:', error);
        throw error;
    }
};

/**
 * Thêm user mới (chỉ admin)
 * @param {Object} userData - Dữ liệu user
 * @returns {Promise<Object>} - Kết quả thêm user
 */
export const createUser = async (userData) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.post(`${API_BASE_URL}/api/users`, userData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Create user error:', error);
        throw error;
    }
};

/**
 * Xóa user (chỉ admin)
 * @param {number} userId - ID của user
 * @returns {Promise<Object>} - Kết quả xóa user
 */
export const deleteUser = async (userId) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.delete(`${API_BASE_URL}/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Delete user error:', error);
        throw error;
    }
};

/**
 * Lấy permissions của link
 * @param {number} linkId - ID của link
 * @returns {Promise<Object>} - Permissions của link
 */
export const getLinkPermissions = async (linkId) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/links/${linkId}/permissions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Get link permissions error:', error);
        throw error;
    }
};

/**
 * Cập nhật permissions của link (chỉ admin)
 * @param {number} linkId - ID của link
 * @param {Object} permissions - Permissions mới
 * @returns {Promise<Object>} - Kết quả cập nhật
 */
export const updateLinkPermissions = async (linkId, permissions) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.put(`${API_BASE_URL}/api/links/${linkId}/permissions`, permissions, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Update link permissions error:', error);
        throw error;
    }
};

/**
 * Kiểm tra quyền truy cập link
 * @param {number} linkId - ID của link
 * @returns {Promise<Object>} - Thông tin quyền truy cập
 */
export const checkLinkAccess = async (linkId) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/links/${linkId}/access`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Check link access error:', error);
        throw error;
    }
};
