/**
 * Fixed lawyer data for Avv. Francesca Guicciardini
 * This data is reused across the application for PDF generation
 */

export const AVVOCATO = {
  nome: 'Francesca',
  cognome: 'Guicciardini',
  nomeCompleto: 'Avv. Francesca Guicciardini',
  foro: 'Milano',
  codiceFiscale: 'GCCFNC92H43A662W',
  studio: 'Via Mario Pieri 2 – Milano',
  pec: 'francesca.guicciardini@pec.it',
} as const;

export type Avvocato = typeof AVVOCATO;
