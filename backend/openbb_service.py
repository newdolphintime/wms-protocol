from openbb import obb
from datetime import datetime, timedelta
from typing import List, Dict, Any

class OpenBBService:
    @staticmethod
    def get_historical_data(symbol: str, days: int = 30) -> List[Dict[str, Any]]:
        """
        Fetch historical data for a given stock symbol using OpenBB.
        Returns a list of dictionaries with date, open, high, low, close, volume.
        """
        try:
            # Calculate start date
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days*2) # Fetch extra to ensure we get enough trading days
            
            start_str = start_date.strftime("%Y-%m-%d")
            
            # Fetch data
            # obb.equity.price.historical returns a OBBject, we need to convert to dataframe or dict
            result = obb.equity.price.historical(symbol=symbol, start_date=start_str, provider="yfinance")
            
            # Convert to list of dicts
            # The result.results is typically a list of models or a DataFrame depending on config
            # By default in 4.x it returns a list of Pydantic models
            
            data_list = []
            for item in result.results:
                # Assuming standard OBB 4.x output structure
                # item.date might be a datetime object or string
                entry = {
                    "date": item.date.strftime("%Y-%m-%d") if isinstance(item.date, datetime) or hasattr(item.date, 'strftime') else str(item.date),
                    "open": float(item.open),
                    "high": float(item.high),
                    "low": float(item.low),
                    "close": float(item.close),
                    "volume": int(item.volume)
                }
                data_list.append(entry)
                
            # Sort by date descending and take requested number of days
            data_list.sort(key=lambda x: x['date'], reverse=True)
            return data_list[:days]
            
        except Exception as e:
            print(f"Error fetching OpenBB data for {symbol}: {e}")
            raise e
