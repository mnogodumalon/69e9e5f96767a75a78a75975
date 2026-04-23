import type { Verbrauchserfassung, Produktkatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface VerbrauchserfassungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Verbrauchserfassung | null;
  onEdit: (record: Verbrauchserfassung) => void;
  produktkatalogList: Produktkatalog[];
}

export function VerbrauchserfassungViewDialog({ open, onClose, record, onEdit, produktkatalogList }: VerbrauchserfassungViewDialogProps) {
  function getProduktkatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return produktkatalogList.find(r => r.record_id === id)?.fields.marke ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verbrauchserfassung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum</Label>
            <p className="text-sm">{formatDate(record.fields.verbrauch_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erfassungszeitraum</Label>
            <Badge variant="secondary">{record.fields.erfassungszeitraum?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verwendetes Produkt</Label>
            <p className="text-sm">{getProduktkatalogDisplayName(record.fields.verbrauch_produkt_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbrauchte Rollen</Label>
            <p className="text-sm">{record.fields.verbrauchte_rollen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl Personen im Haushalt</Label>
            <p className="text-sm">{record.fields.anzahl_personen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nutzungskontext</Label>
            <Badge variant="secondary">{record.fields.nutzungskontext?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_verbrauch ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}