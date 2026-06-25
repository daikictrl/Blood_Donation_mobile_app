# Project Overview — Blood Donation App

## Overview

BloodLink is a mobile application that connects blood donors with hospitals and blood banks in Cameroon. Donors register, complete a health profile, and browse open blood requests from verified hospitals. They apply to donate for specific requests, track their application status, and receive appointment details when approved. Hospitals create blood requests (including emergency alerts), review incoming donor applications, schedule donation appointments, confirm completed donations, and manage their blood inventory. The system enforces eligibility rules automatically and matches donors to requests based on blood group compatibility and location proximity.

---

## Goals

1. Allow blood donors to find and respond to real blood needs from nearby hospitals
2. Allow hospitals and blood banks to publish blood requests and manage the donation pipeline
3. Automatically enforce donor eligibility rules (age, weight, donation interval, health declaration)
4. Match compatible donors to requests using blood group compatibility rules
5. Send real-time notifications for emergency requests, application updates, and appointment reminders
6. Give hospitals full visibility into their blood inventory at all times
7. Provide donors a clear history of all completed donations

---

## User Roles

### Donor
A person who registers to donate blood. Must complete a profile and pass eligibility checks before they can apply to requests.

### Hospital / Blood Bank
An institution that creates blood requests, manages incoming donor applications, schedules appointments, confirms donations, and tracks blood inventory.

---

## Core User Flows

### Donor Flow
1. Donor opens app and selects "Register as Donor"
2. Donor creates account with email and password
3. Donor completes health profile: full name, blood group, age, gender, weight, phone, address, last donation date, health declaration
4. System computes eligibility status based on profile data
5. Donor views the requests feed — filtered to compatible blood groups only
6. Donor taps a request to view full details (hospital, blood group, quantity, urgency, contact)
7. Donor applies to the request
8. Donor tracks application status (Pending → Approved / Rejected)
9. If approved, donor views appointment details (date, location, notes)
10. After donation is confirmed by hospital, event is added to donor's donation history
11. Last donation date on donor profile is updated; eligibility is recalculated

### Hospital Flow
1. Hospital opens app and selects "Register as Hospital"
2. Hospital creates account with email and password
3. Hospital completes profile: name, type (hospital / blood bank), phone, email, address, location
4. Hospital creates a blood request: blood group, quantity, urgency level, contact info, notes, optional emergency flag
5. Hospital views incoming donor applications for each request
6. Hospital reviews donor profile and eligibility before approving or rejecting
7. Hospital schedules an appointment for an approved donor (date, time, location, notes)
8. Donor attends appointment; hospital marks donation as completed
9. System records donation in donor history and updates hospital blood inventory
10. Hospital views and manages blood inventory per blood group

---

## Features

### Donor Features
- Register and log in (email/password)
- Reset password via email
- Complete and edit health profile
- Automatic eligibility status computation
- Browse blood requests filtered by compatible blood group
- Apply to a specific blood request
- Track application status (Pending, Approved, Rejected)
- View appointment details when application is approved
- View full donation history

### Hospital Features
- Register and log in (email/password)
- Complete and edit hospital profile
- Create blood requests with urgency levels (Normal, Urgent, Emergency)
- Mark a request as emergency (triggers alert notifications to all compatible eligible donors)
- View and manage all open requests
- Review donor applications (view donor profile + eligibility before deciding)
- Approve or reject donor applications
- Schedule donation appointments for approved donors
- Mark appointments as completed (confirms donation)
- Manage blood inventory (add units, update stock per blood group)
- View inventory report per blood group

### Eligibility Engine
- Minimum age: 21 years
- Minimum weight: 100 kg
- Minimum wait since last donation: 1 month (30 days)
- Health declaration: must be accepted
- Status: Eligible / Not Eligible (computed and displayed on donor profile)

### Notifications
- New blood request matching donor's compatible blood groups
- Emergency blood request alert (priority notification)
- Application status update (Approved or Rejected)
- Appointment reminder
- Donation confirmed

### Blood Matching System
- Match donors to requests using full blood group compatibility matrix
- Filter requests by donor's compatible groups on the donor feed
- Filter eligible donors only when hospital reviews applications
- Show nearby requests first (distance calculated from donor and hospital coordinates)

---

## In Scope

- Donor registration, profile, eligibility, requests feed, applications, appointments, donation history
- Hospital registration, profile, request creation, application review, appointment scheduling, donation confirmation
- Blood inventory management (per blood group, per hospital)
- Push notifications (all 5 notification types listed above)
- Blood group compatibility matching
- Location-based sorting (nearest requests shown first to donors)
- Password reset via email (Supabase Auth built-in)

---

## Out of Scope (V1)

- In-app messaging or chat between donor and hospital
- Admin dashboard or super-admin role
- Payment, rewards, or gamification
- Social features (sharing, following, leaderboards)
- Web version or dashboard
- Third-party lab result integration
- SMS notifications (push only for V1)
- Multi-language support
- Dark mode toggle (single theme for V1)

---

## Success Criteria

- A donor can register, complete a profile, and have their eligibility computed automatically
- A donor can browse requests filtered by compatible blood groups and apply to one
- A donor can see their application status change from Pending to Approved or Rejected
- An approved donor can see their appointment details
- A hospital can register, create a blood request, and mark it as emergency
- A hospital can review applications, approve one, schedule an appointment, and confirm a donation
- A confirmed donation appears in the donor's history and updates the hospital's inventory
- Push notifications fire correctly for all 5 notification types
- The system never shows an ineligible donor as eligible
- Blood group compatibility matching is correct for all 8 blood groups
