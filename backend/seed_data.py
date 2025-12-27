
import mysql.connector
from datetime import date, timedelta
import random

# Mock Data extracted from services/dataService.ts
MOCK_FUNDS = [
  {
    "id": "1",
    "code": "510300",
    "name": "华泰柏瑞沪深300ETF",
    "manager": "柳军",
    "type": "宽基指数ETF",
    "nav": 4.023,
    "dayChange": 0.85,
    "ytdReturn": 4.5,
    "riskLevel": 3,
    "inceptionDate": "2012-05-04",
    "description": "A股市场规模最大的权益类ETF，紧密跟踪沪深300指数，覆盖A股核心资产。"
  },
  {
    "id": "2",
    "code": "510310",
    "name": "易方达沪深300ETF",
    "manager": "余海燕",
    "type": "宽基指数ETF",
    "nav": 1.985,
    "dayChange": 0.82,
    "ytdReturn": 4.3,
    "riskLevel": 3,
    "inceptionDate": "2013-03-06",
    "description": "费率低廉，跟踪误差小，是机构投资者配置沪深300指数的重要工具。"
  },
  {
    "id": "3",
    "code": "588000",
    "name": "华夏上证科创板50ETF",
    "manager": "张弘弢",
    "type": "行业主题ETF",
    "nav": 0.892,
    "dayChange": 1.56,
    "ytdReturn": -5.2,
    "riskLevel": 5,
    "inceptionDate": "2020-09-28",
    "description": "紧密跟踪科创50指数，聚焦科创板核心科技企业，具有高弹性特征。"
  },
  {
    "id": "4",
    "code": "510050",
    "name": "华夏上证50ETF",
    "manager": "张弘弢",
    "type": "宽基指数ETF",
    "nav": 2.856,
    "dayChange": 0.45,
    "ytdReturn": 6.8,
    "riskLevel": 3,
    "inceptionDate": "2004-12-30",
    "description": "国内首只ETF，跟踪上证50指数，代表上海证券市场最具代表性的超大盘蓝筹股。"
  },
  {
    "id": "5",
    "code": "159919",
    "name": "嘉实沪深300ETF",
    "manager": "何如",
    "type": "宽基指数ETF",
    "nav": 4.102,
    "dayChange": 0.84,
    "ytdReturn": 4.4,
    "riskLevel": 3,
    "inceptionDate": "2012-05-07",
    "description": "深市规模领先的沪深300ETF，流动性良好，适合长期配置。"
  },
  {
    "id": "6",
    "code": "510500",
    "name": "南方中证500ETF",
    "manager": "罗文杰",
    "type": "宽基指数ETF",
    "nav": 5.670,
    "dayChange": 1.10,
    "ytdReturn": 2.1,
    "riskLevel": 4,
    "inceptionDate": "2013-02-06",
    "description": "跟踪中证500指数，代表A股市场中盘成长股风格，行业分布均衡。"
  },
  {
    "id": "7",
    "code": "159915",
    "name": "易方达创业板ETF",
    "manager": "成曦",
    "type": "行业主题ETF",
    "nav": 2.340,
    "dayChange": 1.85,
    "ytdReturn": -2.5,
    "riskLevel": 5,
    "inceptionDate": "2011-09-20",
    "description": "跟踪创业板指，聚焦新兴产业和高新技术企业，成长性强但波动较大。"
  },
  {
    "id": "8",
    "code": "510330",
    "name": "华夏沪深300ETF",
    "manager": "赵宗庭",
    "type": "宽基指数ETF",
    "nav": 3.950,
    "dayChange": 0.83,
    "ytdReturn": 4.2,
    "riskLevel": 3,
    "inceptionDate": "2012-12-25",
    "description": "华夏基金旗下的沪深300ETF，管理经验丰富，跟踪效果稳定。"
  },
  {
    "id": "9",
    "code": "512880",
    "name": "国泰中证全指证券公司ETF",
    "manager": "艾小军",
    "type": "行业主题ETF",
    "nav": 1.050,
    "dayChange": 2.10,
    "ytdReturn": 8.5,
    "riskLevel": 5,
    "inceptionDate": "2016-07-26",
    "description": "跟踪证券公司指数，被誉为“牛市旗手”，是博取市场贝塔收益的利器。"
  },
  {
    "id": "10",
    "code": "513180",
    "name": "华夏恒生科技ETF(QDII)",
    "manager": "徐猛",
    "type": "跨境ETF",
    "nav": 0.650,
    "dayChange": 3.20,
    "ytdReturn": 12.5,
    "riskLevel": 5,
    "inceptionDate": "2024-05-18",
    "description": "投资于港股恒生科技指数，覆盖互联网巨头及新兴科技企业。"
  },
  {
    "id": "demo-1",
    "code": "DEMO001",
    "name": "多源补齐演示ETF",
    "manager": "演示账号",
    "type": "策略ETF",
    "nav": 1.000,
    "dayChange": 0.05,
    "ytdReturn": 0.5,
    "riskLevel": 3,
    "inceptionDate": "2024-11-27", 
    "description": "这是一个用于演示多源数据补齐功能的虚拟基金。成立仅30天，查看近3月数据时会自动展示补齐效果。"
  }
]

