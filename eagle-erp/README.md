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
