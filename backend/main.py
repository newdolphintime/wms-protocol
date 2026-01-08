from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import date
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env.local")

app = FastAPI()

@app.on_event("startup")
def startup_db_migration():
    """Check and apply database schema migrations on startup"""
    try:
        print("Checking database schema...")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        def add_col(table, col_def, col_name):
            cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{col_name}'")
            if not cursor.fetchone():
                print(f"Migrating: Adding {col_name} to {table}...")
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")

        # Funds Table Liquidity Columns
        add_col("funds", "liquidity_rule_type ENUM('DAILY', 'MONTHLY', 'FIXED_TERM', 'CUSTOM') DEFAULT 'DAILY' COMMENT 'Liquidity Rule Type'", "liquidity_rule_type")
        add_col("funds", "settlement_days INT DEFAULT 1 COMMENT 'Settlement Days (T+N)'", "settlement_days")
        add_col("funds", "open_day INT NULL COMMENT 'Open Day (1-31) for MONTHLY type'", "open_day")
        add_col("funds", "has_lockup BOOLEAN DEFAULT FALSE COMMENT 'Whether lockup period exists'", "has_lockup")
        add_col("funds", "lockup_days INT NULL COMMENT 'Lockup days from purchase'", "lockup_days")
        add_col("funds", "maturity_date DATE NULL COMMENT 'Maturity Date for FIXED_TERM'", "maturity_date")
        add_col("funds", "liquidity_notes TEXT NULL COMMENT 'Additional notes for liquidity'", "liquidity_notes")
        
        conn.commit()
        cursor.close()
        conn.close()
        print("Database migration check completed.")
    except Exception as e:
        print(f"Startup migration failed: {e}")

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
    'charset': 'utf8mb4'
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
    
    # Liquidity Rule Fields
    liquidityRuleType: Optional[str] = 'DAILY'
    settlementDays: Optional[int] = 1
    openDay: Optional[int] = None
    hasLockup: Optional[bool] = False
    lockupDays: Optional[int] = None
    maturityDate: Optional[date] = None
    liquidityNotes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class LiquidityInfo(BaseModel):
    """Effective liquidity rule for a holding"""
    ruleType: str
    settlementDays: int
    openDay: Optional[int] = None
    hasLockup: bool = False
    lockupDays: Optional[int] = None
    maturityDate: Optional[date] = None
    notes: Optional[str] = None
    purchaseDate: Optional[date] = None
    source: str # 'external_product', 'fund', 'holding_config', 'default'

class ExternalProduct(BaseModel):
    id: str
    productCode: Optional[str] = None
    productName: str
    productType: str
    issuer: Optional[str] = None
    latestNav: Optional[float] = None
    navDate: Optional[date] = None
    status: str = '运行中'
    isActive: bool = True
    
    # Liquidity Rules
    liquidityRuleType: str = 'MONTHLY'
    settlementDays: int = 10
    openDay: Optional[int] = None
    hasLockup: bool = False
    lockupDays: Optional[int] = None
    maturityDate: Optional[date] = None
    liquidityNotes: Optional[str] = None
    advancedConfig: Optional[Dict[str, Any]] = None
    
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ExternalProductCreate(BaseModel):
    productCode: Optional[str] = None
    productName: str
    productType: str
    issuer: Optional[str] = None
    latestNav: Optional[float] = None
    navDate: Optional[date] = None
    status: str = '运行中'
    
    liquidityRuleType: str = 'MONTHLY'
    settlementDays: int = 10
    openDay: Optional[int] = None
    hasLockup: bool = False
    lockupDays: Optional[int] = None
    maturityDate: Optional[date] = None
    liquidityNotes: Optional[str] = None
    description: Optional[str] = None

class HoldingUpdate(BaseModel):
    """Model for updating a holding's configuration"""
    externalProductId: Optional[str] = None
    purchaseDate: Optional[date] = None
    redemptionConfig: Optional[Dict[str, Any]] = None

class RedemptionRule(BaseModel):
    ruleType: str
    openDay: Optional[int] = None
    settlementDays: int
    lockupEndDate: Optional[str] = None
    maturityDate: Optional[str] = None

class HoldingBase(BaseModel):
    id: str
    accountId: str
    fundId: Optional[str] = None
    isExternal: bool = False
    externalName: Optional[str] = None
    externalType: Optional[str] = None
    externalNav: Optional[float] = None
    externalNavDate: Optional[str] = None
    shares: float
    avgCost: float
    redemptionRule: Optional[RedemptionRule] = None

class Holding(HoldingBase):
    pass

class Account(BaseModel):
    id: str
    name: str
    type: str # PERSONAL, FAMILY_TRUST
    cashBalance: float
    holdings: List[Holding] = []

