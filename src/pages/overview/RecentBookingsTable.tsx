import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarCheck } from "lucide-react";
import OptimizedImage from "@/components/shared/OptimizedImage";

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  customer: { name: string; email: string; photoURL?: string };
  tour: { title: string };
}

interface RecentBookingsTableProps {
  bookings?: Booking[];
  loading?: boolean;
}

export function RecentBookingsTable({ bookings = [], loading }: RecentBookingsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl bg-white border-0 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-gray-500" />
          <h3 className="text-[15px] font-semibold text-gray-900">Recent Bookings</h3>
        </div>
        <button 
          onClick={() => navigate("/admin/bookings")}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View all
        </button>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">No recent bookings</div>
      ) : (
        <div className="space-y-2">
          {bookings.slice(0, 5).map((booking) => (
            <div 
              key={booking.id} 
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/admin/bookings?bookingId=${booking.id}`, { state: { bookingId: booking.id } })}
            >
              {booking.customer?.photoURL ? (
                <OptimizedImage
                  src={booking.customer.photoURL}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover shrink-0"
                  width={40}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {booking.customer?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {booking.customer?.name || "Unknown"}
                  </p>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {booking.tour?.title || "—"} · {formatDate(booking.createdAt)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(booking.total)}
                </p>
                <p className="text-[10px] text-gray-400">{booking.bookingNumber}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
