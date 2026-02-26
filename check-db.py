import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'projects.db')

print(f'📊 Checking database: {db_path}\n')

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print('Tables in database:')
    for table in tables:
        print(f'  - {table[0]}')
        
        # Get row count
        cursor.execute(f'SELECT COUNT(*) FROM {table[0]}')
        count = cursor.fetchone()[0]
        print(f'    Rows: {count}')
        
        # Show first few rows
        if count > 0:
            cursor.execute(f'SELECT * FROM {table[0]} LIMIT 3')
            rows = cursor.fetchall()
            cursor.execute(f'PRAGMA table_info({table[0]})')
            columns = [col[1] for col in cursor.fetchall()]
            print(f'    Columns: {", ".join(columns)}')
    
    conn.close()
    
except Exception as e:
    print(f'❌ Error: {e}')
