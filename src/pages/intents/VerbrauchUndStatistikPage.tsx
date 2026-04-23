import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Produktkatalog } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { ProduktkatalogDialog } from '@/components/dialogs/ProduktkatalogDialog';
import { format } from 'date-fns';
import { IconChartBar, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const WIZARD_STEPS = [
  { label: 'Produkt auswählen' },
  { label: 'Verbrauch erfassen' },
  { label: 'Statistik erstellen' },
  { label: 'Fertig' },
];

interface VerbrauchForm {
  verbrauch_datum: string;
  erfassungszeitraum: string;
  verbrauchte_rollen: number;
  anzahl_personen: number;
  nutzungskontext: string;
  notizen_verbrauch: string;
}

interface StatistikForm {
  zeitraum_von: string;
  zeitraum_bis: string;
  gesamtverbrauch_rollen: number;
  statistik_personen: number;
  gesamtkosten: number;
  kosten_pro_rolle: number;
  kosten_pro_person_monat: number;
  durchschnitt_pro_person_tag: number;
  effizienzeinschaetzung: string;
  optimierungsempfehlungen: string;
  notizen_statistik: string;
}

export default function VerbrauchUndStatistikPage() {
  const [searchParams] = useSearchParams();

  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    if (s >= 1 && s <= 4) return s;
    return 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [produktkatalog, setProduktkatalog] = useState<Produktkatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Produktkatalog | null>(null);
  const [produktDialogOpen, setProduktDialogOpen] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const [verbrauchForm, setVerbrauchForm] = useState<VerbrauchForm>({
    verbrauch_datum: today,
    erfassungszeitraum: 'taeglich',
    verbrauchte_rollen: 1,
    anzahl_personen: 1,
    nutzungskontext: 'haushalt',
    notizen_verbrauch: '',
  });

  const [statistikForm, setStatistikForm] = useState<StatistikForm>({
    zeitraum_von: today,
    zeitraum_bis: today,
    gesamtverbrauch_rollen: 1,
    statistik_personen: 1,
    gesamtkosten: 0,
    kosten_pro_rolle: 0,
    kosten_pro_person_monat: 0,
    durchschnitt_pro_person_tag: 0,
    effizienzeinschaetzung: 'normal',
    optimierungsempfehlungen: '',
    notizen_statistik: '',
  });

  const [statistikCreated, setStatistikCreated] = useState(false);

  const fetchProdukte = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await LivingAppsService.getProduktkatalog();
      setProduktkatalog(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Produkte'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdukte();
  }, []);

  // Recalculate statistik costs when relevant values change
  useEffect(() => {
    if (!selectedProduct) return;
    const { preis_pro_packung, rollen_pro_packung } = selectedProduct.fields;
    const kostenProRolle =
      preis_pro_packung && rollen_pro_packung && rollen_pro_packung > 0
        ? preis_pro_packung / rollen_pro_packung
        : 0;
    const gesamtkosten = kostenProRolle * statistikForm.gesamtverbrauch_rollen;
    const tage = (() => {
      if (!statistikForm.zeitraum_von || !statistikForm.zeitraum_bis) return 1;
      const von = new Date(statistikForm.zeitraum_von);
      const bis = new Date(statistikForm.zeitraum_bis);
      const diff = Math.max(1, Math.round((bis.getTime() - von.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return diff;
    })();
    const monate = tage / 30;
    const personen = Math.max(1, statistikForm.statistik_personen);
    const kostenProPersonMonat = monate > 0 ? gesamtkosten / personen / monate : 0;
    const durchschnittProPersonTag =
      statistikForm.gesamtverbrauch_rollen / personen / tage;

    setStatistikForm(prev => ({
      ...prev,
      kosten_pro_rolle: parseFloat(kostenProRolle.toFixed(4)),
      gesamtkosten: parseFloat(gesamtkosten.toFixed(2)),
      kosten_pro_person_monat: parseFloat(kostenProPersonMonat.toFixed(2)),
      durchschnitt_pro_person_tag: parseFloat(durchschnittProPersonTag.toFixed(4)),
    }));
  }, [
    selectedProduct,
    statistikForm.gesamtverbrauch_rollen,
    statistikForm.statistik_personen,
    statistikForm.zeitraum_von,
    statistikForm.zeitraum_bis,
  ]);

  const handleProductSelect = (id: string) => {
    const product = produktkatalog.find(p => p.record_id === id) ?? null;
    setSelectedProduct(product);
    setCurrentStep(2);
  };

  const handleVerbrauchSubmit = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await LivingAppsService.createVerbrauchserfassungEntry({
        verbrauch_datum: verbrauchForm.verbrauch_datum,
        erfassungszeitraum: verbrauchForm.erfassungszeitraum,
        verbrauch_produkt_ref: createRecordUrl(APP_IDS.PRODUKTKATALOG, selectedProduct.record_id),
        verbrauchte_rollen: verbrauchForm.verbrauchte_rollen,
        anzahl_personen: verbrauchForm.anzahl_personen,
        nutzungskontext: verbrauchForm.nutzungskontext,
        notizen_verbrauch: verbrauchForm.notizen_verbrauch,
      });

      // Pre-fill statistik form from verbrauch data
      const { preis_pro_packung, rollen_pro_packung } = selectedProduct.fields;
      const kostenProRolle =
        preis_pro_packung && rollen_pro_packung && rollen_pro_packung > 0
          ? preis_pro_packung / rollen_pro_packung
          : 0;
      const gesamtkosten = kostenProRolle * verbrauchForm.verbrauchte_rollen;

      setStatistikForm(prev => ({
        ...prev,
        gesamtverbrauch_rollen: verbrauchForm.verbrauchte_rollen,
        statistik_personen: verbrauchForm.anzahl_personen,
        gesamtkosten: parseFloat(gesamtkosten.toFixed(2)),
        kosten_pro_rolle: parseFloat(kostenProRolle.toFixed(4)),
        zeitraum_von: verbrauchForm.verbrauch_datum,
        zeitraum_bis: verbrauchForm.verbrauch_datum,
      }));

      setCurrentStep(3);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Speichern des Verbrauchs');
    } finally {
      setSaving(false);
    }
  };

  const handleStatistikSubmit = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await LivingAppsService.createVerbrauchsstatistikEntry({
        statistik_produkt_ref: createRecordUrl(APP_IDS.PRODUKTKATALOG, selectedProduct.record_id),
        zeitraum_von: statistikForm.zeitraum_von,
        zeitraum_bis: statistikForm.zeitraum_bis,
        gesamtverbrauch_rollen: statistikForm.gesamtverbrauch_rollen,
        statistik_personen: statistikForm.statistik_personen,
        gesamtkosten: statistikForm.gesamtkosten,
        kosten_pro_rolle: statistikForm.kosten_pro_rolle,
        kosten_pro_person_monat: statistikForm.kosten_pro_person_monat,
        durchschnitt_pro_person_tag: statistikForm.durchschnitt_pro_person_tag,
        effizienzeinschaetzung: statistikForm.effizienzeinschaetzung,
        optimierungsempfehlungen: statistikForm.optimierungsempfehlungen,
        notizen_statistik: statistikForm.notizen_statistik,
      });
      setStatistikCreated(true);
      setCurrentStep(4);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Erstellen der Statistik');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipStatistik = () => {
    setStatistikCreated(false);
    setCurrentStep(4);
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setVerbrauchForm({
      verbrauch_datum: today,
      erfassungszeitraum: 'taeglich',
      verbrauchte_rollen: 1,
      anzahl_personen: 1,
      nutzungskontext: 'haushalt',
      notizen_verbrauch: '',
    });
    setStatistikForm({
      zeitraum_von: today,
      zeitraum_bis: today,
      gesamtverbrauch_rollen: 1,
      statistik_personen: 1,
      gesamtkosten: 0,
      kosten_pro_rolle: 0,
      kosten_pro_person_monat: 0,
      durchschnitt_pro_person_tag: 0,
      effizienzeinschaetzung: 'normal',
      optimierungsempfehlungen: '',
      notizen_statistik: '',
    });
    setStatistikCreated(false);
    setCurrentStep(1);
  };

  const rollenProPerson =
    verbrauchForm.anzahl_personen > 0
      ? (verbrauchForm.verbrauchte_rollen / verbrauchForm.anzahl_personen).toFixed(2)
      : '–';

  const estimatedCost = (() => {
    if (!selectedProduct) return null;
    const { preis_pro_packung, rollen_pro_packung } = selectedProduct.fields;
    if (!preis_pro_packung || !rollen_pro_packung || rollen_pro_packung === 0) return null;
    return (verbrauchForm.verbrauchte_rollen * (preis_pro_packung / rollen_pro_packung)).toFixed(2);
  })();

  return (
    <IntentWizardShell
      title="Verbrauch erfassen & Statistik erstellen"
      subtitle="Toilettenpapierverbrauch protokollieren und auswerten"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchProdukte}
    >
      {/* Step 1: Produkt auswählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Welches Produkt wurde verbraucht?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle ein Produkt aus deinem Katalog aus oder lege ein neues an.
            </p>
          </div>
          <EntitySelectStep
            items={produktkatalog.map(p => ({
              id: p.record_id,
              title: p.fields.produktname ?? '(Kein Name)',
              subtitle: p.fields.marke,
              stats: [
                {
                  label: 'Preis/Rolle',
                  value:
                    p.fields.rollen_pro_packung &&
                    p.fields.preis_pro_packung &&
                    p.fields.rollen_pro_packung > 0
                      ? (p.fields.preis_pro_packung / p.fields.rollen_pro_packung).toFixed(2) + ' €'
                      : '–',
                },
                ...(p.fields.rollen_pro_packung
                  ? [{ label: 'Rollen/Packung', value: String(p.fields.rollen_pro_packung) }]
                  : []),
              ],
            }))}
            onSelect={handleProductSelect}
            searchPlaceholder="Produkt suchen..."
            emptyText="Noch keine Produkte vorhanden. Lege jetzt dein erstes Produkt an."
            createLabel="Neues Produkt"
            onCreateNew={() => setProduktDialogOpen(true)}
            createDialog={
              <ProduktkatalogDialog
                open={produktDialogOpen}
                onClose={() => setProduktDialogOpen(false)}
                onSubmit={async fields => {
                  const result = await LivingAppsService.createProduktkatalogEntry(fields);
                  await fetchProdukte();
                  // Auto-select the newly created product
                  const entries = Object.entries(result as Record<string, unknown>);
                  if (entries.length > 0) {
                    const newId = entries[0][0];
                    const newProduct = (await LivingAppsService.getProduktkatalog()).find(
                      p => p.record_id === newId
                    );
                    if (newProduct) {
                      setSelectedProduct(newProduct);
                      setCurrentStep(2);
                    }
                  }
                  setProduktDialogOpen(false);
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Produktkatalog']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Produktkatalog']}
              />
            }
          />
        </div>
      )}

      {/* Step 2: Verbrauch erfassen */}
      {currentStep === 2 && selectedProduct && (
        <div className="space-y-5">
          {/* Selected product banner */}
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconChartBar size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {selectedProduct.fields.produktname ?? '(Kein Name)'}
                  </p>
                  {selectedProduct.fields.marke && (
                    <p className="text-xs text-muted-foreground truncate">{selectedProduct.fields.marke}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={() => setCurrentStep(1)}
                >
                  <IconArrowLeft size={14} className="mr-1" />
                  Ändern
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Verbrauch eingeben</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="verbrauch_datum">Datum *</Label>
                <Input
                  id="verbrauch_datum"
                  type="date"
                  value={verbrauchForm.verbrauch_datum}
                  onChange={e =>
                    setVerbrauchForm(f => ({ ...f, verbrauch_datum: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="erfassungszeitraum">Erfassungszeitraum</Label>
                <select
                  id="erfassungszeitraum"
                  value={verbrauchForm.erfassungszeitraum}
                  onChange={e =>
                    setVerbrauchForm(f => ({ ...f, erfassungszeitraum: e.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="taeglich">Täglich</option>
                  <option value="woechentlich">Wöchentlich</option>
                  <option value="monatlich">Monatlich</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verbrauchte_rollen">Verbrauchte Rollen *</Label>
                <Input
                  id="verbrauchte_rollen"
                  type="number"
                  min={1}
                  value={verbrauchForm.verbrauchte_rollen}
                  onChange={e =>
                    setVerbrauchForm(f => ({
                      ...f,
                      verbrauchte_rollen: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anzahl_personen">Anzahl Personen *</Label>
                <Input
                  id="anzahl_personen"
                  type="number"
                  min={1}
                  value={verbrauchForm.anzahl_personen}
                  onChange={e =>
                    setVerbrauchForm(f => ({
                      ...f,
                      anzahl_personen: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nutzungskontext">Nutzungskontext</Label>
                <select
                  id="nutzungskontext"
                  value={verbrauchForm.nutzungskontext}
                  onChange={e =>
                    setVerbrauchForm(f => ({ ...f, nutzungskontext: e.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="haushalt">Privater Haushalt</option>
                  <option value="buero">Büro</option>
                  <option value="gastronomie">Gastronomie</option>
                  <option value="sonstiges">Sonstiges</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notizen_verbrauch">Notizen (optional)</Label>
              <Textarea
                id="notizen_verbrauch"
                value={verbrauchForm.notizen_verbrauch}
                onChange={e =>
                  setVerbrauchForm(f => ({ ...f, notizen_verbrauch: e.target.value }))
                }
                rows={3}
                placeholder="Weitere Anmerkungen..."
              />
            </div>

            {/* Live calculations */}
            <Card className="overflow-hidden bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Hochrechnung
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Rollen pro Person</p>
                    <p className="text-lg font-bold">{rollenProPerson}</p>
                  </div>
                  {estimatedCost !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Geschätzte Kosten</p>
                      <p className="text-lg font-bold">{estimatedCost} €</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="flex-1 sm:flex-none"
            >
              <IconArrowLeft size={16} className="mr-2" />
              Zurück
            </Button>
            <Button
              onClick={handleVerbrauchSubmit}
              disabled={saving || !verbrauchForm.verbrauch_datum}
              className="flex-1"
            >
              {saving ? 'Wird gespeichert...' : 'Verbrauch speichern'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Statistik erstellen */}
      {currentStep === 3 && selectedProduct && (
        <div className="space-y-5">
          {/* Summary of logged consumption */}
          <Card className="overflow-hidden bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <IconCheck size={16} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-green-700 dark:text-green-400">
                    Verbrauch erfolgreich gespeichert
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                    {verbrauchForm.verbrauchte_rollen} Rolle(n) &bull;{' '}
                    {selectedProduct.fields.produktname ?? '–'} &bull;{' '}
                    {verbrauchForm.anzahl_personen} Person(en) &bull;{' '}
                    {verbrauchForm.verbrauch_datum}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold">Statistik erstellen (optional)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Möchtest du auch eine Statistik für einen längeren Zeitraum erstellen? Passe die
              Werte bei Bedarf an.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zeitraum_von">Zeitraum von *</Label>
                <Input
                  id="zeitraum_von"
                  type="date"
                  value={statistikForm.zeitraum_von}
                  onChange={e =>
                    setStatistikForm(f => ({ ...f, zeitraum_von: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zeitraum_bis">Zeitraum bis *</Label>
                <Input
                  id="zeitraum_bis"
                  type="date"
                  value={statistikForm.zeitraum_bis}
                  onChange={e =>
                    setStatistikForm(f => ({ ...f, zeitraum_bis: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gesamtverbrauch_rollen">Gesamtverbrauch (Rollen) *</Label>
                <Input
                  id="gesamtverbrauch_rollen"
                  type="number"
                  min={0}
                  step={0.01}
                  value={statistikForm.gesamtverbrauch_rollen}
                  onChange={e =>
                    setStatistikForm(f => ({
                      ...f,
                      gesamtverbrauch_rollen: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statistik_personen">Anzahl Personen *</Label>
                <Input
                  id="statistik_personen"
                  type="number"
                  min={1}
                  value={statistikForm.statistik_personen}
                  onChange={e =>
                    setStatistikForm(f => ({
                      ...f,
                      statistik_personen: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kosten_pro_rolle">Kosten pro Rolle (€)</Label>
                <Input
                  id="kosten_pro_rolle"
                  type="number"
                  min={0}
                  step={0.0001}
                  value={statistikForm.kosten_pro_rolle}
                  onChange={e =>
                    setStatistikForm(f => ({
                      ...f,
                      kosten_pro_rolle: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gesamtkosten">Gesamtkosten (€)</Label>
                <Input
                  id="gesamtkosten"
                  type="number"
                  min={0}
                  step={0.01}
                  value={statistikForm.gesamtkosten}
                  onChange={e =>
                    setStatistikForm(f => ({
                      ...f,
                      gesamtkosten: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kosten_pro_person_monat">Kosten pro Person/Monat (€)</Label>
                <Input
                  id="kosten_pro_person_monat"
                  type="number"
                  min={0}
                  step={0.01}
                  value={statistikForm.kosten_pro_person_monat}
                  onChange={e =>
                    setStatistikForm(f => ({
                      ...f,
                      kosten_pro_person_monat: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durchschnitt_pro_person_tag">
                  Durchschnitt Rollen/Person/Tag
                </Label>
                <Input
                  id="durchschnitt_pro_person_tag"
                  type="number"
                  min={0}
                  step={0.0001}
                  value={statistikForm.durchschnitt_pro_person_tag}
                  onChange={e =>
                    setStatistikForm(f => ({
                      ...f,
                      durchschnitt_pro_person_tag: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="effizienzeinschaetzung">Effizienzeinschätzung</Label>
                <select
                  id="effizienzeinschaetzung"
                  value={statistikForm.effizienzeinschaetzung}
                  onChange={e =>
                    setStatistikForm(f => ({ ...f, effizienzeinschaetzung: e.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="sehr_effizient">Sehr effizient</option>
                  <option value="effizient">Effizient</option>
                  <option value="durchschnittlich">Durchschnittlich</option>
                  <option value="verbesserungswuerdig">Verbesserungswürdig</option>
                  <option value="verschwenderisch">Verschwenderisch</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="optimierungsempfehlungen">Optimierungsempfehlungen (optional)</Label>
              <Textarea
                id="optimierungsempfehlungen"
                value={statistikForm.optimierungsempfehlungen}
                onChange={e =>
                  setStatistikForm(f => ({ ...f, optimierungsempfehlungen: e.target.value }))
                }
                rows={2}
                placeholder="Hinweise zur Optimierung..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notizen_statistik">Notizen Statistik (optional)</Label>
              <Textarea
                id="notizen_statistik"
                value={statistikForm.notizen_statistik}
                onChange={e =>
                  setStatistikForm(f => ({ ...f, notizen_statistik: e.target.value }))
                }
                rows={2}
                placeholder="Weitere Anmerkungen zur Statistik..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSkipStatistik}
              className="w-full sm:flex-1"
            >
              Nur Verbrauch speichern (Statistik überspringen)
            </Button>
            <Button
              onClick={handleStatistikSubmit}
              disabled={
                saving ||
                !statistikForm.zeitraum_von ||
                !statistikForm.zeitraum_bis
              }
              className="w-full sm:flex-1"
            >
              {saving ? 'Wird erstellt...' : 'Statistik erstellen'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Fertig */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <IconCheck size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Alles gespeichert!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Dein Verbrauch wurde erfolgreich protokolliert.
              </p>
            </div>
          </div>

          {/* Summary card */}
          <Card className="overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Zusammenfassung
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Produkt</span>
                  <span className="font-medium truncate text-right">
                    {selectedProduct?.fields.produktname ?? '–'}
                    {selectedProduct?.fields.marke ? ` (${selectedProduct.fields.marke})` : ''}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Verbrauchte Rollen</span>
                  <span className="font-medium">{verbrauchForm.verbrauchte_rollen}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Anzahl Personen</span>
                  <span className="font-medium">{verbrauchForm.anzahl_personen}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Datum</span>
                  <span className="font-medium">{verbrauchForm.verbrauch_datum}</span>
                </div>
                <div className="flex justify-between gap-2 border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Statistik erstellt</span>
                  <span className={`font-medium ${statistikCreated ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {statistikCreated ? 'Ja' : 'Nein'}
                  </span>
                </div>
                {statistikCreated && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Zeitraum</span>
                    <span className="font-medium">
                      {statistikForm.zeitraum_von} – {statistikForm.zeitraum_bis}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full sm:flex-1"
            >
              Weiteren Verbrauch erfassen
            </Button>
            <a href="#/" className="w-full sm:flex-1">
              <Button className="w-full">Zum Dashboard</Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
