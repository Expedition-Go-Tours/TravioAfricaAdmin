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
  total: number;
  currency: string;
  selectedDate: string;
  selectedTime?: string | null;
  subtotal: number;
  taxes: number;
  fees: number;
  discounts: number;
  commissionRate: number;
  commissionAmount: number;
  supplierPayout: number;
  travelers: Traveler[];
  specialRequests?: string | null;
  cancellationReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomer;
  tour: BookingTour;
  payouts: BookingPayout[];
}

export interface Traveler {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}
