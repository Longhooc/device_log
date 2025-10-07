import React, { useState } from 'react';
import './BestlabPage.scss';

// Hooks
import { useSettings } from '../hooks/useSettings';
import { useLinks } from '../hooks/useLinks';
import { useAuth } from '../auth/authContext';

// Components
import SettingsPanel from '../components/SettingsPanel';
import AddLinkForm from '../components/AddLinkForm';
import LinkCard from '../components/LinkCard';
import PreviewModal from '../components/PreviewModal';
import UserProfile from '../components/UserProfile';
import AdminPanel from '../components/AdminPanel';

// Utils
import { convertToEmbedUrl } from '../utils/textUtils';

function BestlabPage() {
    // State management
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [newLink, setNewLink] = useState({
        title: '',
        url: '',
        department: '',
        description: '',
        type: 'form'
    });

    // Custom hooks
    const { user, hasPermission, canAccessLink, canPreviewLink } = useAuth();
    const settings = useSettings();
    const links = useLinks();

    // Constants
    const departments = [
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
        { value: 'ISO', label: 'ISO' },
    ];

    const linkTypes = [
        { value: 'form', label: 'Google Form', icon: '📝' },
        { value: 'sheet', label: 'Google Sheet', icon: '📊' },
        { value: 'doc', label: 'Google Doc', icon: '📄' }
    ];

    // Không còn role-based permissions; backend đã mask URL theo account-based
    const linksWithPermissions = links.links;

    // Filter links (hiển thị tất cả, không ẩn theo quyền)
    const filteredLinks = linksWithPermissions.filter(link => {
        // Kiểm tra tìm kiếm và phòng ban
        const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (link.description && link.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesDepartment = selectedDepartment === 'all' || link.department === selectedDepartment;
        
        return matchesSearch && matchesDepartment;
    });

    // Handlers
    const handleAddLink = async () => {
        try {
            await links.addLink(newLink);
            setNewLink({
                title: '',
                url: '',
                department: '',
                description: '',
                type: 'form'
            });
            setShowAddForm(false);
            alert('Thêm link thành công!');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteLink = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa link này?')) {
            try {
                const authCode = prompt('Nhập mã xác thực để xóa:');
                if (!authCode) return;
                
                await links.removeLink(id, authCode);
                alert('Xóa link thành công!');
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleToggleFavorite = async (linkId) => {
        try {
            await links.toggleFavorite(linkId);
        } catch (error) {
            alert(error.message);
        }
    };

    const handlePreview = (url) => {
        const embedUrl = convertToEmbedUrl(url);
        setPreviewUrl(embedUrl);
        setShowPreview(true);
    };

    const closePreview = () => {
        setShowPreview(false);
        setPreviewUrl(null);
    };

    return (
        <div className="bestlab-page">
            {/* Admin Panel */}
            {showAdminPanel && (
                <AdminPanel />
            )}

            {/* Settings Panel */}
            {showSettings && (
                <SettingsPanel
                    apiKeys={settings.apiKeys}
                    selectedKeyId={settings.selectedKeyId}
                    modelQuick={settings.modelQuick}
                    modelSmart={settings.modelSmart}
                    onModelQuickChange={settings.setModelQuick}
                    onModelSmartChange={settings.setModelSmart}
                    onAddApiKey={settings.addApiKey}
                    onDeleteApiKey={settings.deleteApiKey}
                    onSelectApiKey={settings.selectApiKey}
                    onSaveModels={settings.saveModels}
                    privacyFilters={settings.privacyFilters}
                    onAddPrivacyFilter={settings.addPrivacyFilter}
                    onUpdatePrivacyFilter={settings.updatePrivacyFilter}
                    onDeletePrivacyFilter={settings.deletePrivacyFilter}
                    onClose={() => setShowSettings(false)}
                />
            )}

            {/* Header */}
            <div className="header">
                <div className="header-content">
                    <div className="header-text">
                        <h1>🧪 BESTLAB - Quản lý Link</h1>
                        <p>Tập trung hóa các link Google Form, Sheet, Doc của BESTLAB (không có AI tra cứu)</p>
                        {process.env.NODE_ENV === 'development' && (
                            <small style={{color: '#999', fontSize: '12px'}}>
                                Debug: {links.links.length} links từ API
                            </small>
                        )}
                    </div>
                    <div className="header-actions">
                        {hasPermission('canAccessAdminPanel') && (
                            <button
                                className="btn-admin"
                                onClick={() => setShowAdminPanel(!showAdminPanel)}
                            >
                                👑 Admin Panel
                            </button>
                        )}
                        <UserProfile />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="controls">
                <div className="search-filter">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="🔍 Tìm kiếm link..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="department-filter"
                    >
                        {departments.map(dept => (
                            <option key={dept.value} value={dept.value}>
                                {dept.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="action-buttons">
                    <button
                        className="btn-primary"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        ➕ Thêm Link
                    </button>

                    <button
                        className="btn-settings"
                        onClick={() => setShowSettings(true)}
                    >
                        ⚙️ Cài đặt
                    </button>
                </div>
            </div>

            {/* Add Link Form */}
            {showAddForm && (
                <AddLinkForm
                    newLink={newLink}
                    departments={departments}
                    linkTypes={linkTypes}
                    onChange={setNewLink}
                    onSubmit={handleAddLink}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Stats */}
            <div className="stats">
                <div className="stat-item">
                    <span className="stat-number">{links.links.length}</span>
                    <span className="stat-label">Tổng số links</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{linksWithPermissions.filter(link => link.url !== null).length}</span>
                    <span className="stat-label">Có thể truy cập</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{filteredLinks.length}</span>
                    <span className="stat-label">Đang hiển thị</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{departments.length - 1}</span>
                    <span className="stat-label">Phòng ban</span>
                </div>
            </div>

            {/* Links Grid */}
            <div className="links-grid">
                {links.links.length === 0 ? (
                    <div className="no-results">
                        <div className="no-links-icon">📝</div>
                        <h3>Chưa có link nào</h3>
                        <p>Hãy thêm link đầu tiên để bắt đầu sử dụng hệ thống</p>
                        <button 
                            className="btn-primary"
                            onClick={() => setShowAddForm(true)}
                        >
                            ➕ Thêm Link Đầu Tiên
                        </button>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <h3>Không tìm thấy link nào</h3>
                        <p>Không có link nào phù hợp với tiêu chí tìm kiếm hiện tại</p>
                        <button 
                            className="btn-secondary"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedDepartment('all');
                            }}
                        >
                            🔄 Xóa bộ lọc
                        </button>
                    </div>
                ) : (
                    filteredLinks.map(link => (
                        <LinkCard
                            key={link.id}
                            link={link}
                            departments={departments}
                            linkTypes={linkTypes}
                            isFavorite={links.favoriteLinks.includes(link.id)}
                            onToggleFavorite={handleToggleFavorite}
                            onPreview={handlePreview}
                            onLinkClick={links.trackLinkClick}
                            onDelete={handleDeleteLink}
                        />
                    ))
                )}
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <PreviewModal
                    previewUrl={previewUrl}
                    onClose={closePreview}
                />
            )}
        </div>
    );
}

export default BestlabPage;
