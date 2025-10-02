import React from 'react';

/**
 * Deep search form for AI-powered document analysis
 */
function DeepSearchForm({ 
    deepSearchPrompt, 
    deepSearchDepartment, 
    departments, 
    isLoading, 
    onPromptChange, 
    onDepartmentChange, 
    onSubmit, 
    onClose 
}) {
    return (
        <div className="deep-search-form">
            <h3>🎯 Tìm kiếm chuyên sâu</h3>
            <p className="form-description">
                AI sẽ cào nội dung từ tất cả tài liệu trong phòng ban (song song), 
                phân tích và tìm tài liệu phù hợp với yêu cầu của bạn
            </p>
            <div className="deep-search-inputs">
                <div className="prompt-input-wrapper">
                    <label>📝 Mô tả yêu cầu tìm kiếm:</label>
                    <textarea
                        placeholder="Ví dụ: Tìm các biểu mẫu báo cáo công việc hàng tháng của phòng kỹ thuật..."
                        value={deepSearchPrompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        rows={3}
                        className="prompt-textarea"
                    />
                </div>

                <div className="filter-department">
                    <label>🏢 Tìm kiếm trong phạm vi:</label>
                    <select
                        value={deepSearchDepartment}
                        onChange={(e) => onDepartmentChange(e.target.value)}
                        className="department-select"
                    >
                        <option value="all">Tất cả phòng ban</option>
                        {departments.slice(1).map(dept => (
                            <option key={dept.value} value={dept.value}>
                                {dept.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="deep-search-actions">
                    <button 
                        className="btn-search" 
                        onClick={onSubmit}
                        disabled={isLoading || !deepSearchPrompt.trim()}
                    >
                        {isLoading ? '⏳ Đang phân tích...' : '🔍 Tìm kiếm với AI'}
                    </button>
                    <button 
                        className="btn-cancel"
                        onClick={onClose}
                    >
                        ✖️ Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DeepSearchForm;

