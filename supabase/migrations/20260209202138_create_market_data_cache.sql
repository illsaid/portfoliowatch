/*
  # Create market_data cache table

  1. New Tables
    - `market_data`
      - `id` (bigint, primary key) - Auto-incrementing ID
      - `ticker` (text) - Stock ticker symbol
      - `date` (date) - Trading date
      - `daily_move` (numeric) - Daily percentage change as decimal (e.g., -0.15 for -15%)
      - `open_price` (numeric) - Opening price
      - `close_price` (numeric) - Closing price
      - `high_price` (numeric) - High price
      - `low_price` (numeric) - Low price
      - `volume` (bigint) - Trading volume
      - `fetched_at` (timestamptz) - When this data was fetched from API
      - `created_at` (timestamptz) - Record creation timestamp
    
  2. Indexes
    - Unique index on (ticker, date) to prevent duplicate entries
    - Index on date for efficient date-based queries
    
  3. Security
    - Enable RLS on `market_data` table
    - Add policy for authenticated users to read market data
    - Only admin can insert/update market data (via server-side API)

  4. Notes
    - This table dramatically reduces external API calls by caching results
    - Market data doesn't change once the trading day is closed
    - Free tier Alpha Vantage API has only 25 requests/day limit
*/

CREATE TABLE IF NOT EXISTS market_data (
  id bigserial PRIMARY KEY,
  ticker text NOT NULL,
  date date NOT NULL,
  daily_move numeric,
  open_price numeric,
  close_price numeric,
  high_price numeric,
  low_price numeric,
  volume bigint,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS market_data_ticker_date_idx ON market_data(ticker, date);

-- Create index for efficient date queries
CREATE INDEX IF NOT EXISTS market_data_date_idx ON market_data(date);

-- Enable RLS
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read market data
CREATE POLICY "Authenticated users can read market data"
  ON market_data
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to read market data (for public dashboard)
CREATE POLICY "Anonymous users can read market data"
  ON market_data
  FOR SELECT
  TO anon
  USING (true);