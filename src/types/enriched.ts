import type { Beschaffungsprotokoll, Verbrauchserfassung, Verbrauchsstatistik } from './app';

export type EnrichedBeschaffungsprotokoll = Beschaffungsprotokoll & {
  produkt_refName: string;
};

export type EnrichedVerbrauchserfassung = Verbrauchserfassung & {
  verbrauch_produkt_refName: string;
};

export type EnrichedVerbrauchsstatistik = Verbrauchsstatistik & {
  statistik_produkt_refName: string;
};
