import { UserProfile, Medication } from '@/types/medshare';
import { parseQuantity } from '@/lib/seed';

/**
 * Escapes a cell value for standard CSV compatibility (RFC 4180).
 * Handles quotes, commas, newlines, and nulls.
 */
function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ');
  // If string contains comma, quote, or semicolon, wrap in quotes and escape internal quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Triggers a browser download of CSV string content.
 */
function downloadCSV(csvContent: string, filename: string): void {
  // UTF-8 BOM (\uFEFF) ensures Excel and text editors properly render UTF-8 characters
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports collected medication inventory audit log for clinics and collectors.
 * Filename: MedShare_Collected_Inventory_[Date].csv
 * Columns: Medicine Name, Generic Name, Category, Strength, Quantity Collected, Expiry Date, Donor Name, Pickup Location, Handover Status, Collected At
 */
export function exportCollectedInventoryCSV(
  user: UserProfile,
  collectedItems: Array<{
    medication: Medication;
    claimId?: string;
    claimedQuantity: number;
    unitName: string;
    totalBatchQuantity?: number;
    collectedAt?: string;
    isPartial?: boolean;
  } | Medication>
): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `MedShare_Collected_Inventory_${dateStr}.csv`;

  const headers = [
    'Medicine Name',
    'Generic Name',
    'Category',
    'Strength',
    'Quantity Collected',
    'Expiry Date',
    'Donor Name',
    'Pickup Location',
    'Handover Status',
    'Collected At',
  ];

  const rows: string[][] = [];

  collectedItems.forEach((item) => {
    let med: Medication;
    let qtyCollectedStr: string;
    let collectedTimestamp: string;

    if ('medication' in item) {
      med = item.medication;
      qtyCollectedStr = `${item.claimedQuantity} ${item.unitName}`;
      collectedTimestamp = item.collectedAt || med.collectedAt || med.createdAt;
    } else {
      med = item;
      const parsed = parseQuantity(med.quantity);
      qtyCollectedStr = `${med.claimedQuantity ?? med.totalNumericQuantity ?? parsed.total} ${med.unitName || parsed.unit}`;
      collectedTimestamp = med.collectedAt || med.createdAt;
    }

    const row = [
      med.medicineName || 'Unnamed Medicine',
      med.genericName || 'N/A',
      med.category || 'General',
      med.strength || '',
      qtyCollectedStr,
      med.expiryDate || '',
      med.donorName || 'Community Donor',
      med.location || '',
      'Verified & Handed Over',
      collectedTimestamp ? new Date(collectedTimestamp).toLocaleString('en-US') : 'Verified',
    ];

    rows.push(row);
  });

  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ];

  downloadCSV(csvRows.join('\r\n'), filename);
}

/**
 * Exports complete donation history audit log for donors.
 * Filename: MedShare_Donation_Log_[Date].csv
 * Columns: Medicine Name, Generic Name, Category, Strength, Total Quantity, Remaining Quantity, Expiry Date, Status, Claimed By, Recipient Role
 */
export function exportDonorHistoryCSV(user: UserProfile, donatedItems: Medication[]): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `MedShare_Donation_Log_${dateStr}.csv`;

  const headers = [
    'Medicine Name',
    'Generic Name',
    'Category',
    'Strength',
    'Total Quantity',
    'Remaining Quantity',
    'Expiry Date',
    'Status',
    'Claimed By',
    'Recipient Role',
  ];

  const rows: string[][] = [];

  donatedItems.forEach((med) => {
    const parsed = parseQuantity(med.quantity);
    const total = med.totalNumericQuantity ?? parsed.total;
    const unit = med.unitName || parsed.unit;
    const remaining =
      med.remainingNumericQuantity !== undefined
        ? med.remainingNumericQuantity
        : med.status === 'available'
        ? total
        : 0;

    let claimedByStr = 'None (Available)';
    let recipientRoleStr = 'N/A';

    if (med.claims && med.claims.length > 0) {
      claimedByStr = med.claims.map((c) => `${c.claimerName} (${c.claimedQuantity} ${c.unitName})`).join('; ');
      recipientRoleStr = med.claims.map((c) => c.claimerRole).join(', ');
    } else if (med.claimedByName) {
      claimedByStr = med.claimedByName;
      recipientRoleStr = med.claimedByRole || 'individual';
    }

    let statusLabel = 'Available';
    if (med.status === 'collected') statusLabel = 'Handed Over';
    else if (med.status === 'claimed') statusLabel = 'Claimed (Pending Pickup)';

    const row = [
      med.medicineName || 'Unnamed Medicine',
      med.genericName || 'N/A',
      med.category || 'General',
      med.strength || '',
      `${total} ${unit}`,
      `${remaining} ${unit}`,
      med.expiryDate || '',
      statusLabel,
      claimedByStr,
      recipientRoleStr,
    ];

    rows.push(row);
  });

  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ];

  downloadCSV(csvRows.join('\r\n'), filename);
}
