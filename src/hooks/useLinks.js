import { useState, useEffect, useCallback } from 'react';
import { 
    fetchLinks, 
    createLink, 
    deleteLink, 
    toggleFavorite as toggleFavoriteAPI, 
    incrementAccessCount 
} from '../api/linksApi';

/**
 * Custom hook to manage links CRUD operations
 */
export const useLinks = () => {
    const [links, setLinks] = useState([]);
    const [favoriteLinks, setFavoriteLinks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadLinks();
    }, []);

    const loadLinks = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const linksData = await fetchLinks();
            setLinks(linksData);
            
            // Load favorites from links data
            const favorites = linksData.filter(link => link.is_favorite).map(link => link.id);
            setFavoriteLinks(favorites);
        } catch (err) {
            console.error('Error loading links:', err);
            setError('Không thể tải danh sách links');
            
            // Fallback to empty array
            setLinks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const addLink = async (newLink) => {
        if (!newLink.title || !newLink.url || !newLink.department) {
            throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc!');
        }

        try {
            const linkData = {
                ...newLink,
                created_by: 'admin'
            };

            await createLink(linkData);
            await loadLinks();
            
            return true;
        } catch (err) {
            console.error('Error adding link:', err);
            throw new Error('Lỗi khi thêm link: ' + err.message);
        }
    };

    const removeLink = async (id, authCode) => {
        try {
            await deleteLink(id, authCode);
            await loadLinks();
            
            return true;
        } catch (err) {
            console.error('Error deleting link:', err);
            throw new Error('Lỗi khi xóa link: ' + err.message);
        }
    };

    const toggleFavorite = async (linkId) => {
        try {
            const isCurrentlyFavorite = favoriteLinks.includes(linkId);
            await toggleFavoriteAPI(linkId, !isCurrentlyFavorite);
            
            // Update local state
            const updatedFavorites = isCurrentlyFavorite
                ? favoriteLinks.filter(id => id !== linkId)
                : [...favoriteLinks, linkId];
            
            setFavoriteLinks(updatedFavorites);
        } catch (err) {
            console.error('Error toggling favorite:', err);
            throw new Error('Lỗi khi cập nhật yêu thích: ' + err.message);
        }
    };

    const trackLinkClick = async (linkId) => {
        try {
            await incrementAccessCount(linkId);
        } catch (err) {
            console.error('Error incrementing access count:', err);
        }
    };

    return {
        links,
        favoriteLinks,
        loading,
        error,
        loadLinks,
        addLink,
        removeLink,
        toggleFavorite,
        trackLinkClick
    };
};

