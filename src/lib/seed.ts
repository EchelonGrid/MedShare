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
    name: 'Dr. Farhana Rahman',
    email: 'farhana@medshare.bd',
    password: 'password123',
    role: 'donor',
    phone: '+880 1711-234567',
    location: 'Mirpur 10, Dhaka',
    verificationStatus: 'verified',
    isVerified: true,
  },
  {
    id: 'user-clinic-1',
    name: 'Nurse Michael Chang (Rural Hope)',
    email: 'michael@ruralhope.org',
    password: 'password123',
    role: 'clinic_charity',
    phone: '+880 1712-876543',
    location: 'Jaleswaritola, Bogura',
    verificationStatus: 'verified',
    isVerified: true,
    organizationName: 'Bogura Free Rural Health Relief',
    registrationOrNid: 'DGHS-BOG-4491',
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
    submittedAt: '2026-10-21T09:00:00Z',
  },
];

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    medicineName: 'Napa Extend',
    genericName: 'Paracetamol',
    strength: '665mg',
    quantity: '3 sealed blister strips (30 tablets)',
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
    strength: '20mg',
    quantity: '2 intact strips (20 capsules)',
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
    strength: '5mg',
    quantity: '4 sealed blister packs (40 tablets)',
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
    strength: '500mg',
    quantity: '1 sealed box (6 tablets)',
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
    strength: '10mg',
    quantity: '2 intact blister strips (20 tablets)',
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
    strength: '5mg/20mg',
    quantity: '2 sealed strips (20 tablets)',
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
