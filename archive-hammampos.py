import sqlite3
import os
from datetime import datetime

db_path = os.path.join(os.path.dirname(__file__), 'projects.db')

print('📦 Adding HammamPOS Web App to Archives...\n')

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if HammamPOS exists
    cursor.execute('SELECT id, name, status FROM projects WHERE name = ?', ('HammamPOS',))
    project = cursor.fetchone()
    
    if project:
        project_id, name, status = project
        print(f'Found existing project: {name} (Status: {status})')
        
        # Update to archived
        cursor.execute('''
            UPDATE projects 
            SET status = 'archived',
                notes = 'Desktop application completed with Electron. Web version archived - desktop is primary deployment. Features: POS system, inventory management, reporting, receipt printing, Windows installer.',
                updated_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), project_id))
        
        print(f'✅ {name} moved to archives')
    else:
        # Create new archived entry
        cursor.execute('''
            INSERT INTO projects (name, description, url, type, status, priority, progress, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'HammamPOS Web App',
            'Web-based Point of Sale system for Hammam businesses (Archived)',
            '',
            'webapp',
            'archived',
            0,
            100,
            'Web version archived. Desktop Electron application is the primary deployment. Desktop features: Full POS system, inventory management, sales reporting, receipt printing, Windows installer.',
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        
        print('✅ HammamPOS Web App added to archives')
    
    conn.commit()
    
    # Show all archived projects
    cursor.execute('SELECT name, status FROM projects WHERE status = "archived"')
    archived = cursor.fetchall()
    
    print('\n📦 Archived Projects:')
    for name, status in archived:
        print(f'  - {name}')
    
    conn.close()
    print('\n✅ Done! Check the Archives tab in the dashboard.')
    
except Exception as e:
    print(f'❌ Error: {e}')
