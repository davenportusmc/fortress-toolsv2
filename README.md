# Fortress Fitness Calculators

Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn-style UI

Mobile-first, dark theme, with two tools:
- Percent Calculator
- Weight Calculator

## Prerequisites
- Node.js LTS installed: https://nodejs.org/

## Install & Run (Local)
```bash
# from this folder
npm install
npm run dev
# open http://localhost:3000
```
If you previously ran `npm install` before I added new dependencies, run it again.

## Commands
- `npm run dev` – start dev server (http://localhost:3000)
- `npm run build` – production build
- `npm start` – run production server after build

## Project Structure
- `src/app/` – App Router pages
  - `page.tsx` – landing page
  - `percent-calculator/page.tsx`
  - `weight-calculator/page.tsx`
- `src/components/ui/` – UI primitives (`button`, `select`)
- `src/lib/utils.ts` – utility functions (percentages, weight calc, undo stack)
- `src/app/globals.css` – Tailwind + theme styles

## Notes
- Mobile-first design with bold blue accents and dark background
- Plate row scrolls horizontally on small screens
- Undo history keeps up to 10 actions (adds/removes/bar changes)
- Percent rounding respects selected smallest plate size

## Deploy to Vercel
1. Create a Vercel account if you don’t have one: https://vercel.com
2. Push this project to GitHub.
3. Import the repo in Vercel and deploy with defaults.

## Troubleshooting
- If you see 404 on `/percent-calculator` or `/weight-calculator`, ensure the dev server picked up new files. Try stopping and re-running `npm run dev`.
- If you see module errors (e.g., `lucide-react`, `@radix-ui/...`), run `npm install` again.
- Check the browser console (F12) and the terminal for exact error messages and share them if you need help.
