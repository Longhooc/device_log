import React, { useState } from 'react';
import './SmartphPage.scss';

// Hooks
import { useSmartPhLinks } from '../hooks/useSmartPhLinks';
import { useAuth } from '../auth/authContext';

// Components
import LinkCard from '../components/LinkCard';
import PreviewModal from '../components/PreviewModal';
import UserProfile from '../components/UserProfile';
import AddLinkForm from '../components/AddLinkForm';
import SmartPhAdminPanel from '../components/SmartPhAdminPanel';

// Utils
import { convertToEmbedUrl } from '../utils/textUtils';

function SmartphMobilePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [newLink, setNewLink] = useState({
        title: '',
        url: '',
        department: '',
        description: '',
        type: 'app'
    });

    const { hasPermission } = useAuth();
    const smartphLinks = useSmartPhLinks();

    const departments = [
        { value: 'all', label: 'Tất cả' },
        { value: 'SALES', label: 'Sales' },
        { value: 'MARKETING', label: 'Marketing' },
        { value: 'PROJECT', label: 'Dự Án' },
        { value: 'CUSTOMER', label: 'CSKH' },
        { value: 'PURCHASE', label: 'Mua Hàng' },
        { value: 'ACCOUNTING', label: 'Kế Toán' },
        { value: 'HR', label: 'HCNS' },
        { value: 'RD', label: 'R&D' },
        { value: 'SMARTPH_PROD', label: 'SX SmartpH' },
        { value: 'BESTLAB_PROD', label: 'SX BestLab' },
        { value: 'SMARTPH_CONST', label: 'CT SmartpH' },
        { value: 'BESTLAB_CONST', label: 'CT BestLab' },
        { value: 'QCP', label: 'QCP' },
        { value: 'MECHANICAL', label: 'Cơ Khí' },
        { value: 'ISO', label: 'ISO' },
    ];

    React.useEffect(() => {
        smartphLinks.updateFilters({
            search: searchTerm,
            department: selectedDepartment
        });
    }, [searchTerm, selectedDepartment, smartphLinks.updateFilters]);

    const filteredLinks = smartphLinks.links;

    const linkTypes = [
        { value: 'drive', label: 'Drive', icon: '🔬' },
        { value: 'doc', label: 'Doc', icon: '🔧' },
        { value: 'sheet', label: 'Sheet', icon: '📄' },
        { value: 'bom', label: 'BOM', icon: '📊' },
        { value: 'other', label: 'Khác', icon: '🔗' }
    ];

    const handlePreview = (url) => {
        const embedUrl = convertToEmbedUrl(url);
        setPreviewUrl(embedUrl);
        setShowPreview(true);
    };

    const closePreview = () => {
        setShowPreview(false);
        setPreviewUrl(null);
    };

    const handleAddLink = async () => {
        try {
            await smartphLinks.createLink(newLink);
            setNewLink({ title: '', url: '', department: '', description: '', type: 'app' });
            setShowAddForm(false);
            alert('Thêm SmartPH link thành công!');
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="smartph-page mobile">
            {/* Admin Panel */}
            {showAdminPanel && (
                <SmartPhAdminPanel onClose={() => setShowAdminPanel(false)} />
            )}
            <div className="header smartph-header">
                <div className="header-content">
                    <div className="header-text">
                        <div className="header-icon">📱</div>
                        <div className="header-title">
                            <h1>SMARTPH</h1>
                            <p>Link Ứng Dụng & Công Cụ</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        {hasPermission('canAccessAdminPanel') && (
                            <button
                                className="btn-admin"
                                onClick={() => setShowAdminPanel(!showAdminPanel)}
                            >
                                <span className="btn-icon">👑</span>
                                <span className="btn-text">Admin</span>
                            </button>
                        )}
                        <UserProfile />
                    </div>
                </div>
            </div>

            <div className="controls">
                <div className="search-filter">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="🔍 Tìm link..."
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

            <div className="links-grid">
                {smartphLinks.loading ? (
                    <div className="loading">
                        <div className="loading-spinner">⏳</div>
                        <p>Đang tải...</p>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <h3>Không có kết quả</h3>
                    </div>
                ) : (
                    filteredLinks.map(link => (
                        <LinkCard
                            key={link.id}
                            link={link}
                            departments={departments}
                            linkTypes={linkTypes}
                            isFavorite={link.is_favorite}
                            onToggleFavorite={() => {}}
                            onPreview={handlePreview}
                            onLinkClick={() => smartphLinks.incrementAccess(link.id)}
                            onDelete={undefined}
                        />
                    ))
                )}
            </div>

            {showPreview && (
                <PreviewModal
                    previewUrl={previewUrl}
                    onClose={closePreview}
                />
            )}
        </div>
    );
}

export default SmartphMobilePage;


