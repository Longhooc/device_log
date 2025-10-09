import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/authContext';
import { USER_ROLES } from '../auth/authContext';
import { USER_DEPARTMENTS } from '../constants/departments';
import { useBestLabLinks } from '../hooks/useBestLabLinks';
import { 
    getAllUsers, 
    createUser, 
    deleteUser, 
    addUserToLinkPermissions,
    removeUserFromLinkPermissions,
    getLinkPermissionUsers
} from '../api/authApi';
import './AdminPanel.scss';

function BestLabAdminPanel({ onClose }) {
    const { user, hasPermission } = useAuth();
    const bestlabLinks = useBestLabLinks();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [showAddUser, setShowAddUser] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLinkId, setSelectedLinkId] = useState(null);
    const [linkPermissionUsers, setLinkPermissionUsers] = useState([]);
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

    // Load users có quyền truy cập BestLab link cụ thể
    const loadLinkPermissionUsers = async (linkId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://axithcl.sytes.net:7778'}/api/bestlab/links/${linkId}/permissions/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            const users = await response.json();
            setLinkPermissionUsers(users);
        } catch (error) {
            console.error('Error loading BestLab link permission users:', error);
            setLinkPermissionUsers([]);
        }
    };

    // Kiểm tra quyền admin
    if (!hasPermission('canAccessAdminPanel')) {
        return (
            <div className="admin-panel-overlay">
                <div className="admin-panel">
                    <div className="access-denied">
                        <h2>🚫 Không có quyền truy cập</h2>
                        <p>Chỉ quản trị viên mới có thể truy cập panel này.</p>
                        <button className="btn-secondary" onClick={onClose}>Đóng</button>
                    </div>
                </div>
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

    // Sử dụng danh sách phòng ban có sẵn

    // Function để thêm user vào BestLab link permissions
    const addUserToBestLabLinkPermissions = async (linkId, userId) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/bestlab/links/${linkId}/permissions/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`✅ Added user ${userId} to BestLab link ${linkId}:`, result);
            return result;
        } catch (error) {
            console.error(`❌ Error adding user ${userId} to BestLab link ${linkId}:`, error);
            throw error;
        }
    };

    const handleAddUser = async () => {
        if (!newUser.username || !newUser.password || !newUser.name || !newUser.department) {
            alert('Vui lòng nhập đầy đủ thông tin và chọn phòng ban');
            return;
        }

        try {
            setIsLoading(true);
            
            // 1. Tạo user mới
            const createdUser = await createUser(newUser);
            console.log('✅ User created:', createdUser);
            
            // 2. Lấy tất cả BestLab links của phòng ban
            const allLinks = bestlabLinks.links; // bestlabLinks.links là array từ useBestLabLinks hook
            const departmentLinks = allLinks.filter(link => link.department === newUser.department);
            console.log(`📋 Found ${departmentLinks.length} links for department: ${newUser.department}`);
            
            // 3. Cấp quyền truy cập tất cả BestLab links của phòng ban cho user mới
            if (departmentLinks.length > 0) {
                const permissionPromises = departmentLinks.map(link => 
                    addUserToBestLabLinkPermissions(link.id, createdUser.id).catch(error => {
                        console.warn(`⚠️ Failed to grant access to BestLab link ${link.id}:`, error);
                        return null; // Continue with other links even if one fails
                    })
                );
                
                await Promise.all(permissionPromises);
                console.log(`✅ Granted access to ${departmentLinks.length} BestLab links for user ${createdUser.username}`);
            }
            
            // 4. Reload users list
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
            alert(`Thêm người dùng thành công! Đã cấp quyền truy cập ${departmentLinks.length} tài liệu BestLab của phòng ban.`);
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

    const handleAddUserToLink = async (linkId, userId) => {
        try {
            setIsLoading(true);
            await fetch(`${process.env.REACT_APP_API_URL || 'https://axithcl.sytes.net:7778'}/api/bestlab/links/${linkId}/permissions/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });
            await loadLinkPermissionUsers(linkId);
            alert('Thêm quyền truy cập BestLab link thành công!');
        } catch (error) {
            console.error('Error adding user to BestLab link permissions:', error);
            alert('Lỗi khi thêm quyền truy cập: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveUserFromLink = async (linkId, userId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa quyền truy cập BestLab link này?')) {
            try {
                setIsLoading(true);
                await fetch(`${process.env.REACT_APP_API_URL || 'https://axithcl.sytes.net:7778'}/api/bestlab/links/${linkId}/permissions/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    }
                });
                await loadLinkPermissionUsers(linkId);
                alert('Xóa quyền truy cập BestLab link thành công!');
            } catch (error) {
                console.error('Error removing user from BestLab link permissions:', error);
                alert('Lỗi khi xóa quyền truy cập: ' + (error.response?.data?.message || error.message));
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleLinkSelect = async (linkId) => {
        setSelectedLinkId(linkId);
        await loadLinkPermissionUsers(linkId);
    };

    return (
        <div className="admin-panel-overlay">
            <div className="admin-panel">
                <div className="admin-panel-header">
                    <h2>🧪 BestLab Admin Panel</h2>
                    <button className="close-btn" onClick={onClose}>X</button>
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
                        🔐 Quyền truy cập BestLab links
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
                                        <select
                                            value={newUser.department}
                                            onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                                        >
                                            <option value="">-- Chọn phòng ban --</option>
                                            {USER_DEPARTMENTS.map(dept => (
                                                <option key={dept.value} value={dept.value}>
                                                    {dept.label}
                                                </option>
                                            ))}
                                        </select>
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
                            <h2>Quyền truy cập BestLab links</h2>
                            <p>Chọn BestLab link và quản lý quyền truy cập ngay bên cạnh</p>
                        </div>

                        <div className="permissions-layout">
                            {/* Left: BestLab Link list */}
                            <div className="permissions-left">
                                <div className="link-selection">
                                    <div className="links-grid">
                                        {bestlabLinks.links.map(link => (
                                            <div 
                                                key={link.id}
                                                className={`link-card ${selectedLinkId === link.id ? 'selected' : ''}`}
                                                onClick={() => handleLinkSelect(link.id)}
                                            >
                                                <h4>{link.title}</h4>
                                                <p>{link.department}</p>
                                                <span className="link-type">{link.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Permission panel */}
                            <div className="permissions-right">
                                <div className="permission-management">
                                    <h3>{selectedLinkId ? 'Quản lý quyền truy cập BestLab link' : 'Chọn một BestLab link để quản lý quyền'}</h3>

                                    {selectedLinkId && (
                                        <>
                                            <div className="add-user-section">
                                                <h4>Thêm tài khoản có quyền truy cập BestLab link:</h4>
                                                <div className="user-selector">
                                                    <select 
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handleAddUserToLink(selectedLinkId, e.target.value);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Chọn tài khoản để thêm quyền...</option>
                                                        {users
                                                            .filter(u => !linkPermissionUsers.some(pu => pu.id === u.id))
                                                            .map(user => (
                                                                <option key={user.id} value={user.id}>
                                                                    {user.name} (@{user.username}) - {getRoleDisplayName(user.role)}
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="current-permissions">
                                                <h4>Tài khoản hiện có quyền truy cập BestLab link:</h4>
                                                {linkPermissionUsers.length === 0 ? (
                                                    <p className="no-permissions">Chưa có tài khoản nào được cấp quyền truy cập</p>
                                                ) : (
                                                    <div className="permission-users-list">
                                                        {linkPermissionUsers.map(permissionUser => (
                                                            <div key={permissionUser.id} className="permission-user-item">
                                                                <div className="user-info">
                                                                    <span className="user-icon">{getRoleIcon(permissionUser.role)}</span>
                                                                    <div>
                                                                        <div className="user-name">{permissionUser.name}</div>
                                                                        <div className="user-username">@{permissionUser.username}</div>
                                                                        <div className="user-role">{getRoleDisplayName(permissionUser.role)}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="permission-info">
                                                                    <span className="granted-date">
                                                                        Cấp quyền: {new Date(permissionUser.permission_granted_at).toLocaleDateString('vi-VN')}
                                                                    </span>
                                                                </div>
                                                                <button 
                                                                    className="btn-danger btn-sm"
                                                                    onClick={() => handleRemoveUserFromLink(selectedLinkId, permissionUser.id)}
                                                                    disabled={isLoading}
                                                                >
                                                                    Xóa quyền
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BestLabAdminPanel;