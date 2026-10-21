import { Medication, UserProfile, UrgencyLevel } from '@/types/medshare';

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

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-donor-1',
    name: 'Dr. Sarah Jenkins',
    role: 'donor',
    phone: '+1 (555) 234-5678',
    location: 'North Hill, Sector 7',
    isVerified: true,
  },
  {
    id: 'user-clinic-1',
    name: 'Nurse Michael Chang (Rural Hope)',
    role: 'clinic_charity',
    phone: '+1 (555) 876-5432',
    location: 'Valley Plains Community Center',
    isVerified: true,
    organizationName: 'Rural Hope Health Relief',
    registrationOrNid: 'NGO-CLINIC-7729',
  },
  {
    id: 'user-individual-1',
    name: 'Rahim Chowdhury',
    role: 'individual',
    phone: '+1 (555) 432-1098',
    location: 'East Lake View, Block B',
    isVerified: false,
    registrationOrNid: 'NID-8923-4410',
  },
];

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    medicineName: 'Amoxicillin Trihydrate',
    strength: '500mg',
    quantity: '2 sealed strips (20 capsules)',
    expiryDate: getFutureDateISO(18),
    location: 'North Hill Pharmacy Annex',
    donorId: 'user-donor-1',
    donorName: 'Dr. Sarah Jenkins',
    donorPhone: '+1 (555) 234-5678',
    status: 'available',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-2',
    medicineName: 'Metformin Hydrochloride',
    strength: '850mg',
    quantity: '3 blister packs (30 tablets)',
    expiryDate: getFutureDateISO(27),
    location: 'Downtown Medical Plaza',
    donorId: 'user-donor-1',
    donorName: 'Dr. Sarah Jenkins',
    donorPhone: '+1 (555) 234-5678',
    status: 'available',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-3',
    medicineName: 'Atorvastatin Calcium',
    strength: '20mg',
    quantity: '1 sealed box (30 film-coated tablets)',
    expiryDate: getFutureDateISO(45),
    location: 'Westside Community Hub',
    donorId: 'user-donor-1',
    donorName: 'Dr. Sarah Jenkins',
    donorPhone: '+1 (555) 234-5678',
    status: 'available',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-4',
    medicineName: 'Azithromycin',
    strength: '500mg',
    quantity: '1 unopened box (6 tablets)',
    expiryDate: getFutureDateISO(55),
    location: 'Greenwood Health Center',
    donorId: 'user-donor-1',
    donorName: 'Dr. Sarah Jenkins',
    donorPhone: '+1 (555) 234-5678',
    status: 'available',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-5',
    medicineName: 'Losartan Potassium',
    strength: '50mg',
    quantity: '4 strips (40 tablets)',
    expiryDate: getFutureDateISO(120),
    location: 'Highland Care Center',
    donorId: 'user-donor-1',
    donorName: 'Dr. Sarah Jenkins',
    donorPhone: '+1 (555) 234-5678',
    status: 'available',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'med-6',
    medicineName: 'Omeprazole Delayed-Release',
    strength: '20mg',
    quantity: '2 sealed bottles (28 capsules)',
    expiryDate: getFutureDateISO(90),
    location: 'Valley Plains Community Center',
    donorId: 'user-donor-1',
    donorName: 'Dr. Sarah Jenkins',
    donorPhone: '+1 (555) 234-5678',
    status: 'collected',
    claimedById: 'user-clinic-1',
    claimedByName: 'Nurse Michael Chang (Rural Hope)',
    claimedByRole: 'clinic_charity',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
