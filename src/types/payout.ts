export interface Payout {
  id: string;
  supplier?: {
    name?: string;
    id?: string;
    email?: string;
    phone?: string;
    photoURL?: string;
    user?: { photoURL?: string };
    supplierProfile?: {
      businessInfo?: {
        legalBusinessName?: string;
        displayName?: string;
        country?: string;
        city?: string;
        phone?: string;
        address?: string | { city?: string; line1?: string; state?: string; postalCode?: string };
        phoneNumber?: string;
      };
      payoutInfo?: Record<string, unknown>;
    };
  };
  tour?: { title?: string };
  booking?: { bookingNumber?: string; total?: string; paidAt?: string; tour?: { title?: string } };
  bookingId?: string;
  amount?: number | string;
  commissionAmount?: number | string;
  status?: string;
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  processedAt?: string;
  processedBy?: string;
  paidAt?: string;
  notes?: string;
  commission?: number | string;
  payoutMethod?: {
    id?: string;
    type?: string;
    details?: string;
    bankName?: string;
    accountNumber?: string;
    isDefault?: boolean;
    verified?: boolean;
  };
  reference?: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}
