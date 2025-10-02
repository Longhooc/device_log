import { useState, useEffect } from 'react';

/**
 * Custom hook to manage API keys and model settings
 */
export const useSettings = () => {
    const [apiKeys, setApiKeys] = useState([]);
    const [selectedKeyId, setSelectedKeyId] = useState('');
    const [modelQuick, setModelQuick] = useState('gemini-flash-lite-latest');
    const [modelSmart, setModelSmart] = useState('gemini-flash-lite-latest');
    const [privacyFilters, setPrivacyFilters] = useState([]); // [{id, find, replace, flags}]

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = () => {
        try {
            const storedKeys = JSON.parse(localStorage.getItem('gemini.api.keys') || '[]');
            const storedSelectedId = localStorage.getItem('gemini.api.selectedKeyId') || '';
            const storedQuick = localStorage.getItem('gemini.model.quick') || 'gemini-flash-lite-latest';
            const storedSmart = localStorage.getItem('gemini.model.smart') || 'gemini-flash-lite-latest';
            const storedPrivacy = JSON.parse(localStorage.getItem('gemini.privacy.filters') || '[]');
            
            // Defaults if nothing stored yet
            const DEFAULT_API_KEYS = [
                { id: 'sample', label: 'Sample (use env if empty)', value: '' }
            ];
            const DEFAULT_PRIVACY = [
                { id: 'pf_company', find: 'Phuonghai', replace: 'Nam Nhân', flags: 'gi' },
                { id: 'pf_domain', find: 'bestlab', replace: 'Nam Nhân bé', flags: 'gi' },
                { id: 'pf_intranet', find: 'smartph', replace: 'Nam Nhân con', flags: 'gi' },
                { id: 'pf_project', find: 'phượng hải', replace: 'Nam Nhân', flags: 'gi' }
            ];

            const nextKeys = (storedKeys && storedKeys.length > 0) ? storedKeys : DEFAULT_API_KEYS;
            const nextPrivacy = (storedPrivacy && storedPrivacy.length > 0) ? storedPrivacy : DEFAULT_PRIVACY;

            setApiKeys(nextKeys);
            setSelectedKeyId(storedSelectedId);
            setModelQuick(storedQuick);
            setModelSmart(storedSmart);
            setPrivacyFilters(nextPrivacy);

            // Persist defaults immediately so UI reflects them next loads
            if (!storedKeys || storedKeys.length === 0) {
                localStorage.setItem('gemini.api.keys', JSON.stringify(nextKeys));
            }
            if (!storedPrivacy || storedPrivacy.length === 0) {
                localStorage.setItem('gemini.privacy.filters', JSON.stringify(nextPrivacy));
            }
        } catch (e) {
            console.error('Error loading settings', e);
        }
    };

    const persistSettings = (next = {}) => {
        const keys = next.apiKeys ?? apiKeys;
        const selId = next.selectedKeyId ?? selectedKeyId;
        const q = next.modelQuick ?? modelQuick;
        const s = next.modelSmart ?? modelSmart;
        const pf = next.privacyFilters ?? privacyFilters;
        
        localStorage.setItem('gemini.api.keys', JSON.stringify(keys));
        localStorage.setItem('gemini.api.selectedKeyId', selId);
        localStorage.setItem('gemini.model.quick', q);
        localStorage.setItem('gemini.model.smart', s);
        localStorage.setItem('gemini.privacy.filters', JSON.stringify(pf));
    };

    const addApiKey = (newApiKey, newApiKeyLabel) => {
        if (!newApiKey.trim()) {
            alert('Vui lòng nhập API key');
            return false;
        }
        
        const id = Date.now().toString();
        const label = newApiKeyLabel?.trim() || `Key ${apiKeys.length + 1}`;
        const updated = [...apiKeys, { id, label, value: newApiKey.trim() }];
        
        setApiKeys(updated);
        setSelectedKeyId(id);
        persistSettings({ apiKeys: updated, selectedKeyId: id });
        
        return true;
    };

    const deleteApiKey = (id) => {
        const updated = apiKeys.filter(k => k.id !== id);
        const nextSelected = selectedKeyId === id ? (updated[0]?.id || '') : selectedKeyId;
        
        setApiKeys(updated);
        setSelectedKeyId(nextSelected);
        persistSettings({ apiKeys: updated, selectedKeyId: nextSelected });
    };

    const selectApiKey = (id) => {
        setSelectedKeyId(id);
        persistSettings({ selectedKeyId: id });
    };

    const saveModels = () => {
        persistSettings({ modelQuick, modelSmart });
        alert('Đã lưu cài đặt model.');
    };

    // Privacy filters CRUD
    const addPrivacyFilter = (find, replace, flags = 'gi') => {
        if (!find || !replace) return false;
        const rule = { id: Date.now().toString(), find: find.toString(), replace: replace.toString(), flags };
        const updated = [...privacyFilters, rule];
        setPrivacyFilters(updated);
        persistSettings({ privacyFilters: updated });
        return true;
    };

    const updatePrivacyFilter = (id, patch) => {
        const updated = privacyFilters.map(r => r.id === id ? { ...r, ...patch } : r);
        setPrivacyFilters(updated);
        persistSettings({ privacyFilters: updated });
    };

    const deletePrivacyFilter = (id) => {
        const updated = privacyFilters.filter(r => r.id !== id);
        setPrivacyFilters(updated);
        persistSettings({ privacyFilters: updated });
    };

    return {
        apiKeys,
        selectedKeyId,
        modelQuick,
        modelSmart,
        privacyFilters,
        setModelQuick,
        setModelSmart,
        addApiKey,
        deleteApiKey,
        selectApiKey,
        saveModels,
        addPrivacyFilter,
        updatePrivacyFilter,
        deletePrivacyFilter
    };
};

