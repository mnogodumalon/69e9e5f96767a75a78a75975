import type { EnrichedBeschaffungsprotokoll, EnrichedVerbrauchserfassung, EnrichedVerbrauchsstatistik } from '@/types/enriched';
import type { Beschaffungsprotokoll, Produktkatalog, Verbrauchserfassung, Verbrauchsstatistik } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BeschaffungsprotokollMaps {
  produktkatalogMap: Map<string, Produktkatalog>;
}

export function enrichBeschaffungsprotokoll(
  beschaffungsprotokoll: Beschaffungsprotokoll[],
  maps: BeschaffungsprotokollMaps
): EnrichedBeschaffungsprotokoll[] {
  return beschaffungsprotokoll.map(r => ({
    ...r,
    produkt_refName: resolveDisplay(r.fields.produkt_ref, maps.produktkatalogMap, 'marke'),
  }));
}

interface VerbrauchserfassungMaps {
  produktkatalogMap: Map<string, Produktkatalog>;
}

export function enrichVerbrauchserfassung(
  verbrauchserfassung: Verbrauchserfassung[],
  maps: VerbrauchserfassungMaps
): EnrichedVerbrauchserfassung[] {
  return verbrauchserfassung.map(r => ({
    ...r,
    verbrauch_produkt_refName: resolveDisplay(r.fields.verbrauch_produkt_ref, maps.produktkatalogMap, 'marke'),
  }));
}

interface VerbrauchsstatistikMaps {
  produktkatalogMap: Map<string, Produktkatalog>;
}

export function enrichVerbrauchsstatistik(
  verbrauchsstatistik: Verbrauchsstatistik[],
  maps: VerbrauchsstatistikMaps
): EnrichedVerbrauchsstatistik[] {
  return verbrauchsstatistik.map(r => ({
    ...r,
    statistik_produkt_refName: resolveDisplay(r.fields.statistik_produkt_ref, maps.produktkatalogMap, 'marke'),
  }));
}
