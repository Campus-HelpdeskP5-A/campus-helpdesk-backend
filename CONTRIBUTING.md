# Contributing to Campus Helpdesk Backend

## 1. Create a Branch

Do not work directly on main.

Create a feature branch:

eature/<short-description>

Examples:

- eature/user-authentication
- eature/ticket-api
- ix/login-error

## 2. Make Changes

Keep changes focused and related to the task.

Do not commit:

- .env files
- passwords
- API keys
- access tokens
- private keys
- unnecessary generated files

## 3. Commit Messages

Use clear and descriptive commit messages.

Examples:

eat: add ticket creation endpoint

ix: handle invalid user login

docs: update API documentation

efactor: improve ticket service

## 4. Push Your Branch

Push your feature branch:

git push -u origin feature/<short-description>

## 5. Create a Pull Request

Open a Pull Request from your feature branch to main.

Every Pull Request must:

- Describe the changes
- Explain how the changes were tested
- Pass CI checks
- Contain no secrets
- Follow the project structure

## 6. Code Review

Wait for review before merging.

Address review comments before merging the Pull Request.

## 7. Main Branch

The main branch represents the stable project state.

Do not push directly to main unless explicitly required for repository administration.

## 8. Testing

Run the relevant tests before creating a Pull Request.

If tests are not available yet, explain what was manually verified in the Pull Request.

## 9. Docker

When Docker-related files are changed:

- Validate the Dockerfile
- Check .dockerignore
- Do not include secrets in the image
- Document required environment variables

## 10. Questions

If a change affects another service, API contract, database structure, security, or deployment configuration, coordinate with the responsible team before merging.
