import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Map, Star, Eye, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionError } from "@/components/shared/SectionError";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface TourDetail {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  category?: string;
  duration?: string;
  difficulty?: string;
  groupSize?: string;
  price?: number;
  currency?: string;
  images?: string[];
  coverImage?: string;
  supplier?: { id?: string; name?: string; email?: string };
  bookingCount?: number;
  totalRevenue?: number;
  averageRating?: number;
  reviewCount?: number;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  highlights?: string[];
  itinerary?: { day?: number; title?: string; description?: string }[];
  inclusions?: string[];
  exclusions?: string[];
}

export default function TourDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tour, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "tour-detail", id],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/tour-performance?limit=100`);
      const tours: TourDetail[] = res.data?.data?.tours || res.data?.tours || [];
      const found = tours.find((t) => t.id === id);
      if (!found) throw new Error("Tour not found");
      return found;
    },
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/tours")} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-lg font-semibold text-text-primary">{tour?.title || "Tour Details"}</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <SectionError message="Failed to load tour details" onRetry={() => refetch()} />
      ) : !tour ? (
        <div className="py-12 text-center text-sm text-text-secondary">Tour not found</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Revenue</p>
                  <p className="text-lg font-semibold text-text-primary">{formatCurrency(tour.totalRevenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-sky-500/10">
                  <Calendar className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Bookings</p>
                  <p className="text-lg font-semibold text-text-primary">{formatNumber(tour.bookingCount)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-amber-500/10">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Rating</p>
                  <p className="text-lg font-semibold text-text-primary">{tour.averageRating?.toFixed(1) || "—"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-violet-500/10">
                  <Eye className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Views</p>
                  <p className="text-lg font-semibold text-text-primary">{formatNumber(tour.viewCount)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tour Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={tour.status || "UNKNOWN"} />
                    {tour.category && <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">{tour.category}</span>}
                  </div>
                  {tour.description && (
                    <div>
                      <p className="text-sm text-text-secondary leading-relaxed">{tour.description}</p>
                    </div>
                  )}
                  <div className="border-t border-border-muted">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-border-muted transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                          <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Duration</td>
                          <td className="px-5 py-3 font-medium text-text-primary">{tour.duration || "—"}</td>
                        </tr>
                        <tr className="border-b border-border-muted transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                          <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Group Size</td>
                          <td className="px-5 py-3 font-medium text-text-primary">{tour.groupSize || "—"}</td>
                        </tr>
                        <tr className="border-b border-border-muted transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                          <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Difficulty</td>
                          <td className="px-5 py-3 font-medium text-text-primary">{tour.difficulty || "—"}</td>
                        </tr>
                        <tr className="border-b border-border-muted transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                          <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Price</td>
                          <td className="px-5 py-3 font-medium text-text-primary">{tour.price ? formatCurrency(tour.price) : "—"}</td>
                        </tr>
                        <tr className="border-b border-border-muted transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                          <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Created</td>
                          <td className="px-5 py-3 font-medium text-text-primary">{tour.createdAt ? formatDate(tour.createdAt) : "—"}</td>
                        </tr>
                        <tr className="transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                          <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Updated</td>
                          <td className="px-5 py-3 font-medium text-text-primary">{tour.updatedAt ? formatDate(tour.updatedAt) : "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {tour.highlights && tour.highlights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-text-secondary">
                      {tour.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {tour.itinerary && tour.itinerary.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Itinerary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tour.itinerary.map((day) => (
                      <div key={day.day} className="border-l-2 border-emerald-500 pl-4">
                        <p className="text-sm font-semibold text-text-primary">Day {day.day}: {day.title}</p>
                        <p className="text-sm text-text-secondary">{day.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Supplier</CardTitle>
                </CardHeader>
                <CardContent>
                  {tour.supplier ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-primary">{tour.supplier.name || "Unknown"}</p>
                      <p className="text-xs text-text-secondary">{tour.supplier.email}</p>
                      {tour.supplier.id && (
                        <Link to={`/admin/suppliers/${tour.supplier.id}`} className="block text-xs text-emerald-600 hover:underline">
                          View Supplier
                        </Link>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">No supplier info</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stats</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-border-muted transition-colors hover:bg-green-50/20">
                        <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Reviews</td>
                        <td className="px-5 py-3 font-semibold text-text-primary text-right">{formatNumber(tour.reviewCount)}</td>
                      </tr>
                      <tr className="border-b border-border-muted transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                        <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Avg Rating</td>
                        <td className="px-5 py-3 font-semibold text-text-primary text-right">{tour.averageRating?.toFixed(1) || "—"}</td>
                      </tr>
                      <tr className="border-b border-border-muted transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                        <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Conversion</td>
                        <td className="px-5 py-3 font-semibold text-text-primary text-right">
                          {tour.viewCount && tour.bookingCount ? `${((tour.bookingCount / tour.viewCount) * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                      <tr className="transition-colors hover:bg-green-50/20 even:bg-green-50/10">
                        <td className="px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Revenue/Booking</td>
                        <td className="px-5 py-3 font-semibold text-text-primary text-right">
                          {tour.totalRevenue && tour.bookingCount ? formatCurrency(tour.totalRevenue / tour.bookingCount) : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {tour.inclusions && tour.inclusions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Inclusions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-text-secondary">
                      {tour.inclusions.map((inc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 text-emerald-500">✓</span>
                          {inc}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
