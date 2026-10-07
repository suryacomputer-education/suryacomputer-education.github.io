/**
 * SURYA CIMP — CENTRAL BACKEND CONFIGURATION
 * ------------------------------------------------
 * Keep the production Google Apps Script Web App URL
 * ONLY in this file.
 *
 * Other frontend files must use:
 *     window.SURYA_DATABASE_API
 *
 * Admin Login intentionally remains separate.
 */

window.SURYA_DATABASE_API =
  "https://script.google.com/macros/s/AKfycbzjwBRmF1gPz-J9285RXnwpLBZPcYoWzjjblIVtbgZLb8XneqlYl4YTS3WvCwOlbok/exec";

/* Google Sign-In (Web client). Public value, safe to keep in frontend.
 * Google Cloud Console -> Credentials -> "SURYA Backend Web" me
 * Authorized JavaScript origins me https://suryacomputer-education.github.io add hona zaroori hai. */
window.SURYA_GOOGLE_CLIENT_ID =
  "369025876174-3r7mtt1in65moho8macv2nq1ratsp3q3.apps.googleusercontent.com";
