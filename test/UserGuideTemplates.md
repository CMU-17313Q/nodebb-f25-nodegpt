# User Guide: Template Feature

## Overview

This guide explains how to use and test the new **Template** feature for NodeBB, which enables admins to structure posts using predefined templates (e.g., Assignment Template) or start with a blank template. The feature includes a dynamic popup UI, role-aware CRUD endpoints, and automated tests.

---

## How to Use the Template Feature

### 1. Accessing the Template Selector

- Log in as an admin or staff user.
- Click **New Topic** in the forum composer.
- A popup modal will appear, listing available templates (e.g., Assignment Template, Blank Template).

### 2. Selecting and Using a Template

- **Choose a Template:**  
  - Select a template from the list.  
  - The "Blank Template" is always at the bottom and selected by default.
- **Assignment Template:**  
  - Selecting this injects a left-side panel with fields like course, assignment name, due date, etc.
  - Fill in all required fields; Submit is disabled until validation passes.
- **Blank Template:**  
  - No extra fields are shown; Submit is enabled immediately.

### 3. Submitting a Post

- After selecting a template and filling required fields, click **Submit**.
- The post will include the template data in its payload.

---

## User Testing Instructions

### Manual Testing

1. **Trigger the Composer:**
   - Click **New Topic** and verify the template selector popup appears.
2. **Template Selection:**
   - Select "Assignment Template" 
   - Try submitting with missing required fields; Submit should be disabled.
   - Fill all required fields; Submit should become enabled.
   - Select "Blank Template"; no fields should appear, and Submit should be enabled.
3. **Role Testing:**
   - Log in as a non-staff user; verify you can view post and not be able to use template feature 

### Troubleshooting

- If NodeBB is stuck or the plugin causes issues:
  - Disable plugin:  
    `redis-cli ZREM plugins:active nodebb-plugin-template-selector`
  - Re-enable plugin:  
    `redis-cli ZADD plugins:active <timestamp> nodebb-plugin-template-selector`

---

## Automated Tests

### Location

- **Client-side tests:**  
  `test/client.template-popup.spec.js`

### What Is Tested

- **Picker UI:**  
  - Modal opens and lists templates.
  - "Blank Template" is always last and selected by default.
- **Assignment Template:**  
  - All fields are injected.
  - Submit is gated until required fields are filled.
  - Payload includes selected template and field values.
- **Blank Template:**  
  - No extra fields injected.
  - Submit is enabled.
  - Payload includes blank selection.
- **Role-based Access:**  
  - Staff-only CRUD operations are enforced.
  - Public endpoints allow listing and reading templates.

### Why These Tests Are Sufficient

- They cover all user workflows: opening the picker, selecting templates, filling fields, and submitting.
- They verify both UI and payload correctness.
- They enforce role-based restrictions and error handling.

---

## Running Automated Tests

- Run all tests with:
  ```
  npm test
  ```
- Or run the template feature tests directly:
  ```
  npx mocha test/client.template-popup.spec.js
  ```

---

## Support

For issues or questions reach out to team one team members 