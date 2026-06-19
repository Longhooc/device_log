// SmartPH Links API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://quantrac.online:9443';

class SmartPhApi {
    constructor() {
        this.baseURL = `${API_BASE_URL}/api/smartph`;
    }

    // Helper method to get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    // Helper method to handle API responses
    async handleResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    // 1. Lấy danh sách SmartPH links
    async getLinks(filters = {}) {
        const queryParams = new URLSearchParams();
        
        if (filters.department && filters.department !== 'all') {
            queryParams.append('department', filters.department);
        }
        if (filters.type && filters.type !== 'all') {
            queryParams.append('type', filters.type);
        }
        if (filters.search) {
            queryParams.append('search', filters.search);
        }
        if (filters.favorite === true) {
            queryParams.append('favorite', 'true');
        }

        const url = `${this.baseURL}/links${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    // 2. Lấy SmartPH link theo ID
    async getLinkById(id) {
        const response = await fetch(`${this.baseURL}/links/${id}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    // 3. Thêm SmartPH link mới
    async createLink(linkData) {
        const response = await fetch(`${this.baseURL}/links`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(linkData)
        });

        return this.handleResponse(response);
    }

    // 4. Cập nhật SmartPH link
    async updateLink(id, linkData) {
        const response = await fetch(`${this.baseURL}/links/${id}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(linkData)
        });

        return this.handleResponse(response);
    }

    // 5. Xóa SmartPH link
    async deleteLink(id, authCode) {
        const response = await fetch(`${this.baseURL}/links/${id}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ authCode })
        });

        return this.handleResponse(response);
    }

    // 6. Toggle favorite cho SmartPH link
    async toggleFavorite(id, isFavorite) {
        const response = await fetch(`${this.baseURL}/links/${id}/favorite`, {
            method: 'PATCH',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ is_favorite: isFavorite })
        });

        return this.handleResponse(response);
    }

    // 7. Tăng access count cho SmartPH link
    async incrementAccess(id) {
        const response = await fetch(`${this.baseURL}/links/${id}/access`, {
            method: 'PATCH',
            headers: this.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    // 8. Lấy thống kê SmartPH links
    async getStats() {
        const response = await fetch(`${this.baseURL}/links/stats`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    // 9. Kiểm tra quyền truy cập SmartPH link
    async checkAccess(id) {
        const response = await fetch(`${this.baseURL}/links/${id}/access`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });

        return this.handleResponse(response);
    }
}

// Export singleton instance
export default new SmartPhApi();
