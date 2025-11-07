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
        }, {
            timeout: 5000 // 10 seconds timeout
        });
        
        if (response.data.success) {
            // Lưu token vào localStorage
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            return { success: true, user: response.data.user };
        } else {
            return { success: false, message: response.data.message || 'Đăng nhập thất bại' };
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle network/server connection errors
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                throw new Error('TIMEOUT');
            } else if (error.code === 'ERR_NETWORK' || !error.response) {
                throw new Error('NETWORK_ERROR');
            } else if (error.response?.status === 401) {
                return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
            } else if (error.response?.status >= 500) {
                throw new Error('SERVER_ERROR');
            } else {
                return { success: false, message: error.response?.data?.message || 'Đăng nhập thất bại' };
            }
        }
        
        // Re-throw to be handled by LoginForm
        throw error;
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

// Permissions (role-based) đã bị loại bỏ – không còn export API cũ

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

/**
 * Lấy danh sách users có quyền truy cập link
 * @param {number} linkId - ID của link
 * @returns {Promise<Array>} - Danh sách users
 */
export const getLinkPermissionUsers = async (linkId) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/links/${linkId}/permissions/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting link permission users:', error);
        throw error;
    }
};

/**
 * Thêm tài khoản vào permissions của link
 * @param {number} linkId - ID của link
 * @param {number} userId - ID của user
 * @returns {Promise<Object>} - Kết quả thêm
 */
export const addUserToLinkPermissions = async (linkId, userId) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.post(`${API_BASE_URL}/api/links/${linkId}/permissions/users`, {
            user_id: userId
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error adding user to link permissions:', error);
        throw error;
    }
};

/**
 * Xóa tài khoản khỏi permissions của link
 * @param {number} linkId - ID của link
 * @param {number} userId - ID của user
 * @returns {Promise<Object>} - Kết quả xóa
 */
export const removeUserFromLinkPermissions = async (linkId, userId) => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.delete(`${API_BASE_URL}/api/links/${linkId}/permissions/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error removing user from link permissions:', error);
        throw error;
    }
};
