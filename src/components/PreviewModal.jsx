import React from 'react';

/**
 * Modal to preview documents
 */
function PreviewModal({ previewUrl, onClose }) {
    if (!previewUrl) return null;

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
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            title="Document Preview"
                            className="preview-iframe"
                            frameBorder="0"
                            allowFullScreen
                        />
                    ) : (
                        <div className="preview-error">
                            <p>❌ Không thể xem trước tài liệu này</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PreviewModal;

