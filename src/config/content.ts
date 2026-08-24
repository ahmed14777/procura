import type { TipoRichiesta } from '@/lib/schema'

/* =========================================================
   BRANDING & APP META
========================================================= */

export const PROJECT_BRANDING = {
  projectName: 'Easy2Do',
  logoText: 'E2D',
  headerClientSuffix: 'Servizio Clienti',
  headerLawyerSuffix: 'Area Operativa',
  stripeContributionProductName: 'Contributo volontario Easy2Do',
} as const

export const APP_METADATA_COPY = {
  title: `${PROJECT_BRANDING.projectName} | ${PROJECT_BRANDING.headerClientSuffix}`,
  description:
    'Piattaforma per inviare richieste di aggiornamento pratica e gestire il flusso documentale in modo semplice e sicuro.',
  keywords: ['aggiornamento pratica', 'richiesta cliente', 'easy2do', 'documenti', 'pagamento'],
} as const

/* =========================================================
  HOME PAGE CONTENT
========================================================= */

export const HOME_PAGE_COPY = {
  brand: PROJECT_BRANDING.projectName,
  titleAr: 'إيميل صح لمحكمتك يوفر عليك كتير وقت وتكلفة',
  subtitleIt: 'L’email giusta per la tua Commissione ti fa risparmiare tempo e costi',
  descriptionAr:
    'بنساعدك تجهّز إيميل مناسب لمحكمتك، وتبعتُه للجهة الصح من عندك، عشان توفر وقت وتكلفة وتتابع موعد جلستك بشكل أسهل.',
  descriptionIt:
    'Ti aiutiamo a preparare l’email corretta per la tua Commissione e a inviarla al destinatario giusto, risparmiando tempo e costi e seguendo più facilmente la data dell’udienza.',
  roleHeading: 'دورنا / Il nostro ruolo:',
  roleBodyAr: 'تجهيز الصيغة والإيميل والإرسال الصحيح فقط، بدون تمثيل أو استشارة قانونية.',
  roleBodyIt:
    'Prepariamo il testo, l’email e l’invio corretto. Non offriamo rappresentanza o consulenza legale.',
  contributionHeading: 'مساهمة بسيطة لدعم الخدمة / Contributo per il servizio',
  contributionBodyAr: 'مساهمة بسيطة منك مقابل خدمة مفيدة ليك.',
  contributionBodyIt: 'Un piccolo contributo per un servizio utile.',
  ctaIdle: 'ساهم الآن / Contribuisci ora',
  ctaLoading: 'جاري فتح الدفع... / Apertura del pagamento...',
  phoneLabel: 'رقم الهاتف / Numero di telefono',
  phonePlaceholder: '+39 333 1234567',
  bottomNoteAr: 'مساهمة بسيطة منك مقابل خدمة مفيدة ليك.',
  bottomNoteIt: 'Un piccolo contributo da parte tua per un servizio utile per te.',
} as const

/* =========================================================
  LAWYER FOLLOW-UP MODAL CONTENT
========================================================= */

export const LAWYER_FOLLOW_UP_COPY = {
  modalTitleAr: 'متابعة مع مكتبنا',
  modalSubtitleAr: 'تواصل معنا بالمكتب مع إمكانية عمل توكيل لمتابعة موعد المحكمة أونلاين.',
  workingHoursTitleAr: 'مواعيد العمل',
  workingHoursLine1Ar: 'من ١١ صباحًا حتى ٦ مساءً',
  workingHoursLine2Ar: 'السبت والأحد المكتب مفتوح، والإجازة الأسبوعية يوم الجمعة',
  onlineServicesTitleAr: 'خدماتنا أونلاين',
  onlineServicesBodyAr: 'قريبًا: ربط مباشر لخدمات المتابعة وعمل التوكيل أونلاين مع المكتب.',
  onlineServicesButtonAr: 'الخدمات الأونلاين (قريبًا)',
} as const

/* =========================================================
   EMAIL GENERATOR CONTENT
========================================================= */

