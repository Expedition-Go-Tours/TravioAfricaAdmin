import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Minus, ImageIcon } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TourData = Record<string, any>;

interface DiffViewerProps {
  currentData: TourData;
  draftData: TourData;
  tourPhotos?: string[];
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  price: 'Price',
  duration: 'Duration',
  maxGroupSize: 'Max Group Size',
  meetingPoint: 'Meeting Point',
  category: 'Category',
  difficulty: 'Difficulty',
  languages: 'Languages',
  highlights: 'Highlights',
  itinerary: 'Itinerary',
  included: 'Included',
  notIncluded: 'Not Included',
  safetyInfo: 'Safety Info',
  photos: 'Photos',
};

const EDITABLE_FIELDS = [
  'name', 'description', 'price', 'duration', 'maxGroupSize',
  'meetingPoint', 'category', 'difficulty', 'languages', 'highlights',
  'itinerary', 'included', 'notIncluded', 'safetyInfo',
];

function findChanges(current: TourData, draft: TourData) {
  const changes: Array<{ field: string; label: string; oldValue: unknown; newValue: unknown }> = [];

  for (const field of EDITABLE_FIELDS) {
    const oldVal = current[field];
    const newVal = draft[field];

    if (newVal === undefined) continue;

    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}

function findPhotoChanges(currentPhotos: string[], draftPhotos: string[]) {
  const added = draftPhotos.filter((p) => !currentPhotos.includes(p));
  const removed = currentPhotos.filter((p) => !draftPhotos.includes(p));
  return { added, removed };
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.length > 0 ? val.join(', ') : '—';
    }
    return JSON.stringify(val);
  }
  return String(val);
}

export function DiffViewer({ currentData, draftData, tourPhotos = [] }: DiffViewerProps) {
  const changes = useMemo(() => findChanges(currentData, draftData), [currentData, draftData]);

  const photoChanges = useMemo(() => {
    const draftPhotos = draftData.photos || [];
    return findPhotoChanges(tourPhotos, draftPhotos);
  }, [tourPhotos, draftData]);

  const hasPhotoChanges = photoChanges.added.length > 0 || photoChanges.removed.length > 0;
  const totalChanges = changes.length + (hasPhotoChanges ? 1 : 0);

  if (totalChanges === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-surface-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">No pending changes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="warning" className="px-2 py-0.5">
          {totalChanges} change{totalChanges !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-2">
        {changes.map((change) => (
          <div
            key={change.field}
            className="rounded-xl border border-border/40 bg-surface-base p-4"
          >
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {change.label}
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-1 rounded-lg bg-status-rejected/5 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-status-rejected">
                  <Minus className="h-3 w-3" />
                  Before
                </div>
                <p className="text-sm text-foreground/70 line-through decoration-status-rejected/30">
                  {formatValue(change.oldValue)}
                </p>
              </div>
              <ArrowRight className="mt-6 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 rounded-lg bg-status-active/5 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-status-active">
                  <Plus className="h-3 w-3" />
                  After
                </div>
                <p className="text-sm text-foreground">
                  {formatValue(change.newValue)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {hasPhotoChanges && (
          <div className="rounded-xl border border-border/40 bg-surface-base p-4">
            <div className="mb-2 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Photo Changes
              </span>
            </div>
            <div className="flex gap-4">
              {photoChanges.added.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-status-active">
                    +{photoChanges.added.length} added
                  </div>
                  <div className="flex gap-1.5">
                    {photoChanges.added.slice(0, 4).map((photo) => (
                      <img
                        key={photo}
                        src={photo}
                        alt="New photo"
                        className="h-12 w-12 rounded-lg object-cover ring-2 ring-status-active/20"
                      />
                    ))}
                    {photoChanges.added.length > 4 && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted text-xs font-medium text-muted-foreground">
                        +{photoChanges.added.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {photoChanges.removed.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-status-rejected">
                    -{photoChanges.removed.length} removed
                  </div>
                  <div className="flex gap-1.5">
                    {photoChanges.removed.slice(0, 4).map((photo) => (
                      <img
                        key={photo}
                        src={photo}
                        alt="Removed photo"
                        className="h-12 w-12 rounded-lg object-cover opacity-50 ring-2 ring-status-rejected/20"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
