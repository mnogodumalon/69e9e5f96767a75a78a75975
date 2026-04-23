import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69e9e5db336260cc4f3e835a';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormVerbrauchsstatistik() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Verbrauchsstatistik — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="zeitraum_von">Zeitraum von</Label>
            <Input
              id="zeitraum_von"
              type="date"
              value={fields.zeitraum_von ?? ''}
              onChange={e => setFields(f => ({ ...f, zeitraum_von: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zeitraum_bis">Zeitraum bis</Label>
            <Input
              id="zeitraum_bis"
              type="date"
              value={fields.zeitraum_bis ?? ''}
              onChange={e => setFields(f => ({ ...f, zeitraum_bis: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtverbrauch_rollen">Gesamtverbrauch im Zeitraum (Rollen)</Label>
            <Input
              id="gesamtverbrauch_rollen"
              type="number"
              value={fields.gesamtverbrauch_rollen ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtverbrauch_rollen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="durchschnitt_pro_person_tag">Durchschnittlicher Verbrauch pro Person pro Tag (Rollen)</Label>
            <Input
              id="durchschnitt_pro_person_tag"
              type="number"
              value={fields.durchschnitt_pro_person_tag ?? ''}
              onChange={e => setFields(f => ({ ...f, durchschnitt_pro_person_tag: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statistik_personen">Anzahl Personen</Label>
            <Input
              id="statistik_personen"
              type="number"
              value={fields.statistik_personen ?? ''}
              onChange={e => setFields(f => ({ ...f, statistik_personen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtkosten">Gesamtkosten im Zeitraum (€)</Label>
            <Input
              id="gesamtkosten"
              type="number"
              value={fields.gesamtkosten ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtkosten: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kosten_pro_rolle">Kosten pro Rolle (€)</Label>
            <Input
              id="kosten_pro_rolle"
              type="number"
              value={fields.kosten_pro_rolle ?? ''}
              onChange={e => setFields(f => ({ ...f, kosten_pro_rolle: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kosten_pro_person_monat">Kosten pro Person pro Monat (€)</Label>
            <Input
              id="kosten_pro_person_monat"
              type="number"
              value={fields.kosten_pro_person_monat ?? ''}
              onChange={e => setFields(f => ({ ...f, kosten_pro_person_monat: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effizienzeinschaetzung">Effizienzeinschätzung</Label>
            <Select
              value={lookupKey(fields.effizienzeinschaetzung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, effizienzeinschaetzung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="effizienzeinschaetzung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="sehr_effizient">Sehr effizient</SelectItem>
                <SelectItem value="effizient">Effizient</SelectItem>
                <SelectItem value="durchschnittlich">Durchschnittlich</SelectItem>
                <SelectItem value="verbesserungswuerdig">Verbesserungswürdig</SelectItem>
                <SelectItem value="verschwenderisch">Verschwenderisch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="optimierungsempfehlungen">Optimierungsempfehlungen</Label>
            <Textarea
              id="optimierungsempfehlungen"
              value={fields.optimierungsempfehlungen ?? ''}
              onChange={e => setFields(f => ({ ...f, optimierungsempfehlungen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen_statistik">Notizen</Label>
            <Textarea
              id="notizen_statistik"
              value={fields.notizen_statistik ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen_statistik: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
