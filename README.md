# Professional Translation Suite

A comprehensive AI-powered translation application with TRADOS formatting support, translation memory management, and terminology database.

## Features

- **AI Translation**: Powered by Google Gemini AI with context-aware translation
- **Translation Memory**: Store and reuse previous translations for consistency
- **Terminology Management**: Maintain a database of specialized terms with translations
- **TRADOS Formatting**: Export translations with EU Legal Acts TRADOS formatting rules
- **HTML/DOCX Export**: Export formatted documents ready for Microsoft Word
- **No Authentication Required**: Simple, direct access to all features

## Setup

### Prerequisites

1. **Gemini API Key**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Supabase** (already configured): Database for translation memory and terminology

### Environment Variables

The following environment variables are already configured in `.env`:

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Deployment to Vercel

### Via GitHub

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect the settings
6. Click "Deploy"

### Via Vercel CLI

```bash
npm i -g vercel
vercel
```

## Usage

### 1. Configure API Key

- Navigate to the Translator tab
- Click "Settings"
- Enter your Gemini API key
- Optionally add linguistic and interpunction rules
- Click "Save Settings"

### 2. Manage Translation Memory

- Go to the "Translation Memory" tab
- Add source-target translation pairs
- Include context for better translations
- These will be automatically referenced during translation

### 3. Build Terminology Database

- Go to the "Terminology" tab
- Add specialized terms with their translations
- Include definitions and categories
- Terms will be consistently used in translations

### 4. Configure TRADOS Rules

- Go to the "TRADOS Rules" tab
- Default EU Legal Acts rules are pre-loaded
- Import/export custom rule sets
- Set a default rule set for exports

### 5. Translate Documents

- Enter source text in the left panel
- Set source and target languages
- Click "Translate"
- Edit the translation if needed
- Export as HTML (TRADOS formatted) or DOCX

## TRADOS Formatting

The app implements comprehensive TRADOS formatting rules:

- Font: Times New Roman (12pt main, 10pt footnotes)
- Margins: Top/Bottom 2.54cm, Left 3.17cm, Right 3.17cm
- Paragraph spacing: 6pt before/after
- Hanging indent: 1cm
- Text cleaning (multiple spaces, optional hyphens, manual line breaks)
- Preamble numbering: (1), (2), (3)
- Body numbering: 1., 2., 3.
- Letter formatting: (a), (b), (c)

## Database Structure

- `translation_memory`: Source-target translation pairs with context
- `terminology`: Terms with translations and definitions
- `formatting_rules`: TRADOS formatting rule sets
- `translation_projects`: Saved translation projects (future feature)

## Technologies

- **React** + **TypeScript**: Frontend framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **Supabase**: Database and backend
- **Google Gemini AI**: AI translation engine
- **Lucide React**: Icons

## Notes

- DOCX export is a placeholder and requires additional libraries for full implementation
- HTML export is fully functional and can be opened in Microsoft Word
- All data is stored in Supabase with public access (no authentication required)
- API keys are stored locally in browser localStorage

## License

MIT
