import { MedicineCategory } from '@/types/medshare';

export interface MedicineEntry {
  genericName: string;
  category: MedicineCategory;
  brands: string[];
  commonStrengths: string[];
}

export const MEDICINE_CATEGORIES: MedicineCategory[] = [
  'Gastric & Ulcer',
  'Blood Pressure & Heart',
  'Diabetes',
  'Antibiotics',
  'Pain & Fever',
  'Asthma & Allergy',
  'Vitamins & Supplements',
  'Other',
];

export const BANGLADESH_MEDICINE_DICTIONARY: MedicineEntry[] = [
  // 1. Gastric & Ulcer
  {
    genericName: 'Esomeprazole',
    category: 'Gastric & Ulcer',
    brands: ['Sergel', 'Maxpro', 'Nexum', 'Esoral', 'Exium', 'Opton'],
    commonStrengths: ['20mg', '40mg'],
  },
  {
    genericName: 'Omeprazole',
    category: 'Gastric & Ulcer',
    brands: ['Seclo', 'Losectil', 'Ometid', 'Proceptin'],
    commonStrengths: ['20mg', '40mg'],
  },
  {
    genericName: 'Pantoprazole',
    category: 'Gastric & Ulcer',
    brands: ['Pantonix', 'Pantobex', 'Trupan', 'Pantodac'],
    commonStrengths: ['20mg', '40mg'],
  },

  // 2. Pain & Fever
  {
    genericName: 'Paracetamol',
    category: 'Pain & Fever',
    brands: ['Napa', 'Napa Extend', 'Ace', 'Ace Plus', 'Fast', 'Renova', 'Reset'],
    commonStrengths: ['500mg', '665mg', '120mg/5ml'],
  },
  {
    genericName: 'Ketorolac',
    category: 'Pain & Fever',
    brands: ['Rolac', 'Tora', 'Etorix', 'Torax'],
    commonStrengths: ['10mg', '60mg'],
  },
  {
    genericName: 'Ibuprofen',
    category: 'Pain & Fever',
    brands: ['Flamyd', 'Profen', 'Advil'],
    commonStrengths: ['200mg', '400mg'],
  },

  // 3. Blood Pressure & Heart
  {
    genericName: 'Amlodipine',
    category: 'Blood Pressure & Heart',
    brands: ['Amdocal', 'Camlodin', 'Calbo', 'Amlopin', 'Lodipine'],
    commonStrengths: ['5mg', '10mg'],
  },
  {
    genericName: 'Amlodipine + Olmesartan',
    category: 'Blood Pressure & Heart',
    brands: ['Bizoran', 'Camlosart', 'Orbas'],
    commonStrengths: ['5mg/20mg', '5mg/40mg'],
  },
  {
    genericName: 'Losartan Potassium',
    category: 'Blood Pressure & Heart',
    brands: ['Angilock', 'Osartil', 'Larb', 'Prosan'],
    commonStrengths: ['25mg', '50mg', '100mg'],
  },
  {
    genericName: 'Atorvastatin',
    category: 'Blood Pressure & Heart',
    brands: ['Atova', 'Lipicon', 'Tigesta', 'Atorvastatin Calcium', 'Lipirex'],
    commonStrengths: ['10mg', '20mg', '40mg'],
  },

  // 4. Diabetes
  {
    genericName: 'Metformin Hydrochloride',
    category: 'Diabetes',
    brands: ['Comet', 'Nobesit', 'Daomin', 'Metfo', 'Metformin Hydrochloride'],
    commonStrengths: ['500mg', '850mg', '1000mg'],
  },
  {
    genericName: 'Linagliptin',
    category: 'Diabetes',
    brands: ['Lina', 'Linaglip', 'Trajenta'],
    commonStrengths: ['5mg'],
  },
  {
    genericName: 'Biphasic Isophane Insulin',
    category: 'Diabetes',
    brands: ['Insulin (Mixtard 30/70)', 'Mixtard', 'Humulin 70/30', 'Novorapid'],
    commonStrengths: ['100 IU/ml (10ml Vial)', '100 IU/ml (3ml Pen)'],
  },

  // 5. Antibiotics
  {
    genericName: 'Azithromycin',
    category: 'Antibiotics',
    brands: ['Zimax', 'Azithrocin', 'Tridosil', 'Azithromycin', 'Azyth'],
    commonStrengths: ['250mg', '500mg'],
  },
  {
    genericName: 'Cefixime',
    category: 'Antibiotics',
    brands: ['Cef-3', 'Orcef', 'T-Cef', 'Denvar'],
    commonStrengths: ['200mg', '400mg'],
  },
  {
    genericName: 'Amoxicillin',
    category: 'Antibiotics',
    brands: ['Moxacil', 'Tycil', 'Fimoxyl', 'Amoxicillin Trihydrate'],
    commonStrengths: ['250mg', '500mg'],
  },

  // 6. Asthma & Allergy
  {
    genericName: 'Montelukast',
    category: 'Asthma & Allergy',
    brands: ['Monas', 'Montair', 'Montene', 'Aronas', 'Odmon'],
    commonStrengths: ['5mg', '10mg'],
  },
  {
    genericName: 'Fexofenadine',
    category: 'Asthma & Allergy',
    brands: ['Fexo', 'Telfast', 'Fenadin', 'Axodin'],
    commonStrengths: ['120mg', '180mg'],
  },

  // 7. Vitamins & Supplements
  {
    genericName: 'Calcium + Vitamin D3',
    category: 'Vitamins & Supplements',
    brands: ['Coralcal-D', 'Ostocal D', 'Calbo-D', 'Aristocal-D'],
    commonStrengths: ['500mg+200IU'],
  },
  {
    genericName: 'Zinc + Vitamin B Complex',
    category: 'Vitamins & Supplements',
    brands: ['Bextram Gold', 'Filwel Gold', 'Xinc B', 'Zimax B'],
    commonStrengths: ['Standard'],
  },
];

