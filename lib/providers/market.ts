import fs from 'fs';
import path from 'path';

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

export function getMarketProvider(): MarketProvider {
  return new StubMarketProvider();
}
