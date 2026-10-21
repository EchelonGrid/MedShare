import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Medication, UserProfile, VerificationStatus } from '@/types/medshare';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Database <-> Application DTO helpers
export interface DbMedication {
  id: string;
  medicine_name: string;
  generic_name?: string | null;
  strength: string;
  quantity: string;
  expiry_date: string;
  location: string;
  donor_id?: string | null;
  donor_name: string;
  donor_phone: string;
  status: 'available' | 'claimed' | 'collected';
  claimed_by_id?: string | null;
  claimed_by_name?: string | null;
  claimed_by_role?: string | null;
  prescription_ref?: string | null;
  pickup_note?: string | null;
  claimed_at?: string | null;
  collected_at?: string | null;
  created_at: string;
}

export interface DbProfile {
  id: string;
  name: string;
  email: string;
  role: 'donor' | 'clinic_charity' | 'individual';
  phone?: string | null;
  location?: string | null;
  organization_name?: string | null;
  registration_or_nid?: string | null;
  verification_status?: string | null;
  created_at?: string | null;
}

export function mapDbMedicationToApp(db: DbMedication): Medication {
  return {
    id: db.id,
    medicineName: db.medicine_name,
    genericName: db.generic_name || undefined,
    strength: db.strength,
    quantity: db.quantity,
    expiryDate: db.expiry_date,
    location: db.location,
    donorId: db.donor_id || undefined,
    donorName: db.donor_name,
    donorPhone: db.donor_phone,
    status: db.status,
    claimedById: db.claimed_by_id || undefined,
    claimedByName: db.claimed_by_name || undefined,
    claimedByRole: (db.claimed_by_role as any) || undefined,
    prescriptionRef: db.prescription_ref || undefined,
    pickupNote: db.pickup_note || undefined,
    claimedAt: db.claimed_at || undefined,
    collectedAt: db.collected_at || undefined,
    createdAt: db.created_at,
  };
}

export function mapAppMedicationToDb(app: Omit<Medication, 'id' | 'createdAt'> & { id?: string }): Partial<DbMedication> {
  return {
    ...(app.id && { id: app.id }),
    medicine_name: app.medicineName,
    generic_name: app.genericName || null,
    strength: app.strength,
    quantity: app.quantity,
    expiry_date: app.expiryDate,
    location: app.location,
    donor_id: app.donorId || null,
    donor_name: app.donorName,
    donor_phone: app.donorPhone,
    status: app.status,
    claimed_by_id: app.claimedById || null,
    claimed_by_name: app.claimedByName || null,
    claimed_by_role: app.claimedByRole || null,
    prescription_ref: app.prescriptionRef || null,
    pickup_note: app.pickupNote || null,
  };
}

export function mapDbProfileToApp(db: DbProfile): UserProfile {
  const vStatus = (db.verification_status as VerificationStatus) || 'unverified';
  return {
    id: db.id,
    name: db.name || 'Anonymous User',
    email: db.email || '',
    role: db.role || 'individual',
    phone: db.phone || '',
    location: db.location || '',
    verificationStatus: vStatus,
    isVerified: vStatus === 'verified',
    organizationName: db.organization_name || undefined,
    registrationOrNid: db.registration_or_nid || undefined,
  };
}
