import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Produktkatalog, Beschaffungsprotokoll, Verbrauchserfassung, Verbrauchsstatistik } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [produktkatalog, setProduktkatalog] = useState<Produktkatalog[]>([]);
  const [beschaffungsprotokoll, setBeschaffungsprotokoll] = useState<Beschaffungsprotokoll[]>([]);
  const [verbrauchserfassung, setVerbrauchserfassung] = useState<Verbrauchserfassung[]>([]);
  const [verbrauchsstatistik, setVerbrauchsstatistik] = useState<Verbrauchsstatistik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [produktkatalogData, beschaffungsprotokollData, verbrauchserfassungData, verbrauchsstatistikData] = await Promise.all([
        LivingAppsService.getProduktkatalog(),
        LivingAppsService.getBeschaffungsprotokoll(),
        LivingAppsService.getVerbrauchserfassung(),
        LivingAppsService.getVerbrauchsstatistik(),
      ]);
      setProduktkatalog(produktkatalogData);
      setBeschaffungsprotokoll(beschaffungsprotokollData);
      setVerbrauchserfassung(verbrauchserfassungData);
      setVerbrauchsstatistik(verbrauchsstatistikData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [produktkatalogData, beschaffungsprotokollData, verbrauchserfassungData, verbrauchsstatistikData] = await Promise.all([
          LivingAppsService.getProduktkatalog(),
          LivingAppsService.getBeschaffungsprotokoll(),
          LivingAppsService.getVerbrauchserfassung(),
          LivingAppsService.getVerbrauchsstatistik(),
        ]);
        setProduktkatalog(produktkatalogData);
        setBeschaffungsprotokoll(beschaffungsprotokollData);
        setVerbrauchserfassung(verbrauchserfassungData);
        setVerbrauchsstatistik(verbrauchsstatistikData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const produktkatalogMap = useMemo(() => {
    const m = new Map<string, Produktkatalog>();
    produktkatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [produktkatalog]);

  return { produktkatalog, setProduktkatalog, beschaffungsprotokoll, setBeschaffungsprotokoll, verbrauchserfassung, setVerbrauchserfassung, verbrauchsstatistik, setVerbrauchsstatistik, loading, error, fetchAll, produktkatalogMap };
}