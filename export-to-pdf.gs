/**
 * Drop-down menu initialization
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Export PDF')
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
    ui.alert('Success: Both PDFs have been created and updated in Drive.');
  } catch (e) {
    ui.alert('Batch process failed: ' + e.message);
  }
}

/**
 * Create Whisky_list PDF
 */
function createWhiskyListPDF() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Whisky');

  if (!sheet) {
    ui.alert('The "Whisky" sheet was not found. Please check the sheet name.');
    return;
  }

  ss.setActiveSheet(sheet);
  const targetCols = [2, 5, 6, 7, 9, 10]; // B, E, F, G, I, J

  try {
    ss.toast('Hiding columns...');
    toggleColumns(sheet, targetCols, true);
    SpreadsheetApp.flush();

    ss.toast('Creating PDF...');
    generatePdfExport(ss, 'Whisky_list.pdf', {
      size: 'A5',
      gid: sheet.getSheetId(),
      printtitle: false,
      sheetnames: false,
      printnotes: false
    });

    ss.toast('"Whisky_list.pdf" updated successfully.');
  } catch (e) {
    ui.alert('An error occurred: ' + e.message);
  } finally {
    ss.toast('Restoring columns...');
    toggleColumns(sheet, targetCols, false);
    SpreadsheetApp.flush();
  }
}

/**
 * Create Tasting_notes PDF (Entire Workbook)
 */ 
function exportWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  ss.toast('Exporting Tasting Notes...');
  generatePdfExport(ss, 'Tasting_notes.pdf', {
    size: 'A4',
    printtitle: true,
    sheetnames: true,
    pagenum: 'RIGHT',
    date: 'LEFT',
    printnotes: true
  });
  ss.toast('"Tasting_notes.pdf" updated successfully.');
}

/* =========================================================================
   HELPER FUNCTIONS
   ========================================================================= */

/**
 * Shared PDF Generation Handler
 */
function generatePdfExport(ss, fileName, customParams = {}) {
  const defaultParams = {
    format: 'pdf',
    portrait: 'true',
    scale: '2',
    horizontal_alignment: 'CENTER',
    vertical_alignment: 'TOP',
    gridlines: 'true',
    top_margin: '0.25',
    bottom_margin: '0.25',
    left_margin: '0.25',
    right_margin: '0.25',
    fzr: 'false'
  };

  const finalParams = Object.assign({}, defaultParams, customParams);
  
  const queryString = Object.keys(finalParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(finalParams[key])}`)
    .join('&');

  const exportUrl = `${ss.getUrl().replace(/edit$/, '')}export?${queryString}`;
  saveBlobToDriveInPlace(exportUrl, fileName);
}

/**
 * Toggles column visibility by numerical index
 * @param {Sheet} sheet 
 * @param {Array<number>} columns Column indices (1-based)
 * @param {boolean} hide True to hide, False to show
 */ 
function toggleColumns(sheet, columns, hide) {
  columns.forEach(col => {
    try {
      if (hide) {
        sheet.hideColumns(col);
      } else {
        sheet.showColumns(col);
      }
    } catch (e) {
      Logger.log(`Error toggling column ${col}: ${e.toString()}`);
    }
  });
}

/**
 * Fetches PDF export and overwrites existing file content in-place via Drive API PATCH.
 * Preserves the file ID, permissions, and fixed URL.
 */
function saveBlobToDriveInPlace(exportUrl, fileName) {
  const oauthToken = ScriptApp.getOAuthToken();

  // 1. Fetch the generated PDF blob
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + oauthToken },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(`Failed to generate PDF export (HTTP ${response.getResponseCode()})`);
  }

  const blob = response.getBlob().setName(fileName);
  const existingFiles = DriveApp.getFilesByName(fileName);

  if (existingFiles.hasNext()) {
    const file = existingFiles.next();
    const fileId = file.getId();

    // 2. Overwrite file content via REST API PATCH request
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    
    UrlFetchApp.fetch(updateUrl, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + oauthToken },
      payload: blob.getBytes(),
      contentType: 'application/pdf'
    });

    Logger.log(`Overwrote file content in-place (URL maintained): ${file.getUrl()}`);

    // Clean up extra duplicate files with the exact same name if any exist
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }
  } else {
    // 3. Create a new file if it doesn't exist yet
    const newFile = DriveApp.createFile(blob);
    Logger.log(`Created new file: ${fileName} (${newFile.getUrl()})`);
  }
}