export const EMAIL_GENERATOR_COPY = {
  requestTypeLabels: {
    asilo:
      'Istanza di accesso agli atti e richiesta di aggiornamento sullo stato del procedimento ',
    accesso: 'Istanza di accesso agli atti',
  } as Record<TipoRichiesta, string>,
  legalReferences: {
    asilo: 'ai sensi della normativa vigente in materia di protezione internazionale',
    accesso: 'ai sensi della normativa vigente in materia di accesso agli atti amministrativi',
  } as Record<TipoRichiesta, string>,
  askClauseAsilo: [
    'CHIEDE',
    '',
    'di voler fornire formale riscontro in ordine allo stato del procedimento di protezione internazionale,',
    'con specifico riferimento all’eventuale fissazione della convocazione',
    'ovvero all’adozione del relativo provvedimento conclusivo.',
  ],
  askClauseAccesso: [
    'CHIEDE',
    '',
    'di voler consentire l’accesso e il rilascio di copia integrale del fascicolo amministrativo',
    'relativo al procedimento in oggetto, ai sensi della normativa vigente.',
  ],
  attachments: ['- Procura alle liti;', '- Documento di identità del/la richiedente.'],
} as const

/* =========================================================
   LEGAL PDF CONTENT
========================================================= */

export const PDF_LEGAL_COPY = {
  nominoText: `quale mio difensore e procuratore speciale in ogni fase e grado, anche nelle fasi dell'esecuzione, opposizione, incidentale, cautelare, ed in sede di gravame, l’Avv. Francesca Guicciardini del Foro di Milano, C.F. GCCFNC92H43A662W, nata a Bari il 03.06.1992, con studio in Milano, Via Mario Pieri n.2, conferendole ogni più ampia facoltà di legge, ivi comprese le facoltà di transigere, conciliare, incassare, rinunciare agli atti ed accettarne la rinuncia, farsi rappresentare, assistere e sostituire, eleggere domicili, rinunziare alla comparizione delle parti, riassumere la causa, proseguirla, chiamare terzi in causa, deferire giuramento, proporre domande riconvenzionali ed azioni cautelari di qualsiasi genere e natura in corso di causa, chiedere ed accettare rendiconti, ed assumendo sin d’ora per rato e valido l’operato del suddetto legale, il quale procuratore dichiara di voler ricevere le comunicazioni a mezzo PEC: francesca.guicciardini@pec.it.

Dichiaro di essere stato informato, ai sensi dell’art. 4, co. 3, D. Lgs. n. 28/2010, della possibilità di ricorrere al procedimento di mediazione ivi previsto e dei benefici fiscali di cui agli artt. 17 e 20 del medesimo decreto, nonché dei casi in cui l’esperimento del procedimento di mediazione è condizione di procedibilità della domanda giudiziale.

Dichiaro di essere stato informato, ai sensi dell’art. 2, co. 7, D.L. n. 132/2014, della possibilità di ricorrere alla convenzione di negoziazione assistita da uno o più avvocati disciplinata dagli artt. 2 e ss. del suddetto decreto legge.

Dichiaro, ai sensi e per gli effetti di cui al D. Lgs. n. 196/2003 e s.m.i., di essere stato informato che i miei dati personali, anche sensibili, verranno utilizzati per le finalità inerenti al presente mandato, autorizzando sin d'ora il rispettivo trattamento.

Eleggo domicilio presso lo studio dell’Avv. Francesca Guicciardini, sito in Milano, Via Mario Pieri n. 2.

Dichiaro di revocare ogni precedente mandato conferito.`,
  autodichiarazioneIntro: `Io sottoscritto dichiaro di aver compreso in modo chiaro che il ruolo dell'ufficio ${PROJECT_BRANDING.projectName} e limitato esclusivamente al conferimento di incarico legale tramite l'avvocato incaricato, al solo fine di svolgere una delle seguenti attivita:`,
  autodichiarazioneOptionLabels: {
    prima_udienza:
      'al fine di acquisire ogni utile informazione in merito allo stato della mia domanda di protezione internazionale e di accertare la data della prima udienza dinanzi all’Autorità competente, senza alcun potere di intervento sui tempi o sulle decisioni delle autorità competentiseguire la prima udienza relativa alla mia domanda di asilo',
    riscontro_tribunale:
      'richiedere ed acquisire copia del provvedimento conclusivo adottato dalla Commissione competente in relazione alla mia domanda di protezione internazionale, senza alcun potere di intervento sui tempi o sull’esito del procedimento',
  },
  autodichiarazioneFinal: `Resta espressamente inteso che l’ufficio non ha alcun potere né intervento in merito ai tempi, alle udienze o all’esito del procedimento.
L’attività dell’ufficio ha natura meramente amministrativa ed è svolta nei limiti della legge italiana.

Dichiaro che il contenuto mi è stato spiegato anche in lingua araba e di averlo compreso.
Dichiaro di aver letto e accettato quanto sopra.`,
} as const
