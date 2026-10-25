# Checks and remaining setup

Checked locally on 25 October 2026. These are small learning-project checks,
not a claim of production readiness.

## Automated checks completed

- `npm test` in `frontend/`: 12 tests passed. Covers piece identities, backup
  validation, size-preserving layouts, grouping, and page packing.
- `npm run build` in `frontend/`: the production frontend bundle built.
- `mvn test` in `backend/`: 24 tests passed. Covers JWTs, authentication rules,
  design validation, and project ownership. Repositories are mocked; no database
  is substituted with H2 and no live MySQL connection is used.
- The JWT filter has seven focused regression cases: an old token does not
  block login/register, while private requests still require a valid token.
- Java 21 printed a Mockito dynamic-agent warning. It did not fail the tests.

## Browser smoke check completed

The check used a fresh, isolated browser profile at
`http://localhost:5174/playground` and synthetic images. It blocked API requests
and did not touch an existing project, production app, or personal photos.

Verified:

- Upload two images and place one while leaving the other in the library.
- Add text and select from 20 style presets.
- Apply a composition without changing the placed pieces' physical dimensions.
- Undo, select multiple pieces, group, lock, and unlock them.
- Remove pieces from the wall without deleting them from the library.
- Download a JSON backup.
- Pack grouped text and an image as one print item.
- Choose manual print rotations of -90 and 180 degrees.
- Download an actual PNG print page.
- Preview nine grid cuts, change their shape to hearts, and create the cutouts.
- Capture desktop and narrow mobile layouts. No browser runtime errors occurred
  during this smoke check. This is not a full mobile interaction test.

The optional script is `checks/editor.browser.js`. It uses Playwright CLI, which
is a testing tool, not an application dependency. If installed, start the
frontend, create `output/playwright/`, open a **new empty test profile** at
`http://localhost:5174/playground`, then run the script with the CLI's
`run-code --filename checks/editor.browser.js` command. Run from the repository
root. Do not run this script on a project you want to keep.

## Live MySQL check completed

The Java backend ran with the `local` profile on port 8081, connected to a
separate `cutroom_learning` database using its own restricted database account.
The external `backend/config/application-local.properties` file stays private
and Git-ignored. No existing project's database or password was changed.

`checks/mysql.browser.js` checked the real React-to-Java-to-MySQL path in an
isolated browser session with synthetic images and temporary test accounts:

- Register an account and create a project.
- Save an image and text, refresh the browser, and reopen the saved project.
- Sign in with valid credentials despite an invalid old browser token.
- Reject anonymous access and another account's attempt to read the project.
- Delete the temporary project and confirm it is no longer readable.

The final run passed without browser runtime errors. Temporary test accounts
and projects were removed afterwards. Unit tests still use mocks; this was a
separate local integration smoke check, not a full production test suite.

## Your next manual checkpoint

1. Open the preview, upload a few small images, and check whether the simplified
   editor and code structure suit you. Download a backup before leaving.
2. Restore that backup in a fresh preview and compare the wall and piece sizes.
3. On a fresh checkout, follow the README to create a separate MySQL database and
   local profile. Keep passwords and JWT secrets out of Git and chat.
4. Start the Java backend. Register, log in, create a project, save it, refresh,
   and reopen it with your own small sample images.
5. Test JPG export and the browser's Print / Save as PDF flow. Those were not
   exercised by the automated browser smoke check.

## Not covered

- MySQL setup on other machines, versioned migrations, or automated DB backups.
- Full mobile/touch behavior, all browsers, accessibility, and large-image stress.
- Exact text rendering across operating systems and physical printer accuracy.
- Real AI, cloud sharing, deployment, and production security review.

See `feature-map.md` for features intentionally simplified or not ported. The
original TypeScript Cutroom app remains the separate deployment version.
