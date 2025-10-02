import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/authContext';
import { USER_ROLES } from '../auth/authContext';
import { useLinks } from '../hooks/useLinks';
import { getAllUsers, createUser, deleteUser, updateLinkPermissions, getLinkPermissions } from '../api/authApi';
import './AdminPanel.scss';

function AdminPanel() {
    const { user, hasPermission } = useAuth();
    const links = useLinks();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [linkPermissions, setLinkPermissions] = useState([]);
    const [showAddUser, setShowAddUser] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showInactiveUsers, setShowInactiveUsers] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        name: '',
        role: USER_ROLES.EMPLOYEE,
        department: '',
        email: '',
        phone: ''
    });

    // Load users từ API
    useEffect(() => {
        const loadUsers = async () => {
            try {
                setIsLoading(true);
                const usersData = await getAllUsers();
                setUsers(usersData);
            } catch (error) {
                console.error('Error loading users:', error);
                alert('Lỗi khi tải danh sách người dùng');
            } finally {
                setIsLoading(false);
            }
        };

        loadUsers();
    }, []);

    // Reload link permissions function
    const reloadLinkPermissions = async () => {
        try {
            const permissionsFromAPI = await Promise.all(
                links.links.map(async (link) => {
                    try {
                        const perms = await getLinkPermissions(link.id);
                        
                        // Parse allowed_roles nếu là string JSON
                        let allowedRoles = perms.allowed_roles;
                        console.log(`[AdminPanel] Raw allowedRoles for link ${link.id}:`, {
                            value: allowedRoles,
                            type: typeof allowedRoles
                        });
                        
                        if (typeof allowedRoles === 'string') {
                            try {
                                allowedRoles = JSON.parse(allowedRoles);
                                console.log(`[AdminPanel] ✅ Parsed allowedRoles for link ${link.id}:`, allowedRoles);
                            } catch (e) {
                                console.error(`[AdminPanel] ❌ Failed to parse allowedRoles for link ${link.id}:`, e);
                                allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.DIRECTOR];
                            }
                        }
                        if (!Array.isArray(allowedRoles)) {
                            console.warn(`[AdminPanel] ⚠️ allowedRoles not array for link ${link.id}, using default`);
                            allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.DIRECTOR];
                        }
                        
                        return {
                            id: link.id,
                            linkTitle: link.title,
                            department: link.department,
                            allowedRoles: allowedRoles
                        };
                    } catch (error) {
                        console.error(`Error loading permissions for link ${link.id}:`, error);
                        // Trả về permissions mặc định an toàn nếu lỗi
                        return {
                            id: link.id,
                            linkTitle: link.title,
                            department: link.department,
                            allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.DIRECTOR]
                        };
                    }
                })
            );
            
            setLinkPermissions(permissionsFromAPI);
        } catch (error) {
            console.error('Error reloading link permissions:', error);
        }
    };

    // Load link permissions từ API
    useEffect(() => {
        if (links.links.length > 0) {
            reloadLinkPermissions();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [links.links]);

    // Kiểm tra quyền admin
    if (!hasPermission('canAccessAdminPanel')) {
        return (
            <div className="access-denied">
                <h2>🚫 Không có quyền truy cập</h2>
                <p>Chỉ quản trị viên mới có thể truy cập panel này.</p>
            </div>
        );
    }

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

    const handleAddUser = async () => {
        if (!newUser.username || !newUser.password || !newUser.name) {
            alert('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        try {
            setIsLoading(true);
            await createUser(newUser);
            
            // Reload users list
            const usersData = await getAllUsers();
            setUsers(usersData);
            
            setNewUser({
                username: '',
                password: '',
                name: '',
                role: USER_ROLES.EMPLOYEE,
                department: '',
                email: '',
                phone: ''
            });
            setShowAddUser(false);
            alert('Thêm người dùng thành công!');
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Lỗi khi thêm người dùng: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (userId, userToDelete) => {
        // Không cho xóa chính mình
        if (user && userId === user.id) {
            alert('Bạn không thể xóa chính mình!');
            return;
        }
        
        if (window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${userToDelete.name}" (${userToDelete.username})?`)) {
            try {
                setIsLoading(true);
                await deleteUser(userId);
                
                // Reload users list
                const usersData = await getAllUsers();
                setUsers(usersData);
                
                alert('Xóa người dùng thành công!');
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Lỗi khi xóa người dùng: ' + (error.response?.data?.message || error.message));
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRoleToggle = (linkId, newRoles) => {
        setLinkPermissions(prev =>
            prev.map(permission =>
                permission.id === linkId
                    ? { ...permission, allowedRoles: newRoles }
                    : permission
            )
        );
        setHasChanges(true);
    };

    const handleUpdateLinkPermission = (linkId, field, value) => {
        setLinkPermissions(permissions => 
            permissions.map(permission => 
                permission.id === linkId 
                    ? { ...permission, [field]: value }
                    : permission
            )
        );
        setHasChanges(true);
    };

    const handleSaveAllPermissions = async () => {
        try {
            setIsLoading(true);
            
            console.log('[AdminPanel] Saving permissions for all links:', linkPermissions);
            
            // Lưu tất cả permissions đã thay đổi
            const promises = linkPermissions.map(permission => {
                console.log(`[AdminPanel] Updating link ${permission.id}:`, {
                    allowed_roles: permission.allowedRoles
                });
                
                return updateLinkPermissions(permission.id, {
                    allowed_roles: permission.allowedRoles,
                    allow_manager_preview: 1,  // Always 1 (simplified)
                    allow_employee_preview: 1   // Always 1 (simplified)
                });
            });

            const results = await Promise.all(promises);
            console.log('[AdminPanel] All permissions updated:', results);

            // Reload permissions từ API để đảm bảo dữ liệu đồng bộ
            console.log('[AdminPanel] Reloading permissions from API...');
            await reloadLinkPermissions();
            console.log('[AdminPanel] Permissions reloaded successfully');

            setHasChanges(false);
            alert('Đã lưu tất cả thay đổi quyền truy cập!');
        } catch (error) {
            console.error('[AdminPanel] Error updating permissions:', error);
            alert('Lỗi khi cập nhật quyền truy cập: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h1>👑 Panel Quản Trị</h1>
                <p>Quản lý người dùng và quyền truy cập hệ thống</p>
            </div>

            <div className="admin-tabs">
                <button 
                    className={activeTab === 'users' ? 'active' : ''}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Quản lý người dùng
                </button>
                <button 
                    className={activeTab === 'permissions' ? 'active' : ''}
                    onClick={() => setActiveTab('permissions')}
                >
                    🔐 Quyền truy cập link
                </button>
            </div>

            {activeTab === 'users' && (
                <div className="users-tab">
                    <div className="tab-header">
                        <h2>Danh sách người dùng</h2>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button 
                                className="btn-primary"
                                onClick={() => setShowAddUser(true)}
                            >
                                ➕ Thêm người dùng
                            </button>
                        </div>
                    </div>
                    
                    <div style={{marginBottom: '15px', padding: '10px', background: '#fff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <p style={{margin: '0', color: '#666', fontSize: '14px'}}>
                            ℹ️ <strong>Lưu ý:</strong> Xóa người dùng sẽ vô hiệu hóa tài khoản (soft delete). 
                            User đã xóa không thể đăng nhập nhưng vẫn lưu trong database để theo dõi lịch sử.
                        </p>
                        <div style={{fontSize: '12px', color: '#999', textAlign: 'right'}}>
                            <strong>Đang đăng nhập:</strong> {user?.name} ({user?.username})<br/>
                            <strong>Vai trò:</strong> {getRoleDisplayName(user?.role)}
                        </div>
                    </div>

                    {showAddUser && (
                        <div className="add-user-form">
                            <h3>Thêm người dùng mới</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tên đăng nhập:</label>
                                    <input
                                        type="text"
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                        placeholder="Nhập tên đăng nhập"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mật khẩu:</label>
                                    <input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                        placeholder="Nhập mật khẩu"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tên hiển thị:</label>
                                    <input
                                        type="text"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                        placeholder="Nhập tên hiển thị"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vai trò:</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                    >
                                        <option value={USER_ROLES.ADMIN}>Quản trị viên</option>
                                        <option value={USER_ROLES.DIRECTOR}>Ban giám đốc</option>
                                        <option value={USER_ROLES.MANAGER}>Quản lý</option>
                                        <option value={USER_ROLES.EMPLOYEE}>Nhân viên</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phòng ban:</label>
                                    <input
                                        type="text"
                                        value={newUser.department}
                                        onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                                        placeholder="Nhập phòng ban"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email:</label>
                                    <input
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                        placeholder="Nhập email"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Số điện thoại:</label>
                                <input
                                    type="tel"
                                    value={newUser.phone}
                                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>
                            <div className="form-actions">
                                <button 
                                    className="btn-primary" 
                                    onClick={handleAddUser}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Đang thêm...' : 'Thêm người dùng'}
                                </button>
                                <button 
                                    className="btn-secondary" 
                                    onClick={() => setShowAddUser(false)}
                                    disabled={isLoading}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="users-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Người dùng</th>
                                    <th>Vai trò</th>
                                    <th>Phòng ban</th>
                                    <th>Email</th>
                                    <th>Đăng nhập cuối</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-info">
                                                <span className="user-icon">{getRoleIcon(user.role)}</span>
                                                <div>
                                                    <div className="user-name">{user.name}</div>
                                                    <div className="user-username">@{user.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`role-badge role-${user.role}`}>
                                                {getRoleDisplayName(user.role)}
                                            </span>
                                        </td>
                                        <td>{user.department || '-'}</td>
                                        <td>{user.email || '-'}</td>
                                        <td>{user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</td>
                                        <td>
                                            <button 
                                                className="btn-danger btn-sm"
                                                onClick={() => handleDeleteUser(user.id, user)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Đang xóa...' : 'Xóa'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="permissions-tab">
                    <div className="tab-header">
                        <h2>Quyền truy cập link</h2>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <p>Cấu hình quyền truy cập cho từng link (tick để cho phép mở và xem link)</p>
                            <button 
                                className={`btn-primary ${hasChanges ? 'btn-highlight' : ''}`}
                                onClick={handleSaveAllPermissions}
                                disabled={isLoading || !hasChanges}
                                style={{marginLeft: 'auto'}}
                            >
                                {isLoading ? '💾 Đang lưu...' : hasChanges ? '💾 Lưu tất cả thay đổi' : '✓ Đã lưu'}
                            </button>
                        </div>
                    </div>

                    <div className="permissions-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Link</th>
                                    <th>Vai trò được phép truy cập (Mở & Xem)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {linkPermissions.map(permission => (
                                    <tr key={permission.id}>
                                        <td>
                                            <div className="link-info">
                                                <div className="link-title">{permission.linkTitle}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="role-checkboxes">
                                                {Object.values(USER_ROLES).map(role => (
                                                    <label key={role} className="role-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={permission.allowedRoles.includes(role)}
                                                            onChange={(e) => {
                                                                const newRoles = e.target.checked
                                                                    ? [...permission.allowedRoles, role]
                                                                    : permission.allowedRoles.filter(r => r !== role);
                                                                handleRoleToggle(permission.id, newRoles);
                                                            }}
                                                        />
                                                        <span className={`role-badge role-${role}`}>
                                                            {getRoleIcon(role)} {getRoleDisplayName(role)}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;
