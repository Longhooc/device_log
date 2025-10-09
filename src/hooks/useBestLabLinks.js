import { useState, useEffect, useCallback, useRef } from 'react';
import bestlabApi from '../api/bestlabApi';

export const useBestLabLinks = () => {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        department: 'all',
        type: 'all',
        search: '',
        favorite: false
    });

    // Load links with current filters
    const loadLinks = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const data = await bestlabApi.getLinks(filters);
            setLinks(data);
        } catch (err) {
            setError(err.message);
            console.error('Error loading BestLab links:', err);
        } finally {
            setLoading(false);
        }
    }, [filters.department, filters.type, filters.search, filters.favorite]);

    // Load links on mount and when filters change
    useEffect(() => {
        loadLinks();
    }, [loadLinks]);

    // Create new link
    const createLink = useCallback(async (linkData) => {
        try {
            setLoading(true);
            const result = await bestlabApi.createLink(linkData);
            await loadLinksRef.current(); // Reload to get updated list
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Update existing link
    const updateLink = useCallback(async (id, linkData) => {
        try {
            setLoading(true);
            const result = await bestlabApi.updateLink(id, linkData);
            await loadLinksRef.current(); // Reload to get updated list
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Delete link
    const deleteLink = useCallback(async (id, authCode) => {
        try {
            setLoading(true);
            const result = await bestlabApi.deleteLink(id, authCode);
            await loadLinksRef.current(); // Reload to get updated list
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Toggle favorite
    const toggleFavorite = useCallback(async (id, isFavorite) => {
        try {
            const result = await bestlabApi.toggleFavorite(id, isFavorite);
            // Update local state immediately for better UX
            setLinks(prevLinks => 
                prevLinks.map(link => 
                    link.id === id 
                        ? { ...link, is_favorite: isFavorite }
                        : link
                )
            );
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // Increment access count
    const incrementAccess = useCallback(async (id) => {
        try {
            const result = await bestlabApi.incrementAccess(id);
            // Update local state immediately
            setLinks(prevLinks => 
                prevLinks.map(link => 
                    link.id === id 
                        ? { ...link, access_count: (link.access_count || 0) + 1 }
                        : link
                )
            );
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // Get stats
    const getStats = useCallback(async () => {
        try {
            return await bestlabApi.getStats();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // Update filters
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    // Clear filters
    const clearFilters = useCallback(() => {
        setFilters({
            department: 'all',
            type: 'all',
            search: '',
            favorite: false
        });
    }, []);

    // Store loadLinks in ref to avoid circular dependency
    const loadLinksRef = useRef(loadLinks);
    loadLinksRef.current = loadLinks;

    // Refresh data
    const refresh = useCallback(() => {
        loadLinksRef.current();
    }, []);

    return {
        links,
        loading,
        error,
        filters,
        createLink,
        updateLink,
        deleteLink,
        toggleFavorite,
        incrementAccess,
        getStats,
        updateFilters,
        clearFilters,
        refresh
    };
};
