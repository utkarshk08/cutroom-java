# Read the code in this order

Do not try to memorize every file at once. First follow one action from a button
to the database; then study the editor algorithms separately.

## 1. Start a React page

| File | Why it exists |
| --- | --- |
| `frontend/package.json` | Lists the libraries and commands. Runtime libraries are only React, React DOM, Router and Axios. |
| `frontend/index.html` | Has the root div where React mounts. |
| `frontend/vite.config.js` | Enables JSX with the React plugin. Vite is the development/build tool, not the backend. |
| `frontend/.env.example` | Documents the non-secret Java API address. Never put private keys in a VITE variable. |
| `frontend/public/favicon.svg` | The small browser-tab icon. |
| `frontend/src/main.jsx` | Mounts App inside BrowserRouter and imports the global CSS. |
| `frontend/src/App.jsx` | Routes to Home, Login, Register, Projects, Studio and preview; owns sign-in state. |
| `frontend/src/styles.css` | Shared controls, colors, layout, and small-screen rules. No CSS framework. |

## 2. Register and sign in

| File | What to explain |
| --- | --- |
| `frontend/src/pages/AuthPage.jsx` | One form supports login/register. Controlled inputs use useState; submit calls the API and displays errors. |
| `frontend/src/api.js` | Axios base URL, simple API functions, session storage, and Bearer-header interceptor. |
| `backend/pom.xml` | Maven dependencies. Spring starters gather related libraries. |
| `backend/src/main/resources/application.properties` | Port, MySQL connection, JPA options and required JWT-secret environment variable. |
| `backend/config/application-local.properties.example` | Copyable local settings template. The real sibling file is private, Git-ignored, and kept outside packaged JAR resources. |
| `backend/.../CutroomApplication.java` | `@SpringBootApplication` starts component scanning and the embedded web server. |
| `backend/.../auth/AuthController.java` | Maps POST endpoints and applies `@Valid` to request DTOs. |
| `backend/.../auth/RegisterRequest.java` | Name/email/password validation rules for registration. |
| `backend/.../auth/LoginRequest.java` | Email/password input contract for login. |
| `backend/.../auth/AuthResponse.java` | Token and safe account details; never the password hash. |
| `backend/.../auth/AuthService.java` | Normalize email, reject duplicates, BCrypt hash/check, create JWT. |
| `backend/.../user/User.java` | JPA entity mapping the app_users table, with explicit getters/setters. |
| `backend/.../user/UserRepository.java` | Spring Data JPA implements find-by-email and save without handwritten SQL. |
| `backend/.../security/SecurityConfig.java` | Public auth endpoints, protected project endpoints, stateless sessions, BCrypt and one local CORS origin. |
| `backend/.../security/JwtService.java` | Signs a one-hour JWT and verifies its signature/expiry. |
| `backend/.../security/JwtAuthenticationFilter.java` | Reads Authorization, validates the token, looks up the user, sets the security context. |

`backend/.../` above means `backend/src/main/java/com/cutroom/`.

BCrypt is **hashing**, not reversible encryption. JWT signing is not encryption
either: JWT claims are readable, so do not put passwords/secrets in claims. The
secret is needed to sign/verify, not to read the encoded payload.

Tokens are in sessionStorage for this small local example. That is easy to
follow, but not protection against XSS. Refresh tokens, revocation, login
throttling, email verification and password reset are not implemented.

## 3. Save one wall design

| File | What happens here |
| --- | --- |
| `frontend/src/pages/ProjectsPage.jsx` | Fetches project summaries; creates or deletes a project. |
| `frontend/src/pages/StudioPage.jsx` | Loads a project, owns the design state, switches panels, saves and imports/exports JSON. |
| `backend/.../project/ProjectController.java` | GET/POST/PUT/DELETE routes. Reads owner identity from authentication, not the browser body. |
| `backend/.../project/ProjectService.java` | Validates, finds an owned project, applies changes, saves or deletes. |
| `backend/.../project/ProjectRepository.java` | Database queries include owner ID so another account's project stays private. |
| `backend/.../project/Project.java` | Entity: ID, owner, name, designJson LONGTEXT, updatedAt. |
| `backend/.../project/ProjectRequest.java` | Validated name/designJson fields received from React. |
| `backend/.../project/ProjectResponse.java` | Full saved-project response for the editor. |
| `backend/.../project/ProjectSummary.java` | A small response for the list, without large image data. |
| `backend/.../project/DesignValidator.java` | Basic version, structure, count, IDs and dimensions validation. Not a complete style-schema engine. |
| `backend/.../error/ApiException.java` | A known application failure with an HTTP status. |
| `backend/.../error/ApiError.java` | Consistent message/field-errors JSON structure. |
| `backend/.../error/GlobalExceptionHandler.java` | `@RestControllerAdvice` turns validation, known, and unexpected errors into responses. |
| `backend/database/setup.sql` | Manual, separate MySQL database/user setup; not an automatic migration. |
| `backend/README.md` | Exact environment setup, API endpoints and backend limitations. |

