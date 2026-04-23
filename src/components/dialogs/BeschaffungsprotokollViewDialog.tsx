import type { Beschaffungsprotokoll, Produktkatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BeschaffungsprotokollViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Beschaffungsprotokoll | null;
  onEdit: (record: Beschaffungsprotokoll) => void;
  produktkatalogList: Produktkatalog[];
}

export function BeschaffungsprotokollViewDialog({ open, onClose, record, onEdit, produktkatalogList }: BeschaffungsprotokollViewDialogProps) {
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
          <DialogTitle>Beschaffungsprotokoll anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einkaufsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.einkaufsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Produkt</Label>
            <p className="text-sm">{getProduktkatalogDisplayName(record.fields.produkt_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eingekaufte Packungen</Label>
            <p className="text-sm">{record.fields.eingekaufte_packungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tatsächlicher Preis pro Packung (€)</Label>
            <p className="text-sm">{record.fields.tatsaechlicher_preis ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtpreis (€)</Label>
            <p className="text-sm">{record.fields.gesamtpreis ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einkaufsort</Label>
            <p className="text-sm">{record.fields.einkaufsort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lagerbestand nach Einkauf (Rollen)</Label>
            <p className="text-sm">{record.fields.lagerbestand_nach_einkauf ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_beschaffung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}