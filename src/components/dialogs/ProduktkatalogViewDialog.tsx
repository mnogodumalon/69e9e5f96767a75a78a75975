import type { Produktkatalog } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface ProduktkatalogViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Produktkatalog | null;
  onEdit: (record: Produktkatalog) => void;
}

export function ProduktkatalogViewDialog({ open, onClose, record, onEdit }: ProduktkatalogViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Produktkatalog anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Marke</Label>
            <p className="text-sm">{record.fields.marke ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Produktname</Label>
            <p className="text-sm">{record.fields.produktname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lagenanzahl</Label>
            <Badge variant="secondary">{record.fields.lagenanzahl?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Blätter pro Rolle</Label>
            <p className="text-sm">{record.fields.blaetter_pro_rolle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rollen pro Packung</Label>
            <p className="text-sm">{record.fields.rollen_pro_packung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Preis pro Packung (€)</Label>
            <p className="text-sm">{record.fields.preis_pro_packung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Händler / Lieferant</Label>
            <p className="text-sm">{record.fields.haendler ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_produkt ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}