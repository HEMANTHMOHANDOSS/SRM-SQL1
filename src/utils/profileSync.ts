
import { backendApi, User } from '@/services/backendApi';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'main_admin' | 'dept_admin' | 'staff';
  department_id?: string;
  staff_role?: 'assistant_professor' | 'professor' | 'hod';
  subjects_selected?: string[];
  subjects_locked?: boolean;
}

export const syncUserProfile = async (user: User): Promise<UserProfile | null> => {
  if (!user) return null;

  try {
    console.log('Syncing user profile for:', user.id);

    // Convert backend user to UserProfile format
    const profile: UserProfile = {
      id: user.id,
      email: user.email || '',
      name: user.name,
      role: user.role,
      department_id: user.department_id,
      staff_role: undefined, // This would need to be added to the backend User interface
      subjects_selected: [], // This would need to be fetched separately
      subjects_locked: false, // This would need to be fetched separately
    };

    return profile;
  } catch (error) {
    console.error('Error syncing user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
  try {
    // Convert UserProfile updates to backend User format
    const backendUpdates: Partial<User> = {
      name: updates.name,
      email: updates.email,
      role: updates.role,
      department_id: updates.department_id,
    };

    const result = await backendApi.updateUser(userId, backendUpdates);
    
    if (!result.success) {
      console.error('Error updating profile:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};