The main request path is:

```text
Save project button
  → StudioPage.save()
  → api.updateProject()
  → JWT filter
  → ProjectController.update()
  → ProjectService.update()
  → ProjectRepository.save()
  → MySQL
```

`@Transactional` keeps the service's database work in a transaction. Constructor
injection means Spring supplies a class's dependencies; it also lets tests pass
mock repositories. A Java `record` is a compact immutable DTO, not a Lombok feature.

## 4. Understand the editor, one component at a time

| File | Responsibility |
| --- | --- |
| `components/Editor.jsx` | Photos/library, selection, actions, wall settings, simple history and composition controls. |
| `components/WallCanvas.jsx` | Places HTML elements with cm-to-percent conversion. Pointer events preview a drag; release commits it. Four-corner resize uses local rotated coordinates. |
| `components/Inspector.jsx` | Selected-piece dimensions, rotation, border, lock, layers, grouping and removal. |
| `components/TextPanel.jsx` | Text content and 20 style choices; bold/italic/underline, color and transparent background. |
| `components/CropPanel.jsx` | Reads a source image, proposes equal grid/manual regions, previews masks, creates PNG cutouts. |
| `components/PrintPack.jsx` | Paper settings, temporary per-item overrides, oversized warnings, page previews and exports. |
| `components/editor.css` | Library, wall elements, handles and responsive editor rules. |
| `components/print.css` | Crop previews and print-page layout. |
| `utils/design.js` | Default document, UUIDs, paper/text presets, template layouts and backup validation. |
| `utils/packing.js` | Turns groups into single bounds and packs items row-by-row without silently resizing. |
| `utils/canvas.js` | Loads images and draws photos/text/borders to Canvas in layer order; raster downloads. |

Paths in this table start at `frontend/src/`. The wall itself uses normal HTML
elements, not Canvas. Canvas is used for cutout creation and export. This is why
drag selection can be explained independently of image rendering.

Examples of the small algorithms:

- **Wall placement:** `leftPercent = xCm / wallWidthCm * 100`.
- **Grid cropping:** the end of crop 1 is the rounded start of crop 2, so a grid
  line does not delete a strip of the source image.
- **Lock:** exclude locked pieces from geometry changes; moving a group with a
  locked member is blocked.
- **Group:** a shared groupId identifies members; the print item is their outer
  rotated bounding rectangle, drawn in the original layer order.
- **Print packing:** sort large items first, fill a row, start another row, then
  another page. Try a 90° rotation if allowed. This is a heuristic, not optimal
  bin packing.
- **Undo:** store the previous design object before each committed editor action.
  Cap the list at 20 so it stays small. This is intentionally not full-app history.

## 5. Read the small tests

`frontend/src/utils/design.test.js` tests IDs, backup sanitization, groups, size
preservation and failed-layout immutability. `packing.test.js` tests paper bounds,
rotation, group bounds and oversized recommendations.

`backend/src/test/java/com/cutroom/` contains:

- `auth/AuthServiceTest.java`: password/registration/login behavior.
- `security/JwtServiceTest.java`: valid, expired and incorrectly signed tokens.
- `security/JwtAuthenticationFilterTest.java`: login works despite a stale token;
  private requests still validate tokens and authenticate the correct user ID.
- `project/ProjectServiceTest.java`: ownership isolation and CRUD decisions.
- `project/DesignValidatorTest.java`: malformed JSON, duplicate IDs and limits.

Tests are not a second application layer. You can read them last. Backend tests
use Mockito mocks—not an in-memory database or a production connection.

## Practice before an interview

1. Change one text preset and explain how the dropdown updates state.
2. Add a seventh paper size in one place, then find every UI that uses it.
3. Follow registration through BCrypt and explain why returning User directly
   from a controller would be a mistake.
4. Explain why `findByIdAndOwnerId` is safer than `findById` alone.
5. Move a photo, save, reload and inspect which values reached MySQL.
6. Draw the first two shelves of the packing algorithm on paper.
7. Explain one simplification honestly: JSON storage, manual saves, approximate
   text export, temporary print overrides, or local templates instead of AI.

Keep notes in your own words about what you changed and verified. This repo is
designed for learning and demonstration, not for claiming the production stack
or functionality it does not contain.
