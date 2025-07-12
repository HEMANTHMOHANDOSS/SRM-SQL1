
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/PythonAuthContext';


import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, BookOpen, Users, MapPin, Calendar } from 'lucide-react';
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
  id: string;
  day: string;
  time_slot: string;
  subjects: Subject;
  profiles: Staff;
  classrooms: Classroom;
}

const DepartmentWorkspace = () => {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [department, setDepartment] = useState<Department | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'];

  useEffect(() => {
    if (deptId) {
      fetchDepartmentWorkspace();
    }
  }, [deptId]);

  const fetchDepartmentWorkspace = async () => {
    try {
      // Fetch department info
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('id', deptId)
        .single();

      if (deptError) throw deptError;

      // Fetch subjects
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('department_id', deptId)
        .order('name');

      if (subjectError) throw subjectError;

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('*')
        .eq('department_id', deptId)
        .eq('role', 'staff')
        .order('name');

      if (staffError) throw staffError;

      // Fetch classrooms
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('department_id', deptId)
        .order('name');

      if (classroomError) throw classroomError;

      // Fetch timetable
      const { data: timetableData, error: timetableError } = await supabase
        .from('timetables')
        .select(`
          *,
          subjects (id, name, code, credits),
          profiles (id, name, staff_role),
          classrooms (id, name, capacity)
        `)
        .eq('department_id', deptId)
        .order('day, time_slot');

      if (timetableError) throw timetableError;

      setDepartment(deptData);
      setSubjects(subjectData || []);
      setStaff(staffData || []);
      setClassrooms(classroomData || []);
      setTimetable(timetableData || []);
    } catch (error) {
      console.error('Error fetching department workspace:', error);
      toast({
        title: "Error",
        description: "Failed to fetch department data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Department Not Found</h2>
          <p className="text-gray-600 mb-4">The requested department could not be found.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
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
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{department.name}</h1>
              <p className="text-sm text-gray-600">Department Code: {department.code}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => navigate('/timetable-generator')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Generate Timetable
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subjects.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Staff</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{staff.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Classrooms</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{classrooms.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Classes</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{timetable.length}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest department updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Timetable generated</p>
                        <p className="text-xs text-gray-600">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">New staff member added</p>
                        <p className="text-xs text-gray-600">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Subject updated</p>
                        <p className="text-xs text-gray-600">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common department tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-16 flex flex-col">
                      <BookOpen className="h-5 w-5 mb-1" />
                      <span className="text-xs">Add Subject</span>
                    </Button>
                    <Button variant="outline" className="h-16 flex flex-col">
                      <Users className="h-5 w-5 mb-1" />
                      <span className="text-xs">Add Staff</span>
                    </Button>
                    <Button variant="outline" className="h-16 flex flex-col">
                      <MapPin className="h-5 w-5 mb-1" />
                      <span className="text-xs">Add Room</span>
                    </Button>
                    <Button variant="outline" className="h-16 flex flex-col">
                      <Calendar className="h-5 w-5 mb-1" />
                      <span className="text-xs">View Schedule</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Subjects</CardTitle>
                <CardDescription>Manage curriculum and subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => (
                    <Card key={subject.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{subject.name}</h3>
                          <Badge variant="outline">{subject.credits} Credits</Badge>
                        </div>
                        <p className="text-sm text-gray-600">Code: {subject.code}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Staff</CardTitle>
                <CardDescription>Faculty and staff members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{member.name}</h3>
                          <Badge variant="secondary">
                            {member.staff_role?.replace('_', ' ').toUpperCase() || 'Staff'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Subjects: {member.subjects_selected ? 
                            JSON.parse(member.subjects_selected).length : 0}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetable" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Timetable</CardTitle>
                <CardDescription>Current class schedule</CardDescription>
              </CardHeader>
              <CardContent>
                {timetable.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 p-3 bg-gray-50">Time</th>
                          {daysOfWeek.map(day => (
                            <th key={day} className="border border-gray-300 p-3 bg-gray-50">
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
                              const entry = timetable.find(
                                t => t.day === day && t.time_slot === timeSlot
                              );
                              return (
                                <td key={`${day}-${timeSlot}`} className="border border-gray-300 p-3">
                                  {entry ? (
                                    <div className="space-y-1">
                                      <Badge variant="default" className="text-xs">
                                        {entry.subjects.code}
                                      </Badge>
                                      <div className="text-xs text-gray-600">
                                        <div>{entry.profiles.name}</div>
                                        <div>{entry.classrooms.name}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 text-center">-</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No timetable available</p>
                    <p className="text-sm">Generate a timetable to see the schedule</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DepartmentWorkspace;
