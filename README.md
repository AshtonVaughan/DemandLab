# DemandLab

DemandLab is a local-first product-demand intelligence application for evidence-backed product decisions. It starts empty and never inserts fictional market records.

## Working product flows

- Multi-project workspace with local persistence, duplication, deletion, and version restoration
- Product concept, audience, positioning, channel, price, cost, image, and historical-performance inputs
- CSV catalogue ingestion with quoted-field handling, aliases, validation, and previews
- Traceable demand and evidence scores with visible source labels
- Low, expected, and high planning ranges with assumptions, invalidators, margin, CAC, and break-even values
- Comparable-product search, sorting, similarity scoring, source links, and CSV export
- Scenario simulation across price, conversion, bundle size, subscription, audience, positioning, channel, and budget
- Validation experiment recommendations, experiment creation, status, outcome, and actual-result tracking
- Standalone HTML reports, copied summaries, report snapshots, and project history
- Administrative source monitoring for coverage, freshness, reliability, and field completeness
- Organization settings, public Stripe Payment Link configuration, privacy consent, complete workspace backup/restore, and data deletion
- Responsive desktop and mobile navigation

## Data boundary

The GitHub Pages application is static and local-first. Product data is stored in the current browser's local storage and is not sent to a DemandLab server. Use the workspace export before clearing browser data or moving devices.

Live marketplace, advertising, licensed-data, account-authentication, and Stripe webhook processing require separately provisioned server-side services and credentials. The interface does not pretend these services are connected when they are not.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

The test suite covers CSV parsing, score and forecast calculations, scenario arithmetic, source coverage, project creation, persistence, and all primary application views.

## GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml` runs the full test and production build gates before publishing `dist`. The Vite build uses relative asset paths so it works from a repository subpath.
