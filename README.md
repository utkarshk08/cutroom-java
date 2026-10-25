# Cutroom — React + Spring Boot edition

A smaller, beginner-readable implementation of a poster-wall design studio.
Arrange photos and text on a measured wall, cut a sheet into pieces, and pack
the placed pieces onto printable pages.

**This is a separate learning repository, not the source running on the existing
Cloudflare Cutroom website.** That website still uses the original TypeScript
codebase. This edition has intentionally fewer features and simpler algorithms.
This is a fresh repository. The original project's Git history, secrets,
production database, and deployment configuration have not been copied.

## Stack

- Frontend: HTML, plain CSS, JavaScript, React, React Router, Axios, Vite.
- Backend: Java 21, Spring Boot 3.5, Spring MVC, Spring Security, JPA/Hibernate.
- Authentication: signed JWTs and BCrypt password hashing.
- Validation: Jakarta Bean Validation (`@Valid`) and a global exception handler.
- Database: **MySQL only**. No PostgreSQL or in-memory database.

These are the same core technologies used by the local SkillSphere reference.
No new paid service is needed. No Lombok, Redux, TypeScript, Tailwind, Docker,
Redis, OAuth login, Cloudflare Worker, or separate image-storage service is added.
Spring Boot stays on SkillSphere's 3.5 line with a newer patch.

## Start with these files

```text
cutroom-java/
├── frontend/
│   └── src/
│       ├── App.jsx           # URLs and the main navigation
│       ├── api.js            # Axios calls to the Java backend
│       ├── pages/            # Login, project list, studio page
│       ├── components/       # Wall, inspector, crop and print panels
│       └── utils/            # Data, layout, canvas drawing, page packing
├── backend/
│   └── src/main/java/com/cutroom/
│       ├── auth/             # Register/login controller, service, DTOs
│       ├── user/             # User entity and repository
│       ├── project/          # Saved-project entity, controller, service, repository
│       ├── security/         # JWT filter and Spring Security rules
│       └── error/            # Consistent JSON errors
└── docs/
    ├── architecture.md      # Frontend ↔ backend contract and database design
    ├── code-tour.md         # Each source file, reading order, practice exercises
    └── feature-map.md       # Implemented, simplified, and not yet ported
```

The backend folders are grouped by feature. A controller handles HTTP, a service
contains decisions, and a repository talks to MySQL. React is the view; there
are no JSP or Thymeleaf templates.

## Run the frontend first

Use Node.js 22.12+ and npm. In a terminal:

```sh
cd frontend
npm install
npm run dev
```

Open [localhost:5174](http://localhost:5174). Choose **Try the editor** to use the
browser-only preview without setting up MySQL. It does **not** create a fake
login or save to a database. Download a JSON backup before leaving that preview.

The original Cutroom app can remain on port 3000. This frontend uses port 5174.

## Run the Java + MySQL part

Use Java 21, Maven, and MySQL 8 or newer. The existing backend dependencies
already include the MySQL driver.

1. Start MySQL. This app uses its own `cutroom_learning` database and a dedicated
   local MySQL user. For a fresh setup, follow `backend/database/setup.sql`.
   The application should connect as that user, never as MySQL `root`.
2. From `backend/`, copy the tracked example to your private local configuration:

   ```sh
   cp -n config/application-local.properties.example config/application-local.properties
   ```

   If the local file already exists, this command keeps it. Open it locally and
   fill in your database user's password and a new random Base64 JWT secret.
   Generate the secret with `openssl rand -base64 32`. The real
   `config/application-local.properties` is Git-ignored and stays outside the
   packaged application: keep its values private and
   never paste them into Git or chat. This secret is **not** an OpenAI key; no
   AI key is needed for this edition.
3. From `backend/`, activate the local profile and start Spring Boot:

   ```sh
   mvn spring-boot:run -Dspring-boot.run.profiles=local
   ```

   In an IDE, run `CutroomApplication` with the `local` Spring profile active
   and the working directory set to `backend/`.
4. The Java API runs on `127.0.0.1:8081`. Keep the frontend running on
   [localhost:5174](http://localhost:5174); its API URL defaults to
   `http://localhost:8081/api`. Register an account, create a project, and click
   **Save project** when you want to store changes in MySQL.

### Environment-variable alternative

You can also run without the `local` profile. Set these variables in your IDE
run configuration or terminal:

```text
DB_USER=cutroom_learning
DB_PASSWORD=<your new database user's password>
JWT_SECRET=<a new random Base64 secret>
```

Then run `mvn spring-boot:run` from `backend/`, or run `CutroomApplication` in your
IDE. Optional settings are `DB_HOST`, `DB_PORT`, and `DB_NAME`; keep this app on
its own `cutroom_learning` database. Spring Boot does not read `.env`
automatically. Keep the password and JWT secret out of Git and chat in this
setup too.

See [the backend README](backend/README.md) for the endpoint list and
`docs/manual-checks.md` for live database and browser checks.

## Main workflow

1. Upload photos or open **Cut a poster sheet**. Choose the sheet's physical
   paper size, then a grid or manual crops. Review the thumbnails before cutting.
2. Drag a library piece to a wall location, or double-click it to place it.
3. Select pieces to resize, rotate, add borders, lock, group, or change layers.
4. Add text and choose from 20 simple styles. Text backgrounds start transparent.
5. Use a composition to arrange only the placed, unlocked items, retaining sizes.
6. Open Print Pack. Review pieces that do not fit before downloading pages.
7. Save the account project to MySQL or download this edition's JSON backup.

Use [the feature map](docs/feature-map.md) before assuming an original-app feature
is available in this edition. In particular, **real AI is not connected**.

## Small checks, not a production release process

```sh
cd frontend
npm test
npm run build
```

In a separate terminal, from `backend/`:

```sh
mvn test
```

The Java tests use mocked repositories, not H2 or a live MySQL server. They
exercise JWTs, password checks, input validation, and project ownership. The
JavaScript tests check identity/layout and basic print packing. See
`docs/manual-checks.md` for browser checks and unverified areas.

## Important limits

- Up to 80 pieces. Uploads are limited to 2 MB each; saved/imported design JSON
  is limited to 8,000,000 characters. Data URLs make the design larger than the
  original image files. Use small images for learning.
- Manual save only; one editing tab at a time. No collaboration or conflict
  recovery. Download backups and save before using navigation links.
- Undo/Redo is local to the Arrange panel; switching modes or restoring a backup
  resets that history. Individual Print Pack size/rotation overrides are also
  temporary; paper/global settings are saved. The UI calls out these limits.
- JSON backups belong to this edition. Original TypeScript-app backups are not
  automatically compatible.
- PDF means the browser's **Print → Save as PDF**, not a Java PDF service.
- Do not deploy this learning app as-is. Missing production protections and
  advanced features are listed in the backend README and feature map.

## How to discuss it accurately

Describe this repo as a **React + Spring Boot implementation of a poster-design
application**. Do not describe the existing Cloudflare build as a Spring Boot
deployment; it isn't one. Trace the code, modify it yourself, and explain the
trade-offs you understand. The code tour provides exercises, not an invented
story about work or decisions you have not made.

Reference material: [Spring Boot 3.5 requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html),
[Spring Security password storage](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html).
