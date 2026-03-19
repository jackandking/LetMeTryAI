# MCP Kuaishou Publish Guide

This guide describes how to use the `.automation/scripts/publish-kuaishou-task.js` script to automate the creation of distribution tasks on the Kuaishou Creator Platform.

## Overview

The **MCP Kuaishou Publish** script automates the process of creating a new distribution task by cloning an existing template task. It uses **Playwright** to interact with the Kuaishou web interface, handling authentication, navigating to the distribution plan list, and filling out the task creation form with your provided details.

**Key Features:**
*   **Direct Navigation:** Navigates directly to the creation page for the template task, skipping the list view.
*   **Session Persistence:** Saves your login session to `.automation/.local/auth/kuaishou_auth.json` to avoid repeated manual logins.
*   **Form Filling:** Automatically fills in the Task Name, Description, Target URL parameter.
*   **AI Cover:** Triggers the "AI Generate" button for the cover image.
*   **Manual Review:** Pauses before submission to allow you to review details and click "Submit" manually.

## Prerequisites

*   **Node.js**: Ensure Node.js is installed on your system.
*   **Kuaishou Account**: You must have a valid account on [Kuaishou Creator Platform](https://daren.kuaishou.com/).

## Installation

1.  **Install Dependencies:**
    Run the following command in the project root to install the required packages (Playwright):

    ```bash
    npm install
    # OR if playwright is not in package.json yet
    npm install playwright
    ```

2.  **Install Playwright Browsers:**
    If this is your first time using Playwright, you may need to install the browser binaries:

    ```bash
    npx playwright install chromium
    ```

## Usage

Run the script from the command line with the following arguments:

```bash
node .automation/scripts/publish-kuaishou-task.js <AppID> <AppName> <Description>
```

### Arguments

| Argument      | Description                                      | Example                  |
| :------------ | :----------------------------------------------- | :----------------------- |
| `<AppID>`     | The unique identifier for your app/task.         | `rockets-king`           |
| `<AppName>`   | The display name for the task.                   | `"Rocket Battle"`        |
| `<Description>`| A short description of the task.                 | `"Vote for the best!"`   |

### Example

```bash
node scripts/publish-kuaishou-task.js rockets-king "Rocket Battle" "Vote for the best rocket!"
```

## First Run & Authentication

1.  **Manual Login:**
    *   On the first run, the script will open a browser window and navigate to the Kuaishou login page.
    *   You will have time to manually log in (e.g., via QR code scan).
    *   Once logged in, the script will save your session cookies to `kuaishou_auth.json`.

2.  **Subsequent Runs:**
    *   The script will detect `kuaishou_auth.json` and automatically log you in using the saved session.

## Configuration

The script currently has some hardcoded configuration values at the top of the file `.automation/scripts/publish-kuaishou-task.js`. You may need to modify these if the platform updates or your requirements change:

*   **`BASE_URL`**: The direct URL to recreate the task (derived from `SOURCE_TASK_ID`).
*   **`SOURCE_TASK_ID`**: The ID of the existing task to clone (default: `165805`).
*   **`AUTH_FILE`**: The filename for storing session cookies (default: `kuaishou_auth.json`).

## Workflow Details

1.  **Launch:** The script launches a Chromium browser (headed mode).
2.  **Navigate:** Goes directly to `https://daren.kuaishou.com/distribution-plan-create/recreate/165805`.
3.  **Auth Check:**
    *   *If logged in:* The form loads immediately.
    *   *If not logged in:* Redirects to login page. Script waits for you to log in and land back on the creation page.
4.  **Fill Form:**
    *   Enters `<AppName>` as the task name.
    *   **Click Next Step**: Navigates to the resource configuration.
    *   **Edit Resource**: Opens the resource dialog.
    *   **Update URL**: Replaces `target=` in the dialog input with `<AppID>`.
    *   **AI Cover:** Triggers input blur (clicks whitespace) to enable the button, then clicks "AI Generate".
    *   **Confirm:** Closes the dialog.
    *   **Click Next Step (2nd):** Navigates to the date selection page.
    *   **Select Dates:** 
        *   Selects "Today" as start date.
        *   Clicks "Next Year" (double arrow) 5 times to advance the calendar.
        *   Selects a future date.
        *   **Clicks Confirm:** Explicitly confirms the date picker selection.
6.  **Submit:** The script uses a precise CSS selector to click the final "Submit" button.
7.  **Exit:** The script confirms submission success (URL change) and exits.

## Troubleshooting

*   **Submit Button Not Found:** If the final submit fails, the selector `#app > div > ... > button:nth-child(1)` might have changed. Inspect the page and update `specificSubmitSelector` in the script.
*   **Login Issues:** If the script fails to log in or the session expires, delete `kuaishou_auth.json` and run the script again to perform a fresh login.
*   **Element Not Found:** If Kuaishou updates their UI, the selectors in the script (e.g., class names, IDs) may break. You will need to inspect the page and update the selectors in `.automation/scripts/publish-kuaishou-task.js`.
*   **Timeout:** If the network is slow, you might need to increase the `waitForTimeout` values in the script.
