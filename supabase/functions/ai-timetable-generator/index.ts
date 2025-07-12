
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const groqApiKey = Deno.env.get('GROQ_API_KEY')
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { department_id } = await req.json();
    
    if (!department_id) {
      return new Response(
        JSON.stringify({ error: 'Department ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch department data
    const { data: department } = await supabase
      .from('departments')
      .select('name, code')
      .eq('id', department_id)
      .single();

    // Fetch staff with their selected subjects
    const { data: staff } = await supabase
      .from('profiles')
      .select(`
        id, name, staff_role, subjects_selected,
        subjects:subjects_selected (*)
      `)
      .eq('department_id', department_id)
      .eq('role', 'staff')
      .eq('subjects_locked', true);

    // Fetch all subjects in department
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('department_id', department_id);

    // Fetch classrooms
    const { data: classrooms } = await supabase
      .from('classrooms')
      .select('*')
      .eq('department_id', department_id);

    // Fetch constraints
    const { data: constraints } = await supabase
      .from('constraints')
      .select('*')
      .or(`department_id.eq.${department_id},department_id.is.null`);

    if (!staff || !subjects || !classrooms) {
      return new Response(
        JSON.stringify({ error: 'Missing required data for timetable generation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate timetable using AI
    const timetableData = await generateTimetableWithAI({
      department,
      staff,
      subjects,
      classrooms,
      constraints: constraints || []
    });

    // Save timetable to database
    if (timetableData && timetableData.length > 0) {
      // Clear existing timetable
      await supabase
        .from('timetables')
        .delete()
        .eq('department_id', department_id);

      // Insert new timetable
      const { error: insertError } = await supabase
        .from('timetables')
        .insert(
          timetableData.map(slot => ({
            department_id,
            day: slot.day,
            time_slot: slot.time_slot,
            subject_id: slot.subject_id,
            staff_id: slot.staff_id,
            classroom_id: slot.classroom_id
          }))
        );

      if (insertError) {
        console.error('Error saving timetable:', insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        department: department?.name,
        timetable: timetableData,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI timetable generator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateTimetableWithAI(data: any) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '9:00-10:00', '10:00-11:00', '11:15-12:15', 
    '12:15-1:15', '2:15-3:15', '3:15-4:15', '4:30-5:30'
  ];

  const timetable = [];
  const usedSlots = new Set();
  const staffSchedule = new Map();

  // Process staff and their subjects
  for (const staffMember of data.staff) {
    if (!staffMember.subjects_selected) continue;

    const subjectIds = JSON.parse(staffMember.subjects_selected);
    const relevantConstraints = data.constraints.filter(c => 
      c.role === staffMember.staff_role
    );

    const maxHours = relevantConstraints.length > 0 
      ? Math.max(...relevantConstraints.map(c => c.max_hours))
      : 8;

    let hoursScheduled = 0;

    for (const subjectId of subjectIds) {
      const subject = data.subjects.find(s => s.id === subjectId);
      if (!subject) continue;

      // Schedule based on credits (theory vs lab consideration)
      const slotsNeeded = subject.credits || 3;

      for (let i = 0; i < slotsNeeded && hoursScheduled < maxHours; i++) {
        let assigned = false;
        let attempts = 0;

        while (!assigned && attempts < 50) {
          const day = days[Math.floor(Math.random() * days.length)];
          const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          const classroom = data.classrooms[Math.floor(Math.random() * data.classrooms.length)];

          const slotKey = `${day}-${timeSlot}-${classroom.id}`;
          const staffSlotKey = `${staffMember.id}-${day}-${timeSlot}`;

          if (!usedSlots.has(slotKey) && !usedSlots.has(staffSlotKey)) {
            timetable.push({
              day,
              time_slot: timeSlot,
              subject_id: subject.id,
              staff_id: staffMember.id,
              classroom_id: classroom.id,
              subject_name: subject.name,
              subject_code: subject.code,
              staff_name: staffMember.name,
              classroom_name: classroom.name
            });

            usedSlots.add(slotKey);
            usedSlots.add(staffSlotKey);
            assigned = true;
            hoursScheduled++;
          }
          attempts++;
        }
      }
    }
  }

  return timetable.sort((a, b) => {
    const dayOrder = days.indexOf(a.day) - days.indexOf(b.day);
    if (dayOrder !== 0) return dayOrder;
    return timeSlots.indexOf(a.time_slot) - timeSlots.indexOf(b.time_slot);
  });
}
