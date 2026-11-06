# SEY GAMERZ PROPERTY TYCOON — Financial Update

## Financial rules included
- Starting capital is spendable Cash Balance.
- Land purchase and construction/material purchases deduct from Cash Balance.
- Land income (every 1 minute) and rental income (every 30 seconds) are added to Profit, not Cash Balance.
- Profit is not spendable for purchases unless the player manually converts it.
- Manual Profit-to-Cash conversion applies a 30% penalty: 70% of the converted amount is added to Cash Balance and 30% is recorded in Loss. The full converted amount is deducted from Profit.
- When selling property, 100% of the original land + construction investment returns to Cash Balance. Only district appreciation profit is added to Profit.
- When the 40-minute set timer expires, all unsold properties are removed and their original total investment is added to Loss. Their income stops. Existing Profit remains in the Profit column.
- Leaderboard and host console show Cash Balance, Profit, Loss, and property count.

## Existing property economy retained
- District land prices, construction/material multipliers, blueprints, land income, rental rates, and district appreciation remain as before.
- Land income pays every 1 minute; completed property rental income pays every 30 seconds.
- Player reconnection restores their existing room progress.

## Deployment
1. Keep `server.js`, `package.json`, and `render.yaml` in the project root.
2. Keep `app.js`, `index.html`, and `style.css` in the `public/` folder.
3. Run `npm install`, then `npm start`.
4. Deploy to Render using the included `render.yaml`.

Virtual currency only. No live multiplayer deployment test was performed; server and client JavaScript syntax checks passed.
