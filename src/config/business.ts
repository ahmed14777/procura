export const LAWYER_PROFILE = {
  firstName: 'Francesca',
  lastName: 'Guicciardini',
  fullName: 'Avv. Francesca Guicciardini',
  barAssociation: 'Milano',
  taxCode: 'GCCFNC92H43A662W',
  vatNumber: '10860930154',
  officeAddress: 'Via Mario Pieri 2 – Milano',
  officeAddressLong: 'Milano, Via Mario Pieri n. 2',
  pec: 'francesca.guicciardini@pec.it',
  email: 'francesca.guicciardini@gmail.com',
} as const

export const LAWYER_OFFICE_LOCATIONS = {
  milano: {
    cityAr: 'ميلانو',
    address: 'Via Padova 267',
  },
  brescia: {
    cityAr: 'بريشيا',
    address: 'Corso Mameli 24',
  },
} as const

export const CLIENT_CONTRIBUTION = {
  euro: '1.99',
  cents: 199,
} as const
