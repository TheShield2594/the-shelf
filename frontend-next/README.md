# The Shelf - Next.js Frontend

Modern, privacy-first book tracking platform with **multi-dimensional ratings**.

## Features

✨ **Multi-Dimensional Rating System**
- 7-axis rating system (pace, emotional impact, complexity, character, plot, prose, originality)
- Interactive radar charts
- Visual book "fingerprints"

🎨 **Modern UI**
- Built with Next.js 14 (App Router)
- Tailwind CSS for styling
- Responsive design (mobile-first)
- Dark mode ready

🔒 **Privacy-First**
- No tracking
- No data selling
- Easy data export
- Self-hosting option

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Backend:** FastAPI (see `/backend`)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on port 8000 (see `/backend`)

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local to point to your backend API

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend API URL
```

## Project Structure

```
frontend-next/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── demo/              # Interactive demo
│   │   └── about/             # About page
│   ├── components/            # React components
│   │   ├── RadarChart.tsx     # Recharts radar chart
│   │   ├── RatingSlider.tsx   # Dimension slider
│   │   ├── MultiDimensionalRatingForm.tsx
│   │   └── BookFingerprint.tsx
│   ├── lib/                   # Utilities
│   │   ├── api.ts             # API client
│   │   └── utils.ts           # Helper functions
│   └── types/                 # TypeScript types
│       └── index.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Key Components

### RadarChart

Visualizes multi-dimensional ratings as a radar chart.

```tsx
import { RadarChart } from '@/components/RadarChart';

<RadarChart
  data={[
    { dimension: 'Pace', value: 4 },
    { dimension: 'Emotion', value: 5 },
    // ...
  ]}
/>
```

### MultiDimensionalRatingForm

Interactive form for rating books on 7 dimensions.

```tsx
import { MultiDimensionalRatingForm } from '@/components/MultiDimensionalRatingForm';

<MultiDimensionalRatingForm
  bookId={42}
  onSuccess={(rating) => console.log('Saved!', rating)}
/>
```

### BookFingerprint

Displays aggregated community ratings.

```tsx
import { BookFingerprint } from '@/components/BookFingerprint';

<BookFingerprint bookId={42} />
```

## API Client

The API client (`src/lib/api.ts`) handles all backend communication:

```typescript
import { api } from '@/lib/api';

// Create/update rating
const rating = await api.createOrUpdateRating({
  book_id: 1,
  pace: 4,
  emotional_impact: 5,
  // ...
});

// Get book fingerprint
const fingerprint = await api.getBookFingerprint(1);

// Get books
const books = await api.getBooks({ q: 'search term' });
```

## Available Scripts

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## Multi-Dimensional Rating System

### The 7 Dimensions

1. **Pace** (1=Very Slow, 5=Very Fast)
2. **Emotional Impact** (1=Low, 5=Devastating)
3. **Complexity** (1=Simple, 5=Dense)
4. **Character Development** (1=Weak, 5=Exceptional)
5. **Plot Quality** (1=Poor, 5=Excellent)
6. **Prose Style** (1=Weak, 5=Beautiful)
7. **Originality** (1=Derivative, 5=Groundbreaking)

### Why Multi-Dimensional?

5-star ratings are reductive and can't express complexity like:
- "Great prose but weak plot" → High prose (5), Low plot (2)
- "Fast-paced thriller" → High pace (5), Moderate complexity (3)
- "Slow-burn literary fiction" → Low pace (2), High prose (5)

Multi-dimensional ratings enable:
- **Nuanced expression** of reading experiences
- **Better recommendations** (find books with similar "fingerprints")
- **Smart discovery** ("Books like X but faster-paced")

## Deployment

### Docker

```bash
# Build
docker build -t the-shelf-frontend .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://api.example.com \
  the-shelf-frontend
```

## Design System

### Colors

```css
/* Shelf brown palette */
shelf-50   #fdf8f6  /* Very light */
shelf-600  #a18072  /* Primary */
shelf-800  #846358  /* Dark */
```

### Typography

- **Headings:** Crimson Text (serif)
- **Body:** Inter (sans-serif)

### Components

All components use Tailwind CSS utility classes with consistent spacing (4px base unit).

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Server-side rendering for SEO
- Automatic code splitting
- Image optimization (Next.js Image)
- Lazy loading for charts

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support
- Focus management
- Semantic HTML

## Contributing

See [ARCHITECTURE.md](../ARCHITECTURE.md) and [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md) for technical details.

## License

MIT

---

**Built with ❤️ for readers who deserve better than Goodreads.**
