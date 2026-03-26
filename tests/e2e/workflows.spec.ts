import { test, expect } from '@playwright/test';

test.describe('Memora End-to-End Workflows', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'E2E Tester',
    email: `e2e_${timestamp}@example.com`,
    password: 'Password123!',
  };

  test('Complete workflow: Auth, Note Capture, Organization, AI, Tasks, and Guest Sharing', async ({
    page,
    browser,
  }) => {
    // 1. Register a new user
    await page.goto('/register');
    await page.fill('input[type="text"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // 2. Quick capture a note from dashboard
    const noteTitle = `Sprint Planning Notes ${timestamp}`;
    await page.fill('input[placeholder*="Quick capture"]', noteTitle);
    await page.click('button:has-text("Capture Note")');

    // Should navigate into the note workspace
    await expect(page).toHaveURL(/\/notes\/note_/);
    await expect(page.locator('input[value="' + noteTitle + '"]')).toBeVisible();

    // 3. Edit rich text content
    const editorContent = page.locator('.ProseMirror');
    await editorContent.click();
    await editorContent.fill(
      'Review the architecture documentation. Ask Priya to verify security policies. Submit the final audit report by Friday.'
    );

    // Wait for debounced autosave badge to show "Saved"
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 5000 });

    // 4. Reload page to confirm content persisted
    await page.reload();
    await expect(page.locator('input[value="' + noteTitle + '"]')).toBeVisible();
    await expect(page.locator('.ProseMirror')).toContainText('Review the architecture documentation');

    // 5. AI Actions: Title Suggestion
    await page.click('button:has-text("Suggest Title")');
    await expect(page.locator('text=Proposed Title Suggestion')).toBeVisible({ timeout: 5000 });
    // Dismiss suggestion to keep our title
    await page.click('button:has-text("Dismiss")');

    // 6. AI Actions: Summarize
    await page.click('button:has-text("Summarize")');
    await expect(page.locator('text=AI Summary')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Dismiss")');

    // 7. AI Actions: Extract Tasks and Approve
    await page.click('button:has-text("Extract Tasks")');
    await expect(page.locator('text=Review Extracted Action Items')).toBeVisible({ timeout: 5000 });
    // Click "Create Approved Tasks"
    await page.click('button:has-text("Create Approved Tasks")');
    await expect(page.locator('text=Successfully converted')).toBeVisible({ timeout: 5000 });

    // 8. Verify tasks appear on the Tasks page
    await page.goto('/tasks');
    await expect(page.locator('text=Review the architecture documentation')).toBeVisible();

    // 9. Return to note and create a Guest Share Link
    await page.goto('/notes');
    await page.click(`text=${noteTitle}`);
    await page.click('button:has-text("Share")');
    await expect(page.locator('text=Access Level')).toBeVisible();

    // Select Comment permission
    await page.click('button:has-text("Can Comment")');
    await page.click('button:has-text("Create Secure Share Link")');
    await expect(page.locator('text=Share Link Ready!')).toBeVisible({ timeout: 5000 });

    // Retrieve generated share link from input
    const shareUrl = await page.locator('input[readonly]').inputValue();
    expect(shareUrl).toContain('/shared/');

    // 10. Open share link in a separate unauthenticated browser context (Guest)
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(shareUrl);

    // Verify guest sees the note and permission badge
    await expect(guestPage.locator(`text=${noteTitle}`)).toBeVisible();
    await expect(guestPage.locator('text=Can Comment')).toBeVisible();
    // Guest must not see dashboard or other notes
    await expect(guestPage.locator('text=Dashboard')).not.toBeVisible();

    // Guest posts a comment
    await guestPage.fill('input[placeholder*="Your Name"]', 'External Auditor');
    await guestPage.fill('input[placeholder*="Add a comment"]', 'Looks compliant with policies.');
    await guestPage.click('button:has-text("Send")');
    await expect(guestPage.locator('text=Looks compliant with policies.')).toBeVisible();

    // 11. Author revokes the share link
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button[title="Revoke access immediately"]');
    await page.waitForTimeout(500);

    // 12. Verify guest link is immediately blocked
    await guestPage.reload();
    await expect(guestPage.locator('text=Access Revoked')).toBeVisible({ timeout: 5000 });

    await guestContext.close();
  });

  test('Organization and Intelligent Search workflow', async ({ page }) => {
    // Log in with existing user
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');

    // Navigate to Search page
    await page.goto('/search');
    await page.fill('input[placeholder*="Search notes"]', 'architecture');
    // Verify result is displayed with matching title
    await expect(page.locator(`text=Sprint Planning Notes ${timestamp}`)).toBeVisible({
      timeout: 5000,
    });
  });
});
