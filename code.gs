// code.gs
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://gsheets.vn/wp-content/uploads/2024/05/cropped-EMS-3.png')
    .setTitle('Trang Quản Lý Báo Cáo')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function authenticate(username, password) {
  var userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User');
  var dataRange = userSheet.getDataRange();
  var values = dataRange.getValues();
  
  // Bỏ qua hàng tiêu đề (hàng đầu tiên)
  for (var i = 1; i < values.length; i++) {
    // Email ở cột 3 (index 2), Password ở cột 4 (index 3)
    var storedEmail = values[i][2];
    var storedPassword = values[i][3];
    var role = values[i][5]; // Role ở cột 6 (index 5)
    
    // Loại bỏ khoảng trắng và so sánh
    if (storedEmail && storedEmail.toString().trim() === username.trim() && 
        storedPassword && storedPassword.toString().trim() === password.trim()) {
      
      // Ghi log để debug (có thể gỡ bỏ sau)
      console.log("Đăng nhập thành công cho người dùng: " + username);
      
      if (role === "Admin") {
        return 'admin';
      } else {
        return 'user';
      }
    }
  }
  
  // Ghi log thất bại (có thể gỡ bỏ sau)
  console.log("Đăng nhập thất bại cho người dùng: " + username);
  return 'invalid';
}

function validateLogin(username, password) {
  // Đảm bảo input không có khoảng trắng thừa
  username = username.trim();
  password = password.trim();
  
  var validationResult = authenticate(username, password);
  return validationResult === 'user' || validationResult === 'admin' ? validationResult : 'invalid';
}

function getUserByUsername(username) {
  var sheetUser = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User');
  var dataUser = sheetUser.getDataRange().getValues();
  
  for (var i = 1; i < dataUser.length; i++) {
    if (dataUser[i][2] === username) { // Email đăng nhập ở cột thứ 3
      return {
        id: dataUser[i][0],
        name: dataUser[i][1],
        email: dataUser[i][2],
        password: dataUser[i][3],
        image: dataUser[i][4],
        role: dataUser[i][5]
      };
    }
  }
  return null;
}

function getTotalCounts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pendingSheet = ss.getSheetByName('Đang xử lý');
  var approvedSheet = ss.getSheetByName('Phê duyệt');
  var disapprovedSheet = ss.getSheetByName('Huỷ bỏ');
  
  var pendingCount = Math.max(0, pendingSheet.getLastRow() - 1);
  var approvedCount = Math.max(0, approvedSheet.getLastRow() - 1);
  var disapprovedCount = Math.max(0, disapprovedSheet.getLastRow() - 1);
  
  return {
    pending: pendingCount,
    approved: approvedCount,
    disapproved: disapprovedCount
  };
}

// Trong file code.gs, thêm tham số email và isAdmin vào hàm
function getTotalDataCounts(email, isAdmin) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pendingSheet = ss.getSheetByName('Đang xử lý');
  var approvedSheet = ss.getSheetByName('Phê duyệt');
  var disapprovedSheet = ss.getSheetByName('Huỷ bỏ');
  
  // Lấy dữ liệu từ các sheet
  var pendingData = pendingSheet.getDataRange().getValues();
  var approvedData = approvedSheet.getDataRange().getValues();
  var disapprovedData = disapprovedSheet.getDataRange().getValues();
  
  // Đếm số lượng theo email nếu không phải admin
  var pendingCount = 0;
  var approvedCount = 0;
  var disapprovedCount = 0;
  
  if (isAdmin === 'admin') {
    // Nếu là admin, đếm tất cả (trừ hàng tiêu đề)
    pendingCount = Math.max(0, pendingSheet.getLastRow() - 1);
    approvedCount = Math.max(0, approvedSheet.getLastRow() - 1);
    disapprovedCount = Math.max(0, disapprovedSheet.getLastRow() - 1);
  } else {
    // Nếu là user thường, chỉ đếm các hàng có email trùng khớp
    // Email ở cột 2 (index 2)
    for (var i = 1; i < pendingData.length; i++) {
      if (pendingData[i][2] === email) pendingCount++;
    }
    
    for (var i = 1; i < approvedData.length; i++) {
      if (approvedData[i][2] === email) approvedCount++;
    }
    
    for (var i = 1; i < disapprovedData.length; i++) {
      if (disapprovedData[i][2] === email) disapprovedCount++;
    }
  }
  
  var data = {
    total: pendingCount + approvedCount + disapprovedCount,
    pending: pendingCount,
    approved: approvedCount,
    disapproved: disapprovedCount
  };
  return data;
}

