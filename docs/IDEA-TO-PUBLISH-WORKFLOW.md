# How to Automate "Idea to Kuaishou Publish"

To go from a raw idea to a published Kuaishou task, follow this complete workflow.

## Phase 0: Idea Discovery ( The "Spark" )
**Prompt:**
> "Help me find a hot topic today in **[Category: Tech/Military/Sports]** that would appeal to **[Target Audience: e.g., Men]**.
> Search for recent news or rankings.
> Recommend 3 topics suitable for a 'Voting/Ranking' app like `fighter-jets`."

## Phase 1: App Implementation
**Prompt:**
> "Let's build the **[Selected Topic]** app:
> 1. Clone `fighter-jets` to `[new-app-id]`.
> 2. Update `index.html`, `styles.css`, and `app.js` with the new content.
> 3. Register it in `apps-metadata.json`.
> 4. Create a cover image using the `text-to-image` tool (or ask me to provide one)."

## Phase 2: Local Verification & Deployment
**Prompt:**
> "Verify the new `[new-app-id]` app:
> 1. Run the server and check if the voting logic works.
> 2. Ensure `util.js` KV store keys are unique to this app.
> 3. Check mobile responsiveness.
> 4. **CRITICAL: Commit and Push the code to GitHub.** The app MUST be live (or at least committed) before Kuaishou can verify the URL."

## Phase 3: Kuaishou Publication (The Automation Agent)
**Prompt:**
> "Publish `[new-app-id]` to Kuaishou Spark Plan:
> Run `node scripts/publish-kuaishou-task.js [new-app-id] '[App Name]' '[App Description]'`.
> I will handle the login if needed. The script should:
> 1. Duplicate task 165805.
> 2. Update the target URL.
> 3. Generate AI cover (I'll watch the blur trick).
> 4. Set date range (5 years) and auto-submit."

---

## One-Shot "Mega Prompt" (Try this next time)
> "I want to launch a new voting app about **[Topic]**.
> 1. **Code**: Clone `fighter-jets` to `[app-id]`, update content for [Topic], and register in metadata.
> 2. **Deploy**: Commit and push the changes to GitHub so the new URL is accessible.
> 3. **Publish**: Once code is live, run the `publish-kuaishou-task.js` script to upload it to Kuaishou.
> Note: The script is already updated to handle the 5-year date selection and hidden URL fields automatically."
