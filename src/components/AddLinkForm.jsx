import React from 'react';

/**
 * Form to add new link
 */
function AddLinkForm({ 
    newLink, 
    departments, 
    linkTypes, 
    onChange, 
    onSubmit, 
    onCancel 
}) {
    return (
        <div className="add-form">
            <h3>Thêm Link Mới</h3>
            <div className="form-grid">
                <input
                    type="text"
                    placeholder="Tiêu đề *"
                    value={newLink.title}
                    onChange={(e) => onChange({ ...newLink, title: e.target.value })}
                />
                
                <input
                    type="url"
                    placeholder="URL link *"
                    value={newLink.url}
                    onChange={(e) => onChange({ ...newLink, url: e.target.value })}
                />
                
                <select
                    value={newLink.department}
                    onChange={(e) => onChange({ ...newLink, department: e.target.value })}
                >
                    <option value="">Chọn phòng ban *</option>
                    {departments.slice(1).map(dept => (
                        <option key={dept.value} value={dept.value}>
                            {dept.label}
                        </option>
                    ))}
                </select>
                
                <select
                    value={newLink.type}
                    onChange={(e) => onChange({ ...newLink, type: e.target.value })}
                >
                    {linkTypes.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                        </option>
                    ))}
                </select>
                
                <textarea
                    placeholder="Mô tả (tùy chọn)"
                    value={newLink.description}
                    onChange={(e) => onChange({ ...newLink, description: e.target.value })}
                    className="description-input"
                />
            </div>
            
            <div className="form-buttons">
                <button className="btn-success" onClick={onSubmit}>
                    ✅ Thêm Link
                </button>
                <button className="btn-cancel" onClick={onCancel}>
                    ❌ Hủy
                </button>
            </div>
        </div>
    );
}

export default AddLinkForm;

