
import Tesseract from 'tesseract.js';

export interface OCRResult {
    text: string;
    confidence: number;
    wordCount: number;
}

export class OCRService {
    private static worker: Tesseract.Worker | null = null;
    private static isInitializing = false;

    private static async getWorker() {
        if (this.worker) return this.worker;

        // Simple singleton initialization lock
        if (this.isInitializing) {
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.worker!;
        }

        this.isInitializing = true;
        try {
            const worker = await Tesseract.createWorker('eng');
            this.worker = worker;
            return worker;
        } finally {
            this.isInitializing = false;
        }
    }

    static async processImage(file: File | Blob | string, onProgress?: (progress: number) => void): Promise<OCRResult> {
        try {
            const worker = await this.getWorker();

            const ret = await worker.recognize(file);

            // Call progress callback if provided
            if (onProgress) {
                onProgress(100);
            }

            const text = ret.data.text || '';
            const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

            return {
                text,
                confidence: ret.data.confidence ?? 0,
                wordCount
            };
        } catch (error) {
            console.error('OCR Processing Error:', error);
            throw new Error('Failed to process image');
        }
    }

    static async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}
