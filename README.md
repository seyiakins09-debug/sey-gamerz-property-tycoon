# SEY GAMERZ PROPERTY TYCOON — Economy Upgrade

## Changes included
- Property sale no longer returns only land value plus 70% of construction cost.
- Selling returns 100% of total investment (land + construction) plus district appreciation:
  - Rural: +5%
  - Suburban: +10%
  - Commercial: +20%
  - Luxury: +30%
- Construction/material prices vary by district:
  - Rural: ×1.00
  - Suburban: ×1.25
  - Commercial: ×1.75
  - Luxury: ×2.50
- Higher-tier districts have higher land income, construction costs, and rental rates.
- Land income pays every 1 minute.
- Completed-property rental income pays every 30 seconds.
- Dashboard labels show the revised cadence, construction multiplier, appreciation, and estimated resale value.

## Deployment
1. Extract the ZIP.
2. Keep `server.js`, `package.json`, and `render.yaml` in the project root.
3. Keep `app.js`, `index.html`, and `style.css` inside the `public/` folder.
4. Run `npm install`, then `npm start`.
5. Deploy the folder/repository to Render using the included `render.yaml`.

## Notes
- The game uses virtual currency.
- The server source and client JavaScript passed Node syntax checks.
- This is a code-level validation; a live multiplayer deployment was not performed here.