function addDataToPending(form) {
  try {
    var folderName = '📁Lưu tệp V1';
    var folder;
    var folderIterator = DriveApp.getFoldersByName(folderName);
    if (folderIterator.hasNext()) {
      folder = folderIterator.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      Logger.log('Đã tạo thư mục mới: ' + folderName);
    }
    var name = form.name;
    var email = form.email;
    var position = form.position;
    var report = form.report;
    var fileBlob = form.myFile;
    var status = form.status;
    var description = form.description;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Đang xử lý');
    var lastRow = sheet.getLastRow();
    var id;
    
    function generateID() {
      var randomId = '1' + Math.floor(100 + Math.random() * 900);
      var existingIds = sheet.getRange("A2:A" + lastRow).getValues().flat();
      while (existingIds.includes("'" + randomId)) {
        randomId = '1' + Math.floor(100 + Math.random() * 900);
      }
      return "'" + randomId;
    }
    
    id = generateID();
    var fileUrl = "";
    
    if (fileBlob && fileBlob.getName()) {
      if (fileBlob.getContentType().startsWith('application/pdf') || fileBlob.getContentType().startsWith('image/')) {
        var file = folder.createFile(fileBlob);
        fileUrl = file.getUrl();
      } else {
        throw new Error("Loại tệp không hợp lệ. Chỉ chấp nhận PDF và hình ảnh.");
      }
    }
    
    sheet.appendRow([id, name, email, position, report, fileUrl, status, description]);
    return "Dữ liệu đã được gửi thành công.";
  } catch (error) {
    throw new Error("Đã xảy ra lỗi: " + error.toString());
  }
}

function editData(form) {
  try {
    var id = form.editId;
    var name = form.editName;
    var email = form.editEmail;
    var position = form.editPosition;
    var report = form.editReport;
    var fileUrl = form.editFile;
    var status = form.editStatus;
    var description = form.editDescription;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var pendingSheet = ss.getSheetByName('Đang xử lý');
    var approvedSheet = ss.getSheetByName('Phê duyệt');
    var disapprovedSheet = ss.getSheetByName('Huỷ bỏ');
    var dataRange = pendingSheet.getDataRange();
    var values = dataRange.getValues();

    for (var i = 1; i < values.length; i++) {
      if (values[i][0] == id) {
        var rowData = values[i].slice();
        if (rowData[6] !== status) {
          var targetSheet;
          if (status === 'Phê duyệt') {
            targetSheet = approvedSheet;
          } else if (status === 'Huỷ bỏ') {
            targetSheet = disapprovedSheet;
          } else {
            throw new Error("Trạng thái không hợp lệ. Phải là 'Phê duyệt' hoặc 'Huỷ bỏ'.");
          }
          targetSheet.appendRow([id, name, email, position, report, fileUrl, status, description]);
          pendingSheet.deleteRow(i + 1);
          return "Dữ liệu cập nhật thành công.";
        } else {
          rowData[1] = name;
          rowData[2] = email;
          rowData[3] = position;
          rowData[4] = report;
          rowData[5] = fileUrl;
          rowData[7] = description;
          pendingSheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          return "Dữ liệu cập nhật thành công.";
        }
      }
    }
    throw new Error("Không tìm thấy dữ liệu với ID này.");
  } catch (error) {
    throw new Error("Lỗi: " + error.toString());
  }
}

function getDataById(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Đang xử lý");
  var data = sheet.getRange("A2:H").getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == id) {
      return data[i];
    }
  }
  return null;
}

function deleteData(id) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Đang xử lý');
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var found = false;
    
    for (var i = 0; i < values.length; i++) {
      if (values[i][0] == id) { 
        var fileUrl = values[i][5]; // Vị trí cột Tệp
        if (fileUrl) {
          var fileId = getIdFromUrl(fileUrl);
          if (fileId) {
            try {
              DriveApp.getFileById(fileId).setTrashed(true);
            } catch (e) {
              // Bỏ qua lỗi nếu không thể xóa file (có thể file đã bị xóa)
              console.error("Không thể xóa file: " + e.toString());
            }
          }
        }
        sheet.deleteRow(i + 1);
        found = true;
        break;
      }
    }
    
    if (!found) {
      throw new Error("Không tìm thấy dữ liệu với ID này.");
    }
    
    return "Dữ liệu và tệp đã xóa vĩnh viễn.";
    
  } catch (error) {
    throw new Error("Lỗi: " + error.toString());
  }
}

function getIdFromUrl(url) {
  if (!url) return null;
  var match = /\/d\/([^\/]+)/.exec(url);
  return match && match[1];
}

function getPositionOptions() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User');
  var data = sheet.getRange('F2:F' + sheet.getLastRow()).getValues();
  var options = [];
  var uniquePositions = {};
  
  data.forEach(function(row) {
    if (row[0] !== "" && !uniquePositions[row[0]]) { 
      uniquePositions[row[0]] = true;
      options.push(row[0]);
    }
  });
  
  return options;
}

