
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { syncUserProfile } from '../utils/profileSync';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'main_admin' | 'dept_admin' | 'staff';
  department_id?: string;
  staff_role?: 'assistant_professor' | 'professor' | 'hod';
  subjects_selected?: string;
  subjects_locked?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncAndSetUser = async () => {
      if (isLoaded) {
        if (clerkUser) {
          try {
            // Create a compatible User object for syncUserProfile
            const compatibleUser = {
              id: clerkUser.id,
              name: clerkUser.fullName || clerkUser.firstName || 'User',
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              role: (clerkUser.publicMetadata?.role as any) || 'staff',
              department_id: clerkUser.publicMetadata?.department_id as string
            };
            
            // Sync user profile with backend
            const profile = await syncUserProfile(compatibleUser);
            
            if (profile) {
              setUser({
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,
                department_id: profile.department_id,
                staff_role: profile.staff_role,
                subjects_selected: Array.isArray(profile.subjects_selected) 
                  ? profile.subjects_selected.join(',') 
                  : profile.subjects_selected || '',
                subjects_locked: profile.subjects_locked
              });
            } else {
              // Fallback to Clerk data if backend sync fails
              setUser({
                id: clerkUser.id,
                email: clerkUser.primaryEmailAddress?.emailAddress || '',
                name: clerkUser.fullName || clerkUser.firstName || 'User',
                role: (clerkUser.publicMetadata?.role as any) || 'staff',
                department_id: clerkUser.publicMetadata?.department_id as string,
                staff_role: clerkUser.publicMetadata?.staff_role as any,
                subjects_selected: '',
                subjects_locked: false
              });
            }
          } catch (error) {
            console.error('Error syncing user profile:', error);
            // Fallback to Clerk data
            setUser({
              id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              name: clerkUser.fullName || clerkUser.firstName || 'User',
              role: (clerkUser.publicMetadata?.role as any) || 'staff',
              department_id: clerkUser.publicMetadata?.department_id as string,
              staff_role: clerkUser.publicMetadata?.staff_role as any,
              subjects_selected: '',
              subjects_locked: false
            });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    };

    syncAndSetUser();
  }, [clerkUser, isLoaded]);

  const signOut = async () => {
    await clerkSignOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!clerkUser && !!user,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
