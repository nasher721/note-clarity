
import '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

export class SemanticSearchService {
    private static model: use.UniversalSentenceEncoder | null = null;
    private static isLoading = false;

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
     * Embeds a list of strings into 512-dimensional vectors.
     */
    static async embed(texts: string[]): Promise<number[][]> {
        const model = await this.getModel();
        const embeddings = await model.embed(texts);
        return await embeddings.array();
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
}
