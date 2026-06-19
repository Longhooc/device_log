import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser, getCurrentUser } from '../api/authApi';

// Định nghĩa các vai trò và quyền hạn
export const USER_ROLES = {
    ADMIN: 'admin',
    DIRECTOR: 'director', // Ban giám đốc
    MANAGER: 'manager',   // Quản lý
    EMPLOYEE: 'employee'  // Nhân viên
};

export const ROLE_PERMISSIONS = {
    [USER_ROLES.ADMIN]: {
        canViewAllLinks: true,
        canEditAllLinks: true,
        canDeleteLinks: true,
        canManageUsers: true,
        canSetPermissions: true,
        canAccessAdminPanel: true,
        canPreviewAllLinks: true
    },
    [USER_ROLES.DIRECTOR]: {
        canViewAllLinks: true,
        canEditAllLinks: false,
        canDeleteLinks: false,
        canManageUsers: false,
        canSetPermissions: false,
        canAccessAdminPanel: false,
        canPreviewAllLinks: true
    },
    [USER_ROLES.MANAGER]: {
        canViewAllLinks: true,
        canEditAllLinks: false,
        canDeleteLinks: false,
        canManageUsers: false,
        canSetPermissions: false,
        canAccessAdminPanel: false,
        canPreviewAllLinks: true
    },
    [USER_ROLES.EMPLOYEE]: {
        canViewAllLinks: true,
        canEditAllLinks: false,
        canDeleteLinks: false,
        canManageUsers: false,
        canSetPermissions: false,
        canAccessAdminPanel: false,
        canPreviewAllLinks: false // Chỉ có thể xem, không preview
    }
};

// Context cho authentication
const AuthContext = createContext();

// Hook để sử dụng auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [departments, setDepartments] = useState([
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
        { value: 'ISO', label: 'ISO' }
    ]);
    const [userDepartments, setUserDepartments] = useState([
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
        { value: 'ISO', label: 'ISO' }
    ]);

    // Khởi tạo user từ localStorage và API
    useEffect(() => {
        const initializeAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const queryToken = urlParams.get('token');
            if (queryToken) {
                localStorage.setItem('authToken', queryToken);
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            const savedUser = localStorage.getItem('user');
            const token = localStorage.getItem('authToken');
            
            if (token) {
                try {
                    // Kiểm tra token còn hợp lệ không
                    const currentUser = await getCurrentUser();
                    if (currentUser) {
                        setUser(currentUser);
                    } else {
                        // Token không hợp lệ, xóa khỏi localStorage
                        localStorage.removeItem('user');
                        localStorage.removeItem('authToken');
                    }
                } catch (error) {
                    console.error('Error validating token:', error);
                    localStorage.removeItem('user');
                    localStorage.removeItem('authToken');
                }
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    // Tải phòng ban động từ API khi user đã đăng nhập
    useEffect(() => {
        if (!user) return;

        const loadApiDepartments = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://quantrac.online:9443'}/api/departments/tree`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const resJson = await response.json();
                    if (resJson.success && Array.isArray(resJson.data)) {
                        const list = [];
                        for (const parent of resJson.data) {
                            list.push({ value: parent.name, label: parent.name });
                            for (const child of (parent.children || [])) {
                                list.push({ value: child.name, label: `└─ ${child.name}` });
                            }
                        }
                        if (list.length > 0) {
                            setDepartments([
                                { value: 'all', label: 'Tất cả phòng ban' },
                                ...list
                            ]);
                            setUserDepartments(list);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching api departments in auth:', error);
            }
        };

        loadApiDepartments();
    }, [user]);

    // Đăng nhập
    const login = async (username, password) => {
        // Không set isLoading ở đây để tránh làm ProtectedRoute re-render
        // LoginForm sẽ tự quản lý loading state
        try {
            const result = await loginUser(username, password);
            if (result.success) {
                setUser(result.user);
                return { success: true, user: result.user };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            // Pass through error message for better error handling
            if (error.message === 'TIMEOUT' || error.message === 'NETWORK_ERROR') {
                return { success: false, message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.' };
            } else if (error.message === 'SERVER_ERROR') {
                return { success: false, message: 'Lỗi server. Vui lòng thử lại sau.' };
            } else {
                return { success: false, message: error.message || 'Lỗi đăng nhập' };
            }
        }
    };

    // Đăng xuất
    const logout = () => {
        logoutUser();
        setUser(null);
    };

    // Kiểm tra quyền
    const hasPermission = (permission) => {
        if (!user) return false;
        return ROLE_PERMISSIONS[user.role]?.[permission] || false;
    };

    // Kiểm tra quyền truy cập link - Sử dụng account-based permission
    const canAccessLink = (linkPermissions) => {
        if (!user) return false;
        
        // Admin có thể truy cập tất cả
        if (user.role === USER_ROLES.ADMIN) return true;
        
        // Kiểm tra account-based permission trước (has_user_access)
        if (linkPermissions && typeof linkPermissions.has_user_access !== 'undefined') {
            return Boolean(linkPermissions.has_user_access);
        }
        
        // Fallback: Kiểm tra quyền theo vai trò (role-based)
        if (linkPermissions && linkPermissions.allowedRoles && Array.isArray(linkPermissions.allowedRoles)) {
            return linkPermissions.allowedRoles.includes(user.role);
        }
        
        // Nếu không có permissions, chỉ admin mới truy cập được
        return false;
    };

    // Kiểm tra quyền preview link - ĐƠN GIẢN: Có quyền truy cập = có quyền preview
    const canPreviewLink = (linkPermissions) => {
        return canAccessLink(linkPermissions);
    };

    const value = {
        user,
        isLoading,
        login,
        logout,
        hasPermission,
        canAccessLink,
        canPreviewLink,
        departments,
        userDepartments,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
