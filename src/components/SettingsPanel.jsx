import React, { useState } from 'react';

/**
 * Settings panel for API keys and models configuration
 */
function SettingsPanel({ 
    apiKeys, 
    selectedKeyId, 
    modelQuick, 
    modelSmart,
    onModelQuickChange,
    onModelSmartChange,
    onAddApiKey,
    onDeleteApiKey,
    onSelectApiKey,
    onSaveModels,
    privacyFilters,
    onAddPrivacyFilter,
    onUpdatePrivacyFilter,
    onDeletePrivacyFilter,
    onClose 
}) {
    const [newApiKey, setNewApiKey] = useState('');
    const [newApiKeyLabel, setNewApiKeyLabel] = useState('');
    const [pfFind, setPfFind] = useState('');
    const [pfReplace, setPfReplace] = useState('');
    const [pfFlags, setPfFlags] = useState('gi');

    const handleAddKey = () => {
        const success = onAddApiKey(newApiKey, newApiKeyLabel);
        if (success) {
            setNewApiKey('');
            setNewApiKeyLabel('');
        }
    };

    return (
        <div className="settings-panel">
            <div className="settings-header">
                <h3>⚙️ Cài đặt AI</h3>
                <button className="btn-close" onClick={onClose}>✖️</button>
            </div>

            <div className="settings-section">
                <h4>API Keys</h4>
                <div className="api-keys">
                    <div className="add-key">
                        <input
                            type="text"
                            placeholder="Nhãn (ví dụ: Key Công ty)"
                            value={newApiKeyLabel}
                            onChange={(e) => setNewApiKeyLabel(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Dán API key mới..."
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                        />
                        <button className="btn-success" onClick={handleAddKey}>
                            ➕ Thêm
                        </button>
                    </div>

                    <div className="keys-list">
                        {apiKeys.length === 0 ? (
                            <p className="muted">Chưa có API key nào. Hãy thêm mới.</p>
                        ) : (
                            apiKeys.map(k => (
                                <div 
                                    key={k.id} 
                                    className={`key-item ${selectedKeyId === k.id ? 'selected' : ''}`}
                                >
                                    <div 
                                        className="key-info" 
                                        onClick={() => onSelectApiKey(k.id)}
                                    >
                                        <span className="key-label">{k.label}</span>
                                        <span className="key-value">••••••••</span>
                                    </div>
                                    <button 
                                        className="btn-delete" 
                                        onClick={() => onDeleteApiKey(k.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h4>Models</h4>
                <div className="models-grid">
                    <div className="model-item">
                        <label>Tra cứu nhanh</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: gemini-flash-lite-latest"
                            value={modelQuick}
                            onChange={(e) => onModelQuickChange(e.target.value)}
                        />
                    </div>
                    <div className="model-item">
                        <label>Tìm kiếm thông minh</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: gemini-2.0-flash-exp"
                            value={modelSmart}
                            onChange={(e) => onModelSmartChange(e.target.value)}
                        />
                    </div>
                </div>
                <div className="settings-actions">
                    <button className="btn-primary" onClick={onSaveModels}>
                        💾 Lưu cài đặt
                    </button>
                </div>
            </div>

            <div className="settings-section">
                <h4>Privacy Filters</h4>
                <p className="muted">Thay thế từ khóa nhạy cảm trước khi gửi AI, và khôi phục khi nhận phản hồi.</p>
                <div className="privacy-add">
                    <input
                        type="text"
                        placeholder="Từ cần ẩn (find)"
                        value={pfFind}
                        onChange={(e) => setPfFind(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Thay bằng (replace)"
                        value={pfReplace}
                        onChange={(e) => setPfReplace(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Flags (ví dụ: gi)"
                        value={pfFlags}
                        onChange={(e) => setPfFlags(e.target.value)}
                        style={{ width: 80 }}
                    />
                    <button
                        className="btn-success"
                        onClick={() => {
                            if (onAddPrivacyFilter(pfFind, pfReplace, pfFlags)) {
                                setPfFind('');
                                setPfReplace('');
                                setPfFlags('gi');
                            }
                        }}
                    >
                        ➕ Thêm rule
                    </button>
                </div>

                <div className="privacy-list">
                    {(!privacyFilters || privacyFilters.length === 0) ? (
                        <p className="muted">Chưa có rule nào.</p>
                    ) : (
                        privacyFilters.map(rule => (
                            <div key={rule.id} className="privacy-item">
                                <div className="privacy-fields">
                                    <input
                                        type="text"
                                        value={rule.find}
                                        onChange={(e) => onUpdatePrivacyFilter(rule.id, { find: e.target.value })}
                                        title="find"
                                    />
                                    <span className="arrow">→</span>
                                    <input
                                        type="text"
                                        value={rule.replace}
                                        onChange={(e) => onUpdatePrivacyFilter(rule.id, { replace: e.target.value })}
                                        title="replace"
                                    />
                                    <input
                                        type="text"
                                        value={rule.flags || 'gi'}
                                        onChange={(e) => onUpdatePrivacyFilter(rule.id, { flags: e.target.value })}
                                        title="flags"
                                        style={{ width: 80 }}
                                    />
                                </div>
                                <button className="btn-delete" onClick={() => onDeletePrivacyFilter(rule.id)}>🗑️</button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default SettingsPanel;

