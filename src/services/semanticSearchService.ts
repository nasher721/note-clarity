
import '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { EmbeddingCacheService } from './embeddingCacheService';

export class SemanticSearchService {
    private static model: use.UniversalSentenceEncoder | null = null;
    private static isLoading = false;
    private static pendingEmbedRequests = new Map<string, Promise<number[]>>();

    static async getModel() {
        if (this.model) return this.model;

        if (this.isLoading) {
            // Wait for load
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.model!;
        }

        this.isLoading = true;
        try {
            // Load the model. Ideally this happens once on app startup or first use.
            // This downloads ~30MB of model weights.
            const model = await use.load();
            this.model = model;
            return model;
        } catch (err) {
            console.error('Failed to load TFJS model', err);
            throw err;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Check if the model is loaded
     */
    static isModelLoaded(): boolean {
        return this.model !== null;
    }

    /**
     * Preload the model without blocking
     */
    static preloadModel(): void {
        this.getModel().catch(() => {});
    }

    /**
     * Embeds a list of strings into 512-dimensional vectors with caching.
     */
    static async embed(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        // Check cache for already computed embeddings
        const cachedEmbeddings = await EmbeddingCacheService.getCachedEmbeddings(texts);

        // Find texts that need to be computed
        const uncachedTexts: string[] = [];
        const uncachedIndices: number[] = [];

        texts.forEach((text, index) => {
            if (!cachedEmbeddings.has(text)) {
                uncachedTexts.push(text);
                uncachedIndices.push(index);
            }
        });

        // Compute embeddings for uncached texts
        let newEmbeddings: number[][] = [];
        if (uncachedTexts.length > 0) {
            const model = await this.getModel();
            const tensorEmbeddings = await model.embed(uncachedTexts);
            newEmbeddings = await tensorEmbeddings.array();

            // Cache the new embeddings (async, don't block)
            const toCache = uncachedTexts.map((text, i) => ({
                text,
                embedding: newEmbeddings[i],
            }));
            EmbeddingCacheService.cacheEmbeddings(toCache).catch(() => {});
        }

        // Combine cached and new embeddings in original order
        const result: number[][] = new Array(texts.length);
        let newEmbeddingIndex = 0;

        texts.forEach((text, index) => {
            if (cachedEmbeddings.has(text)) {
                result[index] = cachedEmbeddings.get(text)!;
            } else {
                result[index] = newEmbeddings[newEmbeddingIndex++];
            }
        });

        return result;
    }

    /**
     * Embed a single text with caching and deduplication
     */
    static async embedSingle(text: string): Promise<number[]> {
        // Check if there's already a pending request for this text
        const pending = this.pendingEmbedRequests.get(text);
        if (pending) {
            return pending;
        }

        // Check cache first
        const cached = await EmbeddingCacheService.getCachedEmbedding(text);
        if (cached) {
            return cached;
        }

        // Create a new request
        const promise = (async () => {
            const model = await this.getModel();
            const tensorEmbedding = await model.embed([text]);
            const embedding = (await tensorEmbedding.array())[0];

            // Cache the result
            EmbeddingCacheService.cacheEmbedding(text, embedding).catch(() => {});

            // Clean up pending request
            this.pendingEmbedRequests.delete(text);

            return embedding;
        })();

        this.pendingEmbedRequests.set(text, promise);
        return promise;
    }

    /**
     * Calculates cosine similarity between two vectors.
     */
    static cosineSimilarity(a: number[], b: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Find most similar texts from a list
     */
    static async findSimilar(
        query: string,
        candidates: string[],
        options: { topK?: number; threshold?: number } = {}
    ): Promise<Array<{ text: string; similarity: number; index: number }>> {
        const { topK = 5, threshold = 0.5 } = options;

        if (candidates.length === 0) return [];

        const allTexts = [query, ...candidates];
        const embeddings = await this.embed(allTexts);

        const queryEmbedding = embeddings[0];
        const candidateEmbeddings = embeddings.slice(1);

        const similarities = candidateEmbeddings.map((embedding, index) => ({
            text: candidates[index],
            similarity: this.cosineSimilarity(queryEmbedding, embedding),
            index,
        }));

        return similarities
            .filter(s => s.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    /**
     * Batch compute similarities for multiple queries against same candidates
     */
    static async batchFindSimilar(
        queries: string[],
        candidates: string[],
        options: { threshold?: number } = {}
    ): Promise<Map<string, Array<{ text: string; similarity: number; index: number }>>> {
        const { threshold = 0.5 } = options;

        if (queries.length === 0 || candidates.length === 0) {
            return new Map();
        }

        const allTexts = [...queries, ...candidates];
        const embeddings = await this.embed(allTexts);

        const queryEmbeddings = embeddings.slice(0, queries.length);
        const candidateEmbeddings = embeddings.slice(queries.length);

        const results = new Map<string, Array<{ text: string; similarity: number; index: number }>>();

        queries.forEach((query, queryIndex) => {
            const queryEmbedding = queryEmbeddings[queryIndex];
            const similarities = candidateEmbeddings.map((embedding, index) => ({
                text: candidates[index],
                similarity: this.cosineSimilarity(queryEmbedding, embedding),
                index,
            }));

            results.set(
                query,
                similarities.filter(s => s.similarity >= threshold)
                    .sort((a, b) => b.similarity - a.similarity)
            );
        });

        return results;
    }
}
