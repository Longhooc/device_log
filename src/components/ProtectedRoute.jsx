import React from 'react';
import { useAuth } from '../auth/authContext';
import LoginForm from './LoginForm';
import './ProtectedRoute.scss';

function ProtectedRoute({ children, requiredPermission = null }) {
    const { isAuthenticated, isLoading, hasPermission } = useAuth();

    // Hiển thị loading khi đang kiểm tra authentication
    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Đang kiểm tra quyền truy cập...</p>
            </div>
        );
    }

    // Nếu chưa đăng nhập, hiển thị form đăng nhập
    if (!isAuthenticated) {
        return <LoginForm />;
    }

    // Nếu có yêu cầu quyền cụ thể, kiểm tra quyền
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return (
            <div className="access-denied">
                <div className="access-denied-content">
                    <h2>🚫 Không có quyền truy cập</h2>
                    <p>Bạn không có quyền truy cập vào trang này.</p>
                    <p>Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
                </div>
            </div>
        );
    }

    // Nếu đã đăng nhập và có quyền, hiển thị nội dung
    return children;
}

export default ProtectedRoute;
