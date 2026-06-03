# Mead Tagging Desktop (Electron)

This workspace packages the existing HTML/JS/CSS Mead Tagging pages as a Windows desktop app.

## Prerequisites

- Node.js LTS (includes `npm`)

## Install dependencies

```powershell
npm install
```

## Run in development

```powershell
npm run dev
```

## Build Windows installer (.exe)

```powershell
npm run build
```

Output installer will be in `dist/`.

## Build portable executable

```powershell
npm run build:portable
```

## Project structure

- `main.js` Electron main process
- `preload.js` Secure preload bridge
- `app/` Copied static website files
- `build/` Build resources (icons etc.)

## Notes

- The app launches `app/index.html`.
- Keep your content changes in `app/` for packaging.
