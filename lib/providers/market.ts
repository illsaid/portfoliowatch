import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

export interface MarketProvider {
  getDailyMove(ticker: string, date: string): Promise<number | null>;
}

export class StubMarketProvider implements MarketProvider {
  private data: Record<string, Record<string, number>> = {};

  constructor() {
    try {
      const filePath = path.join(process.cwd(), 'data', 'market_stub.json');
      const raw = fs.readFileSync(filePath, 'utf-8');
      this.data = JSON.parse(raw);
    } catch {
      this.data = {};
    }
  }

  async getDailyMove(ticker: string, date: string): Promise<number | null> {
    const dayData = this.data[date];
    if (!dayData) return null;
    return dayData[ticker] ?? null;
  }
}

interface FinnhubCandleResponse {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string;   // Status
  t: number[]; // Timestamps
  v: number[]; // Volumes
}

export class FinnhubMarketProvider implements MarketProvider {
  private memoryCache: Map<string, number | null> = new Map();
  private apiKey: string;
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY || '';

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (!this.apiKey) {
      console.warn('FINNHUB_API_KEY not configured - market data will always return null');
    }
  }

  private getCacheKey(ticker: string, date: string): string {
    return `${ticker}:${date}`;
  }

  async getDailyMove(ticker: string, date: string): Promise<number | null> {
    if (!this.apiKey) {
      return null;
    }

    const cacheKey = this.getCacheKey(ticker, date);

    // Check in-memory cache first
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey) ?? null;
    }

    // Check database cache
    const dbResult = await this.checkDatabaseCache(ticker, date);
    if (dbResult !== undefined) {
      this.memoryCache.set(cacheKey, dbResult);
      return dbResult;
    }

    // Fetch from API
    try {
      const dailyMove = await this.fetchFromAPI(ticker, date);

      // Cache the result
      this.memoryCache.set(cacheKey, dailyMove);
      await this.saveToDatabaseCache(ticker, date, dailyMove);

      return dailyMove;
    } catch (error) {
      console.error(`Error fetching market data for ${ticker} on ${date}:`, error);
      return null;
    }
  }

  private async checkDatabaseCache(ticker: string, date: string): Promise<number | null | undefined> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('market_data')
        .select('daily_move')
        .eq('ticker', ticker.toUpperCase())
        .eq('date', date)
        .maybeSingle();

      if (error) {
        console.error('Database cache check error:', error);
        return undefined;
      }

      if (data && data.daily_move !== undefined) {
        const dailyMove = data.daily_move;
        return dailyMove !== null ? parseFloat(String(dailyMove)) : null;
      }

      return undefined;
    } catch (error) {
      console.error('Database cache check exception:', error);
      return undefined;
    }
  }

  private async saveToDatabaseCache(
    ticker: string,
    date: string,
    dailyMove: number | null,
    additionalData?: {
      open_price?: number;
      close_price?: number;
      high_price?: number;
      low_price?: number;
      volume?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await (this.supabase as any)
        .from('market_data')
        .upsert({
          ticker: ticker.toUpperCase(),
          date,
          daily_move: dailyMove,
          ...additionalData,
          fetched_at: new Date().toISOString(),
        }, {
          onConflict: 'ticker,date'
        });

      if (error) {
        console.error('Database cache save error:', error);
      }
    } catch (error) {
      console.error('Database cache save exception:', error);
    }
  }

  private async fetchFromAPI(ticker: string, date: string): Promise<number | null> {
    try {
      // Convert date string to Unix timestamp
      const targetDate = new Date(date);
      const targetTimestamp = Math.floor(targetDate.getTime() / 1000);

      // Get data for a range that includes the target date and previous trading days
      // Go back 7 days to ensure we capture the previous trading day
      const fromTimestamp = targetTimestamp - (7 * 24 * 60 * 60);
      const toTimestamp = targetTimestamp + (24 * 60 * 60);

      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${ticker.toUpperCase()}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Finnhub API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: FinnhubCandleResponse = await response.json();

      // Check if we got valid data
      if (data.s !== 'ok' || !data.c || data.c.length === 0) {
        console.error(`Finnhub API returned no data for ${ticker} on ${date}`);
        return null;
      }

      // Find the index for our target date
      let targetIndex = -1;
      for (let i = 0; i < data.t.length; i++) {
        const candleDate = new Date(data.t[i] * 1000).toISOString().split('T')[0];
        if (candleDate === date) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex === -1) {
        // Target date not found (weekend, holiday, or future date)
        return null;
      }

      // Get current and previous close prices
      const currentClose = data.c[targetIndex];

      // Previous index should be the trading day before
      if (targetIndex === 0) {
        // No previous day data available
        return null;
      }

      const prevClose = data.c[targetIndex - 1];

      if (!currentClose || !prevClose || prevClose === 0) {
        return null;
      }

      // Calculate daily percentage change
      const dailyMove = (currentClose - prevClose) / prevClose;

      // Save additional data to database
      await this.saveToDatabaseCache(ticker, date, dailyMove, {
        open_price: data.o[targetIndex],
        close_price: currentClose,
        high_price: data.h[targetIndex],
        low_price: data.l[targetIndex],
        volume: data.v[targetIndex],
      });

      return dailyMove;
    } catch (error) {
      console.error(`Exception fetching from Finnhub API:`, error);
      return null;
    }
  }
}

export function getMarketProvider(): MarketProvider {
  const useRealProvider = process.env.USE_REAL_MARKET_PROVIDER !== 'false';

  if (useRealProvider && process.env.FINNHUB_API_KEY) {
    return new FinnhubMarketProvider();
  }

  return new StubMarketProvider();
}
