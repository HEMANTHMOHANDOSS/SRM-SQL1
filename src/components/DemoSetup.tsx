
import { useState } from 'react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from '../hooks/use-toast';

const DemoSetup = () => {
  const [isSetupRunning, setIsSetupRunning] = useState(false);

  const setupDemoData = async () => {
    setIsSetupRunning(true);
    
    try {
      // Create demo department
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .upsert([
          { name: 'Computer Science Engineering', code: 'CSE' }
        ])
        .select()
        .single();

      if (deptError) {
        console.error('Department creation error:', deptError);
        throw deptError;
      }

      // Create demo subjects
      const subjects = [
        { name: 'Data Structures and Algorithms', code: 'CS301', department_id: department.id, credits: 3 },
        { name: 'Database Management Systems', code: 'CS302', department_id: department.id, credits: 3 },
        { name: 'Operating Systems', code: 'CS303', department_id: department.id, credits: 3 },
        { name: 'Computer Networks', code: 'CS304', department_id: department.id, credits: 3 },
        { name: 'Software Engineering', code: 'CS305', department_id: department.id, credits: 3 }
      ];

      const { error: subjectsError } = await supabase
        .from('subjects')
        .upsert(subjects);

      if (subjectsError) {
        console.error('Subjects creation error:', subjectsError);
        throw subjectsError;
      }

      // Create demo classrooms
      const classrooms = [
        { name: 'Room 101', capacity: 60, department_id: department.id },
        { name: 'Room 102', capacity: 60, department_id: department.id },
        { name: 'Room 103', capacity: 40, department_id: department.id },
        { name: 'Lab 201', capacity: 30, department_id: department.id },
        { name: 'Lab 202', capacity: 30, department_id: department.id }
      ];

      const { error: classroomsError } = await supabase
        .from('classrooms')
        .upsert(classrooms);

      if (classroomsError) {
        console.error('Classrooms creation error:', classroomsError);
        throw classroomsError;
      }

      // Create demo constraints
      const constraints = [
        {
          role: 'assistant_professor',
          subject_type: 'all',
          max_subjects: 2,
          max_hours: 16,
          department_id: department.id,
          created_by: 'demo'
        },
        {
          role: 'professor',
          subject_type: 'all',
          max_subjects: 3,
          max_hours: 20,
          department_id: department.id,
          created_by: 'demo'
        },
        {
          role: 'hod',
          subject_type: 'all',
          max_subjects: 1,
          max_hours: 8,
          department_id: department.id,
          created_by: 'demo'
        }
      ];

      const { error: constraintsError } = await supabase
        .from('constraints')
        .upsert(constraints);

      if (constraintsError) {
        console.error('Constraints creation error:', constraintsError);
        throw constraintsError;
      }

      toast({
        title: "Demo Data Created",
        description: "Demo department, subjects, classrooms, and constraints have been set up successfully!",
      });

    } catch (error) {
      console.error('Demo setup error:', error);
      toast({
        title: "Setup Failed",
        description: "Failed to create demo data. Please check the console for errors.",
        variant: "destructive",
      });
    } finally {
      setIsSetupRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Demo Setup</CardTitle>
        <CardDescription>
          Initialize the application with demo data for testing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={setupDemoData} 
          disabled={isSetupRunning}
          className="w-full"
        >
          {isSetupRunning ? 'Setting up...' : 'Setup Demo Data'}
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          This will create a demo department (CSE), subjects, classrooms, and constraints.
        </p>
      </CardContent>
    </Card>
  );
};

export default DemoSetup;
