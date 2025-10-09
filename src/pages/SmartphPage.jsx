import React, { useState } from 'react';
import './SmartphPage.scss';

// Hooks
import { useSettings } from '../hooks/useSettings';
import { useSmartPhLinks } from '../hooks/useSmartPhLinks';
import { useAuth } from '../auth/authContext';

// Components
import SettingsPanel from '../components/SettingsPanel';
import AddLinkForm from '../components/AddLinkForm';
import LinkCard from '../components/LinkCard';
import PreviewModal from '../components/PreviewModal';
import UserProfile from '../components/UserProfile';
import SmartPhAdminPanel from '../components/SmartPhAdminPanel';

// Utils
import { convertToEmbedUrl } from '../utils/textUtils';

function SmartphPage() {
    // State management
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
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
    const smartphLinks = useSmartPhLinks();

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
        { value: 'drive', label: 'Drive', icon: '🔬' },
        { value: 'doc', label: 'Doc', icon: '🔧' },
        { value: 'sheet', label: 'Sheet', icon: '📄' },
        { value: 'bom', label: 'BOM', icon: '📊' },
        { value: 'other', label: 'Khác', icon: '🔗' }
    ];

    // Update filters when search or department changes
    React.useEffect(() => {
        smartphLinks.updateFilters({
            search: searchTerm,
            department: selectedDepartment
        });
    }, [searchTerm, selectedDepartment, smartphLinks.updateFilters]);

    // Get filtered links from hook
    const filteredLinks = smartphLinks.links;

    // Handlers
    const handleAddLink = async () => {
        try {
            await smartphLinks.createLink(newLink);
            setNewLink({
                title: '',
                url: '',
                department: '',
                description: '',
                type: 'app'
            });
            setShowAddForm(false);
            alert('Thêm SmartPH link thành công!');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteLink = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa SmartPH link này?')) {
            try {
                const authCode = prompt('Nhập mã xác thực để xóa:');
                if (!authCode) return;
                
                await smartphLinks.deleteLink(id, authCode);
                alert('Xóa SmartPH link thành công!');
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleToggleFavorite = async (linkId, isFavorite) => {
        try {
            await smartphLinks.toggleFavorite(linkId, isFavorite);
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
        <div className="smartph-page">
            {/* Admin Panel */}
            {showAdminPanel && (
                <SmartPhAdminPanel onClose={() => setShowAdminPanel(false)} />
            )}


            {/* Header */}
            <div className="header smartph-header">
                <div className="header-content">
                    <div className="header-text">
                        <div className="header-icon">📱</div>
                        <div className="header-title">
                            <h1>SMARTPH</h1>
                            <p>Quản lý Link Ứng Dụng & Công Cụ</p>
                        </div>

                    </div>
                    <div className="header-actions">
                        {hasPermission('canAccessAdminPanel') && (
                            <button
                                className="btn-admin"
                                onClick={() => setShowAdminPanel(!showAdminPanel)}
                            >
                                <span className="btn-icon">👑</span>
                                <span className="btn-text">Admin Panel</span>
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
                    <span className="stat-number">{smartphLinks.links.length}</span>
                    <span className="stat-label">Tổng số SmartPH links</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{smartphLinks.links.filter(link => !link._restricted).length}</span>
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
                {smartphLinks.loading ? (
                    <div className="loading">
                        <div className="loading-spinner">⏳</div>
                        <p>Đang tải SmartPH links...</p>
                    </div>
                ) : smartphLinks.links.length === 0 ? (
                    <div className="no-results">
                        <div className="no-links-icon">📱</div>
                        <h3>Chưa có SmartPH link nào</h3>
                        <p>Hãy thêm SmartPH link đầu tiên để bắt đầu sử dụng hệ thống</p>
                        <button 
                            className="btn-primary"
                            onClick={() => setShowAddForm(true)}
                        >
                            ➕ Thêm SmartPH Link Đầu Tiên
                        </button>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <h3>Không tìm thấy SmartPH link nào</h3>
                        <p>Không có SmartPH link nào phù hợp với tiêu chí tìm kiếm hiện tại</p>
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
                            isFavorite={link.is_favorite}
                            onToggleFavorite={handleToggleFavorite}
                            onPreview={handlePreview}
                            onLinkClick={() => smartphLinks.incrementAccess(link.id)}
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

export default SmartphPage;
