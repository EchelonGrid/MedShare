export type UserRole = 'individual' | 'clinic_charity' | 'admin';

export type MedicationStatus = 'available' | 'claimed' | 'collected';

export type UrgencyLevel = 'critical' | 'priority' | 'normal';

export type RequestUrgency = 'critical' | 'high' | 'routine';

export type RequestStatus = 'open' | 'fulfilled';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export type MedicineCategory =
  | 'Gastric & Ulcer'
  | 'Blood Pressure & Heart'
  | 'Diabetes'
  | 'Antibiotics'
  | 'Pain & Fever'
  | 'Asthma & Allergy'
  | 'Vitamins & Supplements'
  | 'Other';

export interface MedicineRequest {
  id: string;
  medicineName: string;
  genericName?: string;
  category?: MedicineCategory;
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

export interface BatchClaim {
  id: string;
  medicationId: string;
  claimerId: string;
  claimerName: string;
  claimerRole: UserRole;
  claimedQuantity: number;
  unitName: string;
  handoverPin?: string; // 4-digit code e.g. "4829"
  prescriptionRef?: string;
  claimedAt: string;
  claimExpiresAt?: string; // ISO timestamp (claimedAt + 48 hours)
  collectedAt?: string;
  status: 'claimed' | 'pending_pickup' | 'collected';
}

export interface ClaimRecord {
  claimId: string;
  collectorId: string;
  collectorName: string;
  collectorRole: UserRole;
  collectorPhone?: string;
  organizationOrRx?: string;
  quantityClaimed: number;
  unitName: string;
  handoverPin: string; // 4-digit code e.g. "7392"
  claimedAt: string;
  claimExpiresAt: string; // ISO timestamp (claimedAt + 48 hours)
  collectedAt?: string;
  status: 'pending_pickup' | 'collected';
}

export interface Medication {
  id: string;
  medicineName: string;
  genericName?: string; // e.g., "Paracetamol", "Esomeprazole"
  category?: MedicineCategory;
  strength: string; // e.g., "665mg", "20mg"
  quantity: string; // e.g., "2 sealed strips (20 tablets)"
  totalNumericQuantity?: number; // total units in donation batch (e.g., 30)
  unitName?: string; // e.g., "tablets", "capsules", "strips", "bottles", "vials"
  remainingNumericQuantity?: number; // units still available to claim (e.g., 20)
  expiryDate: string; // ISO date string YYYY-MM-DD
  location: string;
  donorId?: string;
  donorName: string;
  donorPhone: string;
  status: MedicationStatus;
  claimedById?: string;
  claimedByName?: string;
  claimedByRole?: UserRole;
  claimedQuantity?: number; // amount claimed in primary or final claim
  claims?: BatchClaim[]; // partial claims log for split batches
  activeClaims?: ClaimRecord[]; // structured claims list
  handoverPin?: string; // 4-digit code e.g. "4829"
  prescriptionRef?: string; // for individual collectors
  pickupNote?: string;
  claimedAt?: string;
  claimExpiresAt?: string; // ISO timestamp (claimedAt + 48 hours)
  collectedAt?: string;
  createdAt: string;
}
