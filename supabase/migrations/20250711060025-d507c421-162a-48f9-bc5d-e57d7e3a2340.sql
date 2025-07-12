
-- Create constraints table
CREATE TABLE public.constraints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES public.departments(id),
  role TEXT NOT NULL CHECK (role IN ('assistant_professor', 'professor', 'hod')),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('theory', 'lab', 'both')),
  max_subjects INTEGER NOT NULL DEFAULT 1,
  max_hours INTEGER NOT NULL DEFAULT 8,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.constraints ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for constraints
CREATE POLICY "Main admins can manage all constraints" 
  ON public.constraints 
  FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_admin')
  );

CREATE POLICY "Dept admins can manage department constraints" 
  ON public.constraints 
  FOR ALL 
  USING (
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid() AND role = 'dept_admin'
    ) OR department_id IS NULL
  );

CREATE POLICY "Users can view applicable constraints" 
  ON public.constraints 
  FOR SELECT 
  USING (
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    ) OR department_id IS NULL
  );
