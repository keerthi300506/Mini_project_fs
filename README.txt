ANITS SMART LOST & FOUND CAMPUS PORTAL — VERSION 2

FILES
- index.html       Main website
- style.css        Responsive ANITS design
- app.js           UI + Google Apps Script integration
- Code.gs          Google Apps Script backend
- assets/anits-logo.png

GOOGLE SHEET SETUP
1. Create a new Google Sheet.
2. Rename the first tab to Reports.
3. Add this exact header row:
ID | Type | Item Name | Category | Location | Date | Description | Reporter Name | Reporter Email | Image URL | Status | Timestamp
4. Add another tab named Claims.
5. Add this exact header row:
Claim ID | Item ID | Claimant Name | Claimant Email | Reason | Status | Timestamp

GOOGLE APPS SCRIPT
1. In the Sheet, open Extensions > Apps Script.
2. Paste Code.gs.
3. If you want image uploads, create a Google Drive folder and the supplied Drive folder ID is already configured in DRIVE_FOLDER_ID.
4. Deploy > New deployment > Web app.
5. Execute as: Me.
6. Who has access: Anyone.
7. Copy the Web App URL.
8. Open app.js and replace:
   const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMwcSeomv4f0hHfGA8p4IMxZQxZQnxiOMVMf4dZLF1Z3gob_Tx1UTxxV4DFtG3v467Gw/exec";
   with your URL.

IMPORTANT ADMIN SECURITY NOTE
The included admin login is intentionally a demo for a student project:
admin / anits123

The frontend login is NOT real security because browser JavaScript can be inspected.
Before real college deployment, use college Google-account authentication or another server-side authentication method.

WHAT HAPPENS
Student submits -> Apps Script -> Reports sheet -> Pending.
Admin approves -> sheet status becomes Approved.
Public page loads only Approved records -> item cards are visible to everyone.
Student clicks "I think this is mine" -> Claim request -> Claims sheet -> admin reviews it.

IMAGE UPLOAD
The browser converts the selected image to a data URL.
Apps Script stores it in the configured Google Drive folder and saves a view URL in the Reports sheet.
The current limit is 2 MB per image in the frontend.

DEMO WITHOUT GOOGLE
If GOOGLE_SCRIPT_URL is empty, the website still works using browser localStorage. This is useful for demonstrating the UI before the Sheet is connected.


ADMIN DELETE FEATURE
---------------------
Admins can now delete any report from the Admin Dashboard. Clicking Delete asks for confirmation, removes the report from the Reports sheet, and removes the item from the public Lost & Found page.

IMPORTANT AFTER UPDATING Code.gs
1. Open Google Apps Script.
2. Replace Code.gs with this updated version.
3. Save the project.
4. Deploy > Manage deployments.
5. Edit the existing Web app deployment and create a new version.
6. Keep Execute as: Me and Who has access: Anyone.
7. The Web App URL stays the same.
