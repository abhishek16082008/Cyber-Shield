/* ==========================================================================
   Seed / sample data.
   --------------------------------------------------------------------------
   Used to populate the Dashboard on first run so the UI is never empty.
   Replace these with real `GET /api/scans` results once the backend is live.
   Each sample is produced by the same safe analyzer used for real uploads,
   so the shapes always match.
   ========================================================================== */

import { analyzeEml } from "@/lib/analyzer";
import type { Scan } from "@/lib/types";

/** Small synthetic .eml bodies used to generate realistic sample reports. */
const SAMPLE_PHISH = `From: "PayPal Security" <alerts@secure-paypal-verify.com>
Subject: Urgent: Your account will be suspended
Received: from unknown ([185.220.101.5])
Content-Type: text/html

<p>Urgent action required. Your account will be suspended within 24 hours.</p>
<p>Please verify now: <a href="http://185.220.101.5/login">https://paypal.com/verify</a></p>
<p>Confirm your identity and update your credentials to avoid suspension.</p>`;

const SAMPLE_INVOICE = `From: "Accounts" <billing@vendor-portal.co>
Subject: Invoice #4471 payment
Received: from mail.vendor-portal.co ([203.0.113.9]) spf=pass dkim=pass dmarc=pass

<p>Please find attached invoice. Wire transfer to the bank details below.</p>`;

const SAMPLE_NEWSLETTER = `From: "AurixCyber News" <news@aurixcyber.com>
Subject: Your monthly security digest
Received: from mail.aurixcyber.com ([198.51.100.20]) spf=pass dkim=pass dmarc=pass

<p>Here are this month's security tips. No action needed.</p>`;

/** Build a completed Scan record from a sample body. */
function seed(id: string, filename: string, body: string, daysAgo: number): Scan {
  const report = analyzeEml(filename, body);
  const created = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const from = body.match(/@([\w.-]+)/)?.[1] ?? "unknown";
  return {
    id,
    user_id: "mock-user",
    original_filename: filename,
    file_hash: "sha256:" + id.slice(0, 12),
    status: "completed",
    overall_score: report.overallScore,
    risk_category: report.riskCategory,
    sender_domain: from,
    created_at: created,
    completed_at: created,
    report,
  };
}

/** Initial seed history shown before the user runs their own scans. */
export const SEED_SCANS: Scan[] = [
  seed("seed-0001", "paypal-suspension-notice.eml", SAMPLE_PHISH, 1),
  seed("seed-0002", "invoice-4471.eml", SAMPLE_INVOICE, 4),
  seed("seed-0003", "monthly-digest.eml", SAMPLE_NEWSLETTER, 9),
];
