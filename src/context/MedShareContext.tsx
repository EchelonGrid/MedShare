'use client';

import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { Medication, UserProfile } from '@/types/medshare';
import { DEFAULT_USERS, INITIAL_MEDICATIONS, getDaysUntilExpiry } from '@/lib/seed';

const MEDS_STORAGE_KEY = 'medshare_v2_medications';
const USERS_STORAGE_KEY = 'medshare_v2_users';
const CURRENT_USER_ID_KEY = 'medshare_v2_current_user_id';

export interface NewMedicationInput {
  medicineName: string;
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
}

export interface RegisterData {
  name: string;
  email: string;
  password?: string;
  role: 'donor' | 'clinic_charity' | 'individual';
  phone: string;
  location: string;
  organizationName?: string;
  registrationOrNid?: string;
}

interface MedShareContextType {
  medications: Medication[];
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  switchUser: (userId: string) => void;
  login: (email: string, password?: string) => { success: boolean; error?: string };
  register: (data: RegisterData) => { success: boolean; error?: string };
  logout: () => void;
  loginAsDemo: (userId: string) => void;
  addMedication: (data: NewMedicationInput) => Medication;
  claimMedication: (medicationId: string, prescriptionRef?: string) => void;
  markAsCollected: (medicationId: string) => void;
  verifyCurrentUser: (details?: VerificationDetails) => void;
  resetDemoData: () => void;
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

// In-memory synced state
let cachedMeds: Medication[] = INITIAL_MEDICATIONS;
let cachedUsers: UserProfile[] = DEFAULT_USERS;
let cachedUserId: string | null = DEFAULT_USERS[0].id;
let isLoaded = false;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function loadInitialData() {
  if (isLoaded || typeof window === 'undefined') return;
  try {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      try {
        const parsedUsers = JSON.parse(storedUsers);
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0 && parsedUsers[0]?.name) {
          cachedUsers = parsedUsers;
        } else {
          cachedUsers = DEFAULT_USERS;
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
        }
      } catch {
        cachedUsers = DEFAULT_USERS;
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      }
    } else {
      cachedUsers = DEFAULT_USERS;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    }

    const storedCurrentId = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (storedCurrentId === 'guest') {
      cachedUserId = null;
    } else if (storedCurrentId && cachedUsers.some((u) => u.id === storedCurrentId)) {
      cachedUserId = storedCurrentId;
    } else if (storedCurrentId === null) {
      cachedUserId = DEFAULT_USERS[0].id;
      localStorage.setItem(CURRENT_USER_ID_KEY, DEFAULT_USERS[0].id);
    } else {
      cachedUserId = DEFAULT_USERS[0]?.id || null;
    }

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
          cachedMeds = parsedMeds;
        } else {
          cachedMeds = INITIAL_MEDICATIONS;
          localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(INITIAL_MEDICATIONS));
        }
      } catch {
        cachedMeds = INITIAL_MEDICATIONS;
        localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(INITIAL_MEDICATIONS));
      }
    } else {
      cachedMeds = INITIAL_MEDICATIONS;
      localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(INITIAL_MEDICATIONS));
    }
  } catch (err) {
    console.error('Error initializing MedShare store from localStorage:', err);
    cachedMeds = INITIAL_MEDICATIONS;
    cachedUsers = DEFAULT_USERS;
    cachedUserId = DEFAULT_USERS[0].id;
  }
  isLoaded = true;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getMedsSnapshot = () => {
  loadInitialData();
  return cachedMeds;
};
const getMedsServerSnapshot = () => INITIAL_MEDICATIONS;

const getUsersSnapshot = () => {
  loadInitialData();
  return cachedUsers;
};
const getUsersServerSnapshot = () => DEFAULT_USERS;

const getCurrentUserIdSnapshot = () => {
  loadInitialData();
  return cachedUserId;
};
const getCurrentUserIdServerSnapshot = () => DEFAULT_USERS[0].id;

const switchUser = (userId: string) => {
  if (cachedUsers.some((u) => u.id === userId)) {
    cachedUserId = userId;
    try {
      localStorage.setItem(CURRENT_USER_ID_KEY, userId);
    } catch (err) {
      console.error('Error saving active user to localStorage:', err);
    }
    notify();
  }
};

const login = (email: string, password?: string): { success: boolean; error?: string } => {
  loadInitialData();
  const user = cachedUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return { success: false, error: 'No account found with this email address.' };
  }
  if (password && user.password && user.password !== password) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }
  cachedUserId = user.id;
  try {
    localStorage.setItem(CURRENT_USER_ID_KEY, user.id);
  } catch (err) {
    console.error('Error saving current user in localStorage:', err);
  }
  notify();
  return { success: true };
};

