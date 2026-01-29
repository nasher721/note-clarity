/**
 * Service for caching text embeddings to improve inference performance
 * Uses in-memory cache only (no database table required)
 */
export class EmbeddingCacheService {
  private static memoryCache = new Map<string, number[]>();
  private static readonly MAX_MEMORY_CACHE_SIZE = 500;

  /**
   * Generate a hash for the text to use as cache key
   */
  private static async hashText(text: string): Promise<string> {
    const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get embedding from memory cache
   */
  static async getCachedEmbedding(text: string): Promise<number[] | null> {
    const hash = await this.hashText(text);

    // Check memory cache
    if (this.memoryCache.has(hash)) {
      return this.memoryCache.get(hash)!;
    }

    return null;
  }

  /**
   * Get multiple embeddings from cache
   */
  static async getCachedEmbeddings(texts: string[]): Promise<Map<string, number[]>> {
    const result = new Map<string, number[]>();
    const hashes = await Promise.all(texts.map(t => this.hashText(t)));
    const textToHash = new Map(texts.map((t, i) => [t, hashes[i]]));

    // Check memory cache
    for (const [text, hash] of textToHash) {
      if (this.memoryCache.has(hash)) {
        result.set(text, this.memoryCache.get(hash)!);
      }
    }

    return result;
  }

  /**
   * Store embedding in cache
   */
  static async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    const hash = await this.hashText(text);

    // Store in memory cache
    this.addToMemoryCache(hash, embedding);
  }

  /**
   * Store multiple embeddings in cache
   */
  static async cacheEmbeddings(textEmbeddingPairs: Array<{ text: string; embedding: number[] }>): Promise<void> {
    const hashes = await Promise.all(textEmbeddingPairs.map(p => this.hashText(p.text)));

    // Store in memory cache
    textEmbeddingPairs.forEach((pair, i) => {
      this.addToMemoryCache(hashes[i], pair.embedding);
    });
  }

  /**
   * Add embedding to memory cache with LRU eviction
   */
  private static addToMemoryCache(hash: string, embedding: number[]): void {
    // Evict oldest entries if cache is full
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
    this.memoryCache.set(hash, embedding);
  }

  /**
   * Clear memory cache
   */
  static clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    memoryCacheSize: number;
    databaseCacheSize: number;
  }> {
    return {
      memoryCacheSize: this.memoryCache.size,
      databaseCacheSize: 0, // No database cache
    };
  }

  /**
   * Cleanup old cache entries (no-op for memory-only cache)
   */
  static async cleanupOldEntries(_daysOld: number = 30): Promise<number> {
    return 0;
  }
}
