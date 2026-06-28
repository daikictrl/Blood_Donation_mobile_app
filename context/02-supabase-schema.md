BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

1. CLAUDE.md
2. context/project-overview.md
3. context/architecture.md
4. context/ui-context.md
5. context/code-standards.md
6. context/ai-workflow-rules.md
7. context/progress-tracker.md

─────────────────────────────────────────────────────────────────

Unit 02 — Database Architecture & Supabase Setup
Objective

Design and implement the complete database foundation for the BloodLink mobile application using Supabase.

This unit establishes the application's entire data layer. Every future feature depends on the correctness, scalability, and security of this implementation.

This unit must only build the database architecture and shared data layer.

Do not implement any UI screens or business workflows in this unit.

Scope

This unit must include:

Complete PostgreSQL database schema
SQL migration files
Database constraints
Reusable PostgreSQL types
Database indexes
Row Level Security policies
Authentication trigger
Shared TypeScript models
Blood compatibility helper
Realtime configuration
Storage bucket creation
Engineering Principles

The implementation must follow these principles:

Normalize data whenever practical.
Avoid duplicated information across tables.
Design for long-term scalability rather than the quickest implementation.
Prefer reusable SQL functions and triggers over duplicated SQL logic.
Every foreign key should be indexed.
Every table requiring updated_at must automatically maintain it using a shared trigger.
Every user query must be protected by Row Level Security.
Never rely on the client to enforce security.
The mobile application must never require the Supabase Service Role Key.
All authorization must work using authenticated user sessions.
Database Requirements

The application supports two authenticated roles:

Donor
Hospital

Authentication is handled by Supabase Auth.

A profile record should automatically be created whenever a new authenticated user registers.

The user's role should be obtained from the metadata passed during signup.

Database Design Requirements

Design a normalized schema for the following entities.

Profiles

Stores information common to authenticated users.

Suggested fields:

id
role
created_at
Donors

Stores donor-specific information.

Should include:

full name
blood group
date of birth
gender
weight
phone number
address
geographic coordinates
avatar
health declaration
last donation date
eligibility status
timestamps

Do not duplicate email information already managed by Supabase Auth.

Hospitals

Stores hospital information.

Should include:

hospital name
hospital type
address
phone number
geographic coordinates
logo
verification status
timestamps

Do not duplicate email information already managed by Supabase Auth.

Blood Requests

Stores requests created by hospitals.

Should include:

hospital
required blood group
quantity
urgency
emergency flag
status
notes
expiration date
timestamps
Donor Applications

Stores donor applications for blood requests.

Requirements:

One donor may only apply once per request.
Application status:
Pending
Approved
Rejected
Appointments

Stores donation appointments.

Should include:

donor
hospital
application
appointment date
location
notes
appointment status
timestamps
Donation History

Stores completed donations.

Should include:

donor
hospital
appointment
blood group
donated units
donation date
notes
Blood Inventory

Maintain one inventory per hospital.

Each hospital should have one inventory record per blood group.

Prevent negative stock.

Notifications

Stores in-app notifications.

Should include:

recipient
title
body
notification type
read status
metadata
timestamps
Expo Push Tokens

Stores registered push notification tokens.

Each user may own multiple devices.

Prevent duplicate tokens.

PostgreSQL Design

Use PostgreSQL features appropriately.

Where appropriate, prefer:

ENUM types instead of repeated CHECK constraints.
Shared trigger functions.
Reusable SQL functions.
Foreign key constraints.
Composite unique constraints.
Proper indexes.

The database should be clean, maintainable, and easy to extend.

Eligibility System

Design the eligibility system so that business rules can evolve.

Avoid hardcoding eligibility calculations in ways that become difficult to change later.

The system should be capable of supporting future rules such as:

minimum age
minimum weight
waiting period
health declaration
manual hospital approval
future medical checks
Blood Compatibility Helper

Create:

lib/blood-compat.ts

The helper should provide:

compatibility lookup
compatibility validation
strongly typed functions

The implementation must be reusable throughout the project.

Shared Types

Complete:

types/index.ts

Define all shared types and interfaces required by future units.

Avoid duplicated type definitions.

Storage

Create Supabase Storage buckets for:

donor avatars
hospital logos

Apply appropriate security policies.

Realtime

Enable Realtime only for tables that genuinely require live updates.

Explain why each selected table requires Realtime.

Security

Implement Row Level Security for every table.

Policies should enforce:

Donors
manage only their own profile
create their own applications
read only their own appointments
read only their own donation history
read their own notifications
Hospitals
manage only their own profile
manage only their own blood requests
review applications belonging only to their requests
manage appointments for their requests
manage only their own inventory

The implementation must follow the principle of least privilege.

Deliverables

Produce:

Complete SQL migration files.
Reusable PostgreSQL helper functions.
Shared timestamp trigger.
Authentication trigger.
Storage bucket setup.
Row Level Security policies.
Required indexes.
lib/blood-compat.ts
types/index.ts
Constraints
Do not modify authentication UI.
Do not build application screens.
Do not implement Zustand stores.
Do not implement business workflows.
Do not write frontend logic.
Do not create API routes unrelated to database setup.
Acceptance Criteria

The implementation is complete only if:

All migrations execute successfully.
The database is fully normalized.
No duplicated user information exists.
All foreign keys are indexed.
Every protected table has RLS enabled.
Every updated_at field updates automatically.
Storage buckets are configured.
Realtime is configured appropriately.
TypeScript compiles without errors.
The schema is extensible without requiring major future refactoring.