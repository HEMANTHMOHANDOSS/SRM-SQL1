
import { useAuth } from '../contexts/PythonAuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';

const Register = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/lovable-uploads/fad397d7-a758-4dcd-88f0-c23bceaaa248.png" 
              alt="SRM Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SRM Timetable AI</h1>
          <p className="text-gray-600">SRM College Ramapuram</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registration Disabled</CardTitle>
            <CardDescription>
              User registration is managed by the system administrator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                New user accounts are created by the Main Administrator. 
                Please contact your system administrator to get access credentials.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">For Access:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Contact your Main Administrator</p>
                <p>• They will create your account</p>
                <p>• You'll receive login credentials</p>
                <p>• Use the Login page to access the system</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Secure authentication powered by SRM Timetable AI</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
