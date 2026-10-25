# Java backend

This is a small learning implementation, not the backend of the live Cutroom site.

## Run locally

Requirements: Java 21, Maven, and MySQL 8 or newer. The existing MySQL driver is
the only database driver; no extra library is needed for this setup.

1. Start MySQL and use the separate `cutroom_learning` database with its own local
   database user. For a fresh machine, use `database/setup.sql` as a guide to
   create them. The application must use the dedicated account, never MySQL
   `root`, and must not connect to another application's database.
2. From this `backend/` folder, copy the tracked example:

   ```sh
   cp -n config/application-local.properties.example config/application-local.properties
   ```

   This keeps any existing local file. Open
   `config/application-local.properties` in your editor and enter
   your database user's password and a new JWT secret. Generate the secret
   locally with `openssl rand -base64 32`. The real local profile is Git-ignored
   and stays outside the packaged application. Its password and JWT secret are
   private and must never go into Git or chat.
   The tracked `.example` contains placeholders only.
3. Start the backend with the local profile:

   ```sh
   mvn spring-boot:run -Dspring-boot.run.profiles=local
   ```

   For an IDE launch, run `CutroomApplication` with the `local` Spring profile
   active and the working directory set to this `backend/` folder. Spring reads
   `config/application-local.properties` when that profile is active.

The API listens on `http://127.0.0.1:8081`. React uses port 5174; only
`http://localhost:5174` is allowed by CORS. The original app on port 3000 is separate.
After starting, Hibernate creates/updates tables in the specified database.
`mvn test` runs small unit tests without a database or real credentials.

### Environment-variable alternative

To configure everything through your IDE or terminal, leave the `local` profile
inactive and set:

```text
DB_USER=cutroom_learning
DB_PASSWORD=<your database user's password>
JWT_SECRET=<a new random Base64 secret>
```

Generate `JWT_SECRET` with `openssl rand -base64 32`. Keep both secrets private.
Optional variables are `DB_HOST`, `DB_PORT`, and `DB_NAME`; the database should
remain `cutroom_learning`. Spring does **not** automatically read a `.env` file.
Run `mvn spring-boot:run` from this folder after setting the variables, or run
`CutroomApplication` from your configured IDE.

## Reading order

1. `CutroomApplication`: starts Spring Boot.
2. `auth/AuthController`: HTTP endpoints for registration/login, with `@Valid`.
3. `auth/AuthService`: normalizes emails, hashes/checks passwords and issues tokens.
4. `user/User` and `UserRepository`: map users to MySQL and query them.
5. `security/SecurityConfig`: stateless access rules, BCrypt and CORS.
6. `security/JwtService` and `JwtAuthenticationFilter`: verify Bearer tokens.
7. `project/ProjectController` → `ProjectService` → `ProjectRepository`: CRUD flow.
8. `project/DesignValidator`: checks the saved design has a usable basic structure.
9. `error/GlobalExceptionHandler`: turns failures into consistent JSON responses.

Request/response records are DTOs. A Java `record` generates the constructor and
accessors for simple immutable values; entities use ordinary getters/setters.
The two entity classes are never returned directly from controllers.

## API

All errors have `{ "message": "...", "errors": {} }`.
Field validation fills `errors`, for example `{ "password": "size must be between 8 and 64" }`.

| Method | Path | Body / result |
| --- | --- | --- |
| POST | `/api/auth/register` | `{name,email,password}` → `{token,name,email}` |
| POST | `/api/auth/login` | `{email,password}` → same response |
| GET | `/api/projects` | list of `{id,name,updatedAt}` |
| GET | `/api/projects/{id}` | `{id,name,designJson,updatedAt}` |
| POST | `/api/projects` | `{name,designJson}` → saved project |
| PUT | `/api/projects/{id}` | same body → updated project |
| DELETE | `/api/projects/{id}` | 204, no body |

Project calls need `Authorization: Bearer <token>`. The token expires after one hour.
An unknown or other user's project returns the same 404 message.
Login and registration check the submitted credentials rather than an old Bearer
token, so an expired session cannot block signing in again.

## Deliberate simplifications

- Design JSON, including embedded images, goes into one MySQL LONGTEXT column.
  The limit is 8,000,000 Java characters and 80 pieces, not an unlimited media store.
  Base64 uses extra space; large projects should use image/object storage later.
- Basic structural validation is not a complete schema validator for every style.
- Manual Save only. No collaborative edits or optimistic locking: the last save wins.
- No refresh tokens, email verification, reset-password flow, login throttling or
  production monitoring. A JWT cannot be individually revoked in this version.
- `ddl-auto=update` is convenient locally, not a production migration strategy.
- Tests use mocked repositories. To check live MySQL integration, register an
  account, save a project, reload it, and delete it; see `../docs/manual-checks.md`.
- This backend saves designs; it does not pretend to provide real AI or image processing.

Keep this app local until those deployment concerns have been handled. No secrets,
existing deployment files, or old project Git history are needed here.
