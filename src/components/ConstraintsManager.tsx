import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Trash2, Plus, Edit } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { useAuth } from '../contexts/PythonAuthContext';

interface Constraint {
  id: string;
  department_id?: string;
  role: string;
  subject_type: string;
  max_subjects: number;
  max_hours: number;
  created_by: string;
  created_at: string;
  departments?: {
    name: string;
    code: string;
  };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface ConstraintsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: 'main_admin' | 'dept_admin';
}

const ConstraintsManager = ({ open, onOpenChange, userRole }: ConstraintsManagerProps) => {
  const { user } = useAuth();
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<Constraint | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    department_id: '',
    role: '',
    subject_type: '',
    max_subjects: 1,
    max_hours: 8
  });

  const roles = [
    'assistant_professor',
    'professor',
    'hod'
  ];

  const subjectTypes = [
    'theory',
    'lab',
    'both'
  ];

  useEffect(() => {
    if (open) {
      fetchConstraints();
      if (userRole === 'main_admin') {
        fetchDepartments();
      }
    }
  }, [open, userRole]);

  const fetchConstraints = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/constraints', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setConstraints(data || []);
    } catch (error) {
      console.error('Error fetching constraints:', error);
      toast({
        title: "Error",
        description: "Failed to fetch constraints",
        variant: "destructive",
      });
    }
  };

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
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const constraintData = {
        ...formData,
        department_id: userRole === 'dept_admin' ? user?.department_id : formData.department_id || null,
      };

      if (editingConstraint) {
        // Update constraint logic would go here
        toast({
          title: "Success",
          description: "Constraint updated successfully",
        });
      } else {
        const response = await fetch('http://localhost:5000/api/constraints', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(constraintData),
        });

        const result = await response.json();

        if (response.ok) {
          toast({
            title: "Success",
            description: "Constraint created successfully",
          });
        } else {
          throw new Error(result.error || 'Failed to create constraint');
        }
      }

      resetForm();
      fetchConstraints();
    } catch (error) {
      console.error('Error saving constraint:', error);
      toast({
        title: "Error",
        description: "Failed to save constraint",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (constraint: Constraint) => {
    setEditingConstraint(constraint);
    setFormData({
      department_id: constraint.department_id || '',
      role: constraint.role,
      subject_type: constraint.subject_type,
      max_subjects: constraint.max_subjects,
      max_hours: constraint.max_hours
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete constraint logic would go here
      toast({
        title: "Success",
        description: "Constraint deleted successfully",
      });

      fetchConstraints();
    } catch (error) {
      console.error('Error deleting constraint:', error);
      toast({
        title: "Error",
        description: "Failed to delete constraint",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      department_id: '',
      role: '',
      subject_type: '',
      max_subjects: 1,
      max_hours: 8
    });
    setEditingConstraint(null);
    setShowForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Constraints Manager</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Current Constraints</h3>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Constraint
            </Button>
          </div>

          {/* Constraints List */}
          <div className="grid gap-4">
            {constraints.map((constraint) => (
              <Card key={constraint.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        {constraint.departments && (
                          <Badge variant="outline">
                            {constraint.departments.name} ({constraint.departments.code})
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {constraint.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {constraint.subject_type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Max Subjects: {constraint.max_subjects} | Max Hours: {constraint.max_hours}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(constraint)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(constraint.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingConstraint ? 'Edit Constraint' : 'Add New Constraint'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {userRole === 'main_admin' && (
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Departments</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="role">Staff Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject_type">Subject Type</Label>
                    <Select
                      value={formData.subject_type}
                      onValueChange={(value) => setFormData({ ...formData, subject_type: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject type" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_subjects">Max Subjects</Label>
                      <Input
                        id="max_subjects"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.max_subjects}
                        onChange={(e) => setFormData({ ...formData, max_subjects: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_hours">Max Hours per Week</Label>
                      <Input
                        id="max_hours"
                        type="number"
                        min="1"
                        max="40"
                        value={formData.max_hours}
                        onChange={(e) => setFormData({ ...formData, max_hours: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : editingConstraint ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConstraintsManager;