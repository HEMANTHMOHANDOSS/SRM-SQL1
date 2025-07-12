import sqlite3

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

cursor.execute("SELECT id, name, email FROM users")
rows = cursor.fetchall()

for row in rows:
    print(f"ID: {row[0]}, Name: {row[1]}, Email: {row[2]}")

conn.close()
