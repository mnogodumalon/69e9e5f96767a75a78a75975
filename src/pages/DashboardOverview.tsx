import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBeschaffungsprotokoll, enrichVerbrauchserfassung } from '@/lib/enrich';
import type { EnrichedBeschaffungsprotokoll, EnrichedVerbrauchserfassung } from '@/types/enriched';
import type { Produktkatalog, Verbrauchserfassung, Beschaffungsprotokoll } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ProduktkatalogDialog } from '@/components/dialogs/ProduktkatalogDialog';
import { BeschaffungsprotokollDialog } from '@/components/dialogs/BeschaffungsprotokollDialog';
import { VerbrauchserfassungDialog } from '@/components/dialogs/VerbrauchserfassungDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconPackage,
  IconShoppingCart, IconDroplet, IconChevronRight,
  IconChevronDown, IconBox, IconCoin,
} from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const APPGROUP_ID = '69e9e5f96767a75a78a75975';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    produktkatalog, beschaffungsprotokoll, verbrauchserfassung,
    produktkatalogMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBeschaffungsprotokoll = enrichBeschaffungsprotokoll(beschaffungsprotokoll, { produktkatalogMap });
  const enrichedVerbrauchserfassung = enrichVerbrauchserfassung(verbrauchserfassung, { produktkatalogMap });

  // Dialog state
  const [produktDialog, setProduktDialog] = useState(false);
  const [editProdukt, setEditProdukt] = useState<Produktkatalog | null>(null);
  const [deleteProduktTarget, setDeleteProduktTarget] = useState<Produktkatalog | null>(null);

  const [beschaffungDialog, setBeschaffungDialog] = useState(false);
  const [editBeschaffung, setEditBeschaffung] = useState<EnrichedBeschaffungsprotokoll | null>(null);
  const [deleteBeschaffungTarget, setDeleteBeschaffungTarget] = useState<EnrichedBeschaffungsprotokoll | null>(null);
  const [beschaffungProduktId, setBeschaffungProduktId] = useState<string | null>(null);

  const [verbrauchDialog, setVerbrauchDialog] = useState(false);
  const [editVerbrauch, setEditVerbrauch] = useState<EnrichedVerbrauchserfassung | null>(null);
  const [deleteVerbrauchTarget, setDeleteVerbrauchTarget] = useState<EnrichedVerbrauchserfassung | null>(null);
  const [verbrauchProduktId, setVerbrauchProduktId] = useState<string | null>(null);

  const [expandedProdukt, setExpandedProdukt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, 'einkauf' | 'verbrauch'>>({});

  // KPI stats
  const totalProdukte = produktkatalog.length;
  const totalEinkaeufe = beschaffungsprotokoll.length;
  const totalVerbrauchseintraege = verbrauchserfassung.length;
  const totalAusgaben = beschaffungsprotokoll.reduce((sum, e) => sum + (e.fields.gesamtpreis ?? 0), 0);

  // Monthly spend chart data (last 6 months)
  const monthlyChartData = useMemo(() => {
    const now = new Date();
    const months: { name: string; ausgaben: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('de-DE', { month: 'short' });
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const ausgaben = beschaffungsprotokoll
        .filter(e => (e.fields.einkaufsdatum ?? '').startsWith(yearMonth))
        .reduce((sum, e) => sum + (e.fields.gesamtpreis ?? 0), 0);
      months.push({ name: label, ausgaben });
    }
    return months;
  }, [beschaffungsprotokoll]);

  // Per-product data maps
  const einkaeufePorProdukt = useMemo(() => {
    const m = new Map<string, EnrichedBeschaffungsprotokoll[]>();
    for (const e of enrichedBeschaffungsprotokoll) {
      const id = e.fields.produkt_ref?.match(/([a-f0-9]{24})$/i)?.[1];
      if (!id) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(e);
    }
    return m;
  }, [enrichedBeschaffungsprotokoll]);

  const verbrauchPerProdukt = useMemo(() => {
    const m = new Map<string, EnrichedVerbrauchserfassung[]>();
    for (const e of enrichedVerbrauchserfassung) {
      const id = e.fields.verbrauch_produkt_ref?.match(/([a-f0-9]{24})$/i)?.[1];
      if (!id) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(e);
    }
    return m;
  }, [enrichedVerbrauchserfassung]);

  // Hooks must come before any early returns
  const produkteSorted = useMemo(() => {
    return [...produktkatalog].sort((a, b) => {
      const aName = `${a.fields.marke ?? ''} ${a.fields.produktname ?? ''}`.trim();
      const bName = `${b.fields.marke ?? ''} ${b.fields.produktname ?? ''}`.trim();
      return aName.localeCompare(bName, 'de');
    });
  }, [produktkatalog]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const getTabForProduct = (id: string): 'einkauf' | 'verbrauch' => activeTab[id] ?? 'einkauf';

  const openBeschaffungCreate = (produktId: string) => {
    setBeschaffungProduktId(produktId);
    setEditBeschaffung(null);
    setBeschaffungDialog(true);
  };

  const openVerbrauchCreate = (produktId: string) => {
    setVerbrauchProduktId(produktId);
    setEditVerbrauch(null);
    setVerbrauchDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Papierverbrauch</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Produkte, Einkäufe &amp; Verbrauch im Überblick</p>
        </div>
        <Button onClick={() => { setEditProdukt(null); setProduktDialog(true); }} className="shrink-0">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Produkt hinzufügen
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Produkte"
          value={String(totalProdukte)}
          description="im Katalog"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Einkäufe"
          value={String(totalEinkaeufe)}
          description="protokolliert"
          icon={<IconShoppingCart size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Verbrauch"
          value={String(totalVerbrauchseintraege)}
          description="Einträge erfasst"
          icon={<IconDroplet size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtausgaben"
          value={formatCurrency(totalAusgaben)}
          description="Gesamtausgaben"
          icon={<IconCoin size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Spend Chart */}
      {totalEinkaeufe > 0 && (
        <div className="rounded-2xl border bg-card p-4 overflow-hidden">
          <p className="text-sm font-semibold text-foreground mb-3">Ausgaben der letzten 6 Monate</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthlyChartData}>
              <defs>
                <linearGradient id="ausgabenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `${v}€`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Ausgaben']}
              />
              <Area type="monotone" dataKey="ausgaben" stroke="var(--primary)" strokeWidth={2} fill="url(#ausgabenGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Product Cards */}
      <div className="space-y-3">
        {produkteSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border bg-card">
            <IconBox size={40} className="text-muted-foreground" stroke={1.5} />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Noch keine Produkte angelegt. Füge dein erstes Produkt hinzu, um loszulegen.
            </p>
            <Button size="sm" onClick={() => { setEditProdukt(null); setProduktDialog(true); }}>
              <IconPlus size={14} className="mr-1 shrink-0" />Produkt hinzufügen
            </Button>
          </div>
        ) : (
          produkteSorted.map((produkt) => {
            const pid = produkt.record_id;
            const isExpanded = expandedProdukt === pid;
            const tab = getTabForProduct(pid);
            const einkaeufe = einkaeufePorProdukt.get(pid) ?? [];
            const verbraeuche = verbrauchPerProdukt.get(pid) ?? [];
            const letzterEinkauf = [...einkaeufe].sort((a, b) =>
              (b.fields.einkaufsdatum ?? '').localeCompare(a.fields.einkaufsdatum ?? '')
            )[0];
            const gesamtRollen = verbraeuche.reduce((s, v) => s + (v.fields.verbrauchte_rollen ?? 0), 0);
            const produktLabel = [produkt.fields.marke, produkt.fields.produktname].filter(Boolean).join(' · ');

            return (
              <div key={pid} className="rounded-2xl border bg-card overflow-hidden">
                {/* Product Header Row */}
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-semibold text-foreground truncate">{produktLabel || 'Unbekanntes Produkt'}</span>
                      {produkt.fields.lagenanzahl && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                          {produkt.fields.lagenanzahl.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {produkt.fields.preis_pro_packung != null && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(produkt.fields.preis_pro_packung)}/Packung
                        </span>
                      )}
                      {produkt.fields.rollen_pro_packung != null && (
                        <span className="text-xs text-muted-foreground">
                          {produkt.fields.rollen_pro_packung} Rollen/Packung
                        </span>
                      )}
                      {letzterEinkauf && (
                        <span className="text-xs text-muted-foreground">
                          Letzter Einkauf: {formatDate(letzterEinkauf.fields.einkaufsdatum)}
                        </span>
                      )}
                      {gesamtRollen > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {gesamtRollen} Rollen verbraucht
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditProdukt(produkt); setProduktDialog(true); }}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Produkt bearbeiten"
                    >
                      <IconPencil size={15} className="shrink-0" />
                    </button>
                    <button
                      onClick={() => setDeleteProduktTarget(produkt)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Produkt löschen"
                    >
                      <IconTrash size={15} className="shrink-0" />
                    </button>
                    <button
                      onClick={() => setExpandedProdukt(isExpanded ? null : pid)}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded
                        ? <IconChevronDown size={16} className="shrink-0" />
                        : <IconChevronRight size={16} className="shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                  <div className="border-t">
                    {/* Tabs */}
                    <div className="flex border-b px-4">
                      <button
                        onClick={() => setActiveTab(t => ({ ...t, [pid]: 'einkauf' }))}
                        className={`py-2 px-3 text-sm font-medium border-b-2 transition-colors ${tab === 'einkauf' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        Einkäufe ({einkaeufe.length})
                      </button>
                      <button
                        onClick={() => setActiveTab(t => ({ ...t, [pid]: 'verbrauch' }))}
                        className={`py-2 px-3 text-sm font-medium border-b-2 transition-colors ${tab === 'verbrauch' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        Verbrauch ({verbraeuche.length})
                      </button>
                    </div>

                    {/* Einkäufe Tab */}
                    {tab === 'einkauf' && (
                      <div className="p-3 space-y-2">
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => openBeschaffungCreate(pid)}>
                            <IconPlus size={13} className="mr-1 shrink-0" />Einkauf erfassen
                          </Button>
                        </div>
                        {einkaeufe.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Noch keine Einkäufe erfasst.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-muted-foreground">
                                  <th className="text-left py-1 px-2 font-medium">Datum</th>
                                  <th className="text-right py-1 px-2 font-medium">Packungen</th>
                                  <th className="text-right py-1 px-2 font-medium">Preis/Pkg</th>
                                  <th className="text-right py-1 px-2 font-medium">Gesamt</th>
                                  <th className="py-1 px-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...einkaeufe]
                                  .sort((a, b) => (b.fields.einkaufsdatum ?? '').localeCompare(a.fields.einkaufsdatum ?? ''))
                                  .map((e) => (
                                  <tr key={e.record_id} className="border-t hover:bg-accent/30 transition-colors">
                                    <td className="py-1.5 px-2 text-foreground">{formatDate(e.fields.einkaufsdatum)}</td>
                                    <td className="py-1.5 px-2 text-right">{e.fields.eingekaufte_packungen ?? '–'}</td>
                                    <td className="py-1.5 px-2 text-right">{e.fields.tatsaechlicher_preis != null ? formatCurrency(e.fields.tatsaechlicher_preis) : '–'}</td>
                                    <td className="py-1.5 px-2 text-right font-medium">{e.fields.gesamtpreis != null ? formatCurrency(e.fields.gesamtpreis) : '–'}</td>
                                    <td className="py-1.5 px-2">
                                      <div className="flex items-center gap-1 justify-end">
                                        <button
                                          onClick={() => { setEditBeschaffung(e); setBeschaffungProduktId(null); setBeschaffungDialog(true); }}
                                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <IconPencil size={13} className="shrink-0" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteBeschaffungTarget(e)}
                                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                          <IconTrash size={13} className="shrink-0" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verbrauch Tab */}
                    {tab === 'verbrauch' && (
                      <div className="p-3 space-y-2">
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => openVerbrauchCreate(pid)}>
                            <IconPlus size={13} className="mr-1 shrink-0" />Verbrauch erfassen
                          </Button>
                        </div>
                        {verbraeuche.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Noch kein Verbrauch erfasst.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-muted-foreground">
                                  <th className="text-left py-1 px-2 font-medium">Datum</th>
                                  <th className="text-left py-1 px-2 font-medium">Zeitraum</th>
                                  <th className="text-right py-1 px-2 font-medium">Rollen</th>
                                  <th className="text-right py-1 px-2 font-medium">Personen</th>
                                  <th className="py-1 px-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...verbraeuche]
                                  .sort((a, b) => (b.fields.verbrauch_datum ?? '').localeCompare(a.fields.verbrauch_datum ?? ''))
                                  .map((v) => (
                                  <tr key={v.record_id} className="border-t hover:bg-accent/30 transition-colors">
                                    <td className="py-1.5 px-2 text-foreground">{formatDate(v.fields.verbrauch_datum)}</td>
                                    <td className="py-1.5 px-2 text-muted-foreground">{v.fields.erfassungszeitraum?.label ?? '–'}</td>
                                    <td className="py-1.5 px-2 text-right font-medium">{v.fields.verbrauchte_rollen ?? '–'}</td>
                                    <td className="py-1.5 px-2 text-right">{v.fields.anzahl_personen ?? '–'}</td>
                                    <td className="py-1.5 px-2">
                                      <div className="flex items-center gap-1 justify-end">
                                        <button
                                          onClick={() => { setEditVerbrauch(v); setVerbrauchProduktId(null); setVerbrauchDialog(true); }}
                                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <IconPencil size={13} className="shrink-0" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteVerbrauchTarget(v)}
                                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                          <IconTrash size={13} className="shrink-0" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <ProduktkatalogDialog
        open={produktDialog}
        onClose={() => { setProduktDialog(false); setEditProdukt(null); }}
        onSubmit={async (fields) => {
          if (editProdukt) {
            await LivingAppsService.updateProduktkatalogEntry(editProdukt.record_id, fields);
          } else {
            await LivingAppsService.createProduktkatalogEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editProdukt?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Produktkatalog']}
      />

      <BeschaffungsprotokollDialog
        open={beschaffungDialog}
        onClose={() => { setBeschaffungDialog(false); setEditBeschaffung(null); setBeschaffungProduktId(null); }}
        onSubmit={async (fields) => {
          if (editBeschaffung) {
            await LivingAppsService.updateBeschaffungsprotokollEntry(editBeschaffung.record_id, fields);
          } else {
            await LivingAppsService.createBeschaffungsprotokollEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          editBeschaffung
            ? editBeschaffung.fields
            : beschaffungProduktId
            ? { produkt_ref: createRecordUrl(APP_IDS.PRODUKTKATALOG, beschaffungProduktId) }
            : undefined
        }
        produktkatalogList={produktkatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Beschaffungsprotokoll']}
      />

      <VerbrauchserfassungDialog
        open={verbrauchDialog}
        onClose={() => { setVerbrauchDialog(false); setEditVerbrauch(null); setVerbrauchProduktId(null); }}
        onSubmit={async (fields) => {
          if (editVerbrauch) {
            await LivingAppsService.updateVerbrauchserfassungEntry(editVerbrauch.record_id, fields);
          } else {
            await LivingAppsService.createVerbrauchserfassungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          editVerbrauch
            ? editVerbrauch.fields
            : verbrauchProduktId
            ? { verbrauch_produkt_ref: createRecordUrl(APP_IDS.PRODUKTKATALOG, verbrauchProduktId) }
            : undefined
        }
        produktkatalogList={produktkatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Verbrauchserfassung']}
      />

      <ConfirmDialog
        open={!!deleteProduktTarget}
        title="Produkt löschen"
        description={`Möchtest du "${[deleteProduktTarget?.fields.marke, deleteProduktTarget?.fields.produktname].filter(Boolean).join(' ')}" wirklich löschen?`}
        onConfirm={async () => {
          if (!deleteProduktTarget) return;
          await LivingAppsService.deleteProduktkatalogEntry(deleteProduktTarget.record_id);
          setDeleteProduktTarget(null);
          fetchAll();
        }}
        onClose={() => setDeleteProduktTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteBeschaffungTarget}
        title="Einkauf löschen"
        description="Möchtest du diesen Einkaufseintrag wirklich löschen?"
        onConfirm={async () => {
          if (!deleteBeschaffungTarget) return;
          await LivingAppsService.deleteBeschaffungsprotokollEntry(deleteBeschaffungTarget.record_id);
          setDeleteBeschaffungTarget(null);
          fetchAll();
        }}
        onClose={() => setDeleteBeschaffungTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteVerbrauchTarget}
        title="Verbrauch löschen"
        description="Möchtest du diesen Verbrauchseintrag wirklich löschen?"
        onConfirm={async () => {
          if (!deleteVerbrauchTarget) return;
          await LivingAppsService.deleteVerbrauchserfassungEntry(deleteVerbrauchTarget.record_id);
          setDeleteVerbrauchTarget(null);
          fetchAll();
        }}
        onClose={() => setDeleteVerbrauchTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
