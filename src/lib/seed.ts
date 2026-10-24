import { Medication, UserProfile, UrgencyLevel, MedicineRequest } from '@/types/medshare';

export function getDaysUntilExpiry(expiryDate?: string | null, baseDate?: Date): number {
  if (!expiryDate || typeof expiryDate !== 'string') return 0;

  const today = baseDate ? new Date(baseDate) : new Date();
  today.setHours(0, 0, 0, 0);

  // Normalize date string (strip time component if present)
  const cleanDate = expiryDate.includes('T') ? expiryDate.split('T')[0] : expiryDate.trim();
  const parts = cleanDate.split('-');

  let target: Date;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    target = new Date(year, month, day);
  } else {
    target = new Date(cleanDate);
  }

  if (isNaN(target.getTime())) {
    return 0;
  }

  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return isNaN(days) ? 0 : days;
}

export function getUrgencyLevel(days: number): UrgencyLevel {
  if (days <= 30) return 'critical';
  if (days <= 60) return 'priority';
  return 'normal';
}

export function getFutureDateISO(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

/**
 * Extracts numeric quantity and unit from human-readable strings like:
 * "3 sealed blister strips (30 tablets)" -> { total: 30, unit: 'tablets' }
 * "2 intact strips (20 capsules)" -> { total: 20, unit: 'capsules' }
 * "3 sealed vials" -> { total: 3, unit: 'vials' }
 * Falls back to { total: 10, unit: 'units' } if unparsable.
 */
export function parseQuantity(quantityStr?: string | null): { total: number; unit: string } {
  if (!quantityStr || typeof quantityStr !== 'string') {
    return { total: 10, unit: 'units' };
  }

  const str = quantityStr.trim();

  // Pattern 1: Inner parentheses count e.g. "(30 tablets)", "(20 capsules)", "(6 tablets)"
  const parenMatch = str.match(/\((\d+)\s*([a-zA-Z]+)\)/);
  if (parenMatch) {
    const total = parseInt(parenMatch[1], 10);
    let unit = parenMatch[2].toLowerCase();
    if (unit === 'tablet' || unit === 'tab' || unit === 'tabs') unit = 'tablets';
    if (unit === 'capsule' || unit === 'cap' || unit === 'caps') unit = 'capsules';
    if (unit === 'strip') unit = 'strips';
    if (unit === 'vial') unit = 'vials';
    if (unit === 'bottle') unit = 'bottles';
    if (unit === 'pack') unit = 'packs';
    if (unit === 'box') unit = 'boxes';
    if (!isNaN(total) && total > 0) {
      return { total, unit };
    }
  }

  // Pattern 2: Direct count + unit e.g. "30 tablets", "4 strips", "3 vials", "1 bottle"
  const directMatch = str.match(
    /(\d+)\s*(tablets?|capsules?|strips?|vials?|bottles?|packs?|boxes?|pieces?|units?|ampoules?)/i
  );
  if (directMatch) {
    const total = parseInt(directMatch[1], 10);
    let unit = directMatch[2].toLowerCase();
    if (!unit.endsWith('s') && !['box'].includes(unit)) {
      unit = unit + 's';
    } else if (unit === 'box') {
      unit = 'boxes';
    }
    if (!isNaN(total) && total > 0) {
      return { total, unit };
    }
  }

  // Pattern 3: Any initial number
  const anyNumMatch = str.match(/(\d+)/);
  if (anyNumMatch) {
    const total = parseInt(anyNumMatch[1], 10);
    if (!isNaN(total) && total > 0) {
      return { total, unit: 'units' };
    }
  }

  return { total: 10, unit: 'units' };
}

/**
 * Generates a random 4-digit numeric handover PIN between "1000" and "9999".
 */
export function generateHandoverPin(): string {
  const pin = Math.floor(1000 + Math.random() * 9000);
  return pin.toString();
}

/**
 * Calculates remaining pickup hold time within a 48-hour anti-ghosting window.
 */
export function getPickupTimeRemaining(claimExpiresAt?: string | null): {
  hours: number;
  minutes: number;
  isExpired: boolean;
  label: string;
} {
  if (!claimExpiresAt) {
    return { hours: 48, minutes: 0, isExpired: false, label: '⏳ 48h hold active' };
  }

  const expiryTime = new Date(claimExpiresAt).getTime();
  const now = Date.now();
  const diffMs = expiryTime - now;

  if (isNaN(expiryTime) || diffMs <= 0) {
    return {
      hours: 0,
      minutes: 0,
      isExpired: true,
      label: '⚠️ 48h Pickup Window Expired',
    };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return {
      hours,
      minutes,
      isExpired: false,
      label: `⏳ ${hours}h ${minutes}m left to pick up`,
    };
  }

  return {
    hours: 0,
    minutes,
    isExpired: false,
    label: `⏳ ${minutes}m left to pick up`,
  };
}

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-donor-1',
    name: 'Dr. Farhana Rahman',
    email: 'farhana@medshare.bd',
    password: 'password123',
    role: 'individual',
    phone: '+880 1711-234567',
    location: 'Mirpur 10, Dhaka',
    verificationStatus: 'verified',
    isVerified: true,
    registrationOrNid: '1987260636123',
  },
  {
    id: 'user-clinic-1',
    name: 'Bogura Free Rural Clinic',
    email: 'clinic@ruralhope.org',
    password: 'password123',
    role: 'clinic_charity',
    phone: '+880 1712-876543',
    location: 'Jaleswaritola, Bogura',
    verificationStatus: 'verified',
    isVerified: true,
    organizationName: 'Bogura Free Rural Clinic',
    registrationOrNid: 'DGHS-BOG-4491',
  },
  {
    id: 'user-admin-1',
    name: 'MedShare Admin',
    email: 'admin@medshare.org',
    password: 'admin123',
    role: 'admin',
    phone: '+880 1700-000000',
    location: 'Dhaka HQ, Bangladesh',
    verificationStatus: 'verified',
    isVerified: true,
  },
  {
    id: 'user-individual-1',
    name: 'Rahim Chowdhury',
    email: 'rahim@gmail.com',
    password: 'password123',
    role: 'individual',
    phone: '+880 1819-334455',
    location: 'Pabna Sadar, Pabna',
    verificationStatus: 'pending',
    isVerified: false,
    registrationOrNid: '1998260636001',
    submittedAt: '2026-10-24T08:00:00Z',
  },
];

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    medicineName: 'Napa Extend',
    genericName: 'Paracetamol',
    category: 'Pain & Fever',
    strength: '665mg',
    quantity: '3 sealed blister strips (30 tablets)',
    totalNumericQuantity: 30,
    unitName: 'tablets',
    remainingNumericQuantity: 30,
    expiryDate: getFutureDateISO(16),
    location: 'Mirpur 10, Dhaka',
    donorId: 'user-donor-1',
    donorName: 'Dr. Farhana Rahman',
    donorPhone: '+880 1711-234567',
    status: 'available',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-2',
    medicineName: 'Sergel',
    genericName: 'Esomeprazole',
    category: 'Gastric & Ulcer',
    strength: '20mg',
    quantity: '2 intact strips (20 capsules)',
    totalNumericQuantity: 20,
    unitName: 'capsules',
    remainingNumericQuantity: 20,
    expiryDate: getFutureDateISO(25),
    location: 'Jaleswaritola, Bogura',
    donorId: 'user-donor-1',
    donorName: 'Dr. Farhana Rahman',
    donorPhone: '+880 1711-234567',
    status: 'available',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-3',
    medicineName: 'Amdocal',
    genericName: 'Amlodipine',
    category: 'Blood Pressure & Heart',
    strength: '5mg',
    quantity: '4 sealed blister packs (40 tablets)',
    totalNumericQuantity: 40,
    unitName: 'tablets',
    remainingNumericQuantity: 40,
    expiryDate: getFutureDateISO(42),
    location: 'Pabna Sadar, Pabna',
    donorId: 'user-donor-1',
    donorName: 'Dr. Farhana Rahman',
    donorPhone: '+880 1711-234567',
    status: 'available',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-4',
    medicineName: 'Azithromycin',
    genericName: 'Azithromycin Dihydrate',
    category: 'Antibiotics',
    strength: '500mg',
    quantity: '1 sealed box (6 tablets)',
    totalNumericQuantity: 6,
    unitName: 'tablets',
    remainingNumericQuantity: 6,
    expiryDate: getFutureDateISO(54),
    location: 'Dhanmondi 27, Dhaka',
    donorId: 'user-donor-1',
    donorName: 'Dr. Farhana Rahman',
    donorPhone: '+880 1711-234567',
    status: 'available',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-5',
    medicineName: 'Monas',
    genericName: 'Montelukast',
    category: 'Asthma & Allergy',
    strength: '10mg',
    quantity: '2 intact blister strips (20 tablets)',
    totalNumericQuantity: 20,
    unitName: 'tablets',
    remainingNumericQuantity: 14,
    claims: [
      {
        id: 'claim-seed-5',
        medicationId: 'med-5',
        claimerId: 'user-clinic-1',
        claimerName: 'Nurse Michael Chang (Rural Hope)',
        claimerRole: 'clinic_charity',
        claimedQuantity: 6,
        unitName: 'tablets',
        handoverPin: '4829',
        prescriptionRef: 'Emergency pediatric respiratory clinic refill',
        claimedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        claimExpiresAt: new Date(Date.now() + 44 * 60 * 60 * 1000).toISOString(),
        status: 'claimed',
      },
    ],
    expiryDate: getFutureDateISO(95),
    location: 'Sherpur Road, Bogura',
    donorId: 'user-donor-1',
    donorName: 'Dr. Farhana Rahman',
    donorPhone: '+880 1711-234567',
    status: 'available',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-6',
    medicineName: 'Bizoran',
    genericName: 'Amlodipine + Olmesartan',
    category: 'Blood Pressure & Heart',
    strength: '5mg/20mg',
    quantity: '2 sealed strips (20 tablets)',
    totalNumericQuantity: 20,
    unitName: 'tablets',
    remainingNumericQuantity: 0,
    claimedQuantity: 20,
    handoverPin: '2841',
    claimedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    claimExpiresAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    collectedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    claims: [
      {
        id: 'claim-seed-6',
        medicationId: 'med-6',
        claimerId: 'user-clinic-1',
        claimerName: 'Nurse Michael Chang (Rural Hope)',
        claimerRole: 'clinic_charity',
        claimedQuantity: 20,
        unitName: 'tablets',
        handoverPin: '2841',
        claimedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        claimExpiresAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        collectedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'collected',
      },
    ],
    expiryDate: getFutureDateISO(14),
    location: 'Pabna Sadar, Pabna',
    donorId: 'user-donor-1',
    donorName: 'Dr. Farhana Rahman',
    donorPhone: '+880 1711-234567',
    status: 'collected',
    claimedById: 'user-clinic-1',
    claimedByName: 'Nurse Michael Chang (Rural Hope)',
    claimedByRole: 'clinic_charity',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_REQUESTS: MedicineRequest[] = [
  {
    id: 'req-1',
    medicineName: 'Insulin (Mixtard 30/70)',
    genericName: 'Biphasic Isophane Insulin',
    category: 'Diabetes',
    strength: '100 IU/ml (10ml Vial)',
    quantityNeeded: '3 sealed vials',
    urgency: 'critical',
    location: 'Jaleswaritola, Bogura',
    requesterId: 'user-clinic-1',
    requesterName: 'Nurse Michael Chang (Rural Hope)',
    requesterRole: 'clinic_charity',
    requesterPhone: '+880 1712-876543',
    reasonOrPrescription: 'Emergency rural clinic stockout: 8 low-income diabetic patients awaiting urgent insulin dosage.',
    status: 'open',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'req-2',
    medicineName: 'Azithromycin',
    genericName: 'Azithromycin Dihydrate',
    category: 'Antibiotics',
    strength: '500mg',
    quantityNeeded: '4 strips (24 tablets)',
    urgency: 'critical',
    location: 'Pabna Sadar, Pabna',
    requesterId: 'user-individual-1',
    requesterName: 'Rahim Chowdhury',
    requesterRole: 'individual',
    requesterPhone: '+880 1819-334455',
    reasonOrPrescription: 'Dr. S. K. Roy Rx #PB-2841 - Mandatory 7-day post-operative pulmonary antibiotic course.',
    status: 'open',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'req-3',
    medicineName: 'Amdocal',
    genericName: 'Amlodipine Besilate',
    category: 'Blood Pressure & Heart',
    strength: '5mg',
    quantityNeeded: '10 strips (100 tablets)',
    urgency: 'high',
    location: 'Mirpur 10, Dhaka',
    requesterId: 'user-clinic-1',
    requesterName: 'Bogura Free Rural Health Relief',
    requesterRole: 'clinic_charity',
    requesterPhone: '+880 1712-876543',
    reasonOrPrescription: 'Monthly free geriatric hypertension outreach camp for elderly rural destitute patients.',
    status: 'open',
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'req-4',
    medicineName: 'Monas',
    genericName: 'Montelukast Sodium',
    category: 'Asthma & Allergy',
    strength: '10mg',
    quantityNeeded: '5 strips (50 chewable tablets)',
    urgency: 'routine',
    location: 'Jaleswaritola, Bogura',
    requesterId: 'user-clinic-1',
    requesterName: 'Nurse Michael Chang (Rural Hope)',
    requesterRole: 'clinic_charity',
    requesterPhone: '+880 1712-876543',
    reasonOrPrescription: 'Seasonal asthma and bronchospasm relief refill for low-income agricultural day-laborers.',
    status: 'open',
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
];
