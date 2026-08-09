import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Users } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Supplier {
  id?: string;
  user?: { name?: string; email?: string; photoURL?: string };
  totalEarnings?: number;
  totalBookings?: number;
  averageRating?: number;
}

interface TopSuppliersProps {
  suppliers?: Supplier[];
  loading?: boolean;
}

export function TopSuppliers({ suppliers = [], loading }: TopSuppliersProps) {
  const navigate = useNavigate();

  return (
    <Card className="h-full border-0 shadow-sm bg-white rounded-2xl">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            Top Suppliers
          </CardTitle>
          <button 
            onClick={() => navigate("/admin/suppliers")}
            className="text-xs text-primary hover:underline font-medium"
          >
            View all
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-2.5 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No supplier data</div>
        ) : (
          <div className="space-y-1">
            {suppliers.slice(0, 5).map((supplier, idx) => (
              <div
                key={supplier.id || idx}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => supplier.id && navigate(`/admin/suppliers/${supplier.id}`)}
              >
                <div className="relative">
                  {supplier.user?.photoURL ? (
                    <img src={supplier.user.photoURL} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-sm font-semibold text-primary">
                      {supplier.user?.name?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                  )}
                  <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-gray-900 text-[10px] font-bold text-white flex items-center justify-center">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{supplier.user?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{formatNumber(supplier.totalBookings)} bookings</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(supplier.totalEarnings)}</p>
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-gray-500">{supplier.averageRating != null ? Number(supplier.averageRating).toFixed(1) : "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
