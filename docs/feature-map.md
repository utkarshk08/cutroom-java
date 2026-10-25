# Feature map: original idea → small implementation

"Implemented" means code is present in this edition; it does not mean every
device or printer has been tested. A local MySQL save/reload flow has passed;
see `manual-checks.md` for the exact verification scope.

| Feature | This edition |
| --- | --- |
| Light playful UI | React + plain CSS; a smaller interface, not a pixel-identical copy. |
| Upload individual photos | PNG/JPEG/WebP, chosen print size, original proportions option, max 2 MB each. |
| Original physical cutout size | Derived from the sheet's chosen paper size and crop fraction. A loose image's pixels do not reveal real centimeters. |
| Sheet paper sizes | A2/A3/A4/A5/A6/custom, orientation swap. A6 is not exactly 4×6 inches. |
| Grid cutting | Shared rounded pixel boundaries; no automatic discarded grid gutters. |
| Manual cutting | Draw a rectangle or enter pixel coordinates; edit/add preview regions. |
| Shaped cutouts | Rectangle, ellipse, heart with transparent outside pixels. |
| AI cutouts | **Not connected.** UI states this; no provider calls or pretend result. |
| Polygon/freehand cutouts | **Not ported.** |
| Cutout approval | Thumbnails before Create; manual cuts can be returned to editing. |
| Library | Three columns, portrait thumbnails, scrolling, placed state. |
| Wall placement | Drag/drop at pointer location, or double-click to place centrally. |
| Move/resize/rotate | Pointer drag, four corners, numeric size/position, -180°…180°, 90° shortcut. |
| Side-only resize handles | **Not ported.** Use numeric width/height with ratio unlocked. |
| Units | Wall size in cm/inches. Photo/print dimensions remain cm in this edition. |
| Wall photo | Upload, replace, remove and 0–100% opacity; flat preview, no perspective mapping. |
| Text | 20 built-in font/color/style presets, text/color/size/bold/italic/underline/background. System fonts only. |
| Text background | Transparent default and Remove text background button. No image background-removal service. |
| Tight glyph measurement | **Not ported.** No padding, but text box height is manually edited. |
| Photo borders | Zero by default; width/color/all/single side/top-bottom; works on multiselect. |
| Selection | Shift/Ctrl/Command-click and select all placed pieces. No marquee selection. |
| Bulk edits | Resize with confirmation, rotation, border, lock/unlock, removal/deletion. |
| Remove from wall | Sets placed=false; keeps the item in the library. |
| Delete from project | Confirmation; removes from both library and wall; Arrange Undo can restore. |
| Labels | One global piece-names checkbox while editing; not printed. |
| Layers | Bring to front / send to back. No Canva-style overlapping-layers sidebar. |
| Print groups | Text/photos grouped, moved together and flattened into one print item. |
| Composition | Grid/ladder/diamond-inspired/wave-inspired templates. Only placed unlocked units; size preserved; impossible placement reports failure. |
| AI layout | **Not connected.** A labeled keyword template helper recognizes four layout names only. |
| Guides and overlap warnings | **Not ported.** User overlap is allowed; simple template checks use conservative bounding boxes. |
| Wall zoom/magnifier | **Not ported.** Responsive fit, browser zoom/scroll as needed. |
| Undo/Redo | Last 20 Arrange actions; resets on panel unmount/backup restore. Print settings/history are not included. |
| Print packing | Larger-first shelf algorithm, original sizes, blank space allowed, optional smart 90°. Not an optimizer. |
| Print manual rotation | 0°, 90°, -90°, 180° in temporary per-item overrides. |
| Print resizing | Global percentage (saved), individual proportional width and fit recommendation (temporary). |
| Page margin/cut gap | Can be zero; margin below .3 cm warns and confirms before export. |
| Oversized pieces | Listed by name with dimensions and suggested fit; never silently shrunk. |
| Export | Wall PNG; each print page PNG/JPG; browser Print → Save as PDF. Print at actual size/100%. |
| Professional crop marks | **Not ported.** Page previews have a margin guide, not exported cutting marks. |
| Project backups | This edition's validated JSON, embedded images, explicit import confirmation. Not original-app compatible. |
| Accounts/projects | JWT, BCrypt, @Valid, global errors, owner-scoped MySQL CRUD. Local register/save/reopen/delete flow verified. |
| Unique IDs | crypto.randomUUID in browser, generated database IDs; duplicate imported piece IDs repaired. |
| Multi-tab/storage recovery | Simple manual save, last writer wins; no production cross-tab arbitration. |
| Real project share links | **Not ported.** Transfer an edition backup manually. |
| Cloudflare/deployment | **Not included.** Original app remains the deployment version. |

Do not turn planned features into fake implementations just to fill this table.
The useful learning goal is to trace and modify what is actually implemented.
