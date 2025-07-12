from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import sqlite3
from ai_timetable import TimetableGenerator
import os

api = Blueprint('api', __name__)

# Staff management routes
@api.route('/api/staff', methods=['GET'])
@jwt_required()
def get_staff():
    try:
        current_user_id = get_jwt_identity()
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get current user's department
        cursor.execute('SELECT department_id, role FROM users WHERE id = ?', (current_user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        department_id = user_data[0]
        
        # Get staff in the same department
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.staff_role, u.subjects_selected, u.subjects_locked
            FROM users u
            WHERE u.department_id = ? AND u.role = 'staff'
            ORDER BY u.name
        ''', (department_id,))
        
        staff_data = cursor.fetchall()
        conn.close()
        
        staff_list = []
        for staff in staff_data:
            staff_list.append({
                'id': str(staff[0]),
                'name': staff[1],
                'email': staff[2],
                'staff_role': staff[3],
                'subjects_selected': staff[4].split(',') if staff[4] else [],
                'subjects_locked': bool(staff[5])
            })
        
        return jsonify(staff_list), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/subjects', methods=['GET'])
@jwt_required()
def get_subjects():
    try:
        current_user_id = get_jwt_identity()
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get current user's department
        cursor.execute('SELECT department_id FROM users WHERE id = ?', (current_user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        department_id = user_data[0]
        
        # Get subjects for the department
        cursor.execute('''
            SELECT id, name, code, credits
            FROM subjects
            WHERE department_id = ?
            ORDER BY name
        ''', (department_id,))
        
        subjects_data = cursor.fetchall()
        conn.close()
        
        subjects_list = []
        for subject in subjects_data:
            subjects_list.append({
                'id': str(subject[0]),
                'name': subject[1],
                'code': subject[2],
                'credits': subject[3]
            })
        
        return jsonify(subjects_list), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/subjects', methods=['POST'])
@jwt_required()
def create_subject():
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Name and code are required'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get current user's department
        cursor.execute('SELECT department_id FROM users WHERE id = ?', (current_user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        department_id = user_data[0]
        
        cursor.execute('''
            INSERT INTO subjects (name, code, department_id, credits)
            VALUES (?, ?, ?, ?)
        ''', (data['name'], data['code'], department_id, data.get('credits', 3)))
        
        subject_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': str(subject_id),
            'name': data['name'],
            'code': data['code'],
            'credits': data.get('credits', 3)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/subjects/select', methods=['POST'])
@jwt_required()
def select_subjects():
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        if not data.get('subject_ids'):
            return jsonify({'error': 'Subject IDs are required'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get current user data
        cursor.execute('SELECT staff_role, subjects_locked FROM users WHERE id = ?', (current_user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        if user_data[1]:  # subjects_locked
            return jsonify({'error': 'Subjects are already locked'}), 400
        
        staff_role = user_data[0]
        max_subjects = 2 if staff_role == 'assistant_professor' else 1
        
        if len(data['subject_ids']) > max_subjects:
            return jsonify({'error': f'Maximum {max_subjects} subjects allowed for {staff_role}'}), 400
        
        # Update user's subjects
        subjects_str = ','.join(map(str, data['subject_ids']))
        cursor.execute('''
            UPDATE users 
            SET subjects_selected = ?, subjects_locked = 1
            WHERE id = ?
        ''', (subjects_str, current_user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Subjects selected and locked successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/timetable/generate', methods=['POST'])
@jwt_required()
def generate_timetable():
    try:
        data = request.get_json()
        department_id = data.get('department_id')
        
        if not department_id:
            return jsonify({'error': 'Department ID is required'}), 400
        
        generator = TimetableGenerator()
        result = generator.generate_timetable(int(department_id))
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/timetable/export', methods=['POST'])
@jwt_required()
def export_timetable():
    try:
        data = request.get_json()
        department_id = data.get('department_id')
        
        if not department_id:
            return jsonify({'error': 'Department ID is required'}), 400
        
        generator = TimetableGenerator()
        file_path = f'timetable_dept_{department_id}.xlsx'
        
        success = generator.export_to_excel(int(department_id), file_path)
        
        if success:
            return jsonify({
                'message': 'Timetable exported successfully',
                'file_path': file_path
            }), 200
        else:
            return jsonify({'error': 'Export failed'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/classrooms', methods=['GET'])
@jwt_required()
def get_classrooms():
    try:
        current_user_id = get_jwt_identity()
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get current user's department
        cursor.execute('SELECT department_id FROM users WHERE id = ?', (current_user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        department_id = user_data[0]
        
        cursor.execute('''
            SELECT id, name, capacity
            FROM classrooms
            WHERE department_id = ?
            ORDER BY name
        ''', (department_id,))
        
        classrooms_data = cursor.fetchall()
        conn.close()
        
        classrooms_list = []
        for classroom in classrooms_data:
            classrooms_list.append({
                'id': str(classroom[0]),
                'name': classroom[1],
                'capacity': classroom[2]
            })
        
        return jsonify(classrooms_list), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/classrooms', methods=['POST'])
@jwt_required()
def create_classroom():
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        if not data.get('name') or not data.get('capacity'):
            return jsonify({'error': 'Name and capacity are required'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get current user's department
        cursor.execute('SELECT department_id FROM users WHERE id = ?', (current_user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        department_id = user_data[0]
        
        cursor.execute('''
            INSERT INTO classrooms (name, capacity, department_id)
            VALUES (?, ?, ?)
        ''', (data['name'], int(data['capacity']), department_id))
        
        classroom_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': str(classroom_id),
            'name': data['name'],
            'capacity': int(data['capacity'])
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/departments', methods=['GET'])
@jwt_required()
def get_departments():
    try:
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, code FROM departments ORDER BY name')
        departments = cursor.fetchall()
        conn.close()
        
        return jsonify([{
            'id': str(dept[0]),
            'name': dept[1],
            'code': dept[2]
        } for dept in departments]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/departments', methods=['POST'])
@jwt_required()
def create_department():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify main admin
        conn = sqlite3.connect('timetable.db')
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
            'id': str(dept_id),
            'name': data['name'],
            'code': data['code']
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/timetables', methods=['GET'])
@jwt_required()
def get_timetables():
    try:
        current_user_id = get_jwt_identity()
        department_id = request.args.get('department_id')
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        if department_id:
            cursor.execute('''
                SELECT t.id, t.day, t.time_slot, s.name as subject_name, s.code as subject_code,
                       u.name as staff_name, c.name as classroom_name, t.subject_id, t.staff_id, t.classroom_id
                FROM timetables t
                JOIN subjects s ON t.subject_id = s.id
                JOIN users u ON t.staff_id = u.id
                JOIN classrooms c ON t.classroom_id = c.id
                WHERE t.department_id = ?
                ORDER BY t.day, t.time_slot
            ''', (department_id,))
        else:
            # Get user's department
            cursor.execute('SELECT department_id FROM users WHERE id = ?', (current_user_id,))
            user_data = cursor.fetchone()
            if not user_data or not user_data[0]:
                return jsonify([]), 200
            
            cursor.execute('''
                SELECT t.id, t.day, t.time_slot, s.name as subject_name, s.code as subject_code,
                       u.name as staff_name, c.name as classroom_name, t.subject_id, t.staff_id, t.classroom_id
                FROM timetables t
                JOIN subjects s ON t.subject_id = s.id
                JOIN users u ON t.staff_id = u.id
                JOIN classrooms c ON t.classroom_id = c.id
                WHERE t.department_id = ?
                ORDER BY t.day, t.time_slot
            ''', (user_data[0],))
        
        timetables_data = cursor.fetchall()
        conn.close()
        
        timetables_list = []
        for timetable in timetables_data:
            timetables_list.append({
                'id': str(timetable[0]),
                'day': timetable[1],
                'time_slot': timetable[2],
                'subjects': {
                    'id': str(timetable[7]),
                    'name': timetable[3],
                    'code': timetable[4]
                },
                'profiles': {
                    'id': str(timetable[8]),
                    'name': timetable[5]
                },
                'classrooms': {
                    'id': str(timetable[9]),
                    'name': timetable[6]
                }
            })
        
        return jsonify(timetables_list), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/timetables', methods=['POST'])
@jwt_required()
def save_timetables():
    try:
        data = request.get_json()
        department_id = data.get('department_id')
        timetable_entries = data.get('timetable', [])
        
        if not department_id:
            return jsonify({'error': 'Department ID is required'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Delete existing timetable for this department
        cursor.execute('DELETE FROM timetables WHERE department_id = ?', (department_id,))
        
        # Insert new timetable entries
        for entry in timetable_entries:
            cursor.execute('''
                INSERT INTO timetables (department_id, day, time_slot, subject_id, staff_id, classroom_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                department_id,
                entry['day'],
                entry['time_slot'],
                entry['subject_id'],
                entry['staff_id'],
                entry['classroom_id']
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Timetable saved successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/constraints', methods=['GET'])
@jwt_required()
def get_constraints():
    try:
        current_user_id = get_jwt_identity()
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get current user's department and role
        cursor.execute('SELECT department_id, role FROM users WHERE id = ?', (current_user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        department_id, user_role = user_data
        
        if user_role == 'main_admin':
            # Main admin can see all constraints
            cursor.execute('''
                SELECT c.id, c.department_id, c.role, c.subject_type, c.max_subjects, c.max_hours, 
                       c.created_by, c.created_at, d.name as department_name, d.code as department_code
                FROM constraints c
                LEFT JOIN departments d ON c.department_id = d.id
                ORDER BY c.created_at DESC
            ''')
        else:
            # Dept admin and staff can see their department constraints
            cursor.execute('''
                SELECT c.id, c.department_id, c.role, c.subject_type, c.max_subjects, c.max_hours, 
                       c.created_by, c.created_at, d.name as department_name, d.code as department_code
                FROM constraints c
                LEFT JOIN departments d ON c.department_id = d.id
                WHERE c.department_id = ? OR c.department_id IS NULL
                ORDER BY c.created_at DESC
            ''', (department_id,))
        
        constraints_data = cursor.fetchall()
        conn.close()
        
        constraints_list = []
        for constraint in constraints_data:
            constraint_obj = {
                'id': str(constraint[0]),
                'department_id': str(constraint[1]) if constraint[1] else None,
                'role': constraint[2],
                'subject_type': constraint[3],
                'max_subjects': constraint[4],
                'max_hours': constraint[5],
                'created_by': str(constraint[6]),
                'created_at': constraint[7]
            }
            
            if constraint[8] and constraint[9]:
                constraint_obj['departments'] = {
                    'name': constraint[8],
                    'code': constraint[9]
                }
            
            constraints_list.append(constraint_obj)
        
        return jsonify(constraints_list), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/api/constraints', methods=['POST'])
@jwt_required()
def create_constraint():
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        if not data.get('role') or not data.get('subject_type'):
            return jsonify({'error': 'Role and subject type are required'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get current user's department and role
        cursor.execute('SELECT department_id, role FROM users WHERE id = ?', (current_user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        user_department_id, user_role = user_data
        
        # Determine department_id for the constraint
        if user_role == 'main_admin':
            constraint_department_id = data.get('department_id')  # Can be None for global constraints
        else:
            constraint_department_id = user_department_id  # Dept admin can only create for their department
        
        cursor.execute('''
            INSERT INTO constraints (department_id, role, subject_type, max_subjects, max_hours, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            constraint_department_id,
            data['role'],
            data['subject_type'],
            data.get('max_subjects', 1),
            data.get('max_hours', 8),
            current_user_id
        ))
        
        constraint_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': str(constraint_id),
            'department_id': str(constraint_department_id) if constraint_department_id else None,
            'role': data['role'],
            'subject_type': data['subject_type'],
            'max_subjects': data.get('max_subjects', 1),
            'max_hours': data.get('max_hours', 8)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500