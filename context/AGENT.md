# Blood Donation App — AI Builder Entry Point

Read the following context files **in order** before implementing anything or making any architectural decision.
Do not skip any file. Do not make assumptions if something is unclear — ask.

---

## Read Order

1. `context/project-overview.md` — what the app does, who uses it, core flows, features, and scope
2. `context/architecture.md` — full stack, system boundaries, database schema, storage model, auth model, and invariants
3. `context/ui-context.md` — color tokens, typography, spacing scale, component conventions, and layout patterns
4. `context/code-standards.md` — naming conventions, file structure, patterns, and rules every file must follow
5. `context/ai-workflow-rules.md` — how to work: scoping, verification, what to do when requirements are missing
6. `context/progress-tracker.md` — current phase, completed units, what is in progress, what comes next

---

## Operational Rules

- After each completed unit, update `context/progress-tracker.md`
- If implementation requires an architectural decision not covered in `context/architecture.md`, document it in the progress tracker and ask before proceeding
- Never modify Supabase migration files after they have been applied — create a new migration instead
- Never install a package that is not listed in the spec file for the current unit
- Never go beyond the scope of the current unit spec

---

## Spec Files Location

All feature spec files live in `context/specs/`.
The build plan is at `context/specs/00-build-plan.md`.
Each unit spec is at `context/specs/NN-unit-name.md`.

To start a unit:
```
Read context/specs/NN-unit-name.md.
Update context/progress-tracker.md to mark this unit as in progress.
Implement it exactly as specified.
Do not go beyond the scope of this unit.
```
