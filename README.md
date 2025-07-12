
# SRM Timetable AI - Complete Setup Guide

A comprehensive AI-powered Timetable Management System for SRM College Ramapuram with React frontend and Flask backend.

## 🚀 Features

- **Multi-Role Authentication**: Main Admin, Department Admin, and Staff roles
- **Department Workspaces**: Isolated environments for each department
- **AI-Powered Timetable Generation**: Intelligent conflict resolution and optimization
- **Subject Management**: Dynamic subject selection based on staff roles
- **Excel Export**: Export generated timetables to Excel format
- **Real-time Updates**: Live timetable generation and management
- **Secure Authentication**: JWT-based auth with @srmist.edu.in email validation

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **VS Code** (recommended IDE)
- **Git**

## 🛠️ Complete Setup Instructions for VS Code

### Step 1: Clone and Setup Project Structure

```bash
# Clone the repository (if from Git) or create project folder
mkdir srm-timetable-ai
cd srm-timetable-ai

# The project structure should be:
# srm-timetable-ai/
# ├── frontend/ (your current React app)
# ├── backend/ (new Flask backend)
# └── README.md
```

### Step 2: Backend Setup (Flask + Python)

1. **Open Terminal in VS Code** (`Ctrl + Shift + '`)

2. **Navigate to backend directory:**
```bash
cd backend
```

3. **Create and activate Python virtual environment:**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

4. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

5. **Setup environment variables:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file with your actual API keys
# JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
# GROQ_API_KEY=gsk_dLi47OvXzQoHkQQGj.......
# GOOGLE_API_KEY=AIzaSyBnP-dX3dSf5........
```

6. **Initialize database with sample data:**
```bash
python seed_data.py
```

7. **Start Flask backend:**
```bash
python app.py
```

Backend will run on `http://localhost:5000`

### Step 3: Frontend Setup (React + TypeScript)

1. **Open a new terminal in VS Code** (`Ctrl + Shift + '`)

2. **Install frontend dependencies:**
```bash
npm install
# or
bun install
```

3. **Start the React development server:**
```bash
npm run dev
# or
bun dev
```

Frontend will run on `http://localhost:5173`

### Step 4: VS Code Configuration

1. **Install recommended VS Code extensions:**
   - Python
   - Flask-Snippets
   - ES7+ React/Redux/React-Native snippets
   - TypeScript Importer
   - Prettier - Code formatter
   - Auto Rename Tag

2. **Create VS Code workspace file** (`.vscode/settings.json`):
```json
{
    "python.defaultInterpreterPath": "./backend/venv/bin/python",
    "python.terminal.activateEnvironment": true,
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    }
}
```

3. **Create launch configuration** (`.vscode/launch.json`):
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: Flask",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}/backend/app.py",
            "env": {
                "FLASK_ENV": "development",
                "FLASK_DEBUG": "1"
            },
            "console": "integratedTerminal",
            "cwd": "${workspaceFolder}/backend"
        }
    ]
}
```

## 🔐 Default Login Credentials

After seeding the database, you can use these accounts:

### Main Admin
- **Email**: `admin@srmist.edu.in`
- **Password**: `admin123`

### Department Admin (CSE)
- **Email**: `cse.admin@srmist.edu.in`
- **Password**: `cseadmin123`

### Staff Members
- **Email**: `john.smith@srmist.edu.in` | **Password**: `staff123`
- **Email**: `jane.doe@srmist.edu.in` | **Password**: `staff123`
- **Email**: `mike.johnson@srmist.edu.in` | **Password**: `staff123`

## 📁 Project Structure

```
srm-timetable-ai/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── api_routes.py          # API route handlers
│   ├── ai_timetable.py        # AI timetable generation logic
│   ├── seed_data.py           # Database seeding script
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment variables template
│   └── timetable.db          # SQLite database (created automatically)
├── src/
│   ├── components/           # React components
│   ├── contexts/            # React contexts (Auth)
│   ├── pages/               # Application pages
│   ├── hooks/               # Custom hooks
│   └── lib/                 # Utility functions
├── public/                  # Static assets
├── package.json            # Node.js dependencies
└── README.md              # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Department Management
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create new department

### Staff Management
- `GET /api/staff` - Get department staff
- `POST /api/subjects/select` - Select subjects for staff

### Subject Management
- `GET /api/subjects` - Get department subjects
- `POST /api/subjects` - Create new subject

### Classroom Management
- `GET /api/classrooms` - Get department classrooms
- `POST /api/classrooms` - Create new classroom

### Timetable Management
- `POST /api/timetable/generate` - Generate AI timetable
- `POST /api/timetable/export` - Export to Excel

## 🧪 Testing the Application

1. **Start both servers** (backend on :5000, frontend on :5173)
2. **Open browser** and go to `http://localhost:5173`
3. **Register a new user** or use default credentials
4. **Test different user roles:**
   - Main Admin: Manage departments and view all data
   - Dept Admin: Manage department staff, subjects, classrooms
   - Staff: Select subjects and view timetables

## 🚀 Deployment

### Backend Deployment
```bash
# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Deploy the 'dist' folder to your hosting service
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with Werkzeug
- CORS protection
- Input validation and sanitization
- Role-based access control
- @srmist.edu.in email validation

## 🤖 AI Features

- **Conflict Resolution**: Automatically detects and resolves scheduling conflicts
- **Optimization**: Uses constraint satisfaction algorithms for optimal timetable generation
- **Load Balancing**: Distributes workload evenly across staff and classrooms
- **GROQ Integration**: Advanced AI capabilities for intelligent scheduling

## 📊 Database Schema

### Users Table
- ID, Name, Email, Password Hash, Role, Department ID, Staff Role, Subjects, Lock Status

### Departments Table
- ID, Name, Code, Created At

### Subjects Table
- ID, Name, Code, Department ID, Credits

### Classrooms Table
- ID, Name, Capacity, Department ID

### Timetables Table
- ID, Department ID, Day, Time Slot, Subject ID, Staff ID, Classroom ID

## 🛠️ Troubleshooting

### Common Issues:

1. **Backend not starting:**
   - Check if Python virtual environment is activated
   - Verify all dependencies are installed: `pip install -r requirements.txt`
   - Check if port 5000 is already in use

2. **Frontend connection issues:**
   - Ensure backend is running on port 5000
   - Check CORS configuration in Flask app
   - Verify API endpoints are accessible

3. **Database issues:**
   - Run `python seed_data.py` to reinitialize database
   - Check if SQLite database file has proper permissions

4. **Authentication issues:**
   - Verify JWT_SECRET_KEY is set in .env file
   - Check if email ends with @srmist.edu.in
   - Clear browser localStorage and try again

### Environment Variables:
Make sure your `.env` file contains:
```
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
GROQ_API_KEY=your-groq-api-key
GOOGLE_API_KEY=your-google-api-key
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Verify all setup steps were followed correctly
3. Check VS Code terminal for error messages
4. Ensure both frontend and backend servers are running

## 🔄 Development Workflow

1. **Start both servers** in VS Code integrated terminals
2. **Make changes** to either frontend or backend
3. **Test immediately** - both servers support hot reload
4. **Use VS Code debugger** for Python backend debugging
5. **Use browser dev tools** for frontend debugging

---

## 🎯 Quick Start Commands

```bash
# Terminal 1 (Backend)
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python app.py

# Terminal 2 (Frontend)
npm run dev  # or bun dev

# Browser
http://localhost:5173
```

**🎉 You're all set! The SRM Timetable AI system is now running locally.**