export interface MedicineLookupResult {
  genericName: string;
  category: MedicineCategory;
  commonStrengths: string[];
  allEquivalentBrands: string[];
  matchedBrand?: string;
}

/**
 * Fast case-insensitive lookup by brand name or generic chemical name.
 */
export function lookupMedicineByBrandOrName(input: string): MedicineLookupResult | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase();
  if (clean.length === 0) return null;

  for (const entry of BANGLADESH_MEDICINE_DICTIONARY) {
    // Check generic name exact or included
    if (
      entry.genericName.toLowerCase() === clean ||
      clean.includes(entry.genericName.toLowerCase()) ||
      entry.genericName.toLowerCase().includes(clean)
    ) {
      return {
        genericName: entry.genericName,
        category: entry.category,
        commonStrengths: entry.commonStrengths,
        allEquivalentBrands: entry.brands,
      };
    }

    // Check brand names
    for (const b of entry.brands) {
      if (
        b.toLowerCase() === clean ||
        clean.includes(b.toLowerCase()) ||
        b.toLowerCase().includes(clean)
      ) {
        return {
          genericName: entry.genericName,
          category: entry.category,
          commonStrengths: entry.commonStrengths,
          allEquivalentBrands: entry.brands,
          matchedBrand: b,
        };
      }
    }
  }

  return null;
}

export interface AutocompleteSuggestion {
  name: string;
  type: 'brand' | 'generic';
  genericName: string;
  category: MedicineCategory;
  commonStrengths: string[];
  equivalentBrands: string[];
}

/**
 * Returns up to 6 matching brand or generic suggestions as user types.
 */
export function getAutocompleteSuggestions(query: string): AutocompleteSuggestion[] {
  if (!query || typeof query !== 'string') return [];
  const clean = query.trim().toLowerCase();
  if (clean.length < 2) return [];

  const results: AutocompleteSuggestion[] = [];
  const seenNames = new Set<string>();

  for (const entry of BANGLADESH_MEDICINE_DICTIONARY) {
    // Check if brand starts with or includes query
    for (const brand of entry.brands) {
      if (brand.toLowerCase().includes(clean) && !seenNames.has(brand)) {
        seenNames.add(brand);
        results.push({
          name: brand,
          type: 'brand',
          genericName: entry.genericName,
          category: entry.category,
          commonStrengths: entry.commonStrengths,
          equivalentBrands: entry.brands.filter((b) => b !== brand),
        });
      }
    }

    // Check if generic name matches
    if (entry.genericName.toLowerCase().includes(clean) && !seenNames.has(entry.genericName)) {
      seenNames.add(entry.genericName);
      results.push({
        name: entry.genericName,
        type: 'generic',
        genericName: entry.genericName,
        category: entry.category,
        commonStrengths: entry.commonStrengths,
        equivalentBrands: entry.brands,
      });
    }

    if (results.length >= 6) break;
  }

  return results.slice(0, 6);
}

/**
 * Inactive or unlisted medicine category inference.
 */
export function inferCategory(medicineName: string, genericName?: string): MedicineCategory {
  if (genericName) {
    const matchGen = lookupMedicineByBrandOrName(genericName);
    if (matchGen) return matchGen.category;
  }

  if (medicineName) {
    const matchBrand = lookupMedicineByBrandOrName(medicineName);
    if (matchBrand) return matchBrand.category;
  }

  // Keyword heuristics fallback
  const combined = `${medicineName} ${genericName || ''}`.toLowerCase();
  if (/gastric|ulcer|prazole|antacid/i.test(combined)) return 'Gastric & Ulcer';
  if (/pressure|hypertension|cardio|heart|dipine|sartan|statin/i.test(combined)) return 'Blood Pressure & Heart';
  if (/diabet|sugar|insulin|metformin|gliptin/i.test(combined)) return 'Diabetes';
  if (/antibiotic|mycin|cillin|cefixime|cef/i.test(combined)) return 'Antibiotics';
  if (/fever|pain|paracetamol|ketorolac|ibuprofen/i.test(combined)) return 'Pain & Fever';
  if (/asthma|allergy|fexo|montelukast|resp/i.test(combined)) return 'Asthma & Allergy';
  if (/vitamin|calcium|zinc|supplement|mineral/i.test(combined)) return 'Vitamins & Supplements';

  return 'Other';
}
