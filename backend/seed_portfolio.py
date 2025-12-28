import mysql.connector
import json
from datetime import date

# Database Configuration (Matching main.py)
DB_CONFIG = {
    'user': 'root',
    'password': 'Zhangwei@123',
    'host': 'localhost',
    'database': 'wms',
}

# MOCK DATA (Copied from services/dataService.ts)
# Note: In a real migration, we would parse the TS file or have a JSON source.
# For this task, we hardcode the known MOCK_PORTFOLIO structure.

MOCK_PORTFOLIO = {
  "id": "client-001",
  "clientName": "张伟 (Mr. Zhang Wei)",
  "accounts": [
    {
      "id": "acc-01",
      "name": "个人尊享理财账户",
      "type": "个人自有账户", # AccountType.PERSONAL
      "cashBalance": 500000,
      "holdings": [
        { "fundId": "1", "shares": 50000, "avgCost": 3.65 },
        { "fundId": "3", "shares": 100000, "avgCost": 1.10 },
      ]
    },
    {
      "id": "acc-02",
      "name": "张氏家族信托 - 稳健成长一号",
      "type": "家族信托账户", # AccountType.FAMILY_TRUST
      "cashBalance": 2000000,
      "holdings": [
        { "fundId": "4", "shares": 200000, "avgCost": 2.60 },
        { "fundId": "6", "shares": 50000, "avgCost": 5.50 },
      ]
    },
    {
      "id": "acc-03",
      "name": "张氏家族信托 - 海外配置二号",
      "type": "家族信托账户", # AccountType.FAMILY_TRUST
      "cashBalance": 100000,
      "holdings": [
        { "fundId": "10", "shares": 150000, "avgCost": 0.55 },
      ]
    }
  ]
}

def seed_portfolio():
    print("Connecting to database...")
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 1. Cleaner: Delete existing data for this client to allow re-seeding
        print(f"Cleaning existing data for client {MOCK_PORTFOLIO['id']}...")
        cursor.execute("DELETE FROM clients WHERE id = %s", (MOCK_PORTFOLIO['id'],))
        # Note: Cascade delete should handle accounts and holdings
        
        # 2. Insert Client
        print(f"Inserting client: {MOCK_PORTFOLIO['clientName']}")
        cursor.execute(
            "INSERT INTO clients (id, name) VALUES (%s, %s)",
            (MOCK_PORTFOLIO['id'], MOCK_PORTFOLIO['clientName'])
        )
        
        # 3. Insert Accounts & Holdings
        holding_count = 0
        for acc in MOCK_PORTFOLIO['accounts']:
            print(f"  Inserting account: {acc['name']}")
            cursor.execute(
                "INSERT INTO accounts (id, client_id, name, type, cash_balance) VALUES (%s, %s, %s, %s, %s)",
                (acc['id'], MOCK_PORTFOLIO['id'], acc['name'], acc['type'], acc['cashBalance'])
            )
            
            for index, h in enumerate(acc['holdings']):
                # Generate a deterministic ID for reproducibility
                holding_id = f"{acc['id']}_h_{index}"
                
                # Check if it's external (Mock data currently are all internal funds)
                fund_id = h.get('fundId')
                is_external = False
                ext_name = None
                ext_type = None
                ext_nav = None
                ext_date = None
                
                # Default empty redemption config
                redemption_json = None
                
                cursor.execute("""
                    INSERT INTO holdings (
                        id, account_id, fund_id, is_external, external_name, external_type, 
                        external_nav, external_nav_date, shares, avg_cost, redemption_config
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    holding_id, acc['id'], fund_id, is_external, ext_name, ext_type,
                    ext_nav, ext_date, h['shares'], h['avgCost'], redemption_json
                ))
                holding_count += 1
                
        conn.commit()
        print(f"Seeding complete! {len(MOCK_PORTFOLIO['accounts'])} accounts and {holding_count} holdings inserted.")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    seed_portfolio()
