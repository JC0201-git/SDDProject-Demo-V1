<!--
SYNC IMPACT REPORT
==================
Version Change: 1.1.0 → 1.1.1
Type: PATCH (Format corrections and version consistency fix)

Modified Principles: N/A
Added Sections: N/A
Removed Sections: N/A

Corrections Made:
  - Fixed version number inconsistency in footer (was 1.0.0, corrected to 1.1.0, then bumped to 1.1.1)
  - Removed extraneous "1" from Governance section heading
  - Updated Last Amended date to 2026-02-19

Templates Requiring Updates:
  ✅ plan-template.md - Aligned with constitution, no changes needed
  ✅ spec-template.md - Aligned with constitution (zh-TW language requirement understood)
  ✅ tasks-template.md - Aligned with constitution, no changes needed

Previous Amendment (v1.1.0, 2026-02-15):
  - Added Core Principles: V. Documentation Language Standards (Traditional Chinese requirement)

Follow-up TODOs: 
  - Continue ensuring all specifications are created in Traditional Chinese (zh-TW)
  - Validate existing user-facing documentation is in Traditional Chinese
-->

# Demo-v1 Frontend Constitution

## Core Principles

### I. Data Consumption

**Standards for frontend integration with external APIs:**

- MUST implement unified request interceptors for all HTTP communications
- MUST define standardized error-handling mechanisms with explicit UI response protocols for 4xx/5xx status codes
- MUST enforce API TypeScript Interfaces/Types as the Single Source of Truth (SSOT) for end-to-end type safety
- MUST NOT make API calls without corresponding TypeScript interface definitions
- MUST handle network errors gracefully with user-appropriate messaging

**Rationale**: Consistent API integration prevents type mismatches, reduces runtime errors, and ensures predictable error handling across the application. Unified interceptors enable centralized logging, authentication token management, and request/response transformation.

### II. State Management and Persistence

**Clear architectural boundaries for application state:**

- MUST distinguish between three state categories:
  - **Global State**: Application-wide data (user session, theme preferences, feature flags)
  - **Local State**: Component-specific data (form inputs, UI toggles, temporary selections)
  - **Server Cache**: Remote data synchronized with backend (user profiles, content listings, API responses)
- MUST implement unidirectional data flow (state changes flow in one direction through the component tree)
- MUST NOT perform direct, cross-component state mutations
- MUST use established state management solutions (e.g., Redux, Zustand, Jotai) for Global State
- MUST use server state libraries (e.g., React Query, SWR, RTK Query) for Server Cache
- MUST document state ownership and mutation patterns for each module

**Rationale**: Clear state boundaries prevent debugging nightmares, make data flow traceable, and enable predictable component behavior. Unidirectional flow ensures state changes are auditable and testable.

### III. Component Architecture

**Strict adherence to established design patterns:**

- MUST follow Atomic Design or Container-Presenter (Smart/Dumb) pattern consistently across the codebase
- MUST define explicit component boundaries:
  - **Presentational (UI) Components**: Stateless, receive data via props, emit events, no business logic, highly reusable
  - **Container (Page) Components**: Stateful, orchestrate data fetching/mutations, contain business logic, compose presentational components
- MUST prioritize encapsulation and reusability
- MUST NOT mix presentation and business logic within a single component
- MUST document component contracts (props interface, events emitted, dependencies)
- SHOULD aim for components with single responsibility
- SHOULD design components to be framework-agnostic where feasible

**Rationale**: Separation of concerns enables independent testing, simplifies refactoring, and allows designers to iterate on UI without touching business logic. Clear patterns reduce cognitive load during code reviews.

### IV. Defensive Development and UI Resilience

**Standardized UI behavior during degraded conditions:**

- MUST implement Skeleton screens for all loading states (no blank pages during data fetch)
- MUST provide unified Empty State handling with actionable user guidance
- MUST gracefully handle API latency with visual loading indicators
- MUST handle API failures with user-friendly error messages and recovery options (retry, contact support, fallback actions)
- MUST implement proper timeout handling for network requests
- MUST test all edge cases: slow network, offline mode, malformed responses, partial data
- SHOULD implement optimistic UI updates where appropriate
- SHOULD provide offline-first capabilities for critical user paths

**Rationale**: Professional user experience requires anticipating and handling failure modes. Users should never encounter blank screens, infinite spinners, or cryptic error messages. Defensive UI patterns maintain user trust even under adverse conditions.

### V. Documentation Language Standards

**Language requirements for project documentation:**

- ALL specifications (spec.md files) MUST be written in Traditional Chinese (zh-TW)
- ALL implementation plans (plan.md files) MUST be written in Traditional Chinese (zh-TW)
- ALL user-facing documentation MUST be written in Traditional Chinese (zh-TW)
- Code comments MAY be in English or Traditional Chinese at developer's discretion
- Technical APIs, interfaces, and code identifiers MUST remain in English
- Constitution, templates, and internal development tooling documentation remain in English

**Rationale**: Ensuring consistent Traditional Chinese documentation improves accessibility for the target user base and stakeholders. This requirement maintains clear communication with end users, product managers, and non-technical team members while preserving standard English conventions for code-level artifacts and developer tooling.

## Testing Standards

**Mandatory testing requirements:**

- MUST write unit tests for all utility functions and business logic
- MUST write integration tests for critical user journeys
- MUST achieve minimum 80% code coverage for business logic modules
- MUST validate TypeScript type safety in test suites (no `any` types in production code)
- SHOULD implement visual regression testing for UI components
- SHOULD use accessibility testing tools (axe, WAVE) in CI pipeline

## Development Workflow

**Code quality gates:**

- All code MUST pass TypeScript compilation with strict mode enabled
- All code MUST pass linting (ESLint) and formatting (Prettier) checks
- All PRs MUST include tests for new functionality
- All PRs MUST be reviewed by at least one other frontend engineer
- Architectural principle violations MUST be justified in PR description and approved by tech lead
- Breaking changes to shared components MUST be documented in migration guide

## Governance

This constitution supersedes all other frontend development practices. Any deviations from the principles outlined above MUST be justified during the architectural review phase and documented in the feature specification.

**Amendment Process**:
- Proposed changes MUST be discussed in architecture review meeting
- Amendments require approval from at least two senior frontend engineers
- Migration plan required for changes affecting existing code

**Compliance**:
- All PRs and code reviews MUST verify compliance with these principles
- Quarterly audits will assess adherence and identify technical debt
- Violations must be remediated within one sprint cycle unless explicitly waived

**Version**: 1.1.1 | **Ratified**: 2026-02-15 | **Last Amended**: 2026-02-19
