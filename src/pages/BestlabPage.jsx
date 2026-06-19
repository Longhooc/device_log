import React, { useState } from 'react';
import './BestlabPage.scss';

// Hooks
import { useSettings } from '../hooks/useSettings';
import { useBestLabLinks } from '../hooks/useBestLabLinks';
import { useAuth } from '../auth/authContext';

// Components
import SettingsPanel from '../components/SettingsPanel';
import AddLinkForm from '../components/AddLinkForm';
import LinkCard from '../components/LinkCard';
import PreviewModal from '../components/PreviewModal';
import UserProfile from '../components/UserProfile';
import BestLabAdminPanel from '../components/BestLabAdminPanel';

// Utils
import { convertToEmbedUrl } from '../utils/textUtils';

function BestlabPage() {
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
    const { user, hasPermission, canAccessLink, canPreviewLink, departments } = useAuth();
    const settings = useSettings();
    const bestlabLinks = useBestLabLinks();

    const linkTypes = [
        { value: 'drive', label: 'Drive', icon: '🔬' },
        { value: 'doc', label: 'Doc', icon: '🔧' },
        { value: 'sheet', label: 'Sheet', icon: '📄' },
        { value: 'bom', label: 'BOM', icon: '📊' },
        { value: 'other', label: 'Khác', icon: '🔗' }
    ];

    // Update filters when search or department changes
    React.useEffect(() => {
        bestlabLinks.updateFilters({
            search: searchTerm,
            department: selectedDepartment
        });
    }, [searchTerm, selectedDepartment, bestlabLinks.updateFilters]);

    // Get filtered links from hook
    const filteredLinks = bestlabLinks.links;

    // Handlers
    const handleAddLink = async () => {
        try {
            await bestlabLinks.createLink(newLink);
            setNewLink({
                title: '',
                url: '',
                department: '',
                description: '',
                type: 'research'
            });
            setShowAddForm(false);
            alert('Thêm BestLab link thành công!');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteLink = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa BestLab link này?')) {
            try {
                const authCode = prompt('Nhập mã xác thực để xóa:');
                if (!authCode) return;
                
                await bestlabLinks.deleteLink(id, authCode);
                alert('Xóa BestLab link thành công!');
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleToggleFavorite = async (linkId, isFavorite) => {
        try {
            await bestlabLinks.toggleFavorite(linkId, isFavorite);
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
                <BestLabAdminPanel onClose={() => setShowAdminPanel(false)} />
            )}


            {/* Header */}
            <div className="header bestlab-header">
                <div className="header-content">
                    <div className="header-text">
                        <div className="header-icon">🧪</div>
                        <div className="header-title">
                            <h1>BESTLAB</h1>
                            <p>Quản lý Link Nghiên Cứu & Tài Liệu</p>
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
                    <span className="stat-number">{bestlabLinks.links.length}</span>
                    <span className="stat-label">Tổng số BestLab links</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{bestlabLinks.links.filter(link => !link._restricted).length}</span>
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
                {bestlabLinks.loading ? (
                    <div className="loading">
                        <div className="loading-spinner">⏳</div>
                        <p>Đang tải BestLab links...</p>
                    </div>
                ) : bestlabLinks.links.length === 0 ? (
                    <div className="no-results">
                        <div className="no-links-icon">🧪</div>
                        <h3>Chưa có BestLab link nào</h3>
                        <p>Hãy thêm BestLab link đầu tiên để bắt đầu sử dụng hệ thống</p>
                        <button 
                            className="btn-primary"
                            onClick={() => setShowAddForm(true)}
                        >
                            ➕ Thêm BestLab Link Đầu Tiên
                        </button>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <h3>Không tìm thấy BestLab link nào</h3>
                        <p>Không có BestLab link nào phù hợp với tiêu chí tìm kiếm hiện tại</p>
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
                            onLinkClick={() => bestlabLinks.incrementAccess(link.id)}
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
