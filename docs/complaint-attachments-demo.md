# Complaint Attachments

This note is for the demo attachment work on the complaint detail page.

## What the frontend does

The detail page reads attachments from the API response:

```ts
this.displayAttachments = this.complaint.attachments;
```

There is no hardcoded `C006` attachment fallback in the Angular component. If the backend returns attachments, the page shows them. If the backend returns an empty attachment array, the attachment section is hidden.

The UI lives in:

- `frontend/src/app/features/complaints/complaint-detail/complaint-detail.component.html`
- `frontend/src/app/features/complaints/complaint-detail/complaint-detail.component.scss`
- `frontend/src/app/features/complaints/complaint-detail/complaint-detail.component.ts`

The attachment tiles support these file types:

- `png`, `jpg`, `jpeg`: image icon
- `pdf`: PDF icon
- `m4a` and other audio MIME types: voice message icon and inline audio player
- anything else: generic file icon

Clicking a tile opens the file URL in a new browser tab. For audio files, the inline player can be used directly.

## Demo data

The demo attachments are seeded in `sql/schema.sql`, in the `complaint_attachments` insert block.

At the moment, only complaint `C006` has demo attachment rows:

- `C006-medical-photo.png`
- `C006-medical-request.pdf`

The PDF asset is in:

- `frontend/src/assets/demo-attachments/C006-medical-request.pdf`

The image row points to:

- `frontend/src/assets/Emblem_of_Sri_Lanka.png`

This is only to make the demo clickable without adding file upload/storage work.

## Reset behavior

If the database is dropped and recreated from `sql/schema.sql`, the `C006` attachment rows are recreated too.

From `backend/`:

```bash
npm run db:reset
```

After reset, opening `/complaints/C006` should show the seeded attachment tiles, assuming the backend is running against that database.

## Later mobile integration

Flutter/mobile upload work should write rows to `complaint_attachments` using the same fields the backend already maps:

- `complaint_id`
- `file_name`
- `file_type`
- `file_size`
- `storage_url`
- `uploaded_by_name`
- `uploaded_at`

As long as the backend returns those records in `complaint.attachments`, the Angular page should not need template changes.

When real storage is added, replace the demo `storage_url` values with the final file URLs and remove the demo asset if it is no longer needed.
