import React, { useState, useEffect } from 'react';

/**
 * Modal to preview documents with loading effect
 */
function PreviewModal({ previewUrl, onClose }) {
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        if (previewUrl) {
            setIsLoading(true);
            setLoadError(false);
        }
    }, [previewUrl]);

    if (!previewUrl) return null;

    const handleIframeLoad = () => {
        setIsLoading(false);
        setLoadError(false);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setLoadError(true);
    };

    return (
        <div className="preview-overlay" onClick={onClose}>
            <div className="preview-container" onClick={(e) => e.stopPropagation()}>
                <div className="preview-header">
                    <h3>👁️ Xem trước tài liệu</h3>
                    <button className="btn-close-preview" onClick={onClose}>
                        ✖️ Đóng
                    </button>
                </div>
                <div className="preview-content">
                    {isLoading && (
                        <div className="preview-loading">
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                            </div>
                            <p>📄 Đang tải tài liệu...</p>
                            <div className="loading-dots">
                                <span>.</span>
                                <span>.</span>
                                <span>.</span>
                            </div>
                        </div>
                    )}
                    
                    {loadError ? (
                        <div className="preview-error">
                            <p>❌ Không thể tải tài liệu</p>
                            <p>Vui lòng thử lại hoặc mở link trực tiếp</p>
                        </div>
                    ) : (
                        <iframe
                            src={previewUrl}
                            title="Document Preview"
                            className="preview-iframe"
                            frameBorder="0"
                            allowFullScreen
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                            style={{ display: isLoading ? 'none' : 'block' }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default PreviewModal;

