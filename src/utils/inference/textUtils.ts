const STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
    'the', 'to', 'was', 'were', 'with',
]);

const NORMALIZED_PUNCTUATION = /[^a-z0-9\s]/g;
const MULTISPACE = /\s+/g;

/**
 * Normalizes text for comparison by lowercasing and removing punctuation
 */
export const normalizeText = (text: string) =>
    text.toLowerCase().replace(NORMALIZED_PUNCTUATION, ' ').replace(MULTISPACE, ' ').trim();

/**
 * Normalizes field values for deduplication
 */
export const normalizeFieldText = (value: string) =>
    value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Tokenizes text into significant words
 */
export const tokenize = (text: string) =>
    normalizeText(text)
        .split(' ')
        .filter(token => token.length > 2 && !STOPWORDS.has(token));

/**
 * Calculates Jaccard similarity between two strings
 */
export const jaccardSimilarity = (a: string, b: string) => {
    const aTokens = new Set(tokenize(a));
    const bTokens = new Set(tokenize(b));
    if (!aTokens.size || !bTokens.size) return 0;
    let intersection = 0;
    for (const token of aTokens) {
        if (bTokens.has(token)) intersection += 1;
    }
    const union = aTokens.size + bTokens.size - intersection;
    return union === 0 ? 0 : intersection / union;
};