const register = (data: RegisterData): { success: boolean; error?: string } => {
  loadInitialData();
  const existing = cachedUsers.find(
    (u) => u.email.toLowerCase() === data.email.trim().toLowerCase()
  );
  if (existing) {
    return { success: false, error: 'An account with this email address already exists.' };
  }

  const isVerifiedInitial =
    data.role === 'donor'
      ? true
      : Boolean(data.registrationOrNid && data.registrationOrNid.trim().length > 0);

  const newUser: UserProfile = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    password: data.password || 'password123',
    role: data.role,
    phone: data.phone.trim(),
    location: data.location.trim(),
    organizationName: data.organizationName?.trim(),
    registrationOrNid: data.registrationOrNid?.trim(),
    isVerified: isVerifiedInitial,
  };

  cachedUsers = [newUser, ...cachedUsers];
  cachedUserId = newUser.id;

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cachedUsers));
    localStorage.setItem(CURRENT_USER_ID_KEY, newUser.id);
  } catch (err) {
    console.error('Error saving new user in localStorage:', err);
  }
  notify();
  return { success: true };
};

const logout = () => {
  cachedUserId = null;
  try {
    localStorage.setItem(CURRENT_USER_ID_KEY, 'guest');
  } catch (err) {
    console.error('Error saving logout state:', err);
  }
  notify();
};

const loginAsDemo = (userId: string) => {
  loadInitialData();
  const user = cachedUsers.find((u) => u.id === userId);
  if (user) {
    cachedUserId = user.id;
    try {
      localStorage.setItem(CURRENT_USER_ID_KEY, user.id);
    } catch (err) {
      console.error('Error saving demo user:', err);
    }
    notify();
  }
};

const addMedication = (data: NewMedicationInput): Medication => {
  const currentUser = cachedUsers.find((u) => u.id === cachedUserId) || null;
  const newMed: Medication = {
    id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    medicineName: data.medicineName.trim(),
    strength: data.strength.trim(),
    quantity: data.quantity.trim(),
    expiryDate: data.expiryDate,
    location: data.location.trim(),
    donorId: currentUser?.id || 'donor-anon',
    donorName: currentUser?.name || 'Community Donor',
    donorPhone: data.donorPhone?.trim() || currentUser?.phone || '+1 (555) 000-0000',
    status: 'available',
    createdAt: new Date().toISOString(),
  };

  cachedMeds = [newMed, ...cachedMeds];
  try {
    localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(cachedMeds));
  } catch (err) {
    console.error('Error saving medications to localStorage:', err);
  }
  notify();
  return newMed;
};

const claimMedication = (medicationId: string, prescriptionRef?: string) => {
  const currentUser = cachedUsers.find((u) => u.id === cachedUserId) || null;
  cachedMeds = cachedMeds.map((med) => {
    if (med.id === medicationId) {
      return {
        ...med,
        status: 'claimed' as const,
        claimedById: currentUser?.id,
        claimedByName: currentUser?.name || 'Verified Collector',
        claimedByRole: currentUser?.role || 'individual',
        prescriptionRef: prescriptionRef || med.prescriptionRef,
      };
    }
    return med;
  });

  try {
    localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(cachedMeds));
  } catch (err) {
    console.error('Error updating claim status in localStorage:', err);
  }
  notify();
};

const markAsCollected = (medicationId: string) => {
  cachedMeds = cachedMeds.map((med) => {
    if (med.id === medicationId) {
      return {
        ...med,
        status: 'collected' as const,
      };
    }
    return med;
  });

  try {
    localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(cachedMeds));
  } catch (err) {
    console.error('Error marking medication as collected in localStorage:', err);
  }
  notify();
};

const verifyCurrentUser = (details?: VerificationDetails) => {
  cachedUsers = cachedUsers.map((user) => {
    if (user.id === cachedUserId) {
      return {
        ...user,
        ...(details?.name !== undefined && { name: details.name.trim() }),
        ...(details?.phone !== undefined && { phone: details.phone.trim() }),
        ...(details?.location !== undefined && { location: details.location.trim() }),
        ...(details?.organizationName !== undefined && { organizationName: details.organizationName.trim() }),
        ...(details?.registrationOrNid !== undefined && { registrationOrNid: details.registrationOrNid.trim() }),
        isVerified: true,
      };
    }
    return user;
  });

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cachedUsers));
  } catch (err) {
    console.error('Error verifying current user in localStorage:', err);
  }
  notify();
};

const resetDemoData = () => {
  cachedMeds = INITIAL_MEDICATIONS;
  cachedUsers = DEFAULT_USERS;
  cachedUserId = DEFAULT_USERS[0].id;

  try {
    localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(INITIAL_MEDICATIONS));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(CURRENT_USER_ID_KEY, DEFAULT_USERS[0].id);
  } catch (err) {
    console.error('Error resetting demo data:', err);
  }
  notify();
};

const MedShareContext = createContext<MedShareContextType | undefined>(undefined);

export function MedShareProvider({ children }: { children: React.ReactNode }) {
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [activeMainTab, setActiveMainTab] = useState<'feed' | 'portal'>('feed');

  const medications = useSyncExternalStore(subscribe, getMedsSnapshot, getMedsServerSnapshot);
  const allUsers = useSyncExternalStore(subscribe, getUsersSnapshot, getUsersServerSnapshot);
  const currentUserId = useSyncExternalStore(
    subscribe,
    getCurrentUserIdSnapshot,
    getCurrentUserIdServerSnapshot
  );

  const currentUser = currentUserId
    ? allUsers.find((u) => u.id === currentUserId) || null
    : null;

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
        switchUser,
        login,
        register,
        logout,
        loginAsDemo,
        addMedication,
        claimMedication,
        markAsCollected,
        verifyCurrentUser,
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
