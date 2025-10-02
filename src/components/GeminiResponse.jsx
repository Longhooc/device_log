import React from 'react';
import { renderLineWithLinks } from '../utils/textUtils';

/**
 * Component to display Gemini AI response with typing effect
 */
function GeminiResponse({ displayedLines, onPreview, onClose, linksWithPermissions, canAccessLink, canPreviewLink }) {
    if (!displayedLines || displayedLines.length === 0) return null;

    return (
        <div className="gemini-response">
            <h3>🔍 Kết quả tra cứu</h3>
            <div className="response-content">
                {displayedLines.map((line, idx) => (
                    <p key={idx}>{renderLineWithLinks(line, onPreview, linksWithPermissions, canAccessLink, canPreviewLink)}</p>
                ))}
            </div>
            <button className="btn-close" onClick={onClose}>✖️</button>
        </div>
    );
}

export default GeminiResponse;

