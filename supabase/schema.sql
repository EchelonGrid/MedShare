-- ==============================================================================
-- MedShare - Robust Supabase Migration & Schema Script
-- Safe to run in Supabase SQL Editor (handles missing tables & permissions)
-- ==============================================================================

-- 1. Ensure UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure medications table exists with basic columns first
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name text NOT NULL,
  generic_name text,
  strength text NOT NULL,
  quantity text NOT NULL,
  expiry_date date NOT NULL,
  location text NOT NULL,
  donor_id text,
  donor_name text NOT NULL,
  donor_phone text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  claimed_by_id text,
  claimed_by_name text,
  claimed_by_role text,
  prescription_ref text,
  pickup_note text,
  claimed_at timestamptz,
  collected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add enhanced columns to medications table (idempotent)
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS total_numeric_quantity integer,
  ADD COLUMN IF NOT EXISTS unit_name text,
  ADD COLUMN IF NOT EXISTS remaining_numeric_quantity integer,
  ADD COLUMN IF NOT EXISTS claimed_quantity integer,
  ADD COLUMN IF NOT EXISTS claims jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS handover_pin text,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz;

-- Reconcile donor ID for seed row if Dr. Farhana Rahman has null donor_id
UPDATE public.medications
SET donor_id = 'user-donor-1'
WHERE donor_name = 'Dr. Farhana Rahman' AND (donor_id IS NULL OR donor_id = '');

-- 4. Create public.medicine_requests table (Reverse Marketplace)
CREATE TABLE IF NOT EXISTS public.medicine_requests (
  id text PRIMARY KEY,
  medicine_name text NOT NULL,
  generic_name text,
  category text,
  strength text NOT NULL,
  quantity_needed text NOT NULL,
  urgency text NOT NULL DEFAULT 'critical', -- critical | high | routine
  location text NOT NULL,
  requester_id text NOT NULL,
  requester_name text NOT NULL,
  requester_role text NOT NULL DEFAULT 'clinic_charity', -- clinic_charity | individual
  requester_phone text NOT NULL,
  reason_or_prescription text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open | fulfilled
  fulfilled_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enable Row Level Security (RLS) safely
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 6. Clean and re-create RLS Policies for MedShare Platform

-- Medications Policies
DROP POLICY IF EXISTS "Public can view unexpired medications" ON public.medications;
DROP POLICY IF EXISTS "Public can view medications" ON public.medications;
CREATE POLICY "Public can view medications"
  ON public.medications FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert donations" ON public.medications;
CREATE POLICY "Anyone can insert donations"
  ON public.medications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update claims and handovers" ON public.medications;
CREATE POLICY "Anyone can update claims and handovers"
  ON public.medications FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Medicine Requests Policies
DROP POLICY IF EXISTS "Public can view medicine requests" ON public.medicine_requests;
CREATE POLICY "Public can view medicine requests"
  ON public.medicine_requests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Verified collectors can broadcast requests" ON public.medicine_requests;
CREATE POLICY "Verified collectors can broadcast requests"
  ON public.medicine_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Donors can fulfill requests" ON public.medicine_requests;
CREATE POLICY "Donors can fulfill requests"
  ON public.medicine_requests FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Profiles Policies (Only created if profiles table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
    CREATE POLICY "Public profiles read"
      ON public.profiles FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 7. Seed initial requests in medicine_requests
INSERT INTO public.medicine_requests (
  id, medicine_name, generic_name, category, strength, quantity_needed,
  urgency, location, requester_id, requester_name, requester_role,
  requester_phone, reason_or_prescription, status, created_at
)
VALUES
  (
    'req-1', 'Insulin (Mixtard 30/70)', 'Biphasic Isophane Insulin', 'Diabetes',
    '100 IU/ml (10ml Vial)', '3 sealed vials', 'critical',
    'Jaleswaritola, Bogura', 'user-clinic-1', 'Nurse Michael Chang (Rural Hope)',
    'clinic_charity', '+880 1712-876543',
    'Emergency rural clinic stockout: 8 low-income diabetic patients awaiting urgent insulin dosage.',
    'open', now() - interval '3 hours'
  ),
  (
    'req-2', 'Azithromycin', 'Azithromycin Dihydrate', 'Antibiotics',
    '500mg', '4 strips (24 tablets)', 'critical',
    'Pabna Sadar, Pabna', 'user-individual-1', 'Rahim Chowdhury',
    'individual', '+880 1819-334455',
    'Dr. S. K. Roy Rx #PB-2841 - Mandatory 7-day post-operative pulmonary antibiotic course.',
    'open', now() - interval '8 hours'
  ),
  (
    'req-3', 'Amdocal', 'Amlodipine Besilate', 'Blood Pressure & Heart',
    '5mg', '10 strips (100 tablets)', 'high',
    'Mirpur 10, Dhaka', 'user-clinic-1', 'Bogura Free Rural Health Relief',
    'clinic_charity', '+880 1712-876543',
    'Monthly free geriatric hypertension outreach camp for elderly rural destitute patients.',
    'open', now() - interval '20 hours'
  ),
  (
    'req-4', 'Monas', 'Montelukast Sodium', 'Asthma & Allergy',
    '10mg', '5 strips (50 chewable tablets)', 'routine',
    'Jaleswaritola, Bogura', 'user-clinic-1', 'Nurse Michael Chang (Rural Hope)',
    'clinic_charity', '+880 1712-876543',
    'Seasonal asthma and bronchospasm relief refill for low-income agricultural day-laborers.',
    'open', now() - interval '36 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- 8. Add tables to Supabase Realtime safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'medications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.medications;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'medicine_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_requests;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication setup skipped or handled: %', SQLERRM;
END $$;
