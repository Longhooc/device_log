import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/authContext';
import { USER_ROLES } from '../auth/authContext';
import { USER_DEPARTMENTS } from '../constants/departments';
import { useLinks } from '../hooks/useLinks';
import { 
    getAllUsers, 
    createUser, 
    deleteUser, 
    addUserToLinkPermissions,
    removeUserFromLinkPermissions,
    getLinkPermissionUsers
} from '../api/authApi';
import './AdminPanel.scss';

function AdminPanel() {
    const { user, hasPermission } = useAuth();
    const links = useLinks();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [showAddUser, setShowAddUser] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLinkId, setSelectedLinkId] = useState(null);
    const [linkPermissionUsers, setLinkPermissionUsers] = useState([]);
    const [selectedDepartmentForAdd, setSelectedDepartmentForAdd] = useState('');
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

    // Load users có quyền truy cập link cụ thể
    const loadLinkPermissionUsers = async (linkId) => {
        try {
            const users = await getLinkPermissionUsers(linkId);
            setLinkPermissionUsers(users);
        } catch (error) {
            console.error('Error loading link permission users:', error);
            setLinkPermissionUsers([]);
        }
    };

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

    // Sử dụng danh sách phòng ban có sẵn

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
            
            // 2. Lấy tất cả Google links của phòng ban
            const allLinks = links.links; // links.links là array từ useLinks hook
            const departmentLinks = allLinks.filter(link => link.department === newUser.department);
            console.log(`📋 Found ${departmentLinks.length} Google links for department: ${newUser.department}`);
            
            // 3. Cấp quyền truy cập tất cả Google links của phòng ban cho user mới
            if (departmentLinks.length > 0) {
                const permissionPromises = departmentLinks.map(link => 
                    addUserToLinkPermissions(link.id, createdUser.id).catch(error => {
                        console.warn(`⚠️ Failed to grant access to Google link ${link.id}:`, error);
                        return null; // Continue with other links even if one fails
                    })
                );
                
                await Promise.all(permissionPromises);
                console.log(`✅ Granted access to ${departmentLinks.length} Google links for user ${createdUser.username}`);
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
            alert(`Thêm người dùng thành công! Đã cấp quyền truy cập ${departmentLinks.length} tài liệu Google của phòng ban.`);
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
        
        if (window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA HOÀN TOÀN người dùng "${userToDelete.name}" (${userToDelete.username})?\n\nHành động này sẽ:\n- Xóa user khỏi database\n- Xóa tất cả quyền truy cập links của user\n- Không thể hoàn tác!\n\nBạn có chắc chắn muốn tiếp tục?`)) {
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
            await addUserToLinkPermissions(linkId, userId);
            await loadLinkPermissionUsers(linkId);
            alert('Thêm quyền truy cập thành công!');
        } catch (error) {
            console.error('Error adding user to link permissions:', error);
            alert('Lỗi khi thêm quyền truy cập: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveUserFromLink = async (linkId, userId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa quyền truy cập này?')) {
            try {
                setIsLoading(true);
                await removeUserFromLinkPermissions(linkId, userId);
                await loadLinkPermissionUsers(linkId);
                alert('Xóa quyền truy cập thành công!');
            } catch (error) {
                console.error('Error removing user from link permissions:', error);
                alert('Lỗi khi xóa quyền truy cập: ' + (error.response?.data?.message || error.message));
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleAddAllUsersToLink = async (linkId) => {
        // Get all users that don't have permission yet
        const usersWithoutPermission = users.filter(
            u => !linkPermissionUsers.some(pu => pu.id === u.id)
        );

        if (usersWithoutPermission.length === 0) {
            alert('Tất cả user đã có quyền truy cập link này!');
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn thêm ${usersWithoutPermission.length} user vào quyền truy cập link này?`)) {
            return;
        }

        try {
            setIsLoading(true);
            let successCount = 0;
            let failCount = 0;

            // Add all users one by one
            for (const user of usersWithoutPermission) {
                try {
                    await addUserToLinkPermissions(linkId, user.id);
                    successCount++;
                } catch (error) {
                    console.warn(`Failed to add user ${user.username} to link permissions:`, error);
                    failCount++;
                }
            }

            // Reload permission users list
            await loadLinkPermissionUsers(linkId);

            if (failCount === 0) {
                alert(`Thêm thành công ${successCount} user vào quyền truy cập!`);
            } else {
                alert(`Thêm thành công ${successCount} user, ${failCount} user thất bại.`);
            }
        } catch (error) {
            console.error('Error adding all users to link permissions:', error);
            alert('Lỗi khi thêm user: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUsersByDepartment = async (linkId, department) => {
        if (!department) {
            alert('Vui lòng chọn phòng ban!');
            return;
        }

        // Get all users of the selected department that don't have permission yet
        const departmentUsersWithoutPermission = users.filter(
            u => u.department === department && !linkPermissionUsers.some(pu => pu.id === u.id)
        );

        if (departmentUsersWithoutPermission.length === 0) {
            const departmentName = USER_DEPARTMENTS.find(d => d.value === department)?.label || department;
            alert(`Tất cả user của phòng ban ${departmentName} đã có quyền truy cập link này!`);
            return;
        }

        const departmentName = USER_DEPARTMENTS.find(d => d.value === department)?.label || department;
        if (!window.confirm(`Bạn có chắc chắn muốn thêm ${departmentUsersWithoutPermission.length} user của phòng ban ${departmentName} vào quyền truy cập link này?`)) {
            return;
        }

        try {
            setIsLoading(true);
            let successCount = 0;
            let failCount = 0;

            // Add all users of the department one by one
            for (const user of departmentUsersWithoutPermission) {
                try {
                    await addUserToLinkPermissions(linkId, user.id);
                    successCount++;
                } catch (error) {
                    console.warn(`Failed to add user ${user.username} to link permissions:`, error);
                    failCount++;
                }
            }

            // Reload permission users list
            await loadLinkPermissionUsers(linkId);
            
            // Reset department selection
            setSelectedDepartmentForAdd('');

            if (failCount === 0) {
                alert(`Thêm thành công ${successCount} user của phòng ban ${departmentName} vào quyền truy cập!`);
            } else {
                alert(`Thêm thành công ${successCount} user, ${failCount} user thất bại.`);
            }
        } catch (error) {
            console.error('Error adding users by department to link permissions:', error);
            alert('Lỗi khi thêm user: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleLinkSelect = async (linkId) => {
        setSelectedLinkId(linkId);
        setSelectedDepartmentForAdd('');
        await loadLinkPermissionUsers(linkId);
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
                        <p style={{margin: '0', color: '#d32f2f', fontSize: '14px'}}>
                            ⚠️ <strong>Cảnh báo:</strong> Xóa người dùng sẽ xóa hoàn toàn khỏi database và tất cả dữ liệu liên quan (quyền truy cập links). 
                            Hành động này không thể hoàn tác!
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
                        <h2>Quyền truy cập link</h2>
                        <p>Chọn link và quản lý quyền truy cập ngay bên cạnh</p>
                    </div>

                    <div className="permissions-layout">
                        {/* Left: Link list */}
                        <div className="permissions-left">
                            <div className="link-selection">
                                <div className="links-grid">
                                    {links.links.map(link => (
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
                                <h3>{selectedLinkId ? 'Quản lý quyền truy cập' : 'Chọn một link để quản lý quyền'}</h3>

                                {selectedLinkId && (
                                    <>
                                        <div className="add-user-section">
                                            <h4>Thêm tài khoản có quyền truy cập:</h4>
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
                                            <div style={{ marginTop: '10px' }}>
                                                <button
                                                    className="btn-primary"
                                                    onClick={() => handleAddAllUsersToLink(selectedLinkId)}
                                                    disabled={isLoading || users.filter(u => !linkPermissionUsers.some(pu => pu.id === u.id)).length === 0}
                                                    style={{ width: '100%', marginBottom: '10px' }}
                                                >
                                                    {isLoading ? 'Đang thêm...' : '➕ Thêm tất cả user có quyền xem'}
                                                </button>
                                            </div>
                                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
                                                <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Thêm user theo phòng ban:</h4>
                                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                                    <select
                                                        value={selectedDepartmentForAdd}
                                                        onChange={(e) => setSelectedDepartmentForAdd(e.target.value)}
                                                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                        disabled={isLoading}
                                                    >
                                                        <option value="">-- Chọn phòng ban --</option>
                                                        {USER_DEPARTMENTS.map(dept => {
                                                            const departmentUsersCount = users.filter(
                                                                u => u.department === dept.value && !linkPermissionUsers.some(pu => pu.id === u.id)
                                                            ).length;
                                                            return (
                                                                <option key={dept.value} value={dept.value}>
                                                                    {dept.label} ({departmentUsersCount} user chưa có quyền)
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => handleAddUsersByDepartment(selectedLinkId, selectedDepartmentForAdd)}
                                                    disabled={isLoading || !selectedDepartmentForAdd || users.filter(u => u.department === selectedDepartmentForAdd && !linkPermissionUsers.some(pu => pu.id === u.id)).length === 0}
                                                    style={{ width: '100%' }}
                                                >
                                                    {isLoading ? 'Đang thêm...' : '➕ Thêm tất cả user của phòng ban'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="current-permissions">
                                            <h4>Tài khoản hiện có quyền truy cập:</h4>
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
    );
}

export default AdminPanel;