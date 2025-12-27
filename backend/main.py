from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env.local")

app = FastAPI()

# CORS Configuration
# Adjust origins in production. For now, allow localhost:3000-3005
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Configuration
DB_CONFIG = {
    'user': 'root',
    'password': 'Zhangwei@123',
    'host': 'localhost',
    'database': 'wms',
}

# Models
class Fund(BaseModel):
    id: str
    code: str
    name: str
    manager: Optional[str] = None
    type: str
    nav: float
    dayChange: float
    ytdReturn: float
    riskLevel: int
    inceptionDate: date
    description: Optional[str] = None

    class Config:
        from_attributes = True

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        raise HTTPException(status_code=500, detail="Database connection failed")

@app.get("/api/funds", response_model=List[Fund])
def get_funds(
    keyword: Optional[str] = Query(None, description="Search term for name or code"),
    type: Optional[str] = Query(None, description="Filter by FundType")
):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = "SELECT * FROM funds WHERE 1=1"
    params = []
    
    if keyword:
        query += " AND (name LIKE %s OR code LIKE %s)"
        params.extend([f"%{keyword}%", f"%{keyword}%"])
    
    if type:
        query += " AND type = %s"
        params.append(type)
        
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Map DB columns (snake_case) to Pydantic model (camelCase)
        results = []
        for row in rows:
            results.append({
                "id": row['id'],
                "code": row['code'],
                "name": row['name'],
                "manager": row['manager'],
                "type": row['type'],
                "nav": float(row['nav']),
                "dayChange": float(row['day_change']),
                "ytdReturn": float(row['ytd_return']),
                "riskLevel": row['risk_level'],
                "inceptionDate": row['inception_date'],
                "description": row['description']
            })
            
        return results
    except mysql.connector.Error as err:
        print(f"Error executing query: {err}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/funds/{fund_id}", response_model=Fund)
def get_fund_detail(fund_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM funds WHERE id = %s", (fund_id,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Fund not found")
            
        return {
            "id": row['id'],
            "code": row['code'],
            "name": row['name'],
            "manager": row['manager'],
            "type": row['type'],
            "nav": float(row['nav']),
            "dayChange": float(row['day_change']),
            "ytdReturn": float(row['ytd_return']),
            "riskLevel": row['risk_level'],
            "inceptionDate": row['inception_date'],
            "description": row['description']
        }
    except mysql.connector.Error as err:
        print(f"Error executing query: {err}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/funds/{fund_id}/history")
def get_fund_history(fund_id: str, days: int = Query(365, description="Number of days")):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        query = """
        SELECT date, nav, change_percent, is_patched, patch_fund_id
        FROM fund_nav_history 
        WHERE fund_id = %s 
        ORDER BY date DESC 
        LIMIT %s
        """
        cursor.execute(query, (fund_id, days))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "date": row['date'],
                "nav_actual": float(row['nav']),
                "change": float(row['change_percent']),
                "is_patched": bool(row['is_patched']),
                "patch_fund_id": row['patch_fund_id']
            })
            
        # Return chronological order for charts if needed, but frontend usually handles it.
        # API.md mock showed Descending (implied by "history"). 
        # Recharts usually prefers ascending for X-axis. Let's return Ascending (Old -> New).
        return results[::-1] 
        
    except mysql.connector.Error as err:
        print(f"Error executing query: {err}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
