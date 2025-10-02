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

    // Khởi tạo user từ localStorage và API
    useEffect(() => {
        const initializeAuth = async () => {
            const savedUser = localStorage.getItem('user');
            const token = localStorage.getItem('authToken');
            
            if (savedUser && token) {
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

    // Đăng nhập
    const login = async (username, password) => {
        setIsLoading(true);
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
            return { success: false, message: 'Lỗi đăng nhập' };
        } finally {
            setIsLoading(false);
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

    // Kiểm tra quyền truy cập link
    const canAccessLink = (linkPermissions) => {
        if (!user) return false;
        
        // Admin có thể truy cập tất cả
        if (user.role === USER_ROLES.ADMIN) return true;
        
        // Kiểm tra quyền theo vai trò
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
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
