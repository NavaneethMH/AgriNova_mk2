# Project TODO

- [x] Review the supplied AgriNova product, technical, business, implementation, branding, design, and visual-reference artifacts.
- [x] Establish the AgriNova green-and-earth-tone dashboard design system with primary green `#2D6A4F`.
- [x] Create farmer-owned farm and field data models with create, edit, and delete workflows for name, crop type, area in hectares, soil type, and GPS coordinates.
- [x] Implement field overview cards that show crop health status, water-stress index, and last-irrigation timestamp.
- [x] Implement four exact water-stress tiers: optimal, mild, moderate, and severe, with color-coded indicators and field-level historical trends.
- [x] Implement irrigation event recording with date, duration, water volume, and per-field history.
- [x] Implement current weather and a seven-day forecast context relevant to irrigation planning.
- [x] Implement a server-side structured LLM irrigation recommendation with reasoning, suggested water volume, and optimal timing window.
- [x] Implement dashboard alerts for critical water-stress warnings and upcoming irrigation reminders.
- [x] Implement an idempotent daily scheduled summary that only notifies field owners about moderate and severe stress thresholds.
- [x] Add role-aware data ownership, validation, error states, and responsive accessibility safeguards.
- [x] Create unit tests for stress evaluation, ownership protection, structured recommendation validation, and scheduled moderate/severe alert filtering.
- [x] Run migrations, type checks, unit tests, and visual verification before delivery.
- [ ] Publish the current checkpoint, then activate the daily 05:00 UTC moderate/severe stress-summary schedule from the secured automation endpoint.
- [x] Generate and surface upcoming irrigation reminder alerts when a recommendation calls for action within 6–12 hours.
- [x] Add explicit accessible UI failure feedback for field, weather, recommendation, irrigation, and alert actions.
- [x] Create deduplicated irrigation reminder alerts from LLM recommendations that call for action within 6–12 hours, and cover the decision rule with a test.
- [x] Replace manual latitude and longitude inputs with an interactive map-based field location selector in the registration and edit workflow.