class ClientPortfolio(BaseModel):
    id: str
    clientName: str
    accounts: List[Account] = []

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
                "description": row['description'],
                "liquidityRuleType": row.get('liquidity_rule_type'),
                "settlementDays": row.get('settlement_days'),
                "openDay": row.get('open_day'),
                "hasLockup": bool(row.get('has_lockup')),
                "lockupDays": row.get('lockup_days'),
                "maturityDate": row.get('maturity_date'),
                "liquidityNotes": row.get('liquidity_notes')
            })
            
        return results
    except mysql.connector.Error as err:
        print(f"Error executing query: {err}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        conn.close()


class FundUpdate(BaseModel):
    liquidityRuleType: Optional[str] = None
    settlementDays: Optional[int] = None
    openDay: Optional[int] = None
    hasLockup: Optional[bool] = None
    lockupDays: Optional[int] = None
    maturityDate: Optional[date] = None
    liquidityNotes: Optional[str] = None

@app.put("/api/funds/{fund_id}")
def update_fund(fund_id: str, update: FundUpdate):
    """Update fund details (currently supports liquidity rules)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        fields = []
        values = []
        
        if update.liquidityRuleType is not None:
            fields.append("liquidity_rule_type = %s")
            values.append(update.liquidityRuleType)
        if update.settlementDays is not None:
            fields.append("settlement_days = %s")
            values.append(update.settlementDays)
        if update.openDay is not None:
            fields.append("open_day = %s")
            values.append(update.openDay)
        if update.hasLockup is not None:
            fields.append("has_lockup = %s")
            values.append(update.hasLockup)
        if update.lockupDays is not None:
            fields.append("lockup_days = %s")
            values.append(update.lockupDays)
        if update.maturityDate is not None:
            fields.append("maturity_date = %s")
            values.append(update.maturityDate)
        if update.liquidityNotes is not None:
            fields.append("liquidity_notes = %s")
            values.append(update.liquidityNotes)
            
        if not fields:
            return {"message": "No changes provided"}
            
        values.append(fund_id)
        query = f"UPDATE funds SET {', '.join(fields)} WHERE id = %s"
        
        cursor.execute(query, tuple(values))
        
        if cursor.rowcount == 0:
            # Check if fund exists
            cursor.execute("SELECT id FROM funds WHERE id = %s", (fund_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Fund not found")
            return {"message": "No changes made"}
            
        conn.commit()
        return {"message": "Fund updated successfully"}
    except mysql.connector.Error as err:
        print(f"Error updating fund: {err}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(err))
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
            "description": row['description'],
            "liquidityRuleType": row.get('liquidity_rule_type'),
            "settlementDays": row.get('settlement_days'),
            "openDay": row.get('open_day'),
            "hasLockup": bool(row.get('has_lockup')),
            "lockupDays": row.get('lockup_days'),
            "maturityDate": row.get('maturity_date'),
            "liquidityNotes": row.get('liquidity_notes')
        }
    except mysql.connector.Error as err:
        print(f"Error executing query: {err}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/funds/{fund_id}/history")
def get_fund_history(fund_id: str, days: Optional[int] = Query(None, description="Number of days")):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        query = """
        SELECT h.date, h.nav, h.change_percent, h.is_patched, h.patch_fund_id, f.name as patch_fund_name
        FROM fund_nav_history h
        LEFT JOIN funds f ON h.patch_fund_id = f.id
        WHERE h.fund_id = %s 
        ORDER BY h.date DESC 
        """
        params = [fund_id]
        
        if days is not None:
            query += " LIMIT %s"
            params.append(days)
            
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "date": row['date'],
                "nav_actual": float(row['nav']),
                "change": float(row['change_percent']),
                "is_patched": bool(row['is_patched']),
                "patch_fund_id": row['patch_fund_id'],
                "patch_fund_name": row['patch_fund_name']
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


class PatchRule(BaseModel):
    id: str
    target_fund_id: str
    proxy_fund_id: str
    start_date: str
    end_date: str

@app.post("/api/patch-rules")
def add_patch_rule(rule: PatchRule):
    print(f"Received Patch Rule: {rule}")
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        # 1. Save Rule
        insert_rule_query = """
        INSERT INTO fund_patch_rules (id, target_fund_id, proxy_fund_id, start_date, end_date)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            proxy_fund_id=VALUES(proxy_fund_id), 
            start_date=VALUES(start_date), 
            end_date=VALUES(end_date)
        """
        cursor.execute(insert_rule_query, (
            rule.id, 
            rule.target_fund_id, 
            rule.proxy_fund_id, 
            rule.start_date, 
            rule.end_date
        ))
        print(f"Rule inserted/updated. ID: {rule.id}")
        
        # 2. Get Proxy Data (Change Percentages)
        cursor.execute("""
            SELECT date, change_percent, nav 
            FROM fund_nav_history 
            WHERE fund_id = %s AND date BETWEEN %s AND %s 
            ORDER BY date ASC
        """, (rule.proxy_fund_id, rule.start_date, rule.end_date))
        proxy_data = cursor.fetchall()
        
        if not proxy_data:
             conn.commit()
             return {"message": "Rule saved, but no proxy data found for the given range", "rows_affected": 0}

        # 3. Determine Anchor and Direction
        # Strategy: Prefer "Backward Calculation" from Future Anchor to ensure splicing with recent data is smooth.
        # If no Future Anchor, use "Forward Calculation" from Past Anchor.
        
        # Check for Future Anchor (Data immediately after end_date)
        cursor.execute("""
            SELECT nav, date FROM fund_nav_history 
            WHERE fund_id = %s AND date > %s 
            ORDER BY date ASC LIMIT 1
        """, (rule.target_fund_id, rule.end_date))
        future_anchor = cursor.fetchone()
        
        patched_rows = []
        
        if future_anchor:
            # BACKWARD CALCULATION
            anchor_nav = float(future_anchor['nav'])
            print(f"Using Future Anchor (Backward): {future_anchor['date']} NAV={anchor_nav}")
            
            # We need proxy data in REVERSE order (Dec 31 -> Dec 1)
            # Logic: To get Dec 31 NAV, we know Jan 1 NAV and Jan 1 Change? 
            # NO. Proxy data gives returns for Dec 1...Dec 31.
            # Relation: NAV_next = NAV_curr * (1 + Change_next/100) ??
            # Wait. 
            # NAV(Dec 31) * (1 + Change(Jan 1) ? No, Change is usually "vs prev day").
            # So NAV(Jan 1) = NAV(Dec 31) * (1 + Change(Jan 1)/100).
            # => NAV(Dec 31) = NAV(Jan 1) / (1 + Change(Jan 1)/100).
            
            # BUT we are patching Dec 1..Dec 31.
            # Future Anchor is Jan 1.
            # value of Jan 1 is known.
            # We want to find Dec 31.
            # Does Proxy data have Jan 1 change? Maybe.
            # But the user rule ends at Dec 31.
            # Actually, we should apply the Proxy's change for Dec 31 to derive Dec 31 from Dec 30? No.
            # If we walk backwards:
            # We need to bridge Dec 1 ... Dec 31 ... [Jan 1]
            # To set Dec 31, if we want it to be consistent with Jan 1...
            # The "Change" recorded on Jan 1 belonging to the TARGET fund is already fixed in DB.
            # WARN: If we change Dec 31 NAV, the *existing* Jan 1 Change % (calculated vs Dec 31) becomes invalid/inconsistent in the DB unless we update Jan 1 too.
            # However, typically "Change" is stored as valid data.
            # If we want visual continuity, we usually assume the Target's Jan 1 value is absolute truth.
            # We want NAV(Dec 31) such that:  NAV(Jan 1) ~= NAV(Dec 31) * (1 + ProxyChange(Jan 1)?) -> No, ProxyChange is from Proxy.
            # Ideally: NAV(Dec 31) should be derived such that the curve looks right.
            # Usually: NAV(Dec 31) = NAV(Jan 1) / (1 + ProxyChange(Jan 1)) ?? No.
            
            # Let's simplify: 
            # If we want the shape of Proxy Dec 1..Dec 31.
            # And we pin the end at Jan 1 (Start of Future).
            # Let's effectively calculate:
            # NAV(Dec 31) = NAV(Jan 1) / (1 + Proxy_Change_Next?? No).
            
            # Actually, if we use Proxy changes for Dec 1...Dec 31.
            # We can calculate the cumulative return of the proxy period: TotalReturn = product(1+r).
            # Then NAV(Dec 31) = NAV(Dec 1) * TotalReturn.
            
            # If we anchor at Jan 1.
            # Realistically, we just want the curve to end near Jan 1.
            # Let's assume the "Gap" between Dec 31 and Jan 1 should follow the Proxy's Jan 1 return?
            # Or just assume "Market Neutral" (0%) jump? 
            # Or assume the discontinuity is handled by the chart?
            # The User complained about "Messy".
            # The mess is likely the vertical jump.
            
            # Let's try: Anchor at Jan 1.
            # Walk BACKWARDS through the proxy data (Dec 31 down to Dec 1).
            # For each day d:
            # We want to calculate NAV(d).
            # We know NAV(d+1).
            # Relation: NAV(d+1) = NAV(d) * (1 + Change(d+1 of Proxy?)).
            # If we assume the Target follows Proxy behavior:
            # NAV(d+1) = NAV(d) * (1 + ProxyChange(d+1)).
            # => NAV(d) = NAV(d+1) / (1 + ProxyChange(d+1)).
            
            # Issue: We need ProxyChange for d+1.
            # If d=Dec 31. d+1=Jan 1. 
            # ProxyChange(Jan 1) is outside the patch rule range (Dec 1-31).
            # So we don't have it in `proxy_data`.
            
            # ALTERNATIVE:
            # Ignore the specific daily link at the boundary.
            # Just set NAV(Dec 31) = NAV(Jan 1). (Zero jump).
            # Then calculate Dec 30 = Dec 31 / (1 + Change(Dec 31)).
            # This ensures no jump at the splice.
            
            current_nav = anchor_nav 
            
            # Sort Proxy Data Descending (Dec 31 -> Dec 1)
            proxy_data.sort(key=lambda x: x['date'], reverse=True)
            
            for point in proxy_data:
                change = float(point['change_percent'] or 0)
                # Formula: NAV(d) = NAV(d) * (1+change)? No, this is standard forward.
                # Standard: NAV(today) = NAV(yest) * (1 + change).
                # So NAV(yest) = NAV(today) / (1 + change).
                
                # Here `point` is Day D (e.g. Dec 31).
                # `current_nav` is Day D+1 (Jan 1) initially.
                # We want NAV(D).
                # And we use Change(D)? No.
                # NAV(D) * (1+Change(D)) = NAV(D) ? No.
                # NAV(D) = NAV(D-1) * (1+Change(D)).
                
                # We are walking backwards.
                # We have NAV(D+1). We want NAV(D).
                # The relationship involves Change(D+1).
                # Only if we treat the "Next Day" change.
                
                # If we use Change(D) to calculate NAV(D) from NAV(D+1)...
                # That implies we are inverting the timeline logic?
                # Let's stick to the visual goal: "Shape of Proxy".
                # If Proxy went UP 10% on Dec 31.
                # Then Target should go UP 10% on Dec 31.
                # So NAV(Dec 31) = NAV(Dec 30) * 1.10.
                
                # Trace:
                # Jan 1 = 100.
                # Dec 31 Change = +10%.
                # So Dec 31 * 1.10 = Jan 1? NO.
                # Dec 31 change impacts Dec 31 NAV relative to Dec 30.
                # It does NOT link Dec 31 to Jan 1.
                
                # The link between Dec 31 and Jan 1 is Change(Jan 1).
                # Use strict logic:
                # We want to fill Dec 1..Dec 31.
                # We Anchor at Jan 1 (Value=100).
                # We assume the "Step" from Dec 31 to Jan 1 is... Unknown (Outside range).
                # Let's assume the step is 0% (Smooth join).
                # So NAV(Dec 31) approx= NAV(Jan 1).
                
                # Then we calculate backwards:
                # NAV(Dec 30) = NAV(Dec 31) / (1 + Change(Dec 31)).
                # NAV(Dec 29) = NAV(Dec 30) / (1 + Change(Dec 30)).
                
                # This works!
                # Logic:
                # 1. Start with `current_nav` = `future_anchor['nav']`.
                # 2. Iterate Dec 31, Dec 30... (Proxy Data Descending).
                # 3. For each day `d`:
                #    new_nav = current_nav / (1 + change(d)/100).
                #    Store (d, new_nav, change(d)).
                #    Update current_nav = new_nav.
                
                # Wait:
                # If NAV(Dec 30) = X.
                # NAV(Dec 31) = X * (1 + Change(Dec 31)).
                # My formula: NAV(Dec 30) = NAV(Dec 31) / (1 + Change(Dec 31)).
                # This is algebraically correct.
                # BUT, I'm setting NAV(Dec 31) derived from Jan 1?
                # If I set NAV(Dec 31) = NAV(Jan 1).
                # Then I calc Dec 30.
                # This introduces a "lag" of 1 day?
                # No.
                # Day D: Dec 31.
                # I calculate NAV(Dec 30) based on NAV(Dec 31) and Change(Dec 31).
                # So I am generating NAV for **Dec 30** in the loop step for Dec 31?
                # That means I need to shift the dates?
                
                # Let's trace carefully.
                # Proxy Data: [(Dec 31, +10%), (Dec 30, +5%)].
                # User wants to fill Dec 30, Dec 31.
                # Anchor: Jan 1 = 100.
                
                # Loop 1: Point=Dec 31 (Change +10%).
                # Derived: NAV_prev = 100 / 1.1 = 90.9.
                # This 90.9 is supposed to be... Dec 30?
                # Yes, because Dec 30 * 1.1 = Dec 31(which we assumed is 100).
                # So we just calculated Dec 30.
                # But we are supposed to Insert Dec 31 as well!
                
                # If we assume NAV(Dec 31) = NAV(Jan 1) = 100.
                # Then we insert (Dec 31, 100, +10%).
                # Then we need Dec 30.
                # NAV(Dec 30) = 100 / 1.1 = 90.9.
                # Insert (Dec 30, 90.9, +5%).
                
                # Is that correct?
                # Yes, visual splice is perfect at Jan 1.
                # But physically, Dec 31 is set to Jan 1.
                
                # Is there a better way?
                # If we knew Change(Jan 1), we would do NAV(Dec 31) = NAV(Jan 1) / (1+Change(Jan 1)).
                # But we don't.
                # Assuming Change(Jan 1) ~ 0 is safe for "Patching".
                
                # Refined Backward Algorithm:
                # 1. `next_nav` = `future_anchor['nav']`.
                # 2. Iterate Proxy Data Descending (Day D).
                #    We need to store NAV(D).
                #    But we only have relationship NAV(D) -> NAV(D) -> Change(D) (No, Change(D) links D-1 to D).
                #    So NAV(D) = NAV(D-1) * (1+Chg(D)).
                
                #    We have `next_nav` (Nav at D+1 maybe?).
                #    If we process Dec 31. We want NAV(Dec 31).
                #    We treat NAV(Dec 31) as the "Anchor" for the calculation of Dec 30.
                #    But what is NAV(Dec 31) value?
                #    We just set it equal to `next_nav`?
                #    Let's set `nav_calculated = next_nav`.
                #    Save (Dec 31, nav_calculated).
                #    Next iteration (Dec 30):
                #    The previous step used "Change(Dec 31)"?
                #    Wait. NAV(Dec 30) = NAV(Dec 31) / (1 + Change(Dec 31)).
                #    So in the loop for Dec 31: 
                #      We SAVE Dec 31 as `next_nav`.
                #      Then we PREPARE `next_nav` for Dec 30 by dividing?
                #      Yes.
                
                #      Logic:
                #      Start: next_nav = 100 (Jan 1).
                #      Data: [Dec 31 (+10), Dec 30 (+5)].
                
                #      Iter 1 (Dec 31, +10):
                #      We want to insert row for Dec 31.
                #      Lets set NAV(Dec 31) = next_nav = 100.
                #      We insert (Dec 31, 100, +10%).  (Note: +10% describes growth FROM Dec 30).
                #      Update next_nav for next step:
                #      next_nav = next_nav / (1 + 0.10) = 90.9. (This is Dec 30).
                
                #      Iter 2 (Dec 30, +5):
                #      Insert (Dec 30, 90.9, +5%).
                #      next_nav = 90.9 / 1.05 = 86.5. (This is Dec 29).
                
                #      Result:
                #      Dec 30: 90.9.
                #      Dec 31: 100.
                #      Jan 1: 100.
                #      Growth Dec 30->31: 90.9 * 1.1 = 100. Correct (+10%).
                #      Growth Dec 31->Jan 1: 100 -> 100. (0%).  <-- The Splice is flat. Smooth.
                
                # This works well.
            
            nav_accumulator = anchor_nav
            proxy_data.sort(key=lambda x: x['date'], reverse=True)
            
            for point in proxy_data:
                change = float(point['change_percent'] or 0)
                
                # 1. Use the accumulator as CURRENT day's NAV (Splice point assumption)
                current_day_nav = nav_accumulator
                
                patched_rows.append((
                    rule.target_fund_id,
                    point['date'],
                    current_day_nav, # NAV
                    change,          # Change % (Day T vs T-1)
                    True,
                    rule.proxy_fund_id
                ))
                
                # 2. Back-calculate previous day's NAV for next iteration
                # NAV(T) = NAV(T-1) * (1 + Change/100)
                # NAV(T-1) = NAV(T) / (1 + Change/100)
                try:
                    nav_accumulator = nav_accumulator / (1 + change / 100)
                except ZeroDivisionError:
                     pass # Should not happen with 1 + change/100 unless change is -100%
                     
        else:
            # FORWARD CALCULATION (Keep existing logic if no future anchor)
            print("No Future Anchor found. Using Forward Calculation.")
            # Get Past Anchor
            cursor.execute("""
                SELECT nav FROM fund_nav_history 
                WHERE fund_id = %s AND date < %s 
                ORDER BY date DESC LIMIT 1
            """, (rule.target_fund_id, rule.start_date))
            anchor = cursor.fetchone()
            
            current_nav = float(anchor['nav']) if anchor else 1.0
            
            # Use proxy data in ASCENDING order
            proxy_data.sort(key=lambda x: x['date'], reverse=False) # Ensure ASC
            
            for point in proxy_data:
                change = float(point['change_percent'] or 0)
                current_nav = current_nav * (1 + change / 100)
                patched_rows.append((
                    rule.target_fund_id,
                    point['date'],
                    current_nav,
                    change,
                    True,
                    rule.proxy_fund_id
                ))

        # 5. Bulk Insert
        insert_patch_query = """
        INSERT INTO fund_nav_history (fund_id, date, nav, change_percent, is_patched, patch_fund_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            nav = VALUES(nav), 
            change_percent = VALUES(change_percent), 
            is_patched = VALUES(is_patched), 
            patch_fund_id = VALUES(patch_fund_id)
        """
        cursor.executemany(insert_patch_query, patched_rows)
        rows_affected = cursor.rowcount
        print(f"Patching complete. Rows affected: {rows_affected}")
        
        conn.commit()
        return {"message": "Rule added and history patched successfully", "rows_affected": rows_affected}
        
    except mysql.connector.Error as err:
        print(f"Error in add_patch_rule: {err}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.get("/api/portfolios/{client_id}", response_model=ClientPortfolio)
def get_portfolio(client_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Get Client Info
        cursor.execute("SELECT * FROM clients WHERE id = %s", (client_id,))
        client = cursor.fetchone()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
            
        # 2. Get Accounts
        cursor.execute("SELECT * FROM accounts WHERE client_id = %s", (client_id,))
        accounts_db = cursor.fetchall()
        
        accounts_list = []
        for acc in accounts_db:
            # 3. Get Holdings for each account
            cursor.execute("""
                SELECT h.*, f.name as fund_name, f.type as fund_type
                FROM holdings h
                LEFT JOIN funds f ON h.fund_id = f.id
                WHERE h.account_id = %s
            """, (acc['id'],))
            holdings_db = cursor.fetchall()
            
            holdings_list = []
            for h in holdings_db:
                # Parse config
                redemption_rule = None
                if h['redemption_config']:
                    try:
                        redemption_rule = json.loads(h['redemption_config'])
                    except:
                        pass
                
                holdings_list.append({
                    "id": h['id'],
                    "accountId": h['account_id'],
                    "fundId": h['fund_id'],
                    "isExternal": bool(h['is_external']),
                    "externalName": h['external_name'],
                    "externalType": h['external_type'],
                    "externalNav": float(h['external_nav']) if h['external_nav'] is not None else None,
                    "externalNavDate": str(h['external_nav_date']) if h['external_nav_date'] else None,
                    "shares": float(h['shares']),
                    "avgCost": float(h['avg_cost']),
                    "redemptionRule": redemption_rule
                })
                
            accounts_list.append({
                "id": acc['id'],
                "name": acc['name'],
                "type": acc['type'],
                "cashBalance": float(acc['cash_balance']),
                "holdings": holdings_list
            })
            
        return {
            "id": client['id'],
            "clientName": client['name'],
            "accounts": accounts_list
        }
        
    except mysql.connector.Error as err:
        print(f"Error executing query: {err}")
        raise HTTPException(status_code=500, detail="Database query failed")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

class HoldingCreate(BaseModel):
    id: str
    accountId: str
    fundId: Optional[str] = None
    isExternal: bool = False
    externalName: Optional[str] = None
    externalType: Optional[str] = None
    externalNav: Optional[float] = None
    externalNavDate: Optional[str] = None
    shares: float
    avgCost: float
    redemptionRule: Optional[RedemptionRule] = None

@app.post("/api/holdings")
def add_holding(holding: HoldingCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Prepare JSON config
        config_json = None
        if holding.redemptionRule:
            config_json = holding.redemptionRule.model_dump_json()
            
        query = """
        INSERT INTO holdings (
            id, account_id, fund_id, is_external, external_name, external_type, 
            external_nav, external_nav_date, shares, avg_cost, redemption_config
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            holding.id,
            holding.accountId,
            holding.fundId,
            holding.isExternal,
            holding.externalName,
            holding.externalType,
            holding.externalNav,
            holding.externalNavDate,
            holding.shares,
            holding.avgCost,
            config_json
        ))
        conn.commit()
        return {"message": "Holding added successfully", "id": holding.id}
    except mysql.connector.Error as err:
        print(f"Error adding holding: {err}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/holdings/{holding_id}")
def delete_holding(holding_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM holdings WHERE id = %s", (holding_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Holding not found")
        conn.commit()
        return {"message": "Holding deleted"}
    except mysql.connector.Error as err:
         conn.rollback()
         raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# --- Cash Flow Models & Endpoints ---

class RecurringRuleItem(BaseModel):
    id: str
    frequency: str
    count: int

class CashFlowItem(BaseModel):
    id: str
    date: str
    amount: float
    description: str
    type: str # INFLOW / OUTFLOW
    recurringRuleId: Optional[str] = None
    relatedHoldingKey: Optional[str] = None

class BatchCashFlowRequest(BaseModel):
    flows: List[CashFlowItem]
    rule: Optional[RecurringRuleItem] = None

@app.get("/api/cash-flows", response_model=List[CashFlowItem])
def get_cash_flows():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM cash_flows")
        rows = cursor.fetchall()
        results = []
        for row in rows:
            results.append({
                "id": row['id'],
                "date": str(row['date']),
                "amount": float(row['amount']),
                "description": row['description'],
                "type": row['type'],
                "recurringRuleId": row['recurring_rule_id'],
                "relatedHoldingKey": row['related_holding_key']
            })
        return results
    except mysql.connector.Error as err:
        print(f"Error fetching cash flows: {err}")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/cash-flows/batch")
def add_cash_flows_batch(payload: BatchCashFlowRequest):
    conn = get_db_connection()
    # Transactional
    conn.start_transaction()
    cursor = conn.cursor()
    try:
        # 1. Insert Rule if exists
        if payload.rule:
            rule_query = "INSERT INTO recurring_rules (id, frequency, count) VALUES (%s, %s, %s)"
            cursor.execute(rule_query, (payload.rule.id, payload.rule.frequency, payload.rule.count))

        # 2. Insert Flows
        if payload.flows:
            flow_query = """
            INSERT INTO cash_flows (id, date, amount, description, type, recurring_rule_id, related_holding_key)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            flow_values = []
            for flow in payload.flows:
                flow_values.append((
                    flow.id,
                    flow.date,
                    flow.amount,
                    flow.description,
                    flow.type,
                    flow.recurringRuleId,
                    flow.relatedHoldingKey
                ))
            cursor.executemany(flow_query, flow_values)
        
        conn.commit()
        return {"message": "Batch save successful", "count": len(payload.flows)}
    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Error in batch save: {err}")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/cash-flows/{flow_id}")
def delete_cash_flow(flow_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM cash_flows WHERE id = %s", (flow_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cash flow not found")
        conn.commit()
        return {"message": "Deleted successfully"}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# --- Static File Serving ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Define the path to the frontend build directory
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")

if os.path.exists(dist_dir):
    # 1. Mount assets (Vite puts JS/CSS in /assets)
    if os.path.exists(os.path.join(dist_dir, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    # 2. Catch-all route for SPA (React Router)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If API request fell through (shouldn't happen if API routes distinct), return 404?
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
            
        file_path = os.path.join(dist_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Default to index.html for client-side routing
        return FileResponse(os.path.join(dist_dir, "index.html"))



# ----------------------------------------------------------------------------
# External Products Endpoints
# ----------------------------------------------------------------------------

@app.get("/api/external-products", response_model=List[ExternalProduct])
def get_external_products():
    """Get all external products"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM external_products WHERE is_active = TRUE ORDER BY created_at DESC")
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "id": row['id'],
                "productCode": row['product_code'],
                "productName": row['product_name'],
                "productType": row['product_type'],
                "issuer": row['issuer'],
                "latestNav": float(row['latest_nav']) if row['latest_nav'] else None,
                "navDate": row['nav_date'],
                "status": row['status'],
                "isActive": bool(row['is_active']),
                "liquidityRuleType": row['liquidity_rule_type'],
                "settlementDays": row['settlement_days'],
                "openDay": row['open_day'],
                "hasLockup": bool(row['has_lockup']),
                "lockupDays": row['lockup_days'],
                "maturityDate": row['maturity_date'],
                "liquidityNotes": row['liquidity_notes'],
                "advancedConfig": json.loads(row['advanced_config']) if row['advanced_config'] else None,
                "description": row['description']
            })
        return results
    except mysql.connector.Error as err:
        print(f"Error fetching external products: {err}")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/external-products", response_model=Dict[str, str])
