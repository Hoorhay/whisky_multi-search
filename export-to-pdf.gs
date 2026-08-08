/**
 * Drop-down menu
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Export PDF')
    .addItem('Run both exports', 'runBothExports')
    .addSeparator() 
    .addItem('Create Whisky_list', 'createWhiskyListPDF') 
    .addItem('Create Tasting_notes', 'exportWorkbook')
    .addToUi();
}

/**
 * Run both exports sequentially
 */
function runBothExports() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    ss.toast('Starting full export process...', 'Batch Process', 3);
    createWhiskyListPDF();
    exportWorkbook();
    ui.alert('Success: Both PDFs have been created and saved to Drive.');
  } catch (e) {
    ui.alert('Batch process failed: ' + e.message);
  }
}

/**
 * Create Whisky_list
 */
function createWhiskyListPDF() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Whisky');

  if (!sheet) {
    ui.alert('The "Whisky" sheet was not found. Please check the sheet name.');
    return;
  }
  
  // Force focus to this sheet so exportCurrentSheetAsPDF captures the correct target
  ss.setActiveSheet(sheet);

  try {
    ss.toast('Hiding columns...');
    hideWhiskyColumns(sheet);
    SpreadsheetApp.flush();
    Utilities.sleep(1000);

    ss.toast('Creating PDF...');
    exportCurrentSheetAsPDF(ss, sheet);

    ss.toast('"Whisky List.pdf" has been created.');
  } catch (e) {
    ui.alert('An error occurred: ' + e.message);
  } finally {
    ss.toast('Restoring columns...');
    unhideWhiskyColumns(sheet);
    SpreadsheetApp.flush();
  }
}

/**
 * Export current active sheet
 */ 
function exportCurrentSheetAsPDF(ss, sheet) {
  const url = ss.getUrl();
  const pdfNameWL = "Whisky_list.pdf";

  const exportUrl = url.replace(/edit$/, '') +
    'export?' +
    'format=pdf' +
    '&size=A5' +
    '&portrait=true' +
    '&scale=2' + 
    '&horizontal_alignment=CENTER' +
    '&vertical_alignment=TOP' +
    '&gridlines=true' +
    '&printtitle=false' +
    '&top_margin=0.25' +
    '&bottom_margin=0.25' +
    '&left_margin=0.25' +
    '&right_margin=0.25' +
    '&sheetnames=false' +
    '&fzr=false' +
    '&printnotes=false' +
    '&gid=' + sheet.getSheetId();

  saveBlobToDrive(exportUrl, pdfNameWL);
}

/**
 * Create Tasting_notes
 */ 
function exportWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const url = ss.getUrl();
  const pdfNameTN = "Tasting_notes.pdf";

  const exportUrl = url.replace(/edit$/, '') +
    'export?' +
    'format=pdf' +
    '&size=A4' +
    '&portrait=true' +
    '&scale=2' + 
    '&horizontal_alignment=CENTER' +
    '&vertical_alignment=TOP' +
    '&gridlines=true' +
    '&printtitle=true' +
    '&top_margin=0.25' +
    '&bottom_margin=0.25' +
    '&left_margin=0.25' +
    '&right_margin=0.25' +
    '&sheetnames=true' +
    '&pagenum=RIGHT' +
    '&date=LEFT' +
    '&fzr=false' +
    '&printnotes=true';

  saveBlobToDrive(exportUrl, pdfNameTN);
}

/* =========================================================================
   HELPER FUNCTIONS
   ========================================================================= */

/**
 * Hides targeted columns on a specific sheet
 */ 
function hideWhiskyColumns(sheet) {
  const columnsToHide = ['B', 'E', 'F', 'G', 'I', 'J'];
  columnsToHide.forEach(col => sheet.hideColumn(sheet.getRange(col + '1')));
}

/**
 * Unhides targeted columns on a specific sheet
 */ 
function unhideWhiskyColumns(sheet) {
  const columnsToUnhide = ['B', 'E', 'F', 'G', 'I', 'J'];

  columnsToUnhide.forEach(columnRange => {
    try {
      const range = sheet.getRange(`${columnRange}:${columnRange}`);
      sheet.showColumns(range.getColumn(), range.getNumColumns());
    } catch (e) {
      Logger.log(`Error unhiding column ${columnRange}: ${e.toString()}`);
    }
  });
}

/**
 * Fetches the export URL and overwrites the existing file on Google Drive
 * without moving the old one to the trash.
 */
function saveBlobToDrive(exportUrl, fileName) {
  const blob = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
  }).getBlob().setName(fileName); 

  const existingFiles = DriveApp.getFilesByName(fileName);

  if (existingFiles.hasNext()) {
    const file = existingFiles.next();
    
    // DriveApp doesn't have a direct native "file.setBlob()" method, 
    // so we use the Drive API via a PATCH request to overwrite the content.
    const fileId = file.getId();
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    
    UrlFetchApp.fetch(updateUrl, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: blob.getBytes(),
      contentType: 'application/pdf'
    });
    
    Logger.log(`Overwrote existing file: ${fileName} (ID: ${fileId})`);
    
    // If there happen to be any accidental duplicate files with the same name, 
    // this cleans them up so you don't accumulate duplicates.
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }
  } else {
    // If the file doesn't exist yet, create it fresh
    DriveApp.createFile(blob);
    Logger.log(`Created new file: ${fileName}`);
  }
}
