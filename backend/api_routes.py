
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
