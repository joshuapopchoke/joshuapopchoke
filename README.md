# Fiduciary Duty

Fiduciary Duty is an Electron desktop training game for users who want to practice client suitability, market analysis, and exam-style financial planning questions in a three-column workstation interface. It is designed for learners working through entry-to-advanced securities and advisory concepts, especially SIE, Series 7, Series 65, and Series 66 style content.

## Project Structure

- `C:\Users\range\fiduciary-duty\electron` contains the Electron main and preload processes.
- `C:\Users\range\fiduciary-duty\renderer` contains the Vite React entrypoint and global styles.
- `C:\Users\range\fiduciary-duty\src\components` contains the UI components for the trading workstation.
- `C:\Users\range\fiduciary-duty\src\data` contains extracted and expanded question banks plus seeded client data.
- `C:\Users\range\fiduciary-duty\src\engine` contains the market, compliance, and question engines.
- `C:\Users\range\fiduciary-duty\src\store` contains the Zustand game store, which is the single source of truth for game state.
- `C:\Users\range\fiduciary-duty\src\types` contains shared TypeScript interfaces.
- `C:\Users\range\fiduciary-duty\public\legacy` contains the preserved legacy simulator used during migration.
- `C:\Users\range\fiduciary-duty\tools` contains local generation scripts used to extract legacy content into typed source files.

## Running Locally

1. Install dependencies with `npm install`.
2. Start the Vite + Electron dev workflow with `npm run dev`.
3. Run `npm run test` for TypeScript verification.
4. Run `npm run dist` to build desktop installers locally without publishing updates.
5. Run `npm run dist:publish` only when a real update feed and release process are ready.
