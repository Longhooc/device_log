import React, { useState } from 'react';
import './BestlabPage.scss';

// Hooks
import { useBestLabLinks } from '../hooks/useBestLabLinks';
import { useAuth } from '../auth/authContext';

// Components
import LinkCard from '../components/LinkCard';
import PreviewModal from '../components/PreviewModal';
import UserProfile from '../components/UserProfile';
import AddLinkForm from '../components/AddLinkForm';
import BestLabAdminPanel from '../components/BestLabAdminPanel';

// Utils
import { convertToEmbedUrl } from '../utils/textUtils';

function BestlabMobilePage() {
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
        type: 'form'
    });

    const { hasPermission, departments } = useAuth();
    const bestlabLinks = useBestLabLinks();

    React.useEffect(() => {
        bestlabLinks.updateFilters({
            search: searchTerm,
            department: selectedDepartment
        });
    }, [searchTerm, selectedDepartment, bestlabLinks.updateFilters]);

    const filteredLinks = bestlabLinks.links;

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
            await bestlabLinks.createLink(newLink);
            setNewLink({ title: '', url: '', department: '', description: '', type: 'form' });
            setShowAddForm(false);
            alert('Thêm BestLab link thành công!');
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="bestlab-page mobile">
            {/* Admin Panel */}
            {showAdminPanel && (
                <BestLabAdminPanel onClose={() => setShowAdminPanel(false)} />
            )}
            <div className="header bestlab-header">
                <div className="header-content">
                    <div className="header-text">
                        <div className="header-icon">🧪</div>
                        <div className="header-title">
                            <h1>BESTLAB</h1>
                            <p>Link Nghiên Cứu & Tài Liệu</p>
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
                {bestlabLinks.loading ? (
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
                            onLinkClick={() => bestlabLinks.incrementAccess(link.id)}
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

export default BestlabMobilePage;


