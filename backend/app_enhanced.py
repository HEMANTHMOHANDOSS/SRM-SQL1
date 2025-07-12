
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import secrets
import string
from datetime import timedelta
import os
from dotenv import load_dotenv
from ai_timetable import TimetableGenerator
import logging

load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', secrets.token_urlsafe(32))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

jwt = JWTManager(app)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database initialization with enhanced schema
def init_enhanced_db():
    conn = sqlite3.connect('timetable_enhanced.db')
    cursor = conn.cursor()
    
    # Users table with additional fields
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            employee_id TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('main_admin', 'dept_admin', 'staff')),
            department_id INTEGER,
            programme TEXT,
            type TEXT,
            contact_number TEXT,
            staff_role TEXT CHECK (staff_role IN ('assistant_professor', 'professor', 'hod')),
            subjects_selected TEXT,
            subjects_locked BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')
    
    # Departments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert default main admin if not exists
    cursor.execute('SELECT id FROM users WHERE email = ?', ('srmtt@srmist.edu.in',))
    if not cursor.fetchone():
        password_hash = generate_password_hash('mcs2024')
        cursor.execute('''
            INSERT INTO users (name, email, password_hash, username, employee_id, role)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('Main Administrator', 'srmtt@srmist.edu.in', password_hash, 'mainadmin', 'ADMIN001', 'main_admin'))
    
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
            return jsonify({'error': 'Email and password are required'}), 400
        
        conn = sqlite3.connect('timetable_enhanced.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.password_hash, u.role, u.department_id, 
                   u.staff_role, u.subjects_selected, u.subjects_locked, u.username,
                   u.employee_id, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.email = ? AND u.is_active = 1
        ''', (email,))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if not user_data or not check_password_hash(user_data[3], password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        user = {
            'id': str(user_data[0]),
            'name': user_data[1],
            'email': user_data[2],
            'role': user_data[4],
            'department_id': str(user_data[5]) if user_data[5] else None,
            'staff_role': user_data[6],
            'subjects_selected': user_data[7].split(',') if user_data[7] else [],
            'subjects_locked': bool(user_data[8]),
            'username': user_data[9],
            'employee_id': user_data[10],
            'department_name': user_data[11]
        }
        
        access_token = create_access_token(identity=str(user_data[0]))
        
        logger.info(f"User {email} logged in successfully with role {user['role']}")
        
        return jsonify({
            'success': True,
            'data': {
                'user': user,
                'token': access_token
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_jwt_identity()
        conn = sqlite3.connect('timetable_enhanced.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.role, u.department_id, 
                   u.staff_role, u.subjects_selected, u.subjects_locked, u.username,
                   u.employee_id, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ? AND u.is_active = 1
        ''', (current_user_id,))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        user = {
            'id': str(user_data[0]),
            'name': user_data[1],
            'email': user_data[2],
            'role': user_data[3],
            'department_id': str(user_data[4]) if user_data[4] else None,
            'staff_role': user_data[5],
            'subjects_selected': user_data[6].split(',') if user_data[6] else [],
            'subjects_locked': bool(user_data[7]),
            'username': user_data[8],
            'employee_id': user_data[9],
            'department_name': user_data[10]
        }
        
        return jsonify({'success': True, 'data': {'user': user}}), 200
        
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Token verification failed'}), 401

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

# User Management routes
@app.route('/api/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Check if user exists and user has permission to update
        conn = sqlite3.connect('timetable_enhanced.db')
        cursor = conn.cursor()
        
        # Verify current user has admin role or is updating their own profile
        cursor.execute('SELECT role FROM users WHERE id = ?', (current_user_id,))
        current_user_role = cursor.fetchone()
        
        if not current_user_role or (current_user_role[0] != 'main_admin' and str(current_user_id) != user_id):
            return jsonify({'error': 'Permission denied'}), 403
        
        # Build update query dynamically based on provided fields
        update_fields = []
        update_values = []
        
        allowed_fields = ['name', 'email', 'role', 'department_id', 'staff_role', 'subjects_selected', 'subjects_locked']
        
        for field in allowed_fields:
            if field in data:
                if field == 'subjects_selected' and isinstance(data[field], list):
                    update_fields.append(f"{field} = ?")
                    update_values.append(','.join(data[field]))
                else:
                    update_fields.append(f"{field} = ?")
                    update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        update_values.append(user_id)
        
        cursor.execute(f'''
            UPDATE users 
            SET {', '.join(update_fields)}
            WHERE id = ? AND is_active = 1
        ''', update_values)
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'User not found or no changes made'}), 404
        
        # Get updated user data
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.role, u.department_id, 
                   u.staff_role, u.subjects_selected, u.subjects_locked, u.username,
                   u.employee_id, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        ''', (user_id,))
        
        user_data = cursor.fetchone()
        conn.commit()
        conn.close()
        
        if user_data:
            user = {
                'id': str(user_data[0]),
                'name': user_data[1],
                'email': user_data[2],
                'role': user_data[3],
                'department_id': str(user_data[4]) if user_data[4] else None,
                'staff_role': user_data[5],
                'subjects_selected': user_data[6].split(',') if user_data[6] else [],
                'subjects_locked': bool(user_data[7]),
                'username': user_data[8],
                'employee_id': user_data[9],
                'department_name': user_data[10]
            }
            
            return jsonify({'success': True, 'data': user}), 200
        
        return jsonify({'error': 'Failed to retrieve updated user'}), 500
        
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        return jsonify({'error': 'Failed to update user'}), 500

# Department Management
@app.route('/api/departments', methods=['GET'])
@jwt_required()
def get_departments():
    try:
        conn = sqlite3.connect('timetable_enhanced.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, code FROM departments ORDER BY name')
        departments = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': str(dept[0]),
                'name': dept[1],
                'code': dept[2]
            } for dept in departments]
        }), 200
        
    except Exception as e:
        logger.error(f"Get departments error: {str(e)}")
        return jsonify({'error': 'Failed to fetch departments'}), 500

@app.route('/api/departments', methods=['POST'])
@jwt_required()
def create_department():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify main admin
        conn = sqlite3.connect('timetable_enhanced.db')
        cursor = conn.cursor()
        cursor.execute('SELECT role FROM users WHERE id = ?', (current_user_id,))
        user_role = cursor.fetchone()
        
        if not user_role or user_role[0] != 'main_admin':
            return jsonify({'error': 'Access denied'}), 403
        
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Name and code are required'}), 400
        
        cursor.execute('INSERT INTO departments (name, code) VALUES (?, ?)', 
                      (data['name'], data['code']))
        dept_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'id': str(dept_id),
                'name': data['name'],
                'code': data['code']
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Create department error: {str(e)}")
        return jsonify({'error': 'Failed to create department'}), 500

if __name__ == '__main__':
    init_enhanced_db()
    app.run(debug=True, port=5000, host='0.0.0.0')
