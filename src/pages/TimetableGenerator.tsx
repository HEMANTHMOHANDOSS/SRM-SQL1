import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/PythonAuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Calendar, Zap, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../hooks/use-toast';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
}

interface Staff {
  id: string;
  name: string;
  staff_role: string;
  subjects_selected?: string;
}

interface Classroom {
  id: string;
  name: string;
  capacity: number;
}

interface TimetableEntry {
  id?: string;
  day: string;
  time_slot: string;
  subject_id: string;
  staff_id: string;
  classroom_id: string;
  department_id: string;
}

const TimetableGenerator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [generatedTimetable, setGeneratedTimetable] = useState<TimetableEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'];

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentData();
    }
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/departments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setDepartments(data || []);
      
      // Auto-select user's department if they are dept_admin
      if (user?.role === 'dept_admin' && user.department_id) {
        setSelectedDepartment(user.department_id);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch subjects
      const subjectRes = await fetch('http://localhost:5000/api/subjects', { headers });
      const subjectData = await subjectRes.json();

      // Fetch staff
      const staffRes = await fetch('http://localhost:5000/api/staff', { headers });
      const staffData = await staffRes.json();

      // Fetch classrooms
      const classroomRes = await fetch('http://localhost:5000/api/classrooms', { headers });
      const classroomData = await classroomRes.json();

      setSubjects(subjectData || []);
      setStaff(staffData || []);
      setClassrooms(classroomData || []);
    } catch (error) {
      console.error('Error fetching department data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch department data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTimetable = async () => {
    setIsGenerating(true);
    
    try {
      // Simple AI-like timetable generation logic
      const newTimetable: TimetableEntry[] = [];
      const usedSlots = new Set<string>();
      const staffWorkload = new Map<string, number>();
      
      // Initialize staff workload tracking
      staff.forEach(s => staffWorkload.set(s.id, 0));

      for (const subject of subjects) {
        // Find available staff for this subject
        const availableStaff = staff.filter(s => {
          const selectedSubjects = s.subjects_selected ? s.subjects_selected.split(',') : [];
          return selectedSubjects.includes(subject.id) || selectedSubjects.length === 0;
        });

        if (availableStaff.length === 0) continue;

        // Calculate classes needed based on credits
        const classesNeeded = Math.max(subject.credits, 1);

        for (let i = 0; i < classesNeeded; i++) {
          // Find available time slot
          let slotFound = false;
          
          for (const day of daysOfWeek) {
            if (slotFound) break;
            
            for (const timeSlot of timeSlots) {
              const slotKey = `${day}-${timeSlot}`;
              
              if (usedSlots.has(slotKey)) continue;

              // Find staff with least workload
              const selectedStaff = availableStaff.reduce((prev, current) => {
                const prevWorkload = staffWorkload.get(prev.id) || 0;
                const currentWorkload = staffWorkload.get(current.id) || 0;
                return currentWorkload < prevWorkload ? current : prev;
              });

              // Check if staff is already assigned at this time
              const staffConflict = newTimetable.some(entry => 
                entry.staff_id === selectedStaff.id && 
                entry.day === day && 
                entry.time_slot === timeSlot
              );

              if (staffConflict) continue;

              // Find available classroom
              const availableClassroom = classrooms.find(classroom => {
                return !newTimetable.some(entry => 
                  entry.classroom_id === classroom.id && 
                  entry.day === day && 
                  entry.time_slot === timeSlot
                );
              });

              if (!availableClassroom) continue;

              // Add to timetable
              newTimetable.push({
                day,
                time_slot: timeSlot,
                subject_id: subject.id,
                staff_id: selectedStaff.id,
                classroom_id: availableClassroom.id,
                department_id: selectedDepartment,
              });

              // Update workload
              staffWorkload.set(selectedStaff.id, (staffWorkload.get(selectedStaff.id) || 0) + 1);
              usedSlots.add(slotKey);
              slotFound = true;
              break;
            }
          }
        }
      }

      setGeneratedTimetable(newTimetable);
      toast({
        title: "Success",
        description: `Generated timetable with ${newTimetable.length} classes`,
      });
    } catch (error) {
      console.error('Error generating timetable:', error);
      toast({
        title: "Error",
        description: "Failed to generate timetable",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveTimetable = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/timetables', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department_id: selectedDepartment,
          timetable: generatedTimetable
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Timetable saved successfully!",
        });
      } else {
        throw new Error(result.error || 'Failed to save timetable');
      }
    } catch (error) {
      console.error('Error saving timetable:', error);
      toast({
        title: "Error",
        description: "Failed to save timetable",
        variant: "destructive",
      });
    }
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.code || 'Unknown';
  };

  const getStaffName = (staffId: string) => {
    return staff.find(s => s.id === staffId)?.name || 'Unknown';
  };

  const getClassroomName = (classroomId: string) => {
    return classrooms.find(c => c.id === classroomId)?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Timetable Generator</h1>
              <p className="text-sm text-gray-600">Generate optimized class schedules</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generate Timetable</CardTitle>
            <CardDescription>Select department and generate AI-optimized timetable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Department</label>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={setSelectedDepartment}
                  disabled={user?.role === 'dept_admin'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={generateTimetable}
                  disabled={!selectedDepartment || isGenerating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
                {generatedTimetable.length > 0 && (
                  <>
                    <Button onClick={saveTimetable} variant="outline">
                      Save Timetable
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedDepartment && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{subjects.length}</div>
                <div className="text-sm text-gray-600">Subjects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{staff.length}</div>
                <div className="text-sm text-gray-600">Staff Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{classrooms.length}</div>
                <div className="text-sm text-gray-600">Classrooms</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{generatedTimetable.length}</div>
                <div className="text-sm text-gray-600">Generated Classes</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Generated Timetable */}
        {generatedTimetable.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Timetable</CardTitle>
              <CardDescription>AI-optimized class schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-3 bg-gray-50 text-left">Time</th>
                      {daysOfWeek.map(day => (
                        <th key={day} className="border border-gray-300 p-3 bg-gray-50 text-center">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(timeSlot => (
                      <tr key={timeSlot}>
                        <td className="border border-gray-300 p-3 font-medium bg-gray-50">
                          {timeSlot}
                        </td>
                        {daysOfWeek.map(day => {
                          const entry = generatedTimetable.find(
                            t => t.day === day && t.time_slot === timeSlot
                          );
                          return (
                            <td key={`${day}-${timeSlot}`} className="border border-gray-300 p-3">
                              {entry ? (
                                <div className="space-y-1">
                                  <Badge variant="default" className="text-xs">
                                    {getSubjectName(entry.subject_id)}
                                  </Badge>
                                  <div className="text-xs text-gray-600">
                                    <div>{getStaffName(entry.staff_id)}</div>
                                    <div>{getClassroomName(entry.classroom_id)}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-400 text-center text-sm">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TimetableGenerator;