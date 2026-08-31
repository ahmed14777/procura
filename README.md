# Procura Francesca

> Professional internal tool for Italian immigration service office

A production-ready web application for generating "Procura ad litem" documents and PEC communications for asylum and administrative access requests.

## Easy2Do × Avv. Francesca Guicciardini

---

## Features

- **PDF Generation**: Generate professional "Procura alle Liti" documents with all required legal sections
- **PEC Resolution**: Automatically resolve the correct PEC address based on official territorial commission data
- **Email Generation**: Create professional and legally correct PEC subject and body text
- **Validation**: Full form validation using Zod schema
- **Modern UI**: Clean, professional interface with subtle animations

## Technology Stack

- **Next.js 14** (App Router) - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Zod** - Form validation
- **@react-pdf/renderer** - PDF generation

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with fonts
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Header.tsx         # Animated header
│   ├── Footer.tsx         # Footer with credits
│   ├── ProcuraForm.tsx    # Main form component
│   └── ResultsPanel.tsx   # Results display
├── lib/                   # Business logic modules
│   ├── schema.ts          # Zod validation schema
│   ├── pecResolver.ts     # PEC address resolution
│   ├── emailGenerator.ts  # Email text generation
│   └── pdfGenerator.tsx   # PDF document generation
└── data/                  # Static data
    ├── commissioni.ts     # Official commission data
    └── avvocato.ts        # Lawyer information
```

## Usage

### Two Operation Modes

1. **"Scarica solo procura PDF"** - Download PDF only
   - Generates and downloads the Procura PDF
   - Does NOT resolve PEC
   - Does NOT generate email

2. **"Genera tutto"** - Generate everything
   - Generates PDF
   - Resolves correct PEC address
   - Generates professional email subject and body

### Form Fields

| Field            | Required | Description                        |
| ---------------- | -------- | ---------------------------------- |
| Nome             | Yes      | Client first name                  |
| Cognome          | Yes      | Client last name                   |
| Data di nascita  | Yes      | Birth date                         |
| Luogo di nascita | Yes      | Birth place                        |
| Codice Fiscale   | Yes      | Italian tax code (16 chars)        |
| Numero VESTANET  | No       | Case reference number              |
| Provincia        | Yes      | Province (from official list only) |
| Tipo richiesta   | Yes      | "asilo" or "accesso"               |

## Data Sources

The commission and PEC data comes from official sources:

1. **contatti_cctt_e_sezioni.pdf** (updated 21.2.2020)
2. **le_commissioni_territoriali_com__naz__dir__asilo.pdf**

⚠️ Do not modify the data files manually. Any updates must come from official sources.

## Request Types

### Protezione Internazionale (asilo)

Legal reference: "ai sensi della normativa vigente in materia di protezione internazionale"

### Accesso agli Atti (accesso)

Legal reference: "ai sensi della normativa vigente in materia di accesso agli atti amministrativi"

## Lawyer Information

```
Avv. Francesca Guicciardini
Foro di Milano
C.F.: GCCFNC92H43A662W
Studio: Via Mario Pieri 2 – Milano
PEC: francesca.guicciardini@pec.it
```

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Extension document analysis

The manually distributed CAF extension uses the application backend for secure image and PDF
analysis. Configure these variables in Vercel before creating extension licenses:

```bash
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
OPENAI_API_KEY=...
OPENAI_DOCUMENT_MODEL=gpt-4.1-mini # optional
```

After deployment, authenticated staff can create and revoke activation codes at
`/extension-licenses`. The raw activation code is displayed only once; Redis stores only its
SHA-256 hash. Website authentication and extension activation are independent.

## Notes

- Personal data captured from forms and CAF autofill data remain in the browser.
- Document analysis sends the selected file to the application backend and OpenAI after consent;
  the request uses `store: false` and the original file is not persisted by the application.
- PDF generation uses @react-pdf/renderer

---

**Designed & built by Ayado**
