/**
 * Privacy filter utilities: mask sensitive tokens before sending to AI
 * and restore them back after AI response.
 */

/**
 * Example rule item shape:
 * { id: string, find: string, replace: string, flags?: string }
 * - find: plain text to search (will be escaped to safe regex)
 * - replace: token placeholder used when sending to AI
 * - flags: optional regex flags, default: 'gi'
 */

const escapeRegex = (input) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const applyMasking = (text, rules = []) => {
    if (!text || !Array.isArray(rules) || rules.length === 0) return { masked: text, applied: [] };
    let masked = text;
    const applied = [];

    rules.forEach(rule => {
        const findStr = (rule?.find ?? '').toString();
        const replaceStr = (rule?.replace ?? '').toString();
        if (!findStr || !replaceStr) return;

        const flags = rule.flags || 'gi';
        const pattern = new RegExp(escapeRegex(findStr), flags);
        if (pattern.test(masked)) {
            masked = masked.replace(pattern, replaceStr);
            applied.push({ find: findStr, replace: replaceStr, flags });
        }
    });

    return { masked, applied };
};

export const revertMasking = (text, applied = []) => {
    if (!text || !Array.isArray(applied) || applied.length === 0) return text;
    let restored = text;

    // Revert in reverse order to avoid overlap issues
    [...applied].reverse().forEach(({ find, replace, flags }) => {
        if (!find || !replace) return;
        const pattern = new RegExp(escapeRegex(replace), flags || 'gi');
        restored = restored.replace(pattern, find);
    });

    return restored;
};

/**
 * Mask multiple text blocks, returning masked texts and unified applied rules
 */
export const applyMaskingToMany = (texts = [], rules = []) => {
    const results = texts.map(t => applyMasking(t, rules));
    return {
        masked: results.map(r => r.masked),
        applied: results.reduce((acc, r) => (r.applied.length ? acc.concat(r.applied) : acc), [])
    };
};


