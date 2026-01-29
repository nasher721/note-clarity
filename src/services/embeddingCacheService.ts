import { supabase } from '@/integrations/supabase/client';

/**
 * Service for caching text embeddings to improve inference performance
 */
export class EmbeddingCacheService {
  private static memoryCache = new Map<string, number[]>();
  private static readonly MAX_MEMORY_CACHE_SIZE = 500;
  private static readonly TEXT_PREVIEW_LENGTH = 100;

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
   * Get embedding from cache (memory first, then database)
   */
  static async getCachedEmbedding(text: string): Promise<number[] | null> {
    const hash = await this.hashText(text);

    // Check memory cache first
    if (this.memoryCache.has(hash)) {
      return this.memoryCache.get(hash)!;
    }

    // Check database cache
    try {
      const { data } = await supabase
        .from('embedding_cache')
        .select('embedding')
        .eq('text_hash', hash)
        .single();

      if (data?.embedding) {
        const embedding = data.embedding as number[];
        // Store in memory cache for faster future access
        this.addToMemoryCache(hash, embedding);
        // Update last_used_at
        this.touchCacheEntry(hash);
        return embedding;
      }
    } catch {
      // Cache miss
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

    // Check memory cache first
    const uncachedHashes: string[] = [];
    for (const [text, hash] of textToHash) {
      if (this.memoryCache.has(hash)) {
        result.set(text, this.memoryCache.get(hash)!);
      } else {
        uncachedHashes.push(hash);
      }
    }

    // Batch query database for remaining
    if (uncachedHashes.length > 0) {
      try {
        const { data } = await supabase
          .from('embedding_cache')
          .select('text_hash, embedding')
          .in('text_hash', uncachedHashes);

        if (data) {
          const hashToEmbedding = new Map(data.map(d => [d.text_hash, d.embedding as number[]]));

          for (const [text, hash] of textToHash) {
            if (hashToEmbedding.has(hash)) {
              const embedding = hashToEmbedding.get(hash)!;
              result.set(text, embedding);
              this.addToMemoryCache(hash, embedding);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching cached embeddings:', error);
      }
    }

    return result;
  }

  /**
   * Store embedding in cache
   */
  static async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    const hash = await this.hashText(text);
    const preview = text.slice(0, this.TEXT_PREVIEW_LENGTH);

    // Store in memory cache
    this.addToMemoryCache(hash, embedding);

    // Store in database cache (async, don't block)
    try {
      await supabase
        .from('embedding_cache')
        .upsert({
          text_hash: hash,
          text_preview: preview,
          embedding: embedding,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'text_hash',
        });
    } catch (error) {
      // Ignore cache write errors
      console.warn('Failed to cache embedding:', error);
    }
  }

  /**
   * Store multiple embeddings in cache
   */
  static async cacheEmbeddings(textEmbeddingPairs: Array<{ text: string; embedding: number[] }>): Promise<void> {
    const hashes = await Promise.all(textEmbeddingPairs.map(p => this.hashText(p.text)));

    const inserts = textEmbeddingPairs.map((pair, i) => ({
      text_hash: hashes[i],
      text_preview: pair.text.slice(0, this.TEXT_PREVIEW_LENGTH),
      embedding: pair.embedding,
      last_used_at: new Date().toISOString(),
    }));

    // Store in memory cache
    inserts.forEach((insert, i) => {
      this.addToMemoryCache(insert.text_hash, textEmbeddingPairs[i].embedding);
    });

    // Batch upsert to database
    try {
      await supabase
        .from('embedding_cache')
        .upsert(inserts, {
          onConflict: 'text_hash',
        });
    } catch (error) {
      console.warn('Failed to batch cache embeddings:', error);
    }
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
   * Update last_used_at for cache entry (async, don't block)
   */
  private static async touchCacheEntry(hash: string): Promise<void> {
    try {
      await supabase
        .from('embedding_cache')
        .update({ last_used_at: new Date().toISOString() })
        .eq('text_hash', hash);
    } catch {
      // Ignore
    }
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
    const { count } = await supabase
      .from('embedding_cache')
      .select('*', { count: 'exact', head: true });

    return {
      memoryCacheSize: this.memoryCache.size,
      databaseCacheSize: count || 0,
    };
  }

  /**
   * Cleanup old cache entries (call periodically)
   */
  static async cleanupOldEntries(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data } = await supabase
      .from('embedding_cache')
      .delete()
      .lt('last_used_at', cutoffDate.toISOString())
      .select('id');

    return data?.length || 0;
  }
}
