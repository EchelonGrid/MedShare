export type UserRole = 'donor' | 'clinic_charity' | 'individual';

export type MedicationStatus = 'available' | 'claimed' | 'collected';

export type UrgencyLevel = 'critical' | 'priority' | 'normal';

export type RequestUrgency = 'critical' | 'high' | 'routine';

export type RequestStatus = 'open' | 'fulfilled';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface MedicineRequest {
  id: string;
  medicineName: string;
  genericName?: string;
  strength: string;
  quantityNeeded: string; // e.g., "5 strips (50 tablets)"
  urgency: RequestUrgency; // critical = Needed within 48h, high = Needed this week, routine = Clinic stock refill
  location: string;
  requesterId: string;
  requesterName: string;
  requesterRole: UserRole;
  requesterPhone: string;
  reasonOrPrescription: string; // e.g., "Rural maternal clinic stockout" or "Dr. A. Rahman Rx - Post-surgery antibiotic course"
  status: RequestStatus;
  fulfilledByName?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  location: string;
  verificationStatus: VerificationStatus;
  isVerified: boolean; // boolean compatibility: verificationStatus === 'verified'
  organizationName?: string; // for clinics/charities
  registrationOrNid?: string; // Clinic/NGO reg ID or Individual NID
  submittedAt?: string;
}

export interface Medication {
  id: string;
  medicineName: string;
  genericName?: string; // e.g., "Paracetamol", "Esomeprazole"
  strength: string; // e.g., "665mg", "20mg"
  quantity: string; // e.g., "2 sealed strips (20 tablets)"
  expiryDate: string; // ISO date string YYYY-MM-DD
  location: string;
  donorId?: string;
  donorName: string;
  donorPhone: string;
  status: MedicationStatus;
  claimedById?: string;
  claimedByName?: string;
  claimedByRole?: UserRole;
  prescriptionRef?: string; // for individual collectors
  pickupNote?: string;
  claimedAt?: string;
  collectedAt?: string;
  createdAt: string;
}
