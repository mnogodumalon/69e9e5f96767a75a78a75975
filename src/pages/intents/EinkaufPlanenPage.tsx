import { useState } from 'react';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import type { Produktkatalog } from '@/types/app';
import { ProduktkatalogDialog } from '@/components/dialogs/ProduktkatalogDialog';
import { format } from 'date-fns';
import { IconShoppingCart, IconCheck, IconArrowLeft, IconChevronRight, IconPackage } from '@tabler/icons-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const STEPS = [
  { label: 'Produkt wählen' },
  { label: 'Einkauf erfassen' },
  { label: 'Bestätigung' },
];

interface PurchaseForm {
  einkaufsdatum: string;
  eingekaufte_packungen: string;
  tatsaechlicher_preis: string;
  einkaufsort: string;
  notizen_beschaffung: string;
}

export default function EinkaufPlanenPage() {
  const { produktkatalog, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Produktkatalog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<PurchaseForm>({
    einkaufsdatum: format(new Date(), 'yyyy-MM-dd'),
    eingekaufte_packungen: '',
    tatsaechlicher_preis: '',
    einkaufsort: '',
    notizen_beschaffung: '',
  });

  // Saved summary for step 3
  const [savedSummary, setSavedSummary] = useState<{
    produktname: string;
    marke: string;
    packungen: number;
    gesamtpreis: number;
    gesamtrollen: number;
    einkaufsort: string;
  } | null>(null);

  // Live calculations
  const packungen = parseFloat(form.eingekaufte_packungen) || 0;
  const preisProPackung = parseFloat(form.tatsaechlicher_preis) || 0;
  const rollenProPackung = selectedProduct?.fields.rollen_pro_packung ?? 0;
  const referenzPreis = selectedProduct?.fields.preis_pro_packung ?? null;

  const gesamtpreis = packungen * preisProPackung;
  const gesamtrollen = packungen * rollenProPackung;
  const preisProRolle = gesamtrollen > 0 ? gesamtpreis / gesamtrollen : 0;

  const preisVergleich: 'hoeher' | 'niedriger' | 'gleich' | null =
    referenzPreis !== null && preisProPackung > 0
      ? preisProPackung > referenzPreis
        ? 'hoeher'
        : preisProPackung < referenzPreis
        ? 'niedriger'
        : 'gleich'
      : null;

  function handleProductSelect(id: string) {
    const found = produktkatalog.find(p => p.record_id === id) ?? null;
    setSelectedProduct(found);
    setStep(2);
  }

  function handleBack() {
    setSubmitError(null);
    setStep(1);
  }

  async function handleSubmit() {
    if (!selectedProduct) return;
    if (!form.einkaufsdatum || !form.eingekaufte_packungen || !form.tatsaechlicher_preis) {
      setSubmitError('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createBeschaffungsprotokollEntry({
        einkaufsdatum: form.einkaufsdatum,
        produkt_ref: createRecordUrl(APP_IDS.PRODUKTKATALOG, selectedProduct.record_id),
        eingekaufte_packungen: packungen,
        tatsaechlicher_preis: preisProPackung,
        gesamtpreis: gesamtpreis,
        einkaufsort: form.einkaufsort || undefined,
        notizen_beschaffung: form.notizen_beschaffung || undefined,
        lagerbestand_nach_einkauf: 0,
      });

      setSavedSummary({
        produktname: selectedProduct.fields.produktname ?? '(Unbekannt)',
        marke: selectedProduct.fields.marke ?? '',
        packungen,
        gesamtpreis,
        gesamtrollen,
        einkaufsort: form.einkaufsort,
      });

      await fetchAll();
      setStep(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSelectedProduct(null);
    setForm({
      einkaufsdatum: format(new Date(), 'yyyy-MM-dd'),
      eingekaufte_packungen: '',
      tatsaechlicher_preis: '',
      einkaufsort: '',
      notizen_beschaffung: '',
    });
    setSavedSummary(null);
    setSubmitError(null);
    setStep(1);
  }

  function formatCurrency(val: number) {
    return val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  return (
    <IntentWizardShell
      title="Einkauf planen & erfassen"
      subtitle="Wähle ein Produkt und erfasse deinen Einkauf Schritt für Schritt."
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Produkt auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Welches Produkt hast du gekauft?</h2>
            <p className="text-sm text-muted-foreground mt-1">Wähle ein Produkt aus deinem Katalog oder lege ein neues an.</p>
          </div>

          <EntitySelectStep
            items={produktkatalog.map(p => ({
              id: p.record_id,
              title: p.fields.produktname ?? '(Kein Name)',
              subtitle: p.fields.marke ?? undefined,
              icon: <IconPackage size={20} className="text-primary" />,
              stats: [
                {
                  label: 'Preis/Packung',
                  value: p.fields.preis_pro_packung != null ? `${p.fields.preis_pro_packung.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '–',
                },
                {
                  label: 'Rollen/Packung',
                  value: p.fields.rollen_pro_packung ?? '–',
                },
              ],
            }))}
            onSelect={handleProductSelect}
            searchPlaceholder="Produkt suchen..."
            emptyIcon={<IconShoppingCart size={32} />}
            emptyText="Noch keine Produkte im Katalog. Lege jetzt dein erstes Produkt an."
            createLabel="Neues Produkt"
            onCreateNew={() => setDialogOpen(true)}
            createDialog={
              <ProduktkatalogDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createProduktkatalogEntry(fields);
                  await fetchAll();
                  setDialogOpen(false);
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Produktkatalog']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Produktkatalog']}
              />
            }
          />
        </div>
      )}

      {/* Step 2: Einkauf erfassen */}
      {step === 2 && selectedProduct && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Einkauf erfassen</h2>
            <p className="text-sm text-muted-foreground mt-1">Trage die Details deines Einkaufs ein.</p>
          </div>

          {/* Selected product info */}
          <Card className="overflow-hidden border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconPackage size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedProduct.fields.produktname ?? '(Kein Name)'}</p>
                  {selectedProduct.fields.marke && (
                    <p className="text-xs text-muted-foreground truncate">{selectedProduct.fields.marke}</p>
                  )}
                  {referenzPreis !== null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Referenzpreis: <span className="font-medium text-foreground">{formatCurrency(referenzPreis)} / Packung</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={handleBack}
                  className="ml-auto text-xs text-primary hover:underline shrink-0"
                >
                  Ändern
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Form fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="einkaufsdatum">
                  Einkaufsdatum <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="einkaufsdatum"
                  type="date"
                  value={form.einkaufsdatum}
                  onChange={e => setForm(f => ({ ...f, einkaufsdatum: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="einkaufsort">Einkaufsort</Label>
                <Input
                  id="einkaufsort"
                  type="text"
                  placeholder="z.B. REWE, Lidl, Amazon..."
                  value={form.einkaufsort}
                  onChange={e => setForm(f => ({ ...f, einkaufsort: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eingekaufte_packungen">
                  Eingekaufte Packungen <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="eingekaufte_packungen"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="z.B. 4"
                  value={form.eingekaufte_packungen}
                  onChange={e => setForm(f => ({ ...f, eingekaufte_packungen: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tatsaechlicher_preis">
                  Tatsächlicher Preis / Packung (€) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tatsaechlicher_preis"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="z.B. 3.99"
                  value={form.tatsaechlicher_preis}
                  onChange={e => setForm(f => ({ ...f, tatsaechlicher_preis: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notizen_beschaffung">Notizen (optional)</Label>
              <Textarea
                id="notizen_beschaffung"
                placeholder="z.B. Sonderangebot, Gutschein verwendet..."
                value={form.notizen_beschaffung}
                onChange={e => setForm(f => ({ ...f, notizen_beschaffung: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Live calculations */}
          {(packungen > 0 || preisProPackung > 0) && (
            <Card className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Berechnungen</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Gesamtpreis</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {packungen > 0 && preisProPackung > 0 ? formatCurrency(gesamtpreis) : '–'}
                    </p>
                  </div>
                  {rollenProPackung > 0 && (
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Gesamtrollen</p>
                      <p className="font-semibold text-foreground mt-0.5">
                        {packungen > 0 ? `${gesamtrollen} Rollen` : '–'}
                      </p>
                    </div>
                  )}
                  {rollenProPackung > 0 && packungen > 0 && preisProPackung > 0 && (
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Preis / Rolle</p>
                      <p className="font-semibold text-foreground mt-0.5">{formatCurrency(preisProRolle)}</p>
                    </div>
                  )}
                </div>

                {preisVergleich !== null && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    preisVergleich === 'niedriger'
                      ? 'bg-green-100 text-green-700'
                      : preisVergleich === 'hoeher'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {preisVergleich === 'niedriger' && (
                      <>
                        <IconCheck size={15} stroke={2.5} />
                        Günstiger als Referenzpreis ({formatCurrency(referenzPreis!)})
                      </>
                    )}
                    {preisVergleich === 'hoeher' && (
                      <>
                        <IconChevronRight size={15} stroke={2.5} />
                        Teurer als Referenzpreis ({formatCurrency(referenzPreis!)})
                      </>
                    )}
                    {preisVergleich === 'gleich' && (
                      <>
                        <IconCheck size={15} stroke={2.5} />
                        Gleicher Preis wie Referenz ({formatCurrency(referenzPreis!)})
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {submitError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">{submitError}</p>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.einkaufsdatum || !form.eingekaufte_packungen || !form.tatsaechlicher_preis}
              className="flex-1 gap-2"
            >
              <IconShoppingCart size={16} />
              {submitting ? 'Wird gespeichert...' : 'Einkauf speichern'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Bestätigung */}
      {step === 3 && savedSummary && (
        <div className="space-y-6">
          {/* Success header */}
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
              <IconCheck size={32} className="text-green-600" stroke={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Einkauf gespeichert!</h2>
              <p className="text-sm text-muted-foreground mt-1">Dein Einkauf wurde erfolgreich ins Beschaffungsprotokoll eingetragen.</p>
            </div>
          </div>

          {/* Summary card */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b bg-muted/30">
                <p className="font-semibold text-foreground">{savedSummary.produktname}</p>
                {savedSummary.marke && (
                  <p className="text-sm text-muted-foreground">{savedSummary.marke}</p>
                )}
              </div>
              <div className="divide-y">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-muted-foreground">Eingekaufte Packungen</span>
                  <span className="font-medium text-sm">{savedSummary.packungen} Packungen</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-muted-foreground">Gesamtpreis</span>
                  <span className="font-semibold text-sm">{formatCurrency(savedSummary.gesamtpreis)}</span>
                </div>
                {savedSummary.gesamtrollen > 0 && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-muted-foreground">Gesamtrollen</span>
                    <span className="font-medium text-sm">{savedSummary.gesamtrollen} Rollen</span>
                  </div>
                )}
                {savedSummary.einkaufsort && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-muted-foreground">Einkaufsort</span>
                    <span className="font-medium text-sm">{savedSummary.einkaufsort}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={handleReset} className="flex-1 gap-2">
              <IconShoppingCart size={16} />
              Weiteren Einkauf erfassen
            </Button>
            <Button asChild className="flex-1">
              <a href="#/">Zum Dashboard</a>
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
