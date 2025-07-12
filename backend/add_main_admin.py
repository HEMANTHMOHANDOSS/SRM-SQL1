import sqlite3
from werkzeug.security import generate_password_hash

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

cursor.execute('''
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
''', (
    'Main Admin',
    'srmtt@srmist.edu.in',
    generate_password_hash('mcs2024'),
    'main_admin'
))

conn.commit()
conn.close()
print("✅ Admin user srmtt@srmist.edu.in added successfully.")
