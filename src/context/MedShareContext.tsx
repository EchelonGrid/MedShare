'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Medication,
  UserProfile,
  VerificationStatus,
  UserRole,
  MedicineRequest,
  RequestUrgency,
  RequestStatus,
  MedicineCategory,
  BatchClaim,
} from '@/types/medshare';
import {
  DEFAULT_USERS,
  INITIAL_MEDICATIONS,
  INITIAL_REQUESTS,
  getDaysUntilExpiry,
  parseQuantity,
  generateHandoverPin,
  getPickupTimeRemaining,
} from '@/lib/seed';
import { inferCategory } from '@/lib/medicine-dictionary';
import {
  supabase,
  isSupabaseConfigured,
  mapDbMedicationToApp,
  mapAppMedicationToDb,
  mapDbProfileToApp,
  DbMedication,
} from '@/lib/supabase';
import { ToastItem } from '@/components/Toast';

const MEDS_STORAGE_KEY = 'medshare_v2_medications';
const USERS_STORAGE_KEY = 'medshare_v2_users';
const CURRENT_USER_ID_KEY = 'medshare_v2_current_user_id';
const REQUESTS_STORAGE_KEY = 'medshare_prod_requests_v1';

export interface NewMedicationInput {
  medicineName: string;
  genericName?: string;
  category?: MedicineCategory;
  strength: string;
  quantity: string;
  totalNumericQuantity?: number;
  unitName?: string;
  remainingNumericQuantity?: number;
  expiryDate: string;
  location: string;
  donorPhone?: string;
}

export interface NewMedicineRequestInput {
  medicineName: string;
  genericName?: string;
  category?: MedicineCategory;
  strength: string;
  quantityNeeded: string;
  urgency: RequestUrgency;
  location: string;
  requesterPhone?: string;
  reasonOrPrescription: string;
}

export interface VerificationDetails {
  name?: string;
  phone?: string;
  location?: string;
  organizationName?: string;
  registrationOrNid?: string;
  autoApprove?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  location: string;
  organizationName?: string;
  registrationOrNid?: string;
}

interface MedShareContextType {
  medications: Medication[];
  requests: MedicineRequest[];
  openRequestsCount: number;
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  isDbConnected: boolean;
  dbMode: 'cloud' | 'local';
  actionLoading: string | null;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  dismissToast: (id: string) => void;
  switchUser: (userId: string) => void;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginAsDemo: (userId: string) => void;
  addMedication: (data: NewMedicationInput) => Promise<Medication>;
  claimMedication: (medicationId: string, prescriptionRef?: string, claimedAmount?: number) => Promise<{ success: boolean; pin: string }>;
  releaseClaim: (medicationId: string, claimId?: string) => Promise<void>;
  markAsCollected: (medicationId: string, enteredPinOrClaimId?: string, claimId?: string) => Promise<{ success: boolean; error?: string }>;
  addMedicineRequest: (data: NewMedicineRequestInput) => Promise<MedicineRequest>;
  fulfillMedicineRequest: (requestId: string, donorName?: string) => Promise<void>;
  verifyCurrentUser: (details?: VerificationDetails) => Promise<void>;
  submitVerification: (details: VerificationDetails) => Promise<void>;
  approveVerification: (userId: string) => Promise<void>;
  rejectVerification: (userId: string, reason?: string) => Promise<void>;
  pendingVerifications: UserProfile[];
  resetDemoData: () => Promise<void>;
  isDonateOpen: boolean;
  openDonateModal: () => void;
  closeDonateModal: () => void;
  isVerifyOpen: boolean;
  verifyNotice: string | null;
  openVerifyModal: (notice?: string) => void;
  closeVerifyModal: () => void;
  isAuthOpen: boolean;
  authMode: 'login' | 'register';
  authNotice: string | null;
  openAuthModal: (mode?: 'login' | 'register', notice?: string) => void;
  closeAuthModal: () => void;
  isRequestModalOpen: boolean;
  openRequestModal: () => void;
  closeRequestModal: () => void;
  prefillRequestForDonation: MedicineRequest | null;
  setPrefillRequestForDonation: (req: MedicineRequest | null) => void;
  openDonateWithRequest: (req: MedicineRequest) => void;
  activeMainTab: 'feed' | 'requests' | 'portal';
  setActiveMainTab: (tab: 'feed' | 'requests' | 'portal') => void;
}

const MedShareContext = createContext<MedShareContextType | undefined>(undefined);

export function MedShareProvider({ children }: { children: React.ReactNode }) {
  // State
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [requests, setRequests] = useState<MedicineRequest[]>(INITIAL_REQUESTS);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(DEFAULT_USERS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(DEFAULT_USERS[0].id);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [dbMode, setDbMode] = useState<'cloud' | 'local'>('local');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Modals state
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [prefillRequestForDonation, setPrefillRequestForDonation] = useState<MedicineRequest | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'feed' | 'requests' | 'portal'>('feed');

  // Toast Helpers
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message };
      setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

      // Auto dismiss after 4.5 seconds
      setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  // Sync to localStorage helpers
  const saveMedsToLocal = useCallback((items: Medication[]) => {
    try {
      localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving medications to localStorage', e);
    }
  }, []);

  const saveRequestsToLocal = useCallback((items: MedicineRequest[]) => {
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving requests to localStorage', e);
    }
  }, []);

  const saveUsersToLocal = useCallback((users: UserProfile[]) => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users to localStorage', e);
    }
  }, []);

  const saveCurrentUserIdToLocal = useCallback((id: string | null) => {
    try {
      if (id === null) {
        localStorage.setItem(CURRENT_USER_ID_KEY, 'guest');
      } else {
        localStorage.setItem(CURRENT_USER_ID_KEY, id);
      }
    } catch (e) {
      console.error('Error saving current user ID to localStorage', e);
    }
  }, []);

  // 1. Initial Load: Local Storage & Supabase Fetch
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load Local Storage first for instant hydration
    let initialLocalUsers = DEFAULT_USERS;
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      try {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.name) {
          initialLocalUsers = parsed;
        }
      } catch (e) {
        console.warn('Failed parsing stored users', e);
      }
    }
    setAllUsers(initialLocalUsers);

    const storedCurrentId = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (storedCurrentId === 'guest') {
      setCurrentUserId(null);
    } else if (storedCurrentId && initialLocalUsers.some((u) => u.id === storedCurrentId)) {
      setCurrentUserId(storedCurrentId);
    } else if (storedCurrentId === null) {
      setCurrentUserId(DEFAULT_USERS[0].id);
    }

    let initialLocalMeds = INITIAL_MEDICATIONS;
    const storedMeds = localStorage.getItem(MEDS_STORAGE_KEY);
    if (storedMeds) {
      try {
        const parsedMeds = JSON.parse(storedMeds);
        const isValid =
          Array.isArray(parsedMeds) &&
          parsedMeds.length > 0 &&
          Boolean(parsedMeds[0]?.medicineName) &&
          Boolean(parsedMeds[0]?.expiryDate) &&
          !isNaN(getDaysUntilExpiry(parsedMeds[0].expiryDate));
        if (isValid) {
          initialLocalMeds = parsedMeds.map((m: Medication) => {
            const parsed = parseQuantity(m.quantity);
            const total = m.totalNumericQuantity ?? parsed.total;
            const unit = m.unitName || parsed.unit;
            const remaining =
              m.remainingNumericQuantity !== undefined
                ? m.remainingNumericQuantity
                : m.status === 'claimed' || m.status === 'collected'
                ? 0
                : total;
            return {
              ...m,
              totalNumericQuantity: total,
              unitName: unit,
              remainingNumericQuantity: remaining,
              claims: (m.claims || []).map((c) => ({
                ...c,
                handoverPin: c.handoverPin || '4829',
                claimExpiresAt: c.claimExpiresAt || new Date(Date.now() + 44 * 60 * 60 * 1000).toISOString(),
              })),
              handoverPin: m.handoverPin || (m.status === 'claimed' ? '4829' : undefined),
              claimExpiresAt: m.claimExpiresAt || (m.status === 'claimed' ? new Date(Date.now() + 44 * 60 * 60 * 1000).toISOString() : undefined),
            };
          });
        }
      } catch (e) {
        console.warn('Failed parsing stored meds', e);
      }
    }
    setMedications(initialLocalMeds);

    let initialLocalRequests = INITIAL_REQUESTS;
    const storedRequests = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (storedRequests) {
      try {
        const parsedRequests = JSON.parse(storedRequests);
        if (Array.isArray(parsedRequests) && parsedRequests.length > 0 && parsedRequests[0]?.medicineName) {
          initialLocalRequests = parsedRequests;
        }
      } catch (e) {
        console.warn('Failed parsing stored requests', e);
      }
    }
    setRequests(initialLocalRequests);

    // If Supabase is configured, connect to live database
    const sb = supabase;
    if (isSupabaseConfigured && sb) {
      setDbMode('cloud');

      (async () => {
        try {
          const { data, error } = await sb
            .from('medications')
            .select('*')
            .order('expiry_date', { ascending: true });

          if (!error && data && data.length > 0) {
            const mapped = data.map((d: DbMedication) => mapDbMedicationToApp(d));
            setMedications(mapped);
            saveMedsToLocal(mapped);
            setIsDbConnected(true);
          } else {
            setIsDbConnected(true);
          }
        } catch (err: any) {
          console.warn('Supabase medications fetch fallback to local:', err);
          setIsDbConnected(false);
          setDbMode('local');
        }
      })();

      // Supabase Real-time Subscription for medications
      const channel = sb
        .channel('public:medications')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'medications' },
          async () => {
            try {
              const { data } = await sb
                .from('medications')
                .select('*')
                .order('expiry_date', { ascending: true });
              if (data) {
                const mapped = data.map((d: DbMedication) => mapDbMedicationToApp(d));
                setMedications(mapped);
                saveMedsToLocal(mapped);
              }
            } catch (err) {
              console.warn('Supabase realtime payload error:', err);
            }
          }
        )
        .subscribe();

      // Gracefully check for medicine_requests table in Supabase
      (async () => {
        try {
          const { data: reqData, error: reqErr } = await sb
            .from('medicine_requests')
            .select('*')
            .order('created_at', { ascending: false });
          if (!reqErr && reqData && reqData.length > 0) {
            const mappedReqs: MedicineRequest[] = reqData.map((r: any) => ({
              id: r.id,
              medicineName: r.medicine_name || r.medicineName,
              genericName: r.generic_name || r.genericName || undefined,
              strength: r.strength,
              quantityNeeded: r.quantity_needed || r.quantityNeeded,
              urgency: r.urgency,
              location: r.location,
              requesterId: r.requester_id || r.requesterId,
              requesterName: r.requester_name || r.requesterName,
              requesterRole: r.requester_role || r.requesterRole,
              requesterPhone: r.requester_phone || r.requesterPhone,
              reasonOrPrescription: r.reason_or_prescription || r.reasonOrPrescription,
              status: r.status,
              fulfilledByName: r.fulfilled_by_name || r.fulfilledByName || undefined,
              createdAt: r.created_at || r.createdAt,
            }));
            setRequests(mappedReqs);
            saveRequestsToLocal(mappedReqs);
          }
        } catch {
          // Graceful fallback to local requests
        }
      })();

      return () => {
        sb.removeChannel(channel);
      };
    } else {
      setDbMode('local');
      setIsDbConnected(false);
    }
  }, [saveMedsToLocal, saveRequestsToLocal]);

  // Derived current user
  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return allUsers.find((u) => u.id === currentUserId) || null;
  }, [allUsers, currentUserId]);

  // Derived counts and pending verifications
  const pendingVerifications = useMemo(() => {
    return allUsers.filter((u) => u.verificationStatus === 'pending');
  }, [allUsers]);

  const openRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'open').length;
  }, [requests]);

  // Auth & User Methods
  const switchUser = useCallback(
    (userId: string) => {
      if (allUsers.some((u) => u.id === userId)) {
        setCurrentUserId(userId);
        saveCurrentUserIdToLocal(userId);
        const u = allUsers.find((x) => x.id === userId);
        showToast(`Switched persona to ${u?.name || 'User'}`, 'info', 'Persona Active');
      }
    },
    [allUsers, saveCurrentUserIdToLocal, showToast]
  );

  const loginAsDemo = useCallback(
    (userId: string) => {
      const user = allUsers.find((u) => u.id === userId);
      if (user) {
        setCurrentUserId(user.id);
        saveCurrentUserIdToLocal(user.id);
        showToast(`Signed in as demo persona: ${user.name}`, 'success', 'Demo Login');
      }
    },
    [allUsers, saveCurrentUserIdToLocal, showToast]
  );

  const login = useCallback(
    async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      setActionLoading('auth');
      try {
        const cleanEmail = email.trim().toLowerCase();

        // 1. Check local users first (for demo accounts and offline mode)
        const localUser = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
        if (localUser) {
          if (password && localUser.password && localUser.password !== password) {
            setActionLoading(null);
            return { success: false, error: 'Incorrect password. Please try again.' };
          }
          setCurrentUserId(localUser.id);
          saveCurrentUserIdToLocal(localUser.id);
          setActionLoading(null);
          showToast(`Welcome back, ${localUser.name}!`, 'success', 'Signed In');
          return { success: true };
        }

        // 2. If Supabase configured, attempt Supabase Auth signIn
        if (isSupabaseConfigured && supabase && password) {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (authError) {
            setActionLoading(null);
            return { success: false, error: authError.message };
          }

          if (authData.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            const appUser: UserProfile = profileData
              ? mapDbProfileToApp(profileData)
              : {
                  id: authData.user.id,
                  name: authData.user.user_metadata?.name || 'MedShare Member',
                  email: authData.user.email || cleanEmail,
                  role: authData.user.user_metadata?.role || 'individual',
                  phone: authData.user.user_metadata?.phone || '+880 1700-000000',
                  location: authData.user.user_metadata?.location || 'Dhaka',
                  verificationStatus: 'unverified',
                  isVerified: false,
                };

            setAllUsers((prev) => {
              const updated = [appUser, ...prev.filter((u) => u.id !== appUser.id)];
              saveUsersToLocal(updated);
              return updated;
            });
            setCurrentUserId(appUser.id);
            saveCurrentUserIdToLocal(appUser.id);
            setActionLoading(null);
            showToast(`Welcome back, ${appUser.name}!`, 'success', 'Signed In');
            return { success: true };
          }
        }

        setActionLoading(null);
        return { success: false, error: 'No account found with this email address.' };
      } catch (err: any) {
        setActionLoading(null);
        return { success: false, error: err.message || 'Login failed. Please try again.' };
      }
    },
    [allUsers, saveCurrentUserIdToLocal, saveUsersToLocal, showToast]
  );

  const register = useCallback(
    async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
      setActionLoading('auth');
      try {
        const cleanEmail = data.email.trim().toLowerCase();
        const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          setActionLoading(null);
          return { success: false, error: 'An account with this email address already exists.' };
        }

        const initialStatus: VerificationStatus =
          data.role === 'donor'
            ? 'verified'
            : data.registrationOrNid && data.registrationOrNid.trim().length > 0
            ? 'pending'
            : 'unverified';

        let newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        if (isSupabaseConfigured && supabase && data.password) {
          const { data: authData, error: authErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password: data.password,
            options: {
              data: {
                name: data.name.trim(),
                role: data.role,
                phone: data.phone.trim(),
                location: data.location.trim(),
              },
            },
          });

          if (!authErr && authData.user) {
            newUserId = authData.user.id;
            await supabase.from('profiles').upsert({
              id: newUserId,
              name: data.name.trim(),
              email: cleanEmail,
              role: data.role,
              phone: data.phone.trim(),
              location: data.location.trim(),
              organization_name: data.organizationName?.trim() || null,
              registration_or_nid: data.registrationOrNid?.trim() || null,
              verification_status: initialStatus,
            });
          }
        }

        const newUser: UserProfile = {
          id: newUserId,
          name: data.name.trim(),
          email: cleanEmail,
          password: data.password || 'password123',
          role: data.role,
          phone: data.phone.trim(),
          location: data.location.trim(),
          organizationName: data.organizationName?.trim(),
          registrationOrNid: data.registrationOrNid?.trim(),
          verificationStatus: initialStatus,
          isVerified: initialStatus === 'verified',
          submittedAt: initialStatus === 'pending' ? new Date().toISOString() : undefined,
        };

        const updatedUsers = [newUser, ...allUsers];
        setAllUsers(updatedUsers);
        saveUsersToLocal(updatedUsers);
        setCurrentUserId(newUser.id);
        saveCurrentUserIdToLocal(newUser.id);

        setActionLoading(null);
        showToast(
          `Welcome to MedShare, ${newUser.name}! Account successfully created.`,
          'success',
          'Registration Complete'
        );
        return { success: true };
      } catch (err: any) {
        setActionLoading(null);
        return { success: false, error: err.message || 'Registration failed.' };
      }
    },
    [allUsers, saveCurrentUserIdToLocal, saveUsersToLocal, showToast]
  );

  const logout = useCallback(async () => {
    setActionLoading('auth');
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    } finally {
      setCurrentUserId(null);
      saveCurrentUserIdToLocal(null);
      setActionLoading(null);
      showToast('You have been safely signed out.', 'info', 'Signed Out');
    }
  }, [saveCurrentUserIdToLocal, showToast]);

  // Medication Actions
  const addMedication = useCallback(
    async (data: NewMedicationInput): Promise<Medication> => {
      setActionLoading('donating');

      const tempId = `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const donorUser = currentUser;
      const resolvedCategory = data.category || inferCategory(data.medicineName, data.genericName);

      const { total, unit } = parseQuantity(data.quantity);
      const totalNumericQuantity = data.totalNumericQuantity ?? total;
      const unitName = data.unitName ?? unit;
      const remainingNumericQuantity = data.remainingNumericQuantity ?? totalNumericQuantity;

      const newMed: Medication = {
        id: tempId,
        medicineName: data.medicineName.trim(),
        genericName: data.genericName?.trim() || undefined,
        category: resolvedCategory,
        strength: data.strength.trim(),
        quantity: data.quantity.trim(),
        totalNumericQuantity,
        unitName,
        remainingNumericQuantity,
        claims: [],
        expiryDate: data.expiryDate,
        location: data.location.trim(),
        donorId: donorUser?.id || 'donor-anon',
        donorName: donorUser?.name || 'Community Donor',
        donorPhone: data.donorPhone?.trim() || donorUser?.phone || '+880 1711-000000',
        status: 'available',
        createdAt: new Date().toISOString(),
      };

      // Optimistic local update
      setMedications((prev) => {
        const updated = [newMed, ...prev];
        saveMedsToLocal(updated);
        return updated;
      });

      // Persist to Supabase if configured
      if (isSupabaseConfigured && supabase) {
        try {
          const dbRow = mapAppMedicationToDb(newMed);
          const { data: inserted, error } = await supabase
            .from('medications')
            .insert(dbRow)
            .select()
            .single();

          if (!error && inserted) {
            const finalMed = mapDbMedicationToApp(inserted as DbMedication);
            setMedications((prev) => {
              const updated = prev.map((m) => (m.id === tempId ? finalMed : m));
              saveMedsToLocal(updated);
              return updated;
            });
            setActionLoading(null);
            showToast(
              `"${newMed.medicineName}" listed for community rescue!`,
              'success',
              'Donation Listed'
            );
            return finalMed;
          }
        } catch (err) {
          console.warn('Supabase medication insert error; kept local copy:', err);
        }
      }

      setActionLoading(null);
      showToast(
        `"${newMed.medicineName}" listed for community rescue!`,
        'success',
        'Donation Listed'
      );
      return newMed;
    },
    [currentUser, saveMedsToLocal, showToast]
  );

  const claimMedication = useCallback(
    async (
      medicationId: string,
      prescriptionRef?: string,
      claimedAmount?: number
    ): Promise<{ success: boolean; pin: string }> => {
      setActionLoading(medicationId);

      const claimer = currentUser;
      const claimedAt = new Date().toISOString();
      const claimExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const pin = generateHandoverPin();

      let feedbackToastMsg = `Medicine claimed! Your 4-Digit Handover PIN is ${pin}. Pick up within 48 hours.`;
      let feedbackToastTitle = 'Claim Successful';

      setMedications((prev) => {
        const updated = prev.map((med) => {
          if (med.id === medicationId) {
            const parsed = parseQuantity(med.quantity);
            const total = med.totalNumericQuantity ?? parsed.total;
            const unit = med.unitName || parsed.unit;
            const currentRemaining =
              med.remainingNumericQuantity !== undefined ? med.remainingNumericQuantity : total;

            const amountToClaim = Math.min(
              claimedAmount && claimedAmount > 0 ? claimedAmount : currentRemaining,
              currentRemaining
            );
            const newRemaining = Math.max(0, currentRemaining - amountToClaim);
            const isFullClaim = newRemaining <= 0;

            const newClaim: BatchClaim = {
              id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              medicationId: med.id,
              claimerId: claimer?.id || 'collector-anon',
              claimerName: claimer?.name || 'Verified Collector',
              claimerRole: claimer?.role || 'individual',
              claimedQuantity: amountToClaim,
              unitName: unit,
              handoverPin: pin,
              prescriptionRef: prescriptionRef || med.prescriptionRef,
              claimedAt,
              claimExpiresAt,
              status: 'claimed',
            };

            const updatedClaims = [...(med.claims || []), newClaim];

            if (newRemaining > 0) {
              feedbackToastMsg = `Partially claimed ${amountToClaim} ${unit}! PIN: ${pin}. ${newRemaining} ${unit} remain available on feed.`;
              feedbackToastTitle = 'Partial Claim Recorded';
            }

            return {
              ...med,
              totalNumericQuantity: total,
              unitName: unit,
              remainingNumericQuantity: newRemaining,
              status: isFullClaim ? ('claimed' as const) : ('available' as const),
              claimedById: isFullClaim ? claimer?.id : (med.claimedById || claimer?.id),
              claimedByName: isFullClaim ? (claimer?.name || 'Verified Collector') : (med.claimedByName || claimer?.name),
              claimedByRole: isFullClaim ? (claimer?.role || 'individual') : (med.claimedByRole || claimer?.role),
              claimedQuantity: isFullClaim ? amountToClaim : med.claimedQuantity,
              claims: updatedClaims,
              handoverPin: isFullClaim ? pin : (med.handoverPin || pin),
              prescriptionRef: prescriptionRef || med.prescriptionRef,
              claimedAt: isFullClaim ? claimedAt : (med.claimedAt || claimedAt),
              claimExpiresAt: isFullClaim ? claimExpiresAt : (med.claimExpiresAt || claimExpiresAt),
            };
          }
          return med;
        });
        saveMedsToLocal(updated);
        return updated;
      });

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('medications')
            .update({
              status: 'claimed',
              claimed_by_id: claimer?.id || null,
              claimed_by_name: claimer?.name || 'Verified Collector',
              claimed_by_role: claimer?.role || 'individual',
              prescription_ref: prescriptionRef || null,
              claimed_at: claimedAt,
            })
            .eq('id', medicationId);
        } catch (err) {
          console.warn('Supabase claim update error; maintained local state:', err);
        }
      }

      setActionLoading(null);
      showToast(feedbackToastMsg, 'success', feedbackToastTitle);
      return { success: true, pin };
    },
    [currentUser, saveMedsToLocal, showToast]
  );

  const releaseClaim = useCallback(
    async (medicationId: string, claimId?: string): Promise<void> => {
      setActionLoading(medicationId);

      setMedications((prev) => {
        const updated = prev.map((med) => {
          if (med.id === medicationId) {
            const parsed = parseQuantity(med.quantity);
            const total = med.totalNumericQuantity ?? parsed.total;
            const unit = med.unitName || parsed.unit;
            const currentRemaining =
              med.remainingNumericQuantity !== undefined ? med.remainingNumericQuantity : 0;

            let updatedClaims = med.claims || [];
            let restockAmount = 0;

            if (claimId) {
              const targetClaim = updatedClaims.find((c) => c.id === claimId);
              if (targetClaim) {
                restockAmount = targetClaim.claimedQuantity;
                updatedClaims = updatedClaims.filter((c) => c.id !== claimId);
              }
            } else {
              restockAmount = med.claimedQuantity || (total - currentRemaining);
              updatedClaims = [];
            }

            const newRemaining = Math.min(total, currentRemaining + restockAmount);
            const hasPendingClaims = updatedClaims.some((c) => c.status === 'claimed');

            let nextStatus: 'available' | 'claimed' | 'collected' = 'available';
            if (newRemaining <= 0) {
              nextStatus = hasPendingClaims ? 'claimed' : 'collected';
            } else {
              nextStatus = 'available';
            }

            const latestActiveClaim = updatedClaims.find((c) => c.status === 'claimed');

            return {
              ...med,
              totalNumericQuantity: total,
              unitName: unit,
              remainingNumericQuantity: newRemaining,
              status: nextStatus,
              claimedById: latestActiveClaim ? latestActiveClaim.claimerId : (nextStatus === 'available' ? undefined : med.claimedById),
              claimedByName: latestActiveClaim ? latestActiveClaim.claimerName : (nextStatus === 'available' ? undefined : med.claimedByName),
              claimedByRole: latestActiveClaim ? latestActiveClaim.claimerRole : (nextStatus === 'available' ? undefined : med.claimedByRole),
              claimedQuantity: latestActiveClaim ? latestActiveClaim.claimedQuantity : (nextStatus === 'available' ? undefined : med.claimedQuantity),
              claims: updatedClaims,
              handoverPin: latestActiveClaim ? latestActiveClaim.handoverPin : (nextStatus === 'available' ? undefined : med.handoverPin),
              claimExpiresAt: latestActiveClaim ? latestActiveClaim.claimExpiresAt : (nextStatus === 'available' ? undefined : med.claimExpiresAt),
              claimedAt: latestActiveClaim ? latestActiveClaim.claimedAt : (nextStatus === 'available' ? undefined : med.claimedAt),
            };
          }
          return med;
        });
        saveMedsToLocal(updated);
        return updated;
      });

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('medications')
            .update({
              status: 'available',
              claimed_by_id: null,
              claimed_by_name: null,
              claimed_by_role: null,
              prescription_ref: null,
              claimed_at: null,
            })
            .eq('id', medicationId);
        } catch (err) {
          console.warn('Supabase release claim error; maintained local state:', err);
        }
      }

      setActionLoading(null);
      showToast('Medication batch restocked back to available feed!', 'info', 'Claim Released');
    },
    [saveMedsToLocal, showToast]
  );

  const markAsCollected = useCallback(
    async (
      medicationId: string,
      enteredPinOrClaimId?: string,
      claimId?: string
    ): Promise<{ success: boolean; error?: string }> => {
      let pinToVerify: string | undefined = undefined;
      let targetClaimId: string | undefined = undefined;

      if (enteredPinOrClaimId) {
        if (enteredPinOrClaimId.startsWith('claim-')) {
          targetClaimId = enteredPinOrClaimId;
        } else {
          pinToVerify = enteredPinOrClaimId;
        }
      }
      if (claimId) {
        targetClaimId = claimId;
      }

      // Check PIN if entered by donor
      const targetMed = medications.find((m) => m.id === medicationId);
      if (targetMed && pinToVerify !== undefined && pinToVerify.trim().length > 0) {
        let expectedPin = targetMed.handoverPin;
        if (targetClaimId && targetMed.claims) {
          const matchedClaim = targetMed.claims.find((c) => c.id === targetClaimId);
          if (matchedClaim?.handoverPin) {
            expectedPin = matchedClaim.handoverPin;
          }
        }

        if (expectedPin && pinToVerify.trim() !== expectedPin.trim()) {
          showToast(
            'Invalid Handover PIN. Please ask the collector for the 4-digit code shown in their portal.',
            'error',
            'Incorrect Handover PIN'
          );
          return {
            success: false,
            error: 'Invalid Handover PIN. Code does not match.',
          };
        }
      }

      setActionLoading(medicationId);
      const collectedAt = new Date().toISOString();

      setMedications((prev) => {
        const updated = prev.map((med) => {
          if (med.id === medicationId) {
            let updatedClaims = med.claims || [];
            if (targetClaimId) {
              updatedClaims = updatedClaims.map((c) =>
                c.id === targetClaimId ? { ...c, status: 'collected' as const, collectedAt } : c
              );
            } else {
              updatedClaims = updatedClaims.map((c) => ({
                ...c,
                status: 'collected' as const,
                collectedAt: c.collectedAt || collectedAt,
              }));
            }

            const allClaimsCollected =
              updatedClaims.length > 0 &&
              updatedClaims.every((c) => c.status === 'collected') &&
              (med.remainingNumericQuantity ?? 0) <= 0;

            const isNowFullyCollected = !targetClaimId || allClaimsCollected || med.status === 'claimed';

            return {
              ...med,
              status: isNowFullyCollected ? ('collected' as const) : med.status,
              claims: updatedClaims,
              collectedAt: isNowFullyCollected ? collectedAt : med.collectedAt,
            };
          }
          return med;
        });
        saveMedsToLocal(updated);
        return updated;
      });

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('medications')
            .update({
              status: 'collected',
              collected_at: collectedAt,
            })
            .eq('id', medicationId);
        } catch (err) {
          console.warn('Supabase collected update error; maintained local state:', err);
        }
      }

      setActionLoading(null);
      showToast('Medication marked as safely collected and handed over!', 'success', 'Handover Complete');
      return { success: true };
    },
    [medications, saveMedsToLocal, showToast]
  );

  // Medicine Requests (Reverse Marketplace)
  const addMedicineRequest = useCallback(
    async (data: NewMedicineRequestInput): Promise<MedicineRequest> => {
      setActionLoading('requesting');
      const tempId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const reqUser = currentUser;
      const resolvedCategory = data.category || inferCategory(data.medicineName, data.genericName);

      const newRequest: MedicineRequest = {
        id: tempId,
        medicineName: data.medicineName.trim(),
        genericName: data.genericName?.trim() || undefined,
        category: resolvedCategory,
        strength: data.strength.trim(),
        quantityNeeded: data.quantityNeeded.trim(),
        urgency: data.urgency,
        location: data.location.trim(),
        requesterId: reqUser?.id || 'guest-collector',
        requesterName: reqUser?.name || 'Verified Community Collector',
        requesterRole: reqUser?.role || 'individual',
        requesterPhone: data.requesterPhone?.trim() || reqUser?.phone || '+880 1700-000000',
        reasonOrPrescription: data.reasonOrPrescription.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
      };

      setRequests((prev) => {
        const updated = [newRequest, ...prev];
        saveRequestsToLocal(updated);
        return updated;
      });

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('medicine_requests').insert({
            id: newRequest.id,
            medicine_name: newRequest.medicineName,
            generic_name: newRequest.genericName || null,
            strength: newRequest.strength,
            quantity_needed: newRequest.quantityNeeded,
            urgency: newRequest.urgency,
            location: newRequest.location,
            requester_id: newRequest.requesterId,
            requester_name: newRequest.requesterName,
            requester_role: newRequest.requesterRole,
            requester_phone: newRequest.requesterPhone,
            reason_or_prescription: newRequest.reasonOrPrescription,
            status: newRequest.status,
          });
        } catch (e) {
          console.warn('Supabase medicine_requests insert fallback to local:', e);
        }
      }

      setActionLoading(null);
      showToast(
        `Urgent request for "${newRequest.medicineName}" posted to board!`,
        'success',
        'Request Broadcasted'
      );
      return newRequest;
    },
    [currentUser, saveRequestsToLocal, showToast]
  );

  const fulfillMedicineRequest = useCallback(
    async (requestId: string, donorName?: string) => {
      setActionLoading(requestId);
      const name = donorName || currentUser?.name || 'Community Donor';

      setRequests((prev) => {
        const updated = prev.map((req) => {
          if (req.id === requestId) {
            return {
              ...req,
              status: 'fulfilled' as const,
              fulfilledByName: name,
            };
          }
          return req;
        });
        saveRequestsToLocal(updated);
        return updated;
      });

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('medicine_requests')
            .update({
              status: 'fulfilled',
              fulfilled_by_name: name,
            })
            .eq('id', requestId);
        } catch (e) {
          console.warn('Supabase fulfill request fallback to local:', e);
        }
      }

      setActionLoading(null);
      showToast(
        `Urgent request marked as fulfilled by ${name}!`,
        'success',
        'Request Fulfilled'
      );
    },
    [currentUser, saveRequestsToLocal, showToast]
  );

  const openDonateWithRequest = useCallback((req: MedicineRequest) => {
    setPrefillRequestForDonation(req);
    setIsDonateOpen(true);
  }, []);

  // Verification Methods (3-Stage Workflow)
  const submitVerification = useCallback(
    async (details: VerificationDetails) => {
      if (!currentUserId) return;
      setActionLoading('verifying');

      const isAuto = details.autoApprove === true;
      const newStatus: VerificationStatus = isAuto ? 'verified' : 'pending';

      const updatedUsers = allUsers.map((user) => {
        if (user.id === currentUserId) {
          return {
            ...user,
            ...(details.name !== undefined && { name: details.name.trim() }),
            ...(details.phone !== undefined && { phone: details.phone.trim() }),
            ...(details.location !== undefined && { location: details.location.trim() }),
            ...(details.organizationName !== undefined && {
              organizationName: details.organizationName.trim(),
            }),
            ...(details.registrationOrNid !== undefined && {
              registrationOrNid: details.registrationOrNid.trim(),
            }),
            verificationStatus: newStatus,
            isVerified: isAuto,
            submittedAt: new Date().toISOString(),
          };
        }
        return user;
      });

      setAllUsers(updatedUsers);
      saveUsersToLocal(updatedUsers);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('profiles').update({
            organization_name: details.organizationName?.trim() || null,
            registration_or_nid: details.registrationOrNid?.trim() || null,
            verification_status: newStatus,
          }).eq('id', currentUserId);
        } catch (e) {
          console.warn('Supabase verification update fallback:', e);
        }
      }

      setActionLoading(null);
      if (isAuto) {
        showToast('Account verified! You can now claim available medications.', 'success', 'Verified');
      } else {
        showToast(
          'Verification submitted! Your credentials are now under review by the MedShare Verification Team.',
          'info',
          'Submitted for Review'
        );
      }
    },
    [allUsers, currentUserId, saveUsersToLocal, showToast]
  );

  const verifyCurrentUser = useCallback(
    async (details?: VerificationDetails) => {
      await submitVerification({
        ...details,
        autoApprove: true,
      });
    },
    [submitVerification]
  );

  const approveVerification = useCallback(
    async (userId: string) => {
      const target = allUsers.find((u) => u.id === userId);
      const updatedUsers = allUsers.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            verificationStatus: 'verified' as const,
            isVerified: true,
          };
        }
        return u;
      });

      setAllUsers(updatedUsers);
      saveUsersToLocal(updatedUsers);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('profiles')
            .update({ verification_status: 'verified' })
            .eq('id', userId);
        } catch (e) {
          console.warn('Supabase approve fallback:', e);
        }
      }

      showToast(
        `Approved collector credentials for ${target?.name || 'User'}!`,
        'success',
        'Moderator Approval'
      );
    },
    [allUsers, saveUsersToLocal, showToast]
  );

  const rejectVerification = useCallback(
    async (userId: string, reason?: string) => {
      const target = allUsers.find((u) => u.id === userId);
      const updatedUsers = allUsers.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            verificationStatus: 'unverified' as const,
            isVerified: false,
          };
        }
        return u;
      });

      setAllUsers(updatedUsers);
      saveUsersToLocal(updatedUsers);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('profiles')
            .update({ verification_status: 'unverified' })
            .eq('id', userId);
        } catch (e) {
          console.warn('Supabase reject fallback:', e);
        }
      }

      showToast(
        `Verification rejected for ${target?.name || 'User'}.${reason ? ` Reason: ${reason}` : ''}`,
        'warning',
        'Moderator Decision'
      );
    },
    [allUsers, saveUsersToLocal, showToast]
  );

  const resetDemoData = useCallback(async () => {
    setMedications(INITIAL_MEDICATIONS);
    setRequests(INITIAL_REQUESTS);
    setAllUsers(DEFAULT_USERS);
    setCurrentUserId(DEFAULT_USERS[0].id);

    try {
      localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(INITIAL_MEDICATIONS));
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(INITIAL_REQUESTS));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      localStorage.setItem(CURRENT_USER_ID_KEY, DEFAULT_USERS[0].id);
    } catch (err) {
      console.error('Error resetting demo data:', err);
    }
    showToast('Demo data and local state reset to default Bangladeshi seeds.', 'info', 'Demo Reset');
  }, [showToast]);

  // Modal open/close helpers
  const openDonateModal = () => {
    setPrefillRequestForDonation(null);
    setIsDonateOpen(true);
  };
  const closeDonateModal = () => {
    setIsDonateOpen(false);
    setPrefillRequestForDonation(null);
  };

  const openVerifyModal = (notice?: string) => {
    setVerifyNotice(notice || null);
    setIsVerifyOpen(true);
  };
  const closeVerifyModal = () => {
    setIsVerifyOpen(false);
    setVerifyNotice(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login', notice?: string) => {
    setAuthMode(mode);
    setAuthNotice(notice || null);
    setIsAuthOpen(true);
  };
  const closeAuthModal = () => {
    setIsAuthOpen(false);
    setAuthNotice(null);
  };

  const openRequestModal = () => setIsRequestModalOpen(true);
  const closeRequestModal = () => setIsRequestModalOpen(false);

  return (
    <MedShareContext.Provider
      value={{
        medications,
        requests,
        openRequestsCount,
        currentUser,
        allUsers,
        isDbConnected,
        dbMode,
        actionLoading,
        toasts,
        showToast,
        dismissToast,
        switchUser,
        login,
        register,
        logout,
        loginAsDemo,
        addMedication,
        claimMedication,
        releaseClaim,
        markAsCollected,
        addMedicineRequest,
        fulfillMedicineRequest,
        verifyCurrentUser,
        submitVerification,
        approveVerification,
        rejectVerification,
        pendingVerifications,
        resetDemoData,
        isDonateOpen,
        openDonateModal,
        closeDonateModal,
        isVerifyOpen,
        verifyNotice,
        openVerifyModal,
        closeVerifyModal,
        isAuthOpen,
        authMode,
        authNotice,
        openAuthModal,
        closeAuthModal,
        isRequestModalOpen,
        openRequestModal,
        closeRequestModal,
        prefillRequestForDonation,
        setPrefillRequestForDonation,
        openDonateWithRequest,
        activeMainTab,
        setActiveMainTab,
      }}
    >
      {children}
    </MedShareContext.Provider>
  );
}

export function useMedShare() {
  const context = useContext(MedShareContext);
  if (!context) {
    throw new Error('useMedShare must be used within a MedShareProvider');
  }
  return context;
}
