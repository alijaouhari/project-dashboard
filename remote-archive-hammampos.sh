#!/bin/bash

echo "📦 Archiving HammamPOS on Oracle server..."

ssh -i ../. ssh/oracle_key -o StrictHostKeyChecking=no opc@84.8.221.172 << 'EOF'
cd /home/opc/project-dashboard

# Create Python script on server
cat > archive_hammampos.py << 'PYTHON'
import sqlite3
from datetime import datetime

conn = sqlite3.connect('projects.db')
cursor = conn.cursor()

# Check if HammamPOS exists
cursor.execute('SELECT id, name, status FROM projects WHERE name = ?', ('HammamPOS',))
project = cursor.fetchone()

if project:
    project_id, name, status = project
    print(f'Found: {name} (Status: {status})')
    
    # Update to archived
    cursor.execute('''
        UPDATE projects 
        SET status = 'archived',
            notes = 'Desktop application completed. Web version archived - desktop is primary deployment.',
            updated_at = ?
        WHERE id = ?
    ''', (datetime.now().isoformat(), project_id))
    
    print(f'✅ {name} archived')
else:
    print('HammamPOS not found, creating archived entry...')
    cursor.execute('''
        INSERT INTO projects (name, description, type, status, priority, progress, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        'HammamPOS Web App',
        'Web-based POS system (Archived - Desktop version is primary)',
        'webapp',
        'archived',
        0,
        100,
        'Web version archived. Desktop Electron app is primary deployment.',
        datetime.now().isoformat(),
        datetime.now().isoformat()
    ))
    print('✅ HammamPOS Web App added to archives')

conn.commit()

# Show archived projects
cursor.execute('SELECT name FROM projects WHERE status = "archived"')
archived = cursor.fetchall()
print('\n📦 Archived Projects:')
for (name,) in archived:
    print(f'  - {name}')

conn.close()
PYTHON

# Run the script
python3 archive_hammampos.py

# Clean up
rm archive_hammampos.py

echo "✅ Done!"
EOF