# Database Configuration
DB_CONFIG = {
    'user': 'root',
    'password': 'Zhangwei@123',
    'host': 'localhost',
    'database': 'wms',
}

def generate_history(fund):
    history = []
    current_nav = fund['nav']
    days = 500
    now = date.today()
    
    # Generate backwards
    for i in range(days):
        d = now - timedelta(days=i)
        
        # Check if date is before inception
        # For the DEMO fund, we simulate "patched" data before inception (approx 30 days ago)
        # For others, we stop at inception.
        
        inception_str = fund['inceptionDate'] if isinstance(fund['inceptionDate'], str) else fund['inceptionDate'].isoformat()
        inception = date.fromisoformat(inception_str)
        
        is_patched = False
        patch_fund_id = None
        
        if d < inception:
            if fund['code'] == 'DEMO001':
                is_patched = True
                patch_fund_id = "1" # Use Fund 1 (沪深300) as proxy source
            else:
                break
            
        change_percent = 0
        if i == 0:
            change_percent = fund['dayChange']
        else:
            volatility = fund['riskLevel'] * 0.008
            trend = 0.0002
            change_percent = (random.random() * volatility * 2 - volatility + trend) * 100
        
        history.append({
            'fund_id': fund['id'],
            'date': d,
            'nav': round(current_nav, 4),
            'change_percent': round(change_percent, 2),
            'is_patched': is_patched,
            'patch_fund_id': patch_fund_id
        })
        
        # Reverse calculation for previous day
        current_nav = current_nav / (1 + change_percent / 100)
    
    return history

def seed_database():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("Connected to database...")

        # Clear existing data
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        cursor.execute("TRUNCATE TABLE funds")
        cursor.execute("TRUNCATE TABLE fund_nav_history")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        print("Cleared existing data from tables.")

        insert_fund_query = """
        INSERT INTO funds (id, code, name, manager, type, nav, day_change, ytd_return, risk_level, inception_date, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        insert_history_query = """
        INSERT INTO fund_nav_history (fund_id, date, nav, change_percent, is_patched, patch_fund_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        """

        for fund in MOCK_FUNDS:
            # 1. Insert Fund
            values = (
                fund['id'],
                fund['code'],
                fund['name'],
                fund['manager'],
                fund['type'],
                fund['nav'],
                fund['dayChange'],
                fund['ytdReturn'],
                fund['riskLevel'],
                fund['inceptionDate'],
                fund['description']
            )
            cursor.execute(insert_fund_query, values)
            
            # 2. Generate and Insert History
            history_data = generate_history(fund)
            for point in history_data:
                 cursor.execute(insert_history_query, (
                     point['fund_id'],
                     point['date'],
                     point['nav'],
                     point['change_percent'],
                     point['is_patched'],
                     point['patch_fund_id']
                 ))

        conn.commit()
        print(f"Successfully inserted {len(MOCK_FUNDS)} funds and their historical data.")

    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    seed_database()
