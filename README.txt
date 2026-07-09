JOHN JONES FEATURED UPFITS DISPLAY

GITHUB PAGES DISPLAY AND ADMIN

Public display:
https://YOUR-GITHUB-USERNAME.github.io/john-jones-ppv-display/

Public admin:
https://YOUR-GITHUB-USERNAME.github.io/john-jones-ppv-display/admin.html

The admin page can publish photos and content directly to GitHub. Create a
fine-grained GitHub personal access token that can access only the
john-jones-ppv-display repository and has Contents permission set to
Read and write. Paste that token into the admin page for the current session.

After Save & Publish Display Changes is selected, GitHub Pages normally
publishes within 1-2 minutes. Every open display checks for new content every
30 seconds and updates automatically.

EVENT CONTACT LEADS (CLOUDFLARE PAGES)

The display includes an in-app contact form. Shared lead storage requires the
Cloudflare Pages project:

1. In Cloudflare, create a D1 database named jj-ppv-event-leads.
2. Open Workers & Pages, select the display project, then open Settings.
3. Under Bindings, add a D1 database binding:
   Variable name: LEADS_DB
   Database: jj-ppv-event-leads
4. Under Variables and Secrets, add an encrypted secret:
   Variable name: LEADS_ADMIN_KEY
   Value: create a long private password used only by John Jones staff.
5. Redeploy the Cloudflare Pages project.

The database table is created automatically after the first submission.

Event leads admin:
https://YOUR-CLOUDFLARE-ADDRESS.pages.dev/leads.html

Enter LEADS_ADMIN_KEY on that page to view, delete, or export event leads.
Visitors can submit while internet is briefly unavailable; the display stores
the submission locally and retries automatically when internet returns.

STARTING THE DISPLAY AND ADMIN

Run START-SERVER.cmd.
Keep its command window open while using the display or admin screen.
Run OPEN-ADMIN.cmd to open the editor after the server is running.

Display:
http://127.0.0.1:8080/

Content Admin:
http://127.0.0.1:8080/admin.html

The admin screen can update:
- Main headings
- Tile names
- Tile/gallery photos and videos
- Featured upfit display order by drag and drop
- Model year, built-for agency, agency type, and upfit description
- Idle time before the slideshow
- Slideshow speed

ANDROID BOARD

The board should open the server address instead of a file address. If the
server runs directly on the Android board, use http://127.0.0.1:8080/. If the
server runs on another computer, use that computer's local-network IP address.
