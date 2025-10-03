// API client cho Google Links Management với Authentication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://axithcl.sytes.net:7778';

/**
 * Lấy token từ localStorage
 */
const getAuthToken = () => {
    return localStorage.getItem('authToken');
};

/**
 * Tạo headers với authentication
 */
const createAuthHeaders = () => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

/**
 * Lấy danh sách tất cả links với permissions
 * @param {Object} filters - Bộ lọc
 * @param {string} filters.department - Phòng ban
 * @param {string} filters.type - Loại tài liệu
 * @param {string} filters.search - Từ khóa tìm kiếm
 * @param {boolean} filters.favorite - Chỉ lấy yêu thích
 * @returns {Promise<Array>} - Danh sách links với permissions
 */
export const fetchLinks = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        
        if (filters.department && filters.department !== 'all') {
            params.append('department', filters.department);
        }
        if (filters.type && filters.type !== 'all') {
            params.append('type', filters.type);
        }
        if (filters.search) {
            params.append('search', filters.search);
        }
        if (filters.favorite) {
            params.append('favorite', 'true');
        }

        const response = await fetch(`${API_BASE_URL}/api/links?${params.toString()}`, {
            headers: createAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const links = await response.json();
        
        // Thêm permissions cho mỗi link
        const linksWithPermissions = await Promise.all(
            links.map(async (link) => {
                try {
                    const permissionsResponse = await fetch(`${API_BASE_URL}/api/links/${link.id}/permissions`, {
                        headers: createAuthHeaders()
                    });
                    
                    if (permissionsResponse.ok) {
                        const permissions = await permissionsResponse.json();
                        console.log(`[linksApi] Fetched permissions for link ${link.id}:`, permissions);
                        return { ...link, permissions };
                    } else {
                        console.warn(`[linksApi] Failed to fetch permissions for link ${link.id}, status:`, permissionsResponse.status);
                        // Nếu không có permissions, backend sẽ trả về default an toàn
                        return { 
                            ...link, 
                            permissions: {
                                allowedRoles: ['admin', 'director'],
                                allowManagerPreview: false,
                                allowEmployeePreview: false
                            }
                        };
                    }
                } catch (error) {
                    console.error(`[linksApi] Error fetching permissions for link ${link.id}:`, error);
                    return { 
                        ...link, 
                        permissions: {
                            allowedRoles: ['admin', 'director'],
                            allowManagerPreview: false,
                            allowEmployeePreview: false
                        }
                    };
                }
            })
        );
        
        return linksWithPermissions;
    } catch (error) {
        console.error('Error fetching links:', error);
        throw error;
    }
};

/**
 * Lấy link theo ID
 * @param {number} id - ID của link
 * @returns {Promise<Object>} - Thông tin link
 */
export const fetchLinkById = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/links/${id}`, {
            headers: createAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Không tìm thấy link');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const link = await response.json();
        
        // Lấy permissions
        try {
            const permissionsResponse = await fetch(`${API_BASE_URL}/api/links/${id}/permissions`, {
                headers: createAuthHeaders()
            });
            
            if (permissionsResponse.ok) {
                const permissions = await permissionsResponse.json();
                return { ...link, permissions };
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
        
        return link;
    } catch (error) {
        console.error('Error fetching link by ID:', error);
        throw error;
    }
};

/**
 * Thêm link mới
 * @param {Object} linkData - Dữ liệu link
 * @param {string} linkData.title - Tiêu đề
 * @param {string} linkData.url - URL
 * @param {string} linkData.department - Phòng ban
 * @param {string} linkData.type - Loại tài liệu
 * @param {string} linkData.description - Mô tả
 * @param {string} linkData.created_by - Người tạo
 * @returns {Promise<Object>} - Kết quả thêm
 */
export const createLink = async (linkData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/links`, {
            method: 'POST',
            headers: createAuthHeaders(),
            body: JSON.stringify(linkData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error creating link:', error);
        throw error;
    }
};

/**
 * Cập nhật link
 * @param {number} id - ID của link
 * @param {Object} linkData - Dữ liệu cập nhật
 * @returns {Promise<Object>} - Kết quả cập nhật
 */
export const updateLink = async (id, linkData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/links/${id}`, {
            method: 'PUT',
            headers: createAuthHeaders(),
            body: JSON.stringify(linkData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating link:', error);
        throw error;
    }
};

/**
 * Xóa link (soft delete)
 * @param {number} id - ID của link
 * @param {string} authCode - Mã xác thực
 * @returns {Promise<Object>} - Kết quả xóa
 */
export const deleteLink = async (id, authCode) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/links/${id}`, {
            method: 'DELETE',
            headers: createAuthHeaders(),
            body: JSON.stringify({ authCode })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error deleting link:', error);
        throw error;
    }
};

/**
 * Toggle favorite status
 * @param {number} id - ID của link
 * @param {boolean} isFavorite - Trạng thái yêu thích
 * @returns {Promise<Object>} - Kết quả cập nhật
 */
export const toggleFavorite = async (id, isFavorite) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/links/${id}/favorite`, {
            method: 'PATCH',
            headers: createAuthHeaders(),
            body: JSON.stringify({ is_favorite: isFavorite })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
    }
};

/**
 * Tăng access count
 * @param {number} id - ID của link
 * @returns {Promise<Object>} - Kết quả cập nhật
 */
export const incrementAccessCount = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/links/${id}/access`, {
            method: 'PATCH',
            headers: createAuthHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error incrementing access count:', error);
        throw error;
    }
};

/**
 * Lấy thống kê
 * @returns {Promise<Array>} - Dữ liệu thống kê
 */
export const fetchStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/links/stats`, {
            headers: createAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
    }
};

/**
 * Tìm kiếm links với Gemini AI
 * @param {Array} links - Danh sách links
 * @param {string} searchQuery - Từ khóa tìm kiếm
 * @returns {Promise<string>} - Kết quả tìm kiếm từ AI
 */
export const searchWithGemini = async (links, searchQuery) => {
    // Fallback về local search nếu không có Gemini
    const filteredLinks = links.filter(link => 
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (link.description && link.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        link.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredLinks.length === 0) {
        return 'Không tìm thấy link nào phù hợp với từ khóa tìm kiếm.';
    }
    
    return filteredLinks.map(link => 
        `• ${link.title} (${link.department} - ${link.type})\n  ${link.description || 'Không có mô tả'}\n  ${link.url}`
    ).join('\n\n');
};
