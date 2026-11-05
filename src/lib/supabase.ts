import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Medication, UserProfile, VerificationStatus, MedicineCategory, BatchClaim, ClaimRecord, UserRole } from '@/types/medshare';
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
  role: UserRole;
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
    undefined;

  const claimExpiresAt =
    db.claim_expires_at ||
    (richMeta?.claimExpiresAt as string | undefined) ||
    localFallback?.claimExpiresAt ||
    (db.status === 'claimed' ? new Date(Date.now() + 44 * 60 * 60 * 1000).toISOString() : undefined);

  // Preserve donorId: if db has null, check fallback only if donorName matches, richMeta, or match known demo donors
  let donorId = db.donor_id || (richMeta?.donorId as string | undefined);
  if (
    !donorId &&
    localFallback &&
    localFallback.donorName &&
    db.donor_name &&
    localFallback.donorName.trim().toLowerCase() === db.donor_name.trim().toLowerCase()
  ) {
    donorId = localFallback.donorId;
  }
  if (!donorId && db.donor_name === 'Dr. Farhana Rahman') {
    donorId = 'user-donor-1';
  }

  let claimedById = db.claimed_by_id || (richMeta?.claimedById as string | undefined);
  if (
    !claimedById &&
    localFallback &&
    localFallback.claimedByName &&
    db.claimed_by_name &&
    localFallback.claimedByName.trim().toLowerCase() === db.claimed_by_name.trim().toLowerCase()
  ) {
    claimedById = localFallback.claimedById;
  }
  if (!claimedById && db.status === 'collected') {
    claimedById = 'user-clinic-1';
  }

  let claimedByName = db.claimed_by_name || (richMeta?.claimedByName as string | undefined);
  if (
    !claimedByName &&
    localFallback &&
    localFallback.claimedByName &&
    localFallback.status === db.status
  ) {
    claimedByName = localFallback.claimedByName;
  }
  if (!claimedByName && db.status === 'collected') {
    claimedByName = 'Nurse Michael Chang (Rural Hope)';
  }

  let claimedByRole =
    (db.claimed_by_role as UserRole | undefined) ||
    (richMeta?.claimedByRole as UserRole | undefined);
  if (!claimedByRole && localFallback && localFallback.claimedByRole && localFallback.status === db.status) {
    claimedByRole = localFallback.claimedByRole;
  }
  if (!claimedByRole && db.status === 'collected') {
    claimedByRole = 'clinic_charity';
  }

  // Synthesize activeClaims from db.claims and single-claim fields
  const rawActiveClaims: ClaimRecord[] =
    (richMeta?.activeClaims as ClaimRecord[] | undefined) ||
    localFallback?.activeClaims ||
    [];

  const activeClaims: ClaimRecord[] = [...rawActiveClaims];

  if (claims.length > 0) {
    claims.forEach((bc) => {
      const existingIdx = activeClaims.findIndex((ac) => ac.claimId === bc.id);
      const isCollected = bc.status === 'collected' || db.status === 'collected';
      const record: ClaimRecord = {
        claimId: bc.id,
        collectorId: bc.claimerId,
        collectorName: bc.claimerName,
        collectorRole: bc.claimerRole,
        collectorPhone: undefined,
        organizationOrRx: bc.prescriptionRef,
        quantityClaimed: bc.claimedQuantity,
        unitName: bc.unitName || unit,
        handoverPin: bc.handoverPin || handoverPin || '0000',
        claimedAt: bc.claimedAt || new Date().toISOString(),
        claimExpiresAt: bc.claimExpiresAt || claimExpiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        collectedAt: isCollected ? (db.collected_at || new Date().toISOString()) : undefined,
        status: isCollected ? ('collected' as const) : ('pending_pickup' as const),
      };
      if (existingIdx >= 0) {
        activeClaims[existingIdx] = { ...activeClaims[existingIdx], ...record };
      } else {
        activeClaims.push(record);
      }
    });
  } else if ((db.status === 'claimed' || db.status === 'collected') && handoverPin) {
    const isCollected = db.status === 'collected';
    const existingIdx = activeClaims.findIndex((ac) => ac.claimId === db.id);
    const record: ClaimRecord = {
      claimId: db.id,
      collectorId: claimedById || 'collector-anon',
      collectorName: claimedByName || 'Verified Collector',
      collectorRole: claimedByRole || 'individual',
      collectorPhone: undefined,
      organizationOrRx: db.prescription_ref || undefined,
      quantityClaimed: db.claimed_quantity ?? total,
      unitName: unit,
      handoverPin: handoverPin,
      claimedAt: db.claimed_at || new Date().toISOString(),
      claimExpiresAt: claimExpiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      collectedAt: isCollected ? (db.collected_at || new Date().toISOString()) : undefined,
      status: isCollected ? ('collected' as const) : ('pending_pickup' as const),
    };
    if (existingIdx >= 0) {
      activeClaims[existingIdx] = { ...activeClaims[existingIdx], ...record };
    } else {
      activeClaims.push(record);
    }
  }

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
    activeClaims,
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

export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Normalizes NID or Organization Registration numbers by stripping
 * whitespace, hyphens, and other standard formatting artifacts.
 */
export function normalizeRegistrationOrNid(id?: string | null): string {
  if (!id || typeof id !== 'string') return '';
  return id.replace(/[\s-]/g, '').trim().toUpperCase();
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

  const safeId = isValidUuid(app.id) ? app.id : undefined;
  const safeDonorId = isValidUuid(app.donorId) ? app.donorId : null;
  const safeClaimedById = isValidUuid(app.claimedById) ? app.claimedById : null;

  return {
    ...(safeId && { id: safeId }),
    medicine_name: app.medicineName,
    generic_name: app.genericName || null,
    category: app.category || null,
    strength: app.strength,
    quantity: app.quantity,
    total_numeric_quantity: app.totalNumericQuantity ?? null,
    unit_name: app.unitName ?? null,
    remaining_numeric_quantity: app.remainingNumericQuantity !== undefined ? app.remainingNumericQuantity : null,
    claimed_quantity: app.claimedQuantity ?? null,
    claims: app.claims || [],
    handover_pin: app.handoverPin || null,
    claim_expires_at: app.claimExpiresAt || null,
    expiry_date: app.expiryDate,
    location: app.location,
    donor_id: safeDonorId,
    donor_name: app.donorName,
    donor_phone: app.donorPhone,
    status: app.status,
    claimed_by_id: safeClaimedById,
    claimed_by_name: app.claimedByName || null,
    claimed_by_role: app.claimedByRole || null,
    prescription_ref: app.prescriptionRef || null,
    pickup_note: JSON.stringify(metaObj),
  };
}

export function mapDbProfileToApp(db: DbProfile): UserProfile {
  const vStatus = (db.verification_status as VerificationStatus) || 'unverified';
  const role: UserRole =
    (db.role as string) === 'clinic_charity' || (db.role as string) === 'admin'
      ? (db.role as UserRole)
      : 'individual';
  return {
    id: db.id,
    name: db.name || 'Anonymous User',
    email: db.email || '',
    role,
    phone: db.phone || '',
    location: db.location || '',
    verificationStatus: vStatus,
    isVerified: vStatus === 'verified',
    organizationName: db.organization_name || undefined,
    registrationOrNid: db.registration_or_nid || undefined,
  };
}
