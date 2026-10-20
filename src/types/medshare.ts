export type UserRole = 'donor' | 'clinic_charity' | 'individual';

export type MedicationStatus = 'available' | 'claimed' | 'collected';

export type UrgencyLevel = 'critical' | 'priority' | 'normal';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  location: string;
  isVerified: boolean;
  organizationName?: string; // for clinics/charities
  registrationOrNid?: string; // Clinic/NGO reg ID or Individual NID
}

export interface Medication {
  id: string;
  medicineName: string;
  strength: string; // e.g., "500mg", "20mg"
  quantity: string; // e.g., "2 sealed strips (20 tablets)"
  expiryDate: string; // ISO date string YYYY-MM-DD
  location: string;
  donorId: string;
  donorName: string;
  donorPhone: string;
  status: MedicationStatus;
  claimedById?: string;
  claimedByName?: string;
  claimedByRole?: UserRole;
  prescriptionRef?: string; // for individual collectors
  createdAt: string;
}
