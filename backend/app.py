from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import timedelta
import os
from dotenv import load_dotenv
from api_routes import api
from ai_timetable import TimetableGenerator

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Register Blueprints
app.register_blueprint(api)

# Database initialization
def init_db():
    conn = sqlite3.connect('timetable.db')
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('main_admin', 'dept_admin', 'staff')),
            department_id INTEGER,
            staff_role TEXT CHECK (staff_role IN ('assistant_professor', 'professor', 'hod')),
            subjects_selected TEXT,
            subjects_locked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            department_id INTEGER NOT NULL,
            credits INTEGER DEFAULT 3,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS classrooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            department_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS timetables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_id INTEGER NOT NULL,
            day TEXT NOT NULL,
            time_slot TEXT NOT NULL,
            subject_id INTEGER NOT NULL,
            staff_id INTEGER NOT NULL,
            classroom_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            FOREIGN KEY (staff_id) REFERENCES users (id),
            FOREIGN KEY (classroom_id) REFERENCES classrooms (id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS constraints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_id INTEGER,
            role TEXT NOT NULL CHECK (role IN ('assistant_professor', 'professor', 'hod')),
            subject_type TEXT NOT NULL CHECK (subject_type IN ('theory', 'lab', 'both')),
            max_subjects INTEGER NOT NULL DEFAULT 1,
            max_hours INTEGER NOT NULL DEFAULT 8,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    ''')

    conn.commit()
    conn.close()

# Health check route
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'SRM Timetable AI Backend is running'}), 200

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.password_hash, u.role, u.department_id, 
                   u.staff_role, u.subjects_selected, u.subjects_locked, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.email = ?
        ''', (email,))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if not user_data or not check_password_hash(user_data[3], password):
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        
        user = {
            'id': str(user_data[0]),
            'name': user_data[1],
            'email': user_data[2],
            'role': user_data[4],
            'department_id': str(user_data[5]) if user_data[5] else None,
            'staff_role': user_data[6],
            'subjects_selected': user_data[7].split(',') if user_data[7] else [],
            'subjects_locked': bool(user_data[8]),
            'department_name': user_data[9]
        }
        
        access_token = create_access_token(identity=str(user_data[0]))
        
        return jsonify({
            'success': True,
            'data': {
                'user': user,
                'token': access_token
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': 'Login failed'}), 500

@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_jwt_identity()
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.role, u.department_id, 
                   u.staff_role, u.subjects_selected, u.subjects_locked, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        ''', (current_user_id,))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if not user_data:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user = {
            'id': str(user_data[0]),
            'name': user_data[1],
            'email': user_data[2],
            'role': user_data[3],
            'department_id': str(user_data[4]) if user_data[4] else None,
            'staff_role': user_data[5],
            'subjects_selected': user_data[6].split(',') if user_data[6] else [],
            'subjects_locked': bool(user_data[7]),
            'department_name': user_data[8]
        }
        
        return jsonify({'success': True, 'data': {'user': user}}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': 'Token verification failed'}), 401

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

# Users management
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    try:
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.role, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            ORDER BY u.name
        ''')
        
        users_data = cursor.fetchall()
        conn.close()
        
        users_list = []
        for user in users_data:
            users_list.append({
                'id': str(user[0]),
                'name': user[1],
                'email': user[2],
                'role': user[3],
                'department_name': user[4]
            })
        
        return jsonify(users_list), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Timetable stats
@app.route('/api/timetables/stats', methods=['GET'])
@jwt_required()
def get_timetable_stats():
    try:
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM timetables')
        total = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({'total': total}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Run the application
if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)