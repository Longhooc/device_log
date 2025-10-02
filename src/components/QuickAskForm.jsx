import React from 'react';

/**
 * Quick ask form for fast AI queries
 */
function QuickAskForm({ 
    quickQuestion, 
    isLoading, 
    onChange, 
    onSubmit, 
    onClose 
}) {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading && quickQuestion.trim()) {
            onSubmit();
        }
    };

    return (
        <div className="quick-ask-form">
            <h3>❓ Tra cứu nhanh</h3>
            <div className="quick-ask-input">
                <input
                    type="text"
                    placeholder="Ví dụ: Tìm form báo cáo của phòng HR, link nào dùng để xin phép?"
                    value={quickQuestion}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <button 
                    className="btn-ask" 
                    onClick={onSubmit}
                    disabled={isLoading || !quickQuestion.trim()}
                >
                    {isLoading ? '⏳' : '🔍 Tìm'}
                </button>
                <button 
                    className="btn-close-ask"
                    onClick={onClose}
                >
                    ✖️
                </button>
            </div>
        </div>
    );
}

export default QuickAskForm;

