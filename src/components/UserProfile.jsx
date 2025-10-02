import React, { useState } from 'react';
import { useAuth } from '../auth/authContext';
import { USER_ROLES } from '../auth/authContext';
import './UserProfile.scss';

function UserProfile() {
    const { user, logout } = useAuth();
    const [showProfile, setShowProfile] = useState(false);

    if (!user) return null;

    const getRoleDisplayName = (role) => {
        const roleNames = {
            [USER_ROLES.ADMIN]: 'Quản trị viên',
            [USER_ROLES.DIRECTOR]: 'Ban giám đốc',
            [USER_ROLES.MANAGER]: 'Quản lý',
            [USER_ROLES.EMPLOYEE]: 'Nhân viên'
        };
        return roleNames[role] || role;
    };

    const getRoleIcon = (role) => {
        const roleIcons = {
            [USER_ROLES.ADMIN]: '👑',
            [USER_ROLES.DIRECTOR]: '🎖️',
            [USER_ROLES.MANAGER]: '👔',
            [USER_ROLES.EMPLOYEE]: '👤'
        };
        return roleIcons[role] || '👤';
    };

    const handleLogout = () => {
        if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            logout();
        }
    };

    return (
        <div className="user-profile">
            <div 
                className="user-info"
                onClick={() => setShowProfile(!showProfile)}
            >
                <div className="user-avatar">
                    {getRoleIcon(user.role)}
                </div>
                <div className="user-details">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{getRoleDisplayName(user.role)}</span>
                </div>
                <div className="dropdown-arrow">
                    {showProfile ? '▲' : '▼'}
                </div>
            </div>

            {showProfile && (
                <div className="profile-dropdown">
                    <div className="profile-header">
                        <div className="profile-avatar">
                            {getRoleIcon(user.role)}
                        </div>
                        <div className="profile-info">
                            <h4>{user.name}</h4>
                            <p>{getRoleDisplayName(user.role)}</p>
                            <span className="department">{user.department}</span>
                        </div>
                    </div>
                    
                    <div className="profile-actions">
                        <button 
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            🚪 Đăng xuất
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserProfile;
