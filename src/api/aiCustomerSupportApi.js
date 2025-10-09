// AI Customer Support API Service
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://axithcl.sytes.net:7778';

// Tạo axios instance với authentication
const createApiInstance = () => {
    const token = localStorage.getItem('authToken');
    return axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        }
    });
};

/**
 * Đọc Google Docs có bảo mật
 * @param {string} documentUrl - URL của Google Docs
 * @returns {Promise<Object>} - Dữ liệu đã đọc được
 */
export const readGoogleDoc = async (documentUrl) => {
    try {
        const api = createApiInstance();
        const response = await api.post('/api/ai/read-google-doc', {
            documentUrl
        });
        
        return response.data;
    } catch (error) {
        console.error('Error reading Google Doc:', error);
        throw new Error(error.response?.data?.message || 'Lỗi khi đọc Google Docs');
    }
};

/**
 * Validate Google Docs URL
 * @param {string} url - URL cần validate
 * @returns {boolean} - True nếu URL hợp lệ
 */
export const validateGoogleDocsUrl = (url) => {
    const patterns = [
        /https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9-_]+/,
        /https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/,
        /https:\/\/docs\.google\.com\/presentation\/d\/[a-zA-Z0-9-_]+/,
        /https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9-_]+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
};

/**
 * Extract document type from URL
 * @param {string} url - URL của tài liệu
 * @returns {string} - Loại tài liệu
 */
export const getDocumentTypeFromUrl = (url) => {
    if (url.includes('/document/d/')) return 'Google Docs';
    if (url.includes('/spreadsheets/d/')) return 'Google Sheets';
    if (url.includes('/presentation/d/')) return 'Google Slides';
    if (url.includes('/forms/d/')) return 'Google Forms';
    return 'Unknown';
};

/**
 * Format URL for display
 * @param {string} url - URL gốc
 * @returns {string} - URL đã format
 */
export const formatUrl = (url) => {
    if (!url) return '';
    
    // Rút gọn URL để hiển thị
    if (url.length > 50) {
        return url.substring(0, 47) + '...';
    }
    
    return url;
};
