
-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('main_admin', 'dept_admin', 'staff')),
  department_id UUID REFERENCES public.departments(id),
  staff_role TEXT CHECK (staff_role IN ('assistant_professor', 'professor', 'hod')),
  subjects_selected TEXT,
  subjects_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  credits INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classrooms table
CREATE TABLE public.classrooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create timetables table
CREATE TABLE public.timetables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id),
  day TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  staff_id UUID NOT NULL REFERENCES public.profiles(id),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Main admins can manage departments" ON public.departments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_admin')
);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Main admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_admin')
);
CREATE POLICY "Dept admins can view department profiles" ON public.profiles FOR SELECT USING (
  department_id IN (
    SELECT department_id FROM public.profiles WHERE id = auth.uid() AND role = 'dept_admin'
  )
);

-- RLS Policies for subjects
CREATE POLICY "Users can view department subjects" ON public.subjects FOR SELECT USING (
  department_id IN (
    SELECT department_id FROM public.profiles WHERE id = auth.uid()
  )
);
CREATE POLICY "Dept admins can manage department subjects" ON public.subjects FOR ALL USING (
  department_id IN (
    SELECT department_id FROM public.profiles WHERE id = auth.uid() AND role IN ('dept_admin', 'main_admin')
  )
);

-- RLS Policies for classrooms
CREATE POLICY "Users can view department classrooms" ON public.classrooms FOR SELECT USING (
  department_id IN (
    SELECT department_id FROM public.profiles WHERE id = auth.uid()
  )
);
CREATE POLICY "Dept admins can manage department classrooms" ON public.classrooms FOR ALL USING (
  department_id IN (
    SELECT department_id FROM public.profiles WHERE id = auth.uid() AND role IN ('dept_admin', 'main_admin')
  )
);

-- RLS Policies for timetables
CREATE POLICY "Users can view department timetables" ON public.timetables FOR SELECT USING (
  department_id IN (
    SELECT department_id FROM public.profiles WHERE id = auth.uid()
  )
);
CREATE POLICY "Dept admins can manage department timetables" ON public.timetables FOR ALL USING (
  department_id IN (
    SELECT department_id FROM public.profiles WHERE id = auth.uid() AND role IN ('dept_admin', 'main_admin')
  )
);

-- Insert sample departments
INSERT INTO public.departments (name, code) VALUES
('Computer Science Engineering', 'CSE'),
('Electronics & Communication Engineering', 'ECE'),
('Mechanical Engineering', 'MECH'),
('Civil Engineering', 'CIVIL'),
('Information Technology', 'IT');

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
