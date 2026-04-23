import type { Verbrauchsstatistik, Produktkatalog } from '@/types/app';
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

interface VerbrauchsstatistikViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Verbrauchsstatistik | null;
  onEdit: (record: Verbrauchsstatistik) => void;
  produktkatalogList: Produktkatalog[];
}

export function VerbrauchsstatistikViewDialog({ open, onClose, record, onEdit, produktkatalogList }: VerbrauchsstatistikViewDialogProps) {
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
          <DialogTitle>Verbrauchsstatistik anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zeitraum von</Label>
            <p className="text-sm">{formatDate(record.fields.zeitraum_von)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zeitraum bis</Label>
            <p className="text-sm">{formatDate(record.fields.zeitraum_bis)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausgewertetes Produkt</Label>
            <p className="text-sm">{getProduktkatalogDisplayName(record.fields.statistik_produkt_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtverbrauch im Zeitraum (Rollen)</Label>
            <p className="text-sm">{record.fields.gesamtverbrauch_rollen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Durchschnittlicher Verbrauch pro Person pro Tag (Rollen)</Label>
            <p className="text-sm">{record.fields.durchschnitt_pro_person_tag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl Personen</Label>
            <p className="text-sm">{record.fields.statistik_personen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtkosten im Zeitraum (€)</Label>
            <p className="text-sm">{record.fields.gesamtkosten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kosten pro Rolle (€)</Label>
            <p className="text-sm">{record.fields.kosten_pro_rolle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kosten pro Person pro Monat (€)</Label>
            <p className="text-sm">{record.fields.kosten_pro_person_monat ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Effizienzeinschätzung</Label>
            <Badge variant="secondary">{record.fields.effizienzeinschaetzung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Optimierungsempfehlungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.optimierungsempfehlungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_statistik ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}