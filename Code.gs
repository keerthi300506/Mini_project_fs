/**
 * ANITS SMART LOST & FOUND - GOOGLE APPS SCRIPT
 *
 * GOOGLE SHEET:
 * Create two sheets named exactly:
 * 1) Reports
 * 2) Claims
 *
 * Reports row 1:
 * ID | Type | Item Name | Category | Location | Date | Description |
 * Reporter Name | Reporter Email | Image URL | Status | Timestamp
 *
 * Claims row 1:
 * Claim ID | Item ID | Claimant Name | Claimant Email | Reason | Status | Timestamp
 *
 * OPTIONAL IMAGE STORAGE:
 * Create a Google Drive folder and paste its ID below.
 * Leave blank to store no uploaded image.
 */
const DRIVE_FOLDER_ID = "1bYOj3eGmbLcIWA8QmR3w76pIruSWS3SQ";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "public";
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "public") {
    const reports = readSheet_(ss, "Reports").filter(r => r.status === "Approved")
      .map(publicReport_);
    return json_({success:true, reports});
  }

  if (action === "admin") {
    // For a classroom/demo project. Add proper authentication before real deployment.
    return json_({
      success:true,
      reports: readSheet_(ss, "Reports"),
      claims: readSheet_(ss, "Claims")
    });
  }

  return json_({success:true, message:"ANITS Smart Lost & Found API"});
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === "claim") {
      const sheet = ss.getSheetByName("Claims");
      sheet.appendRow([
        data.id || Utilities.getUuid(),
        data.itemId || "",
        data.name || "",
        data.email || "",
        data.reason || "",
        "Pending",
        new Date()
      ]);
      return json_({success:true});
    }

    if (data.action === "status") {
      updateReportStatus_(ss.getSheetByName("Reports"), String(data.id), String(data.status));
      return json_({success:true});
    }

    if (data.action === "delete") {
      const deleted = deleteReport_(ss.getSheetByName("Reports"), String(data.id));
      return json_({success:deleted, message:deleted ? "Report deleted" : "Report not found"});
    }

    const sheet = ss.getSheetByName("Reports");
    let imageUrl = "";

    // Image upload from the browser as a data URL.
    if (data.imageData && DRIVE_FOLDER_ID) {
      imageUrl = saveImage_(data.imageData, data.name || "lost-found-item");
    }

    sheet.appendRow([
      data.id || Utilities.getUuid(),
      data.type || "",
      data.name || "",
      data.category || "",
      data.location || "",
      data.date || "",
      data.description || "",
      data.reporterName || "",
      data.reporterEmail || "",
      imageUrl,
      "Pending",
      new Date()
    ]);

    return json_({success:true, id:data.id || ""});
  } catch (err) {
    return json_({success:false, error:String(err)});
  }
}

function readSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map(row => {
    const obj = {};
    headers.forEach((h,i) => obj[normalize_(h)] = row[i] instanceof Date
      ? Utilities.formatDate(row[i], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
      : row[i]);
    return obj;
  });
}

function normalize_(header) {
  return String(header).trim().toLowerCase().replace(/\s+/g,"_");
}

function publicReport_(r) {
  return {
    id:r.id,
    type:r.type,
    name:r.item_name,
    category:r.category,
    location:r.location,
    date:r.date,
    description:r.description,
    imageUrl:r.image_url || "",
    status:r.status
  };
}

function updateReportStatus_(sheet, id, status) {
  if (!sheet || sheet.getLastRow() < 2) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(normalize_);
  const idCol = headers.indexOf("id");
  const statusCol = headers.indexOf("status");
  if (idCol < 0 || statusCol < 0) return;
  for (let i=1;i<values.length;i++) {
    if (String(values[i][idCol]) === id) {
      sheet.getRange(i+1,statusCol+1).setValue(status);
      return;
    }
  }
}

function deleteReport_(sheet, id) {
  if (!sheet || sheet.getLastRow() < 2) return false;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(normalize_);
  const idCol = headers.indexOf("id");
  if (idCol < 0) return false;
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][idCol]) === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function saveImage_(dataUrl, name) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return "";
  const mime = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  const ext = mime.split("/")[1] || "jpg";
  const blob = Utilities.newBlob(bytes, mime, name + "-" + Date.now() + "." + ext);
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);
  // Make the image viewable to anyone with the link.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/uc?export=view&id=" + file.getId();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
