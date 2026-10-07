# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Expo Router with React Native and TypeScript, selected in the approved product brief for one
adaptive iOS and Android application.

## Users

People who manage physical assets away from a desk and already use Baserow as their source of
record. They need to identify an item quickly, see the correct record, record a small field update,
and attach current visual evidence from a mobile device.

## Product Purpose

Enable a user to connect their Baserow database, scan a barcode or QR code, retrieve one exact
matching record, update configured fields, attach a photo, and persist the changes. v0 succeeds
when a user completes that loop reliably from an installed mobile app and sees the result in
Baserow.

## Positioning

A focused, open-source mobile field client that works directly with the user's Baserow instance.
It turns a scan into a safe, explicit record update without recreating the Baserow web application.

## Operating Context

Users work around equipment, workshops, stock rooms, and field locations. They may use Baserow
Cloud or a self-hosted server. The primary workflow is Connect -> Scan -> Find -> Edit -> Photo ->
Save.

## Capabilities and Constraints

- Connection requires a server URL, restricted database token, and table configuration.
- Tokens use platform-backed secure storage and never appear in logs, analytics, test fixtures, or
  screenshots.
- Barcode lookup is exact and exposes no-match, single-match, and duplicate-match outcomes.
- Users can edit only configured fields and optionally attach a captured photo.
- v0 has no backend proxy, accounts, offline synchronization, push notifications, GPS, analytics,
  workflow builder, or additional database providers.
- A live Baserow test table is required before release to verify lookup, update, and file upload.

## Evidence on Hand

The repository contains two approved written briefs describing the v0 workflow, architecture,
security boundary, and product scope. There are no approved logos, customer claims, benchmarks,
screenshots, or other marketing evidence; future work must not fabricate them.

## Product Principles

- Optimize the complete field workflow, not feature count.
- Prefer explicit data-quality errors over displaying or updating the wrong record.
- Keep Baserow HTTP and authentication details behind one service boundary.
- Use native, accessible platform behavior and the smallest dependable implementation.
- Protect user credentials even when that requires more work than the shortest code path.

## Accessibility & Inclusion

The app must support scalable system text, screen-reader labels, light and dark appearances,
minimum iOS and Android touch targets, safe areas, and each platform's system back behavior.
