import { useState } from "react";
import { Search, Calendar, User, FileText, Star, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Activity {
  id?: string;
  type: "booking" | "user" | "review" | "alert" | "update";
  title: string;
  description: string;
  timestamp: string;
}

interface LatestUpdatesPanelProps {
  activities?: Activity[];
  loading?: boolean;
}

const activityIcons: Record<string, React.ReactNode> = {
  booking: <Calendar className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  review: <Star className="h-4 w-4" />,
  alert: <AlertCircle className="h-4 w-4" />,
  update: <FileText className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  booking: "bg-blue-100 text-blue-600",
  user: "bg-green-100 text-green-600",
  review: "bg-yellow-100 text-yellow-600",
  alert: "bg-red-100 text-red-600",
  update: "bg-purple-100 text-purple-600",
};

export function LatestUpdatesPanel({ activities = [], loading }: LatestUpdatesPanelProps) {
  const [activeTab, setActiveTab] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredActivities = activities.filter(
    (activity) =>
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-text-primary">Latest Updates</CardTitle>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
          <TabsList className="w-full bg-surface-muted">
            <TabsTrigger value="today" className="flex-1 text-xs">Today</TabsTrigger>
            <TabsTrigger value="yesterday" className="flex-1 text-xs">Yesterday</TabsTrigger>
            <TabsTrigger value="week" className="flex-1 text-xs">This week</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search activities"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
        <p className="text-xs text-text-tertiary mt-2">{filteredActivities.length} new activities today</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-border">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-surface-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-surface-muted rounded" />
                    <div className="h-2 w-32 bg-surface-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-tertiary">No activities found</div>
          ) : (
            filteredActivities.map((activity, index) => (
              <div key={activity.id || index} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-muted/30 transition-colors">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", activityColors[activity.type])}>
                  {activityIcons[activity.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{activity.title}</p>
                  <p className="text-xs text-text-tertiary truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-text-tertiary whitespace-nowrap">{timeAgo(activity.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
