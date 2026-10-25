# The small version of Cutroom

This is a separate educational React/Java implementation of the Cutroom idea.
It is not the source code running on the existing Cloudflare website. The real
TypeScript app is left unchanged. No old secrets or Git history are copied.

## Request flow

React page → Axios API helper → Spring controller → service → JPA repository → MySQL

The frontend draws and edits the wall. Java handles users, authentication, and
saved projects. There is no need to send a request every time a photo moves.
The user clicks Save to store the current design.

## Two database tables

- `app_users`: id, name, email, BCrypt password hash.
- `projects`: id, owner, name, design JSON, last updated time.

The design is saved as one JSON string in a LONGTEXT column. This is an explicit
simplification: it keeps CRUD easy, but individual photos cannot be searched
efficiently with SQL. A larger app could use separate photo and group tables.

## API contract

Auth requests:

- `POST /api/auth/register`: `{name, email, password}`
- `POST /api/auth/login`: `{email, password}`
- Both respond with `{token, name, email}`.

Project requests require `Authorization: Bearer <token>`:

- `GET /api/projects`: summaries `[{id, name, updatedAt}]`
- `GET /api/projects/{id}`: `{id, name, designJson, updatedAt}`
- `POST /api/projects`: `{name, designJson}` → full project
- `PUT /api/projects/{id}`: same body → full project
- `DELETE /api/projects/{id}`: no response body

Each project query includes the signed-in owner. A project ID is not permission
to read or overwrite another user's design. Errors return `{message, errors}`;
`errors` is a field-name/message object for validation failures.

## Frontend design document (version 1)

```js
{
  version: 1,
  wall: { width: 160, height: 100, color: '#f8f5ef', image: '', opacity: 1 },
  pieces: [{
    id: 'browser-generated-uuid', name: 'Photo 1', type: 'photo', src: 'data:image/png;...',
    x: 5, y: 5, width: 15, height: 20, rotation: 0, placed: true,
    locked: false, ratioLocked: true, groupId: null,
    borderColor: '#ffffff', borderWidth: 0, borderSides: 'all',
    text: '', fontSize: 32, fontFamily: 'sans-serif', color: '#252238',
    bold: false, italic: false, underline: false, textStyle: 'plain', background: 'transparent'
  }],
  print: { paper: 'A4', customWidth: 21, customHeight: 29.7, margin: 0.5, gap: 0.2, scale: 100, smartRotate: true }
}
```

Positions and photo dimensions are centimeters. Text font size and border width
use CSS pixels for this learning version. Array order is layer order. Items with
the same nonempty groupId form a print group. The print pack uses the bounding
rectangle of that group, preserving overlapping members. Rotation is in degrees.

## Deliberately not added

No Redux, TypeScript, Tailwind, Next.js, Cloudflare configuration, Google OAuth,
PostgreSQL, H2, Docker, Redis, microservices, or new paid services. Normal React
state, browser Canvas, Spring MVC, and MySQL are sufficient for this version.
Real AI, production-grade packing, precise typography, and collaboration belong
to the original app or later work, not an invented claim about this repository.
