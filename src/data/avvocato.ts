/**
 * Fixed lawyer data for Avv. Francesca Guicciardini
 * This data is reused across the application for PDF generation
 */

import { LAWYER_PROFILE } from '@/config/business'

export const AVVOCATO = {
  nome: LAWYER_PROFILE.firstName,
  cognome: LAWYER_PROFILE.lastName,
  nomeCompleto: LAWYER_PROFILE.fullName,
  foro: LAWYER_PROFILE.barAssociation,
  codiceFiscale: LAWYER_PROFILE.taxCode,
  studio: LAWYER_PROFILE.officeAddress,
  pec: LAWYER_PROFILE.pec,
} as const

export type Avvocato = typeof AVVOCATO
