import sqlite3
from werkzeug.security import generate_password_hash

def seed_database():
    conn = sqlite3.connect('timetable.db')
    cursor = conn.cursor()

    # Insert Departments
    departments = [
        ('Computer Science Engineering', 'CSE'),
        ('Electronics & Communication Engineering', 'ECE'),
        ('Mechanical Engineering', 'MECH'),
        ('Civil Engineering', 'CIVIL'),
        ('Information Technology', 'IT')
    ]
    for name, code in departments:
        cursor.execute('INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)', (name, code))

    # Get CSE department ID
    cursor.execute('SELECT id FROM departments WHERE code = ?', ('CSE',))
    cse_dept_id = cursor.fetchone()
    if not cse_dept_id:
        print("❌ CSE department not found")
        return
    cse_dept_id = cse_dept_id[0]

    # Insert Subjects
    subjects = [
        ('Data Structures', 'CS101'),
        ('Algorithms', 'CS102'),
        ('Database Management Systems', 'CS201'),
        ('Computer Networks', 'CS202'),
        ('Operating Systems', 'CS301'),
        ('Software Engineering', 'CS302'),
        ('Machine Learning', 'CS401'),
        ('Artificial Intelligence', 'CS402')
    ]
    for name, code in subjects:
        cursor.execute('INSERT OR IGNORE INTO subjects (name, code, department_id) VALUES (?, ?, ?)',
                       (name, code, cse_dept_id))

    # Insert Classrooms
    classrooms = [
        ('Room A101', 60),
        ('Room A102', 50),
        ('Lab B101', 30),
        ('Lab B102', 30),
        ('Seminar Hall', 100)
    ]
    for name, capacity in classrooms:
        cursor.execute('INSERT OR IGNORE INTO classrooms (name, capacity, department_id) VALUES (?, ?, ?)',
                       (name, capacity, cse_dept_id))

    # Insert Users
    users = [
        ('Main Admin', 'admin@srmist.edu.in', 'admin123', 'main_admin', None, None, None, False),
        ('CSE Admin', 'cse.admin@srmist.edu.in', 'cseadmin123', 'dept_admin', cse_dept_id, None, None, False),
        ('Dr. John Smith', 'john.smith@srmist.edu.in', 'staff123', 'staff', cse_dept_id, 'professor', '1,2', True),
        ('Prof. Jane Doe', 'jane.doe@srmist.edu.in', 'staff123', 'staff', cse_dept_id, 'hod', '3', True),
        ('Dr. Mike Johnson', 'mike.johnson@srmist.edu.in', 'staff123', 'staff', cse_dept_id, 'assistant_professor', '4,5', True),
        ('Dr. Sarah Wilson', 'sarah.wilson@srmist.edu.in', 'staff123', 'staff', cse_dept_id, 'assistant_professor', '6,7', True)
    ]

    for name, email, password, role, dept_id, staff_role, subj_sel, subj_locked in users:
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if not cursor.fetchone():
            hashed = generate_password_hash(password)
            cursor.execute('''
                INSERT INTO users (name, email, password_hash, role, department_id, staff_role, subjects_selected, subjects_locked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (name, email, hashed, role, dept_id, staff_role, subj_sel, subj_locked))

    conn.commit()
    conn.close()
    print("✅ Database seeded successfully!")

if __name__ == '__main__':
    seed_database()
