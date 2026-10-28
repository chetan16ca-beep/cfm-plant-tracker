# Eagle Plant ERP — NEW V3

New work orders start at **CFM-685**. This application is distinct from the old CFM Plant Tracker; nothing in the OLD ERP was replaced by this release.

## Existing features retained

Dashboard, work order entry and search, automatic cloud-verified numbering, product codes, cutting meter deduction, physical SRL stock, stage change, and backup download.

## New operations (Cloud V3)

Production Stage Entries (cutting/stitching/thread cut/gun finish/packing), Measurement Sheets, material Allocation Notes, Daily Department Reports, Dispatch and Label Issue history, PO multi-line to separate work orders, manual Work Order editing and reversible archiving, stock meter adjustments with reason log, order-wise reports and A4 print center.

**Stock safeguard:** Saving a Cutting entry deducts physical meter once. The manual Material Issue register is for allocation notes only and does not make a second deduction. Stock corrections cannot set total physical meter below used meter. Work Orders are never auto-deleted. Every NEW cloud write is version-checked and read back for verification.

**PO safeguard:** File preview is local-only; automatic OCR is not enabled on the new PO screen. Verify manually before saving multiple separate work orders.

**Old ERP:** `../index.html` continues to open historical work orders and existing stock. The two systems use separate cloud data. Do not import old ERP backup into new ERP.

**Access:** Uses the previously issued private link; no email/password screen. Never put the access token into this public repository or browser source code.

**Backup:** Download NEW ERP JSON in Backup tab. Bulk server restore is not enabled to avoid overwriting valid SRL stock or work orders.

## Verification / limitations

Cloud state carries pre-existing physical stock. JavaScript files compile syntactically and new backend operations were deployed additively. Full end-to-end browser/user acceptance testing requires opening the private link on a real device. Do not call it production-tested before that test.

## V4 — Old ERP Party & Historical Cutting Measurements

- New Work Order → Party: searchable autocomplete combines old CFM custom Parties, existing old Work Order party names, and new ERP party names.
- After choosing a party, the OLD Work Order dropdown shows prior work orders for that party. The operator selects the correct prior product/size; there is no silent assumption.
- Selecting an old Work Order pre-fills product description, product code, cloth quality, and roll width; old PO and order quantity are NEVER copied.
- Historical Cutting Register Length × Height measurements are presented as L × W in inches. When the copy-reference box is checked, server validates the old party/work match and saves dimensions on the new Work Order's Measurement Sheet as UNVERIFIED_REFERENCE.
- Measurements absent in the historical cutting register are NOT guessed. Always verify dimensions against the present job requirements before production.
- The old ERP state is fetched only via the private-access NEW ERP Edge Function and is strictly READ-ONLY. Old pending, cutting, and physical stock are never overwritten.
- Missing old reference connectivity does not block manual creation of new Work Orders.

## V5 — Compatibility audit and new modules

Compared against OLD CFM Plant ERP source: Daily Planning (planned Work Order selection with Cloud save), Physical SRL/Width Report, Open-Close-by-balance, Cloth Stock Summary, Monthly Analysis, Person-wise Given/Done/Pending, Bill/Challan Status Tracker, Search across NEW registers, and CSV export added as separate NEW cloud functions. Added Delivery Date/Remarks to NEW Work Order create/edit.

**Remaining parity gaps:** OLD ERP's 78-sheet original Excel mirror/Excel import, full attachment storage, person-wise edit/delete and photo register processing, print layout exact duplication, Wastage W entries, stock serial movement events with opening/closing dates, all historical records in the NEW database, full backup restore, old stage sirens, and full offline functionality are NOT ported. OLD ERP remains accessible separately. Do not assume every OLD feature is now available in NEW ERP.

**Accounting:** Bill/Challan tracker saves statuses and metadata, not legally valid GST invoices.

**Planning caution:** Pending Cut = New Order Qty - saved CUTTING department finished qty. Cutting piece entries may represent multiple pieces per bag and must not be treated as completed bags.

**Data safety:** NEW ERP uses separate Supabase payload, optimistic version checks, read-after-write verification, and no hard deletion. OLD ERP database is read only for previous Work Order references.

**Verification:** JS syntax and DOM IDs checked, merge only eagle-erp files, old/new stock state counts verified. Real browser workflow requires private-link testing; no live order or stock mutation is performed merely as a test.

## V6 — Enterprise UI Theme (design-only)

The NEW ERP now uses a navy/cobalt **professional light theme**, compact brand header, responsive left-side grouped navigation, descriptive inline navigation icons, mobile menu drawer with Escape/backdrop close, consistent KPI cards, clear form focus states and refined A4-oriented UI styling. No external font or icon dependency is needed. The old ERP remains unchanged.

The extra global KPI strip is visually hidden (its data calculation is unchanged). The Home dashboard shows New Orders, Next Work No, Physical SRL; Cutting KPI card is hidden to honor the request to remove that dashboard card (Cutting module remains accessible). Existing operational panels, data bindings, Work Order and SRL saving, reports, private-link access and backend are not altered by the theme.

Theme source: enterprise-theme-v6.css and enterprise-theme-v6.js. Verify visually on actual PC/mobile using the existing private access URL; static syntax/layout checks are not the same as full user acceptance testing.

## V7 — Unique CFM Control Tower & restored legacy functions

- Unique midnight blue + deep green/teal navigation, plant-control command hero, refined light forms, dashboard and responsive mobile drawer. Does not alter underlying UI behavior or old ERP.
- Historical Work Orders from OLD Cloud: read-only party/product/cloth/cutting measurement search and template into NEW Work Order. This is NOT the full 78-sheet Excel archive.
- Wastage (`W`) register: separately marked W entries, material-meter deduction with duplicate checks on server, no finished bag quantity increment.
- NEW private Photo/PDF Storage: uploaded PO, Cutting register scan, Measurement files stored in separate Supabase Storage bucket, accessed via private edge function and short-lived signed URLs. No auto-OCR claimed.
- Person Work Update and reversible Archive: authenticated cloud actions retain historical entry changes in personWorkAudit.
- Cloud Automatic Recovery: DB trigger snapshots the previous NEW payload on every update. Recovery Center lists recent versions. Explicit snapshot restore double-confirmed and server validated; the before-update trigger also backs up current state when restoring.
- Existing NEW Cloud work orders/physical stock remain intact, OLD ERP code and database untouched. All backed by private server-side token checking; no keys in public GitHub source.

**Parity limitations still present:** exact OLD 78-sheet Excel mirror/import, automatic handwriting-to-cutting and PO-to-work-order OCR, full old-style stage/wastage and product master edge cases, siren notification workflows, offline sync, all historical attachments and exact print templates are not yet fully replicated. Do not mark NEW ERP as identical to OLD ERP until these workflows are built and real-device acceptance-tested.

**Critical:** A read-only historical lookup and NEW recovered state are different datasets. New Work Order values must be verified before production; snapshot restore intentionally replaces NEW state and must not be used casually.

### V7 Live Sync & URGENT notifications

- When the NEW app is visible and the user is not working inside an input, it checks its own NEW Cloud at a guarded 90-second interval; active Cloud saves are skipped.
- Selecting Work Order or SRL is preserved when lists re-render after a refresh.
- The user can opt in by pressing **Enable URGENT Alerts** on Dashboard. Only newly observed orders with priority URGENT can play a brief audio signal; no sound is played on first load, no siren for normal/high priority, and no automatic sound permission bypass.
- Browser notifications only when the browser permission was explicitly granted. No old database events trigger the alert.
- Background/closed-browser notifications and server push are NOT implemented; this is visible-app polling.
