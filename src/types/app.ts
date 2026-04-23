// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Produktkatalog {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    marke?: string;
    produktname?: string;
    lagenanzahl?: LookupValue;
    blaetter_pro_rolle?: number;
    rollen_pro_packung?: number;
    preis_pro_packung?: number;
    haendler?: string;
    notizen_produkt?: string;
  };
}

export interface Beschaffungsprotokoll {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    einkaufsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    produkt_ref?: string; // applookup -> URL zu 'Produktkatalog' Record
    eingekaufte_packungen?: number;
    tatsaechlicher_preis?: number;
    gesamtpreis?: number;
    einkaufsort?: string;
    lagerbestand_nach_einkauf?: number;
    notizen_beschaffung?: string;
  };
}

export interface Verbrauchserfassung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    verbrauch_datum?: string; // Format: YYYY-MM-DD oder ISO String
    erfassungszeitraum?: LookupValue;
    verbrauch_produkt_ref?: string; // applookup -> URL zu 'Produktkatalog' Record
    verbrauchte_rollen?: number;
    anzahl_personen?: number;
    nutzungskontext?: LookupValue;
    notizen_verbrauch?: string;
  };
}

export interface Verbrauchsstatistik {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    zeitraum_von?: string; // Format: YYYY-MM-DD oder ISO String
    zeitraum_bis?: string; // Format: YYYY-MM-DD oder ISO String
    statistik_produkt_ref?: string; // applookup -> URL zu 'Produktkatalog' Record
    gesamtverbrauch_rollen?: number;
    durchschnitt_pro_person_tag?: number;
    statistik_personen?: number;
    gesamtkosten?: number;
    kosten_pro_rolle?: number;
    kosten_pro_person_monat?: number;
    effizienzeinschaetzung?: LookupValue;
    optimierungsempfehlungen?: string;
    notizen_statistik?: string;
  };
}

export const APP_IDS = {
  PRODUKTKATALOG: '69e9e5d3c50aa0bc0dbdd1b4',
  BESCHAFFUNGSPROTOKOLL: '69e9e5d97115acc28bfe78aa',
  VERBRAUCHSERFASSUNG: '69e9e5daed7b54f376491f1f',
  VERBRAUCHSSTATISTIK: '69e9e5db336260cc4f3e835a',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'produktkatalog': {
    lagenanzahl: [{ key: "einlagig", label: "1-lagig" }, { key: "zweilagig", label: "2-lagig" }, { key: "dreilagig", label: "3-lagig" }, { key: "vierlagig", label: "4-lagig" }],
  },
  'verbrauchserfassung': {
    erfassungszeitraum: [{ key: "taeglich", label: "Täglich" }, { key: "woechentlich", label: "Wöchentlich" }, { key: "monatlich", label: "Monatlich" }],
    nutzungskontext: [{ key: "haushalt", label: "Privater Haushalt" }, { key: "buero", label: "Büro" }, { key: "gastronomie", label: "Gastronomie" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'verbrauchsstatistik': {
    effizienzeinschaetzung: [{ key: "sehr_effizient", label: "Sehr effizient" }, { key: "effizient", label: "Effizient" }, { key: "durchschnittlich", label: "Durchschnittlich" }, { key: "verbesserungswuerdig", label: "Verbesserungswürdig" }, { key: "verschwenderisch", label: "Verschwenderisch" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'produktkatalog': {
    'marke': 'string/text',
    'produktname': 'string/text',
    'lagenanzahl': 'lookup/radio',
    'blaetter_pro_rolle': 'number',
    'rollen_pro_packung': 'number',
    'preis_pro_packung': 'number',
    'haendler': 'string/text',
    'notizen_produkt': 'string/textarea',
  },
  'beschaffungsprotokoll': {
    'einkaufsdatum': 'date/date',
    'produkt_ref': 'applookup/select',
    'eingekaufte_packungen': 'number',
    'tatsaechlicher_preis': 'number',
    'gesamtpreis': 'number',
    'einkaufsort': 'string/text',
    'lagerbestand_nach_einkauf': 'number',
    'notizen_beschaffung': 'string/textarea',
  },
  'verbrauchserfassung': {
    'verbrauch_datum': 'date/date',
    'erfassungszeitraum': 'lookup/radio',
    'verbrauch_produkt_ref': 'applookup/select',
    'verbrauchte_rollen': 'number',
    'anzahl_personen': 'number',
    'nutzungskontext': 'lookup/select',
    'notizen_verbrauch': 'string/textarea',
  },
  'verbrauchsstatistik': {
    'zeitraum_von': 'date/date',
    'zeitraum_bis': 'date/date',
    'statistik_produkt_ref': 'applookup/select',
    'gesamtverbrauch_rollen': 'number',
    'durchschnitt_pro_person_tag': 'number',
    'statistik_personen': 'number',
    'gesamtkosten': 'number',
    'kosten_pro_rolle': 'number',
    'kosten_pro_person_monat': 'number',
    'effizienzeinschaetzung': 'lookup/radio',
    'optimierungsempfehlungen': 'string/textarea',
    'notizen_statistik': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateProduktkatalog = StripLookup<Produktkatalog['fields']>;
export type CreateBeschaffungsprotokoll = StripLookup<Beschaffungsprotokoll['fields']>;
export type CreateVerbrauchserfassung = StripLookup<Verbrauchserfassung['fields']>;
export type CreateVerbrauchsstatistik = StripLookup<Verbrauchsstatistik['fields']>;