function doGetPositionOptions() {
  return getPositionOptions();
}

function getUserData() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User');
    if (!sheet) {
      throw new Error("Không tìm thấy sheet 'User'");
    }
    const dataRange = sheet.getRange('A2:F' + sheet.getLastRow());
    const values = dataRange.getValues();
    const filteredValues = values.filter(row => row[0] !== '');
    return JSON.stringify(filteredValues);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ User:", error.message);
    return JSON.stringify([]);
  }
}

function getPendingData(email, isAdmin) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Đang xử lý');
    if (!sheet || sheet.getLastRow() <= 1) {
      return JSON.stringify([]);
    }
    
    const dataRange = sheet.getRange('A2:H' + sheet.getLastRow());
    const values = dataRange.getValues();
    let filteredValues;
    
    if (isAdmin === 'admin') {
      // Admin thấy tất cả dữ liệu
      filteredValues = values.filter(row => row[0] !== '');
    } else {
      // User chỉ thấy dữ liệu của mình
      filteredValues = values.filter(row => row[0] !== '' && row[2] === email);
    }
    
    return JSON.stringify(filteredValues);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu Đang xử lý:", error.message);
    return JSON.stringify([]);
  }
}

function getApprovedData(email, isAdmin) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Phê duyệt');
    if (!sheet || sheet.getLastRow() <= 1) {
      return JSON.stringify([]);
    }
    
    const dataRange = sheet.getRange('A2:H' + sheet.getLastRow());
    const values = dataRange.getValues();
    let filteredValues;
    
    if (isAdmin === 'admin') {
      // Admin thấy tất cả dữ liệu
      filteredValues = values.filter(row => row[0] !== '');
    } else {
      // User chỉ thấy dữ liệu của mình
      filteredValues = values.filter(row => row[0] !== '' && row[2] === email);
    }
    
    return JSON.stringify(filteredValues);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu Phê duyệt:", error.message);
    return JSON.stringify([]);
  }
}

function getDisapprovedData(email, isAdmin) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Huỷ bỏ');
    if (!sheet || sheet.getLastRow() <= 1) {
      return JSON.stringify([]);
    }
    
    const dataRange = sheet.getRange('A2:H' + sheet.getLastRow());
    const values = dataRange.getValues();
    let filteredValues;
    
    if (isAdmin === 'admin') {
      // Admin thấy tất cả dữ liệu
      filteredValues = values.filter(row => row[0] !== '');
    } else {
      // User chỉ thấy dữ liệu của mình
      filteredValues = values.filter(row => row[0] !== '' && row[2] === email);
    }
    
    return JSON.stringify(filteredValues);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu Huỷ bỏ:", error.message);
    return JSON.stringify([]);
  }
}

// Thêm các hàm để quản lý người dùng
function addUser(form) {
  try {
    var name = form.name;
    var email = form.email;
    var password = form.password;
    var image = form.image;
    var role = form.role;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('User');
    var lastRow = sheet.getLastRow();
    var id = lastRow; // ID tự tăng
    
    // Kiểm tra xem email đã tồn tại chưa
    var data = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === email) {
        throw new Error("Email đã tồn tại trong hệ thống!");
      }
    }
    
    sheet.appendRow([id, name, email, password, image, role]);
    return "Người dùng đã được thêm thành công.";
  } catch (error) {
    throw new Error("Lỗi khi thêm người dùng: " + error.toString());
  }
}

function editUser(form) {
  try {
    var id = form.id;
    var name = form.name;
    var email = form.email;
    var password = form.password;
    var image = form.image;
    var role = form.role;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('User');
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] == id) {
        // Cập nhật dữ liệu
        sheet.getRange(i + 1, 2).setValue(name);
        sheet.getRange(i + 1, 3).setValue(email);
        sheet.getRange(i + 1, 4).setValue(password);
        sheet.getRange(i + 1, 5).setValue(image);
        sheet.getRange(i + 1, 6).setValue(role);
        return "Cập nhật người dùng thành công.";
      }
    }
    throw new Error("Không tìm thấy người dùng với ID này.");
  } catch (error) {
    throw new Error("Lỗi khi cập nhật người dùng: " + error.toString());
  }
}

function deleteUser(id) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('User');
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] == id) {
        sheet.deleteRow(i + 1);
        return "Người dùng đã được xóa thành công.";
      }
    }
    throw new Error("Không tìm thấy người dùng với ID này.");
  } catch (error) {
    throw new Error("Lỗi khi xóa người dùng: " + error.toString());
  }
}

function getUserById(id) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("User");
    var data = sheet.getRange("A2:F").getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id) {
        return data[i];
      }
    }
    return null;
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu người dùng:", error.message);
    return null;
  }
}
