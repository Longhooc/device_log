import React, { useState } from 'react';
import './LinkManager.scss';

// Hooks
import { useLinks } from '../hooks/useLinks';
import { useAuth } from '../auth/authContext';
import { useSettings } from '../hooks/useSettings';
import { useGeminiAI } from '../hooks/useGeminiAI';

// Components
import LinkCard from '../components/LinkCard';
import PreviewModal from '../components/PreviewModal';
import AddLinkForm from '../components/AddLinkForm';
import QuickAskForm from '../components/QuickAskForm';
import DeepSearchForm from '../components/DeepSearchForm';
import UserProfile from '../components/UserProfile';
import AdminPanel from '../components/AdminPanel';
import GeminiResponse from '../components/GeminiResponse';

// Utils
import { convertToEmbedUrl } from '../utils/textUtils';

function LinkManagerMobile() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [newLink, setNewLink] = useState({
        title: '',
        url: '',
        department: '',
        description: '',
        type: 'form'
    });

    const { user, hasPermission, canAccessLink, canPreviewLink, departments } = useAuth();
    const links = useLinks();
    const settings = useSettings();
    const gemini = useGeminiAI(canAccessLink, user);

    const linkTypes = [
        { value: 'form', label: 'Google Form', icon: '📝' },
        { value: 'sheet', label: 'Google Sheet', icon: '📊' },
        { value: 'doc', label: 'Google Doc', icon: '📄' }
    ];

    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showQuickAsk, setShowQuickAsk] = useState(false);
    const [showDeepSearch, setShowDeepSearch] = useState(false);
    const [quickQuestion, setQuickQuestion] = useState('');
    const [deepSearchPrompt, setDeepSearchPrompt] = useState('');
    const [deepSearchDepartment, setDeepSearchDepartment] = useState('all');

    // Filter
    const filteredLinks = links.links.filter(link => {
        const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (link.description && link.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesDepartment = selectedDepartment === 'all' || link.department === selectedDepartment;
        return matchesSearch && matchesDepartment;
    });

    const handleAddLink = async () => {
        try {
            await links.addLink(newLink);
            setNewLink({ title: '', url: '', department: '', description: '', type: 'form' });
            setShowAddForm(false);
            alert('Thêm link thành công!');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleQuickAsk = async () => {
        await gemini.askQuickQuestion(links.links, quickQuestion, settings.privacyFilters);
        setQuickQuestion('');
        setShowQuickAsk(false);
    };

    const handleDeepSearch = async () => {
        const success = await gemini.handleDeepSearch(
            links.links,
            departments,
            deepSearchPrompt,
            deepSearchDepartment,
            settings.privacyFilters
        );
        if (success) {
            setShowDeepSearch(false);
            setDeepSearchPrompt('');
        }
    };

    const handleDeleteLink = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa link này?')) return;
        try {
            const authCode = prompt('Nhập mã xác thực để xóa:');
            if (!authCode) return;
            await links.removeLink(id, authCode);
            alert('Xóa link thành công!');
        } catch (error) {
            alert(error.message);
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
        <div className="link-manager">
            {/* Admin Panel */}
            {showAdminPanel && (
                <AdminPanel />
            )}
            {/* Settings Panel */}
            {showSettings && (
                <div className="settings-panel">
                    <div className="settings-header">
                        <h3>Cài đặt</h3>
                        <button className="btn-close" onClick={() => setShowSettings(false)}>Đóng</button>
                    </div>
                    <div className="settings-section">
                        <h4>Model cấu hình</h4>
                        <div className="models-grid">
                            <div className="model-item">
                                <label>Model Quick</label>
                                <input value={settings.modelQuick} onChange={(e) => settings.setModelQuick(e.target.value)} />
                            </div>
                            <div className="model-item">
                                <label>Model Smart</label>
                                <input value={settings.modelSmart} onChange={(e) => settings.setModelSmart(e.target.value)} />
                            </div>
                        </div>
                        <div className="settings-actions">
                            <button className="btn-primary" onClick={settings.saveModels}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="header">
                <div className="header-content">
                    <div className="header-text">
                        <h1>🔗 Quản lý Link </h1>
                        <p>Quản lý nhanh link Google Doc/Sheet/Form trên điện thoại</p>
                    </div>
                    <div className="header-actions">
                        {hasPermission('canAccessAdminPanel') && (
                            <button className="btn-admin" onClick={() => setShowAdminPanel(!showAdminPanel)}>
                                👑 Admin Panel
                            </button>
                        )}
                    </div>
                    <div className="header-user">
                        <UserProfile />
                    </div>
                </div>
            </div>

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
                    <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                        ➕ Thêm Link
                    </button>
                    <button className="btn-secondary" onClick={() => setShowQuickAsk(!showQuickAsk)}>
                        ❓ Tra cứu nhanh AI
                    </button>
                    <button className="btn-gemini" onClick={() => setShowDeepSearch(!showDeepSearch)}>
                        🎯 Tìm kiếm chuyên sâu
                    </button>
                    <button className="btn-settings" onClick={() => setShowSettings(true)}>
                        ⚙️ Cài đặt
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

            {showQuickAsk && (
                <div className="quick-ask-form">
                    <h3>Tra cứu nhanh</h3>
                    <div className="quick-ask-input">
                        <input
                            placeholder="Nhập câu hỏi..."
                            value={quickQuestion}
                            onChange={(e) => setQuickQuestion(e.target.value)}
                        />
                        <button className="btn-ask" disabled={gemini.isLoadingGemini} onClick={handleQuickAsk}>Hỏi</button>
                        <button className="btn-close-ask" onClick={() => setShowQuickAsk(false)}>✖</button>
                    </div>
                </div>
            )}

            {showDeepSearch && (
                <div className="deep-search-form">
                    <h3>Tìm kiếm chuyên sâu</h3>
                    <div className="deep-search-inputs">
                        <div className="prompt-input-wrapper">
                            <label>Nội dung tìm kiếm</label>
                            <textarea className="prompt-textarea" value={deepSearchPrompt} onChange={(e) => setDeepSearchPrompt(e.target.value)} />
                        </div>
                        <div className="filter-department">
                            <label>Phòng ban</label>
                            <select value={deepSearchDepartment} onChange={(e) => setDeepSearchDepartment(e.target.value)}>
                                {departments.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="deep-search-actions">
                        <button className="btn-search" disabled={gemini.isLoadingGemini} onClick={handleDeepSearch}>Tìm</button>
                        <button className="btn-cancel" onClick={() => { setShowDeepSearch(false); setDeepSearchPrompt(''); setDeepSearchDepartment('all'); }}>Hủy</button>
                    </div>
                </div>
            )}

            {/* Gemini Response */}
            {!gemini.isLoadingGemini && gemini.displayedLines.length > 0 && (
                <GeminiResponse
                    displayedLines={gemini.displayedLines}
                    onPreview={handlePreview}
                    onClose={gemini.clearResponse}
                    linksWithPermissions={links.links.filter(link => link.url !== null)}
                    canAccessLink={canAccessLink}
                    canPreviewLink={canPreviewLink}
                />
            )}

            {/* Loading Indicator */}
            {gemini.isLoadingGemini && (
                <div className="thinking">
                    <div className="spinner"></div>
                    <p>{gemini.analyzingProgress || '🤔 AI Thinking...'}</p>
                </div>
            )}

            <div className="links-grid">
                {links.links.length === 0 ? (
                    <div className="no-results">
                        <div className="no-links-icon">📝</div>
                        <h3>Chưa có link nào</h3>
                        <p>Hãy thêm link đầu tiên để bắt đầu sử dụng hệ thống</p>
                        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                            ➕ Thêm Link Đầu Tiên
                        </button>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <h3>Không tìm thấy link nào</h3>
                        <p>Không có link nào phù hợp với tiêu chí tìm kiếm hiện tại</p>
                        <button className="btn-secondary" onClick={() => { setSearchTerm(''); setSelectedDepartment('all'); }}>
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

            {showPreview && (
                <PreviewModal previewUrl={previewUrl} onClose={closePreview} />
            )}
        </div>
    );
}

export default LinkManagerMobile;


