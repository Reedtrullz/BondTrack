const COINAPI_KEY = process.env.COINAPI_API_KEY || 'e25e552d-4006-4d62-a0d5-90500cdfccbc';
const COINAPI_BASE = 'https://rest.coinapi.io/v1';

export interface CoinApiExchangeRate {
  asset_id_base: string;
  asset_id_quote: string;
  rate: number;
  time: string;
}

export interface CoinApiTimeSeries {
  time_period_start: string;
  time_period_end: string;
  rate_open: number;
  rate_high: number;
  rate_low: number;
  rate_close: number;
}

async function coinApiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${COINAPI_BASE}${path}`, {
    headers: {
      'X-CoinAPI-Key': COINAPI_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CoinAPI error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getCurrentRunePrice(): Promise<number> {
  try {
    const data = await coinApiFetch<CoinApiExchangeRate>('/exchangerate/RUNE/USD');
    return data.rate;
  } catch (error) {
    console.error('CoinAPI fetch error:', error);
    return 0;
  }
}

export async function getRunePriceAtDate(targetDate: Date): Promise<number | null> {
  const dateStr = targetDate.toISOString().slice(0, 10);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const dateEnd = nextDay.toISOString().slice(0, 10);
  
  try {
    const data = await coinApiFetch<CoinApiTimeSeries[]>(
      `/exchangerate/RUNE/USD/history?time_start=${dateStr}T00:00:00Z&time_end=${dateEnd}T00:00:00Z&period_id=1DAY&limit=1`
    );
    
    if (data && data.length > 0) {
      return data[0].rate_close;
    }
    return null;
  } catch (error) {
    console.error('CoinAPI historical price fetch error:', error);
    return null;
  }
}

export async function getRunePriceRange(
  timeStart: string,
  timeEnd: string
): Promise<CoinApiTimeSeries[]> {
  try {
    const data = await coinApiFetch<CoinApiTimeSeries[]>(
      `/exchangerate/RUNE/USD/history?time_start=${timeStart}&time_end=${timeEnd}&period_id=1DAY`
    );
    return data;
  } catch (error) {
    console.error('CoinAPI range fetch error:', error);
    return [];
  }
}