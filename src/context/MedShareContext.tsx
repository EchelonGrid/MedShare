'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Medication, UserProfile, VerificationStatus, UserRole } from '@/types/medshare';
import { DEFAULT_USERS, INITIAL_MEDICATIONS, getDaysUntilExpiry } from '@/lib/seed';
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

export interface NewMedicationInput {
  medicineName: string;
  genericName?: string;
  strength: string;
  quantity: string;
  expiryDate: string;
  location: string;
  donorPhone?: string;
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
  claimMedication: (medicationId: string, prescriptionRef?: string) => Promise<void>;
  markAsCollected: (medicationId: string) => Promise<void>;
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
  activeMainTab: 'feed' | 'portal';
  setActiveMainTab: (tab: 'feed' | 'portal') => void;
}

const MedShareContext = createContext<MedShareContextType | undefined>(undefined);

export function MedShareProvider({ children }: { children: React.ReactNode }) {
  // State
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
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
  const [activeMainTab, setActiveMainTab] = useState<'feed' | 'portal'>('feed');

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
          initialLocalMeds = parsedMeds;
        }
      } catch (e) {
        console.warn('Failed parsing stored meds', e);
      }
    }
    setMedications(initialLocalMeds);

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

      // Supabase Real-time Subscription
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

      return () => {
        sb.removeChannel(channel);
      };
    } else {
      setDbMode('local');
      setIsDbConnected(false);
    }
  }, [saveMedsToLocal]);

  // Derived current user
  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return allUsers.find((u) => u.id === currentUserId) || null;
  }, [allUsers, currentUserId]);

  // Derived pending verifications list
  const pendingVerifications = useMemo(() => {
    return allUsers.filter((u) => u.verificationStatus === 'pending');
  }, [allUsers]);

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
            // Fetch profile
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

        // Attempt Supabase Auth signUp if configured
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
            // Upsert profile in DB
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

      const newMed: Medication = {
        id: tempId,
        medicineName: data.medicineName.trim(),
        genericName: data.genericName?.trim() || undefined,
        strength: data.strength.trim(),
        quantity: data.quantity.trim(),
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
          // Omit tempId if let Supabase generate UUID, or keep if UUID
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
    async (medicationId: string, prescriptionRef?: string) => {
      setActionLoading(medicationId);

      const claimer = currentUser;
      const claimedAt = new Date().toISOString();

      // Optimistic update
      setMedications((prev) => {
        const updated = prev.map((med) => {
          if (med.id === medicationId) {
            return {
              ...med,
              status: 'claimed' as const,
              claimedById: claimer?.id,
              claimedByName: claimer?.name || 'Verified Collector',
              claimedByRole: claimer?.role || 'individual',
              prescriptionRef: prescriptionRef || med.prescriptionRef,
              claimedAt,
            };
          }
          return med;
        });
        saveMedsToLocal(updated);
        return updated;
      });

      // Persist to Supabase if configured
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
      showToast(
        'Medicine claimed! Pickup contact unlocked in your portal.',
        'success',
        'Claim Successful'
      );
    },
    [currentUser, saveMedsToLocal, showToast]
  );

  const markAsCollected = useCallback(
    async (medicationId: string) => {
      setActionLoading(medicationId);
      const collectedAt = new Date().toISOString();

      // Optimistic update
      setMedications((prev) => {
        const updated = prev.map((med) => {
          if (med.id === medicationId) {
            return {
              ...med,
              status: 'collected' as const,
              collectedAt,
            };
          }
          return med;
        });
        saveMedsToLocal(updated);
        return updated;
      });

      // Supabase update
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
    },
    [saveMedsToLocal, showToast]
  );

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

      // Supabase profile update if configured
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
      // Direct verification / auto-approval convenience helper
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
    setAllUsers(DEFAULT_USERS);
    setCurrentUserId(DEFAULT_USERS[0].id);

    try {
      localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(INITIAL_MEDICATIONS));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      localStorage.setItem(CURRENT_USER_ID_KEY, DEFAULT_USERS[0].id);
    } catch (err) {
      console.error('Error resetting demo data:', err);
    }
    showToast('Demo data and local state reset to default Bangladeshi seeds.', 'info', 'Demo Reset');
  }, [showToast]);

  // Modal open/close helpers
  const openDonateModal = () => setIsDonateOpen(true);
  const closeDonateModal = () => setIsDonateOpen(false);

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

  return (
    <MedShareContext.Provider
      value={{
        medications,
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
        markAsCollected,
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
