# Caseworker tasks: frontend

GOV.UK-styled frontend for the caseworker task API, built on the HMCTS frontend starter (Express 5, Nunjucks, GOV.UK Frontend).

The API lives in a separate repository: [task-api](https://github.com/task-challenge-2026/task-api). Design decisions for both are in [`task-api/docs/DECISIONS.md`](https://github.com/task-challenge-2026/task-api/blob/main/docs/DECISIONS.md).

## What it does

- List tasks, with sort (due date, status, date created), order and status filter
- Create a task with a title, optional description, status, and a due date and time
- View a task with its details, an overdue tag and its status history
- Change a task's status
- Delete a task after a confirmation page

## Running locally

Requires Node 22 and the API running on port 4000 (see the API README).

```bash
corepack enable
yarn install
yarn build
yarn start:dev
```

Open https://localhost:3100 and accept the self-signed certificate.

To point at an API elsewhere, set `API_URL`, for example `API_URL=http://localhost:4000`.

## Tests and checks

```bash
yarn lint          # stylelint, eslint, prettier
yarn test:unit     # date conversion and error message mapping
yarn test:routes   # every page via Supertest, with the API client mocked
```

Run `yarn build` before `yarn test:routes`, because the routes render the built templates. CI runs all of these on every push to `main`, along with CodeQL.

## How it works

- **Server-side API calls.** The Express server calls the API. The browser never does, so no CORS setup is needed and pages work without JavaScript.
- **UK time in, UTC out.** Due dates are entered and shown in UK time and stored in UTC. The conversion handles the days the clocks change.
- **GOV.UK patterns.** Error summary and inline errors, success notification banners, a confirmation page for deletion, and no disabled buttons or modals.
- **Post/Redirect/Get.** Refreshing after a form submission never resubmits it.

## Next steps

- CSRF protection on forms (the starter includes a `csrf.njk` macro to build on)
- Sign-in, with deletion restricted to an elevated role such as a team manager
- Record who changed a status and why, alongside the existing audit trail
- Pagination for large caseloads
- Security headers with helmet

## Use of AI

I used an AI assistant as a pair programmer: to explain options, review my code and suggest test cases. The design decisions are mine and are logged with reasons in the API repository's `docs/DECISIONS.md`. I wrote the code myself, and all of it is covered by the tests above.
