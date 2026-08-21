export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "REFUNDED";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "SUCCEEDED"
  | "PROCESSING"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export function isPaymentPaid(status: PaymentStatus | string): boolean {
  return status === "PAID" || status === "SUCCEEDED";
}

export interface BookingPayout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface BookingCustomer {
  id: string;
  name: string;
  email: string;
  photoURL?: string | null;
  phone?: string | null;
}

export interface BookingTour {
  id: string;
  title: string;
  coverPhoto?: string | null;
  supplier: {
    id: string;
    name: string;
  };
}

export interface Booking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  grossAmount: number;
  currency: string;
  travelDate: string;
  selectedTime?: string | null;
  subtotal: number;
  taxes: number;
  fees: number;
  discounts: number;
  commissionRate: number;
  platformCommission: number;
  supplierPayout: number;
  travelers: TravelerData;
  specialRequests?: string | null;
  cancellationReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomer;
  tour: BookingTour;
  payouts: BookingPayout[];
  source?: string;
}

export interface TravelerDetail {
  name: string;
  age?: number;
  ageGroup?: string;
}

export interface TravelerData {
  adults: number;
  children: number;
  infants: number;
  seniors?: number;
  phoneNumber?: string;
  location?: string;
  details?: TravelerDetail[];
}

export function travelerCount(travelers: TravelerData | null | undefined): number {
  if (!travelers || typeof travelers !== "object") return 0;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0) + (travelers.seniors || 0);
}
