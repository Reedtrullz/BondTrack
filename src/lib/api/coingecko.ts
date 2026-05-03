
export async function getCoingeckoRunePrice(timestamp: number): Promise<number | null> {
  try {
    // Request a 4-hour window around the timestamp
    const from = timestamp - 7200;
    const to = timestamp + 7200;
    
    const url = `/api/coingecko/coins/thorchain/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.prices || data.prices.length === 0) {
      return null;
    }

    // data.prices is an array of [timestamp, price]
    // Find the one closest to our target timestamp
    let closestPrice = data.prices[0][1];
    let minDiff = Math.abs(data.prices[0][0] / 1000 - timestamp);

    for (const [ts, price] of data.prices) {
      const diff = Math.abs(ts / 1000 - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestPrice = price;
      }
    }

    return closestPrice;
  } catch (error) {
    console.error('Error fetching RUNE price from CoinGecko:', error);
    return null;
  }
}
