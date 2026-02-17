# Pipeline Visual Regression Checklist

Use this checklist before merging pipeline UI changes:

- Long company names do not overflow card width.
- Long role titles clamp to two lines and keep card height stable.
- Columns preserve width targets:
  - >=1280px: 320px
  - 1024-1279px: 300px
  - <1024px: horizontal snap scroll
- Column headers remain sticky while cards scroll.
- 50+ cards distributed across stages keep stable spacing (12px gap) and no overlap.
- Dragging over each stage shows magnetic glow and does not shift neighboring columns.
- Dropping a card animates settle spring and rolls back status if API update fails.
- Clicking any card opens detail drawer with tabs: Overview, Notes, Timeline, AI Actions.
- Drawer closes with ESC and returns focus to the board.
- Mobile/tablet (768px/1024px) maintains horizontal board usability.