def create_external_product(product: ExternalProductCreate):
    """Create a new external product"""
    import uuid
    product_id = str(uuid.uuid4())
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO external_products (
                id, product_code, product_name, product_type, issuer,
                latest_nav, nav_date, status,
                liquidity_rule_type, settlement_days, open_day,
                has_lockup, lockup_days, maturity_date, liquidity_notes,
                description
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            product_id, product.productCode, product.productName, product.productType, product.issuer,
            product.latestNav, product.navDate, product.status,
            product.liquidityRuleType, product.settlementDays, product.openDay,
            product.hasLockup, product.lockupDays, product.maturityDate, product.liquidityNotes,
            product.description
        ))
        conn.commit()
        return {"id": product_id, "message": "Product created successfully"}
    except mysql.connector.Error as err:
        print(f"Error creating external product: {err}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# ----------------------------------------------------------------------------
# Holdings Liquidity Management
# ----------------------------------------------------------------------------

@app.get("/api/holdings/{holding_id}/liquidity-info", response_model=LiquidityInfo)
def get_holding_liquidity_info(holding_id: str):
    """
    Get effective liquidity info for a holding.
    Resolution Priority:
    1. External Product Rule (if linked)
    2. Fund Rule (if linked)
    3. Holding Config (if set)
    4. Default
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get Holding
        cursor.execute("""
            SELECT h.*, 
                   ep.liquidity_rule_type as ep_rule, ep.settlement_days as ep_settlement, 
                   ep.open_day as ep_open, ep.has_lockup as ep_lockup, ep.lockup_days as ep_lock_days, 
                   ep.maturity_date as ep_maturity, ep.liquidity_notes as ep_notes,
                   f.liquidity_rule_type as f_rule, f.settlement_days as f_settlement,
                   f.open_day as f_open, f.has_lockup as f_lockup, f.lockup_days as f_lock_days,
                   f.maturity_date as f_maturity, f.liquidity_notes as f_notes
            FROM holdings h
            LEFT JOIN external_products ep ON h.external_product_id = ep.id
            LEFT JOIN funds f ON h.fund_id = f.id
            WHERE h.id = %s
        """, (holding_id,))
        
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Holding not found")
        
        # Determine Rule
        rule = {
            "ruleType": "DAILY",
            "settlementDays": 1,
            "openDay": None,
            "hasLockup": False,
            "lockupDays": None,
            "maturityDate": None,
            "notes": None,
            "source": "default",
            "purchaseDate": row['purchase_date']
        }

        # 1. External Product
        if row['external_product_id']:
            rule.update({
                "ruleType": row['ep_rule'],
                "settlementDays": row['ep_settlement'],
                "openDay": row['ep_open'],
                "hasLockup": bool(row['ep_lockup']),
                "lockupDays": row['ep_lock_days'],
                "maturityDate": row['ep_maturity'],
                "notes": row['ep_notes'],
                "source": "external_product"
            })
        # 2. Fund
        elif row['fund_id']:
            # Use defaults if fund fields are null (migration should have set them though)
            rule.update({
                "ruleType": row['f_rule'] or 'DAILY',
                "settlementDays": row['f_settlement'] or 1,
                "openDay": row['f_open'],
                "hasLockup": bool(row['f_lockup']),
                "lockupDays": row['f_lock_days'],
                "maturityDate": row['f_maturity'],
                "notes": row['f_notes'],
                "source": "fund"
            })
        # 3. Holding Configuration (Override)
        elif row['redemption_config']:
            try:
                config = json.loads(row['redemption_config'])
                # Only update fields present in config
                if 'ruleType' in config: rule['ruleType'] = config['ruleType']
                if 'settlementDays' in config: rule['settlementDays'] = config['settlementDays']
                if 'openDay' in config: rule['openDay'] = config['openDay']
                if 'maturityDate' in config: rule['maturityDate'] = config['maturityDate']
                rule['source'] = "holding_config"
            except:
                pass # Ignore malformed JSON

        return rule

    except mysql.connector.Error as err:
        print(f"Error fetching liquidity info: {err}")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/api/holdings/{holding_id}", response_model=Dict[str, str])
def update_holding(holding_id: str, update: HoldingUpdate):
    """
    Update holding configuration (link to product or set custom config)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Build Update Query
        fields = []
        values = []
        
        if update.externalProductId is not None:
            fields.append("external_product_id = %s")
            # Handle empty string as NULL to unlink
            values.append(update.externalProductId if update.externalProductId else None)
            
        if update.purchaseDate is not None:
            fields.append("purchase_date = %s")
            values.append(update.purchaseDate)
            
        if update.redemptionConfig is not None:
            fields.append("redemption_config = %s")
            values.append(json.dumps(update.redemptionConfig))
            
        if not fields:
             return {"message": "No changes provided"}
             
        values.append(holding_id)
        query = f"UPDATE holdings SET {', '.join(fields)} WHERE id = %s"
        
        cursor.execute(query, tuple(values))
        
        if cursor.rowcount == 0:
             raise HTTPException(status_code=404, detail="Holding not found")
             
        conn.commit()
        return {"message": "Holding updated successfully"}
        
    except mysql.connector.Error as err:
        print(f"Error updating holding: {err}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()



if __name__ == "__main__":
    import uvicorn
    # Use 0.0.0.0 to make it accessible externally
    uvicorn.run(app, host="0.0.0.0", port=8001)
