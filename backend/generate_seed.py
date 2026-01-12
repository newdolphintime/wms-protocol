import mysql.connector
import datetime
from decimal import Decimal

# Database Configuration
DB_CONFIG = {
    'user': 'root',
    'password': 'Zhangwei@123',
    'host': 'localhost',
    'database': 'wms',
}

OUTPUT_FILE = 'seed_data.py'

def get_python_repr(value):
    if isinstance(value, datetime.date):
        return f"datetime.date({value.year}, {value.month}, {value.day})"
    if isinstance(value, datetime.datetime):
        # Strip microseconds for cleaner seed
        return f"datetime.datetime({value.year}, {value.month}, {value.day}, {value.hour}, {value.minute}, {value.second})"
    if isinstance(value, Decimal):
        return f"Decimal('{value}')"
    if value is None:
        return "None"
    return repr(value)

def generate_seed_script():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    tables = [
        'funds',
        'fund_nav_history', 
        'fund_patch_rules',
        'external_products',
        'clients',
        'accounts',
        'holdings',
        'recurring_rules',
        'cash_flows'
    ]

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        # Header
        f.write("import mysql.connector\n")
        f.write("import datetime\n")
        f.write("from decimal import Decimal\n\n")
        f.write("DB_CONFIG = {\n")
        f.write(f"    'user': '{DB_CONFIG['user']}',\n")
        f.write(f"    'password': '{DB_CONFIG['password']}',\n")
        f.write(f"    'host': '{DB_CONFIG['host']}',\n")
        f.write(f"    'database': '{DB_CONFIG['database']}',\n")
        f.write("}\n\n")

        f.write("def seed_data():\n")
        f.write("    conn = mysql.connector.connect(**DB_CONFIG)\n")
        f.write("    cursor = conn.cursor()\n\n")
        
        # Disable FK checks to allow arbitrary insertion order if needed, 
        # but we will try to insert in order.
        f.write("    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')\n\n")
        f.write("    print('Starting full database seed...')\n\n")

        for table in tables:
            print(f"Exporting {table}...")
            f.write(f"    # --- Table: {table} ---\n")
            f.write(f"    print('Seeding {table}...')\n")
            f.write(f"    cursor.execute('TRUNCATE TABLE {table};')\n")
            
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            
            if not rows:
                f.write(f"    # No data for {table}\n\n")
                continue

            # Get columns
            columns = list(rows[0].keys())
            cols_str = ", ".join([f"`{c}`" for c in columns])
            placeholders = ", ".join(["%s"] * len(columns))
            
            f.write(f"    sql_{table} = \"INSERT INTO {table} ({cols_str}) VALUES ({placeholders})\"\n")
            f.write(f"    data_{table} = [\n")
            
            for row in rows:
                values = [get_python_repr(row[c]) for c in columns]
                f.write(f"        ({', '.join(values)}),\n")
            
            f.write("    ]\n")
            f.write(f"    cursor.executemany(sql_{table}, data_{table})\n")
            f.write(f"    conn.commit()\n\n")

        f.write("    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')\n")
        f.write("    cursor.close()\n")
        f.write("    conn.close()\n")
        f.write("    print('Seeding completed successfully.')\n\n")
        
        f.write("if __name__ == '__main__':\n")
        f.write("    seed_data()\n")

    conn.close()
    print(f"Generated {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_seed_script()
