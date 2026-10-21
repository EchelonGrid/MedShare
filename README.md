# 🏥 MedShare

> **Surplus Medicine Rescue & Community Redistribution Network**  
> Bridging the gap between surplus unexpired medicine and rural healthcare facilities & low-income families.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 The Problem & The Solution

Every year, millions of dollars worth of unopened, factory-sealed, unexpired medications are thrown away in urban households and medical clinics simply because treatment was completed or adjusted. Meanwhile, rural health outposts, free charity clinics, and underserved patients face chronic medication shortages.

**MedShare** is an expiry-aware medicine redistribution platform built to prevent medical waste and support community healthcare through:
1. **First-to-Expire, First-Out (FEFO) Allocation**: Automatically prioritizes medicines nearing expiry so community organizers rescue critical items before dates lapse.
2. **Mandatory Safety Confirmation Gates**: Rejects loose tablets, opened bottles, expired items, and cold-chain medications.
3. **Verified Collector Access**: Requires official clinic/NGO registration numbers or national identity (NID) verification before medicines can be claimed.
4. **Physician Prescription Compliance**: Individual recipients must provide a valid doctor prescription reference to claim prescription-grade medicines.
5. **Closed-Loop In-Person Handover**: Contact details remain shielded until a verified claim is made, followed by in-person package inspection and a *"Mark as Collected"* status update.

---

## ✨ Key Features

### 1. 🕒 Expiry-Aware Live Rescue Feed (FEFO)
- **Automatic FEFO Sorting**: Available medicines are ordered strictly by the earliest expiration date to maximize community rescue efficiency.
- **Urgency Levels**:
  - 🔴 **Critical (≤ 30 days)**: Red-flagged with priority indicators for urgent rescue.
  - 🟡 **Priority (≤ 60 days)**: Amber-highlighted priority rescue window.
  - 🟢 **Normal (> 60 days)**: Standard unexpired community inventory.
- **Instant Search & Location Filters**: Real-time filtering by medicine name, strength (e.g., `500mg`, `20mg`), and pickup location.
- **Filter Tabs**: Quick toggling between `Available`, `Expiring Soon (≤60d)`, `Urgent (≤30d)`, and `Claimed & Collected`.

### 2. 🛡️ 3-Tier Safety Listing Gate (`DonateModal`)
- Donors can list surplus medications with exact quantity, packaging type, expiration date, and pickup area.
- Includes a live expiration date validator preventing expired or current-day entries.
- **Mandatory Safety Gatekeeper Checkboxes**:
  - `[✓]` Factory-sealed, intact blister pack or strip (no opened bottles or loose pills).
  - `[✓]` Stored at normal room temperature and unexpired.
  - `[✓]` Not an opened liquid syrup or a drug requiring refrigeration (e.g., insulin).

### 3. 🪪 Role-Based Collector Verification (`VerifyModal`)
- Unverified users cannot claim medications until identity is validated.
- **Dynamic Role Verification**:
  - **Rural Clinic / Charity**: Organization name, DGHS / NGO Affairs Bureau registration or license number, official phone, and location.
  - **Individual Recipient**: Full legal name, Government National ID (NID) / Birth Registration Number, phone, and location.
- Requires confirmation of the in-person physical inspection agreement upon handover.

### 4. 📋 Prescription Compliance & Direct Handover (`ClaimModal`)
- **Individual Claim Requirements**: Individual claimants must enter a valid physician or hospital prescription reference to verify legitimate medical need.
- **Clinic Claim Badges**: Verified clinics automatically display their NGO/clinic license credential with an optional coordination note for volunteer drivers.
- **Revealed Contact Card**: Once claimed, the donor's contact phone number and exact pickup location are revealed to the claimant.
- **In-Person Inspection Protocol**: Direct instructions for inspecting foil seals, checking stamped batch expiry dates, and concluding handover with the **"Mark as Collected"** action.

### 5. 👥 Interactive Demo Persona Switcher
Switch between demo roles instantly in the top navigation bar to test all user journeys:
- **Dr. Sarah Jenkins** (`donor`) – Doctor donating surplus sealed antibiotics and cardiometabolic drugs.
- **Nurse Michael Chang** (`clinic_charity`) – Healthcare worker for *Rural Hope Health Relief* (Verified NGO Clinic).
- **Rahim Chowdhury** (`individual`) – Patient with a doctor's prescription needing affordable ongoing medication (Starts unverified to demonstrate verification onboarding).
- **Reset Demo Button**: One-click reset to restore the original demo inventory and user accounts.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Storage**: Reactive synchronization using React 19 `useSyncExternalStore` backed by `localStorage` for zero-hydration mismatch persistence.

---

## 📁 Project Structure

```text
MedShare/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with fonts, metadata & providers
│   │   ├── page.tsx               # Main dashboard, stat counters, feed & footer
│   │   └── globals.css            # Tailwind CSS styling and theme setup
│   ├── components/
│   │   ├── Navbar.tsx             # Header, role switcher, verification badge & reset
│   │   ├── MedicationFeed.tsx     # Filterable FEFO medicine feed & tab filters
│   │   ├── MedicationCard.tsx     # Urgency pills, sealed badges & handover controls
│   │   ├── DonateModal.tsx        # Medicine donation modal with 3-point safety checklist
│   │   ├── VerifyModal.tsx        # Dynamic verification for clinics and individuals
│   │   ├── ClaimModal.tsx         # Prescription gate, clinic notes & contact reveal
│   │   └── Providers.tsx          # Client-side context provider wrapper
│   ├── context/
│   │   └── MedShareContext.tsx    # Central store: medicines, user state & modals
│   ├── types/
│   │   └── medshare.ts            # TypeScript interfaces & domain types
│   └── lib/
│       ├── seed.ts                # Default seed inventory, demo users & FEFO helpers
│       └── useIsMounted.ts        # Client mounting hook for hydration-safe dates
├── public/                        # Static assets & icons
├── package.json                   # Dependencies and npm scripts
└── README.md                      # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18 or later
- npm, yarn, or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/EchelonGrid/MedShare.git
   cd MedShare
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**  
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build
To create an optimized production build:
```bash
npm run build
npm start
```

---

## ⚠️ Safety Boundary & Disclaimer

> [!IMPORTANT]
> **Safety Boundary Protocol**:  
> MedShare exclusively facilitates the redistribution of **factory-sealed, intact blister strips and unopened original packaging** with clearly stamped, valid future expiration dates.
> 
> - **Zero Loose Pills**: Open bottles, loose tablets, or repacked items are strictly prohibited.
> - **In-Person Inspection**: Claimants and donors must physically inspect packaging integrity and verify the embossed expiry date on the foil packaging before completing the handover.
> - **Prescription Compliance**: Prescription medications must be matched to a licensed doctor's prescription before administration.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
