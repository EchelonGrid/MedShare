import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Medication, UserProfile, VerificationStatus, MedicineCategory, BatchClaim, UserRole } from '@/types/medshare';
import { inferCategory } from '@/lib/medicine-dictionary';
import { parseQuantity } from '@/lib/seed';

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
  category?: string | null;
  strength: string;
  quantity: string;
  total_numeric_quantity?: number | null;
  unit_name?: string | null;
  remaining_numeric_quantity?: number | null;
  claimed_quantity?: number | null;
  claims?: BatchClaim[] | null;
  handover_pin?: string | null;
  claim_expires_at?: string | null;
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

export function mapDbMedicationToApp(db: DbMedication, localFallback?: Medication): Medication {
  // Extract any serialized rich metadata stored in pickup_note
  let richMeta: Record<string, unknown> | null = null;
  let originalNote = db.pickup_note;

  if (db.pickup_note && typeof db.pickup_note === 'string' && db.pickup_note.startsWith('{')) {
    try {
      richMeta = JSON.parse(db.pickup_note);
      originalNote = (richMeta?.pickupNoteText as string) || undefined;
    } catch {
      // not JSON, retain as plain note
    }
  }

  const parsedQty = parseQuantity(db.quantity);
  const total =
    db.total_numeric_quantity ??
    (richMeta?.totalNumericQuantity as number | undefined) ??
    localFallback?.totalNumericQuantity ??
    parsedQty.total;

  const unit =
    db.unit_name ||
    (richMeta?.unitName as string | undefined) ||
    localFallback?.unitName ||
    parsedQty.unit;

  const remaining =
    db.remaining_numeric_quantity ??
    (richMeta?.remainingNumericQuantity as number | undefined) ??
    localFallback?.remainingNumericQuantity ??
    (db.status === 'claimed' || db.status === 'collected' ? 0 : total);

  const resolvedCategory: MedicineCategory = (
    (db.category as MedicineCategory | undefined) ||
    (richMeta?.category as MedicineCategory | undefined) ||
    localFallback?.category ||
    inferCategory(db.medicine_name, db.generic_name || undefined)
  );

  const claims: BatchClaim[] =
    db.claims ||
    (richMeta?.claims as BatchClaim[] | undefined) ||
    localFallback?.claims ||
    [];

  const handoverPin =
    db.handover_pin ||
    (richMeta?.handoverPin as string | undefined) ||
    localFallback?.handoverPin ||
    (db.status === 'claimed' ? '4829' : undefined);

  const claimExpiresAt =
    db.claim_expires_at ||
    (richMeta?.claimExpiresAt as string | undefined) ||
    localFallback?.claimExpiresAt ||
    (db.status === 'claimed' ? new Date(Date.now() + 44 * 60 * 60 * 1000).toISOString() : undefined);

  // Preserve donorId: if db has null, check fallback, richMeta, or match known demo donors
  const donorId =
    db.donor_id ||
    (richMeta?.donorId as string | undefined) ||
    localFallback?.donorId ||
    (db.donor_name === 'Dr. Farhana Rahman' ? 'user-donor-1' : undefined);

  const claimedById =
    db.claimed_by_id ||
    (richMeta?.claimedById as string | undefined) ||
    localFallback?.claimedById ||
    (db.status === 'collected' ? 'user-clinic-1' : undefined);

  const claimedByName =
    db.claimed_by_name ||
    (richMeta?.claimedByName as string | undefined) ||
    localFallback?.claimedByName ||
    (db.status === 'collected' ? 'Nurse Michael Chang (Rural Hope)' : undefined);

  const claimedByRole = (
    (db.claimed_by_role as UserRole | undefined) ||
    (richMeta?.claimedByRole as UserRole | undefined) ||
    localFallback?.claimedByRole ||
    (db.status === 'collected' ? 'clinic_charity' : undefined)
  );

  return {
    id: db.id,
    medicineName: db.medicine_name,
    genericName: db.generic_name || undefined,
    category: resolvedCategory,
    strength: db.strength,
    quantity: db.quantity,
    totalNumericQuantity: total,
    unitName: unit,
    remainingNumericQuantity: remaining,
    claims,
    handoverPin,
    claimExpiresAt,
    expiryDate: db.expiry_date,
    location: db.location,
    donorId,
    donorName: db.donor_name,
    donorPhone: db.donor_phone,
    status: db.status,
    claimedById,
    claimedByName,
    claimedByRole,
    claimedQuantity: db.claimed_quantity ?? (richMeta?.claimedQuantity as number | undefined) ?? localFallback?.claimedQuantity,
    prescriptionRef: db.prescription_ref || undefined,
    pickupNote: originalNote || undefined,
    claimedAt: db.claimed_at || undefined,
    collectedAt: db.collected_at || undefined,
    createdAt: db.created_at,
  };
}

export function mapAppMedicationToDb(app: Omit<Medication, 'id' | 'createdAt'> & { id?: string }): Partial<DbMedication> {
  const metaObj = {
    category: app.category,
    totalNumericQuantity: app.totalNumericQuantity,
    unitName: app.unitName,
    remainingNumericQuantity: app.remainingNumericQuantity,
    claimedQuantity: app.claimedQuantity,
    claims: app.claims,
    handoverPin: app.handoverPin,
    claimExpiresAt: app.claimExpiresAt,
    donorId: app.donorId,
    pickupNoteText: app.pickupNote,
  };

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
    pickup_note: JSON.stringify(metaObj),
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
