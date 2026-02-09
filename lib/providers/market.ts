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

interface AlphaVantageTimeSeriesDaily {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

export class AlphaVantageMarketProvider implements MarketProvider {
  private memoryCache: Map<string, number | null> = new Map();
  private apiKey: string;
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (!this.apiKey) {
      console.warn('ALPHA_VANTAGE_API_KEY not configured - market data will always return null');
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
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker.toUpperCase()}&apikey=${this.apiKey}&outputsize=full`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: AlphaVantageTimeSeriesDaily = await response.json();

      // Check for API error messages
      if ('Error Message' in data) {
        console.error(`Alpha Vantage API error: ${(data as any)['Error Message']}`);
        return null;
      }

      // Check for rate limit
      if ('Note' in data) {
        console.warn(`Alpha Vantage API rate limit: ${(data as any)['Note']}`);
        return null;
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        console.error('No time series data in Alpha Vantage response');
        return null;
      }

      // Get data for the requested date
      const dayData = timeSeries[date];
      if (!dayData) {
        // Date not found (weekend, holiday, or future date)
        return null;
      }

      // Get previous trading day to calculate daily move
      const dates = Object.keys(timeSeries).sort().reverse();
      const dateIndex = dates.indexOf(date);

      if (dateIndex === -1) {
        return null;
      }

      // If this is the first date in the series, we can't calculate a move
      if (dateIndex >= dates.length - 1) {
        return null;
      }

      const prevDate = dates[dateIndex + 1];
      const prevDayData = timeSeries[prevDate];

      if (!prevDayData) {
        return null;
      }

      const currentClose = parseFloat(dayData['4. close']);
      const prevClose = parseFloat(prevDayData['4. close']);

      if (isNaN(currentClose) || isNaN(prevClose) || prevClose === 0) {
        return null;
      }

      // Calculate daily percentage change
      const dailyMove = (currentClose - prevClose) / prevClose;

      // Save additional data to database
      await this.saveToDatabaseCache(ticker, date, dailyMove, {
        open_price: parseFloat(dayData['1. open']),
        close_price: currentClose,
        high_price: parseFloat(dayData['2. high']),
        low_price: parseFloat(dayData['3. low']),
        volume: parseInt(dayData['5. volume']),
      });

      return dailyMove;
    } catch (error) {
      console.error(`Exception fetching from Alpha Vantage API:`, error);
      return null;
    }
  }
}

export function getMarketProvider(): MarketProvider {
  const useRealProvider = process.env.USE_REAL_MARKET_PROVIDER !== 'false';

  if (useRealProvider && process.env.ALPHA_VANTAGE_API_KEY) {
    return new AlphaVantageMarketProvider();
  }

  return new StubMarketProvider();
}
