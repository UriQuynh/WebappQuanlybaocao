<!-- js.html -->
<script>
var isAdmin = false;
var currentUserRole = '';
var currentUserEmail = '';
var disableLoadingOverlay = false;

// Hàm hiển thị loading (chỉ dùng cho đăng nhập)
function showLoading() {
    if (!disableLoadingOverlay) {
        $('#loadingOverlay').addClass('show');
    }
}

// Hàm ẩn loading
function hideLoading() {
    $('#loadingOverlay').removeClass('show');
}

// Hàm flash thông báo thành công
function showSuccessFlash(message, action) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: message,
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
    });
    
    if (action && typeof action === 'function') {
        setTimeout(action, 300);
    }
}

$(document).ready(function () {
    // Tắt hiệu ứng loading khi chuyển đổi giữa các tab
    disableLoadingOverlay = true;
    
    // Kiểm tra xem có thông tin đăng nhập được lưu không
    checkSavedLogin();
    
    $('#loginForm').submit(function(event) {
        event.preventDefault();
        var username = $('#username').val();
        var password = $('#password').val();
        var rememberMe = $('#rememberMe').is(':checked');

        if (!username || !password) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: 'Vui lòng nhập tên đăng nhập và mật khẩu!'
            });
            return;
        }
        
        var submitButton = $(this).find('button[type="submit"]');
        submitButton.prop('disabled', true);
        submitButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang tải...');
        disableLoadingOverlay = false;
        showLoading();

        google.script.run.withSuccessHandler(function(loginType) {
            hideLoading();
            if (loginType === 'user' || loginType === 'admin') {
                isAdmin = loginType === 'admin';
                currentUserRole = loginType;
                
                google.script.run.withSuccessHandler(function(data) {
                    $('#user-name').text(data.name);
                    $('#user-email').text(data.email);
                    $('#user-role').text(data.role);
                    $('#user-pass').text(data.password);
                    $('#user-id').text(data.id);
                    currentUserEmail = data.email;
                    
                    // Cập nhật avatar nếu có
                    if (data.image && data.image.length > 5) {
                        $('#userAvatar').attr('src', data.image);
                    }
                    
                    updateContainerVisibility(loginType);
                    
                    // Lưu thông tin đăng nhập nếu người dùng chọn "Nhớ đăng nhập"
                    if (rememberMe) {
                        localStorage.setItem('savedUsername', username);
                        localStorage.setItem('savedPassword', password);
                        localStorage.setItem('rememberMe', 'true');
                    } else {
                        localStorage.removeItem('savedUsername');
                        localStorage.removeItem('savedPassword');
                        localStorage.removeItem('rememberMe');
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Đăng nhập thành công!',
                        text: 'Xin chào, ' + data.name + '!'
                    }).then((result) => {
                        $('#loginPage').hide();
                        $('.wrapper').show();
                        // Load các dữ liệu không hiển thị loading
                        disableLoadingOverlay = true;
                        loadAllData();
                    });
                }).getUserByUsername(username);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Đăng nhập thất bại!',
                    text: 'Email hoặc mật khẩu không đúng.'
                });
                submitButton.prop('disabled', false);
                submitButton.html('Đăng Nhập');
            }
        }).withFailureHandler(function(error) {
            hideLoading();
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: 'Không thể xác thực. Vui lòng thử lại sau.'
            });
            submitButton.prop('disabled', false);
            submitButton.html('Đăng Nhập');
        }).validateLogin(username, password);
    });

    function checkSavedLogin() {
        var savedUsername = localStorage.getItem('savedUsername');
        var savedPassword = localStorage.getItem('savedPassword');
        var rememberMe = localStorage.getItem('rememberMe');
        
        if (savedUsername && savedPassword && rememberMe === 'true') {
            $('#username').val(savedUsername);
            $('#password').val(savedPassword);
            $('#rememberMe').prop('checked', true);
            
            // Tự động đăng nhập
            disableLoadingOverlay = false;
            showLoading();
            google.script.run
                .withSuccessHandler(function(loginType) {
                    if (loginType === 'user' || loginType === 'admin') {
                        isAdmin = loginType === 'admin';
                        currentUserRole = loginType;
                        
                        google.script.run.withSuccessHandler(function(data) {
                            hideLoading();
                            $('#user-name').text(data.name);
                            $('#user-email').text(data.email);
                            $('#user-role').text(data.role);
                            $('#user-pass').text(data.password);
                            $('#user-id').text(data.id);
                            currentUserEmail = data.email;
                            
                            // Cập nhật avatar nếu có
                            if (data.image && data.image.length > 5) {
                                $('#userAvatar').attr('src', data.image);
                            }
                            
                            updateContainerVisibility(loginType);
                            
                            $('#loginPage').hide();
                            $('.wrapper').show();
                            
                            // Không hiển thị loading khi load dữ liệu
                            disableLoadingOverlay = true;
                            loadAllData();
                        }).getUserByUsername(savedUsername);
                    } else {
                        hideLoading();
                    }
                })
                .withFailureHandler(function(error) {
                    console.error('Lỗi đăng nhập tự động:', error);
                    hideLoading();
                })
                .validateLogin(savedUsername, savedPassword);
        }
    }

    function updateContainerVisibility(loginType) {
        if (loginType === 'admin') {
            $('#statusContainer').show();
            $('#descriptionContainer').show();
            $('#userData').show();
        } else {
            $('#statusContainer').hide();
            $('#descriptionContainer').hide();
            $('#userData').hide();
        }
    }

    $('#logoutLink').click(function (event) {
        event.preventDefault();
        Swal.fire({
            title: 'Đăng xuất',
            text: 'Bạn có chắc chắn muốn đăng xuất không?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Huỷ'
        }).then((result) => {
            if (result.isConfirmed) {
                // Giữ lại thông tin đăng nhập nếu đã chọn "Nhớ đăng nhập"
                if (!$('#rememberMe').is(':checked')) {
                    localStorage.removeItem('savedUsername');
                    localStorage.removeItem('savedPassword');
                    localStorage.removeItem('rememberMe');
                }
                
                $('.wrapper').hide();
                $('#loginPage').show();
                $('#loginForm button[type="submit"]').html('Đăng Nhập').prop('disabled', false);
                isAdmin = false;
                currentUserRole = '';
                currentUserEmail = '';
            }
        });
    });

    function addDataToPending() {
        var form = document.getElementById("addDataForm");
        var requiredFields = ['name', 'email', 'report', 'position'];
        for (var i = 0; i < requiredFields.length; i++) {
            var field = requiredFields[i];
            if (!form[field].value) {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi',
                    text: 'Vui lòng điền vào tất cả các trường bắt buộc.'
                });
                return;
            }
        }

        var submitButton = $('#addDataForm').find('button[type="submit"]');
        submitButton.prop('disabled', true);
        submitButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang gửi...');

        google.script.run
            .withSuccessHandler(function(response) {
                submitButton.prop('disabled', false).html('Gửi');
                $('#addDataModal').modal('hide');
                form.reset();
                
                showSuccessFlash(response, function() {
                    loadPendingData();
                    updateDataCounts();
                });
            })
            .withFailureHandler(function(error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi!',
                    text: error.message || 'Không thể thêm dữ liệu. Vui lòng thử lại sau.'
                });
                submitButton.prop('disabled', false).html('Gửi');
            })
            .addDataToPending(form);
    }

    // Sự kiện submit form thêm báo cáo
    $('#addDataForm').submit(function (event) {
        event.preventDefault();
        addDataToPending();
    });

    // Sự kiện submit form thêm người dùng
    $('#addUserForm').submit(function (event) {
        event.preventDefault();
        addUser();
    });

    // Sự kiện submit form sửa người dùng
    $('#editUserForm').submit(function (event) {
        event.preventDefault();
        updateUser();
    });

    // Xử lý khi modal đóng
    $('#addDataModal').on('hidden.bs.modal', function (e) {
        $('#addDataForm')[0].reset();
    });

    $('#addUserModal').on('hidden.bs.modal', function (e) {
        $('#addUserForm')[0].reset();
    });

    $('#editUserModal').on('hidden.bs.modal', function (e) {
        $('#editUserForm')[0].reset();
    });

    $('#editDataModal').on('hidden.bs.modal', function (e) {
        $('#editDataForm')[0].reset();
    });
});

// Chức năng quản lý người dùng
function addUser() {
    var form = document.getElementById("addUserForm");
    var requiredFields = ['name', 'email', 'password', 'role'];
    for (var i = 0; i < requiredFields.length; i++) {
        var field = requiredFields[i];
        if (!form[field].value) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: 'Vui lòng điền vào tất cả các trường bắt buộc.'
            });
            return;
        }
    }

    var formData = {
        name: $('#userName').val(),
        email: $('#userEmail').val(),
        password: $('#userPassword').val(),
        image: $('#userImage').val(),
        role: $('#userRole').val()
    };

    var submitButton = $('#addUserForm').find('button[type="submit"]');
    submitButton.prop('disabled', true);
    submitButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...');

    google.script.run
        .withSuccessHandler(function(response) {
            submitButton.prop('disabled', false).html('Thêm');
            $('#addUserForm')[0].reset();
            $('#addUserModal').modal('hide');
            
            showSuccessFlash(response, function() {
                loadUserData();
            });
        })
        .withFailureHandler(function(error) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: error.message || 'Không thể thêm người dùng. Vui lòng thử lại sau.'
            });
            submitButton.prop('disabled', false).html('Thêm');
        })
        .addUser(formData);
}

function editUser(id) {
    // Dùng ẩn hiện nhanh để hiển thị giao diện UI trước
    $('#editUserModal').modal('show');
    var userRow = $('#dataTable1').DataTable().row(function(idx, data, node) {
        return data[0] == id;
    }).data();
    
    if (userRow) {
        $('#editUserId').val(userRow[0]);
        $('#editUserName').val(userRow[1]);
        $('#editUserEmail').val(userRow[2]);
        $('#editUserImage').val(userRow[4]);
        $('#editUserRole').val(userRow[5]);
        $('#editUserPassword').val(''); // Mật khẩu sẽ được lấy từ server
        
        // Lấy dữ liệu chi tiết từ server
        google.script.run
            .withSuccessHandler(function(userData) {
                if (userData) {
                    $('#editUserPassword').val(userData[3]); // Cập nhật mật khẩu
                }
            })
            .getUserById(id);
    } else {
        setTimeout(function() {
            $('#editUserModal').modal('hide');
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: 'Không tìm thấy thông tin người dùng!'
            });
        }, 500);
    }
}

function updateUser() {
    var formData = {
        id: $('#editUserId').val(),
        name: $('#editUserName').val(),
        email: $('#editUserEmail').val(),
        password: $('#editUserPassword').val(),
        image: $('#editUserImage').val(),
        role: $('#editUserRole').val()
    };

    var submitButton = $('#editUserForm').find('button[type="submit"]');
    submitButton.prop('disabled', true);
    submitButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang cập nhật...');

    google.script.run
        .withSuccessHandler(function(response) {
            submitButton.prop('disabled', false).html('Cập nhật');
            $('#editUserModal').modal('hide');
            
            showSuccessFlash(response, function() {
                loadUserData();
            });
        })
        .withFailureHandler(function(error) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: error.message || 'Không thể cập nhật người dùng. Vui lòng thử lại sau.'
            });
            submitButton.prop('disabled', false).html('Cập nhật');
        })
        .editUser(formData);
}

function deleteUser(id) {
    Swal.fire({
        title: 'Xác nhận xóa',
        text: 'Bạn có chắc chắn muốn xóa người dùng này không?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            google.script.run
                .withSuccessHandler(function(response) {
                    showSuccessFlash(response, function() {
                        loadUserData();
                    });
                })
                .withFailureHandler(function(error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi!',
                        text: error.message || 'Không thể xóa người dùng. Vui lòng thử lại sau.'
                    });
                })
                .deleteUser(id);
        }
    });
}

// Hàm tải dữ liệu
function loadAllData() {
  // Cập nhật số liệu thống kê với email của người dùng hiện tại
  google.script.run
    .withSuccessHandler(function(data) {
      $('#totalData').text(data.total);
      $('#pendingCount').text(data.pending);
      $('#approvedCount').text(data.approved);
      $('#disapprovedCount').text(data.disapproved); 
    })
    .withFailureHandler(function(error) {
      console.error('Không thể lấy dữ liệu đếm:', error);
    })
    .getTotalDataCounts(currentUserEmail, currentUserRole);
  
  // Load dữ liệu người dùng nếu là admin
  if (isAdmin) {
    loadUserData();
  }
  
  // Luôn load tất cả dữ liệu báo cáo bất kể tab nào đang hiển thị
  loadPendingData();
  loadApprovedData();
  loadDisapprovedData();
}
    
function loadUserData() {
    if (isAdmin) {
        google.script.run
            .withSuccessHandler(function(data) {
                initializeDataTable('#dataTable1', data);
            })
            .getUserData();
    }
}
    
function loadPendingData() {
    google.script.run
        .withSuccessHandler(function(data) {
            initializeDataTable('#dataTable2', data);
        })
        .getPendingData(currentUserEmail, currentUserRole);
}
    
function loadApprovedData() {
    google.script.run
        .withSuccessHandler(function(data) {
            initializeDataTable('#dataTable3', data);
        })
        .getApprovedData(currentUserEmail, currentUserRole);
}
    
function loadDisapprovedData() {
    google.script.run
        .withSuccessHandler(function(data) {
            initializeDataTable('#dataTable4', data);
        })
        .getDisapprovedData(currentUserEmail, currentUserRole);
}

function initializeDataTable(tableId, data) {
    // Nếu bảng đã được khởi tạo, hủy nó trước
    if ($.fn.DataTable.isDataTable(tableId)) {
        $(tableId).DataTable().destroy();
    }
    
    var columns = [];
    var pageLength = 10;
    var responsiveConfig = {
        responsive: true,
        autoWidth: true
    };
    
    try {
        var parsedData = [];
        
        // Xử lý dữ liệu trống
        if (data && data.length > 0) {
            try {
                if (typeof data === 'string') {
                    parsedData = JSON.parse(data);
                } else {
                    parsedData = data;
                }
            } catch (e) {
                console.error("Lỗi parse dữ liệu:", e);
                parsedData = [];
            }
        }
        
        switch (tableId) {
            case '#dataTable1':
                columns = [
                    { title: "ID", data: 0 },
                    { title: "Họ và tên", data: 1 },
                    { title: "Email đăng nhập", data: 2 },
                    { 
                        title: "Hình ảnh", 
                        data: 4,
                        render: function(data, type, row) {
                            return type === 'display' ? 
                                '<img src="' + data + '" style="max-width:30px; max-height:30px;">' : 
                                data;
                        }
                    },
                    { title: "Chức vụ", data: 5 },
                    { 
                        title: "Hành động",
                        data: null,
                        render: function(data, type, row) {
                            if (type === 'display') {
                                return '<div class="d-flex">' +
                                    '<button class="btn btn-sm btn-primary btn-action me-1" onclick="editUser(' + row[0] + ')">' +
                                    '<i class="fa fa-edit"></i>' +
                                    '</button>' +
                                    '<button class="btn btn-sm btn-danger btn-action" onclick="deleteUser(' + row[0] + ')">' +
                                    '<i class="fa fa-trash"></i>' +
                                    '</button>' +
                                    '</div>';
                            }
                            return '';
                        }
                    }
                ];
                break;
            case '#dataTable2':
                columns = [
                    { title: "ID", data: 0 },
                    { title: "Họ và tên", data: 1 },
                    { title: "Email", data: 2 },
                    { title: "Chức vụ", data: 3 },
                    { title: "Báo cáo", data: 4 },
                    { 
                        title: "Tệp",
                        data: 5,
                        render: function(data, type, row) {
                            return type === 'display' && data ? 
                                '<a href="' + data + '" target="_blank" class="btn btn-sm btn-info"><i class="fas fa-folder-open"></i></a>' : 
                                '';
                        },
                        responsivePriority: 1
                    },
                    { title: "Trạng thái", data: 6, responsivePriority: 2 },
                    { 
                        title: "Ghi chú",
                        data: 7,
                        render: function(data, type, row) {
                            if (type === 'display' && data && data.length > 20) {
                                return '<span class="ellipsis-text">' + data.substr(0, 20) + 
                                    '... <a href="#" onclick="showFullDescription(\'' + 
                                    data.replace(/'/g, "\\'") + '\')">Xem</a></span>';
                            } else {
                                return data;
                            }
                        }
                    },
                    { 
                        title: "Hành động",
                        data: null,
                        render: function(data, type, row) {
                            if (type === 'display') {
                                return '<div class="d-flex">' +
                                    '<button class="btn btn-sm btn-primary btn-action me-1" onclick="editData(\'' + row[0] + '\')">' +
                                    '<i class="fa fa-edit"></i>' +
                                    '</button>' +
                                    '<button class="btn btn-sm btn-danger btn-action" onclick="deleteData(\'' + row[0] + '\')">' +
                                    '<i class="fa fa-trash"></i>' +
                                    '</button>' +
                                    '</div>';
                            }
                            return '';
                        },
                        responsivePriority: 4 
                    }
                ];
                break;
            case '#dataTable3':
            case '#dataTable4':
                columns = [
                    { title: "ID", data: 0 },
                    { title: "Họ và tên", data: 1 },
                    { title: "Email", data: 2 },
                    { title: "Chức vụ", data: 3 },
                    { title: "Báo cáo", data: 4 },
                    { 
                        title: "Tệp",
                        data: 5,
                        render: function(data, type, row) {
                            return type === 'display' && data ? 
                                '<a href="' + data + '" target="_blank" class="btn btn-sm btn-info"><i class="fas fa-folder-open"></i></a>' : 
                                '';
                        },
                        responsivePriority: 1
                    },
                    { title: "Trạng thái", data: 6, responsivePriority: 2 },
                    { 
                        title: "Ghi chú",
                        data: 7,
                        render: function(data, type, row) {
                            if (type === 'display' && data && data.length > 20) {
                                return '<span class="ellipsis-text">' + data.substr(0, 20) + 
                                    '... <a href="#" onclick="showFullDescription(\'' + 
                                    data.replace(/'/g, "\\'") + '\')">Xem</a></span>';
                            } else {
                                return data;
                            }
                        }
                    }
                ];
                break;
            default:
                break;
        }
        
        var language = {
            "sProcessing":   "Đang xử lý...",
            "sLengthMenu":   "Hiển thị _MENU_ mục",
            "sZeroRecords":  "Không tìm thấy kết quả",
            "sInfo":         "Hiển thị _START_ đến _END_ trong tổng số _TOTAL_ mục",
            "sInfoEmpty":    "Hiển thị 0 đến 0 trong tổng số 0 mục",
            "sInfoFiltered": "(được lọc từ _MAX_ mục)",
            "sInfoPostFix":  "",
            "sSearch":       "Tìm kiếm:",
            "sUrl":          "",
            "oPaginate": {
                "sFirst":    "Đầu",
                "sPrevious": "Trước",
                "sNext":     "Tiếp",
                "sLast":     "Cuối"
            }
        };
        
        var dom = '<"top"lf>rt<"bottom"ip>';
        
        $(tableId).DataTable({
            data: parsedData,
            columns: columns,
            paging: true,
            pageLength: pageLength,
            lengthMenu: [
                [10, 50, 100, 500, 1000, -1],
                [10, 50, 100, 500, 1000, "Tất cả"]
            ],
            dom: dom,
            language: language,
            ...responsiveConfig
        });
        
    } catch (error) {
        console.error("Lỗi khi khởi tạo DataTable:", error);
        console.error("Dữ liệu nhận được:", data);
        
        // Hiển thị bảng rỗng nếu có lỗi
        $(tableId).html('<div class="alert alert-warning">Không có dữ liệu để hiển thị</div>');
    }
}

function showFullDescription(description) {
    Swal.fire({
        title: 'Chi tiết ghi chú',
        html: description,
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
            container: 'description-popup'
        }
    });
}

function editData(id) {
    var userEmail = $('#user-email').text();
    
    // Hiển thị UI trước
    $('#editDataModal').modal('show');
    
    // Tìm dữ liệu từ DataTable trước (hiển thị nhanh)
    var dataTable = $('#dataTable2').DataTable();
    var rowData = dataTable.rows().data().toArray().find(row => row[0] == id);
    
    if (rowData) {
        $('#editId').val(rowData[0]);
        $('#editName').val(rowData[1]);
        $('#editEmail').val(rowData[2]);
        $('#editPosition').val(rowData[3]);
        $('#editReport').val(rowData[4]);
        $('#editFile').val(rowData[5]);
        $('#editStatus').val(rowData[6]);
        $('#editDescription').val(rowData[7]);
        
        // Sau đó lấy dữ liệu từ server để đảm bảo chính xác
        google.script.run
            .withSuccessHandler(function(data) {
                if (data && (data[2] === userEmail || isAdmin)) {
                    if (isAdmin) {
                        $('#statusContainer').show();
                        $('#descriptionContainer').show();
                    } else {
                        $('#statusContainer').hide();
                        $('#descriptionContainer').hide();
                    }
                } else if (!data) {
                    $('#editDataModal').modal('hide');
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi!',
                        text: 'Không tìm thấy dữ liệu cần sửa.'
                    });
                } else {
                    $('#editDataModal').modal('hide');
                    Swal.fire({
                        icon: 'error',
                        title: 'Không được phép!',
                        text: 'Bạn không có quyền chỉnh sửa dữ liệu này.'
                    });
                }
            })
            .withFailureHandler(function(error) {
                console.log('Lỗi lấy dữ liệu:', error);
            })
            .getDataById(id);
    } else {
        // Nếu không tìm thấy dữ liệu trong DataTable, lấy từ server
        google.script.run
            .withSuccessHandler(function(data) {
                if (data && (data[2] === userEmail || isAdmin)) {
                    $('#editId').val(data[0]);
                    $('#editName').val(data[1]);
                    $('#editEmail').val(data[2]);
                    $('#editPosition').val(data[3]);
                    $('#editReport').val(data[4]);
                    $('#editFile').val(data[5]);
                    $('#editStatus').val(data[6]);
                    $('#editDescription').val(data[7]);
                    
                    if (isAdmin) {
                        $('#statusContainer').show();
                        $('#descriptionContainer').show();
                    } else {
                        $('#statusContainer').hide();
                        $('#descriptionContainer').hide();
                    }
                } else if (!data) {
                    $('#editDataModal').modal('hide');
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi!',
                        text: 'Không tìm thấy dữ liệu cần sửa.'
                    });
                } else {
                    $('#editDataModal').modal('hide');
                    Swal.fire({
                        icon: 'error',
                        title: 'Không được phép!',
                        text: 'Bạn không có quyền chỉnh sửa dữ liệu này.'
                    });
                }
            })
            .withFailureHandler(function(error) {
                $('#editDataModal').modal('hide');
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi!',
                    text: 'Không thể lấy dữ liệu: ' + error
                });
            })
            .getDataById(id);
    }
}

$('#editDataForm').submit(function(event) {
    event.preventDefault();
    submitEditForm();
});

function submitEditForm() {
    var formData = {
        editId: $('#editId').val(),
        editName: $('#editName').val(),
        editEmail: $('#editEmail').val(),
        editPosition: $('#editPosition').val(),
        editReport: $('#editReport').val(),
        editFile: $('#editFile').val(),
        editStatus: $('#editStatus').val(),
        editDescription: $('#editDescription').val()
    };

    $('#editUpdateBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang cập nhật...');
    
    google.script.run
        .withSuccessHandler(function(response) {
            $('#editUpdateBtn').prop('disabled', false).html('Cập nhật');
            $('#editDataModal').modal('hide');
            
            showSuccessFlash(response, function() {
                // Làm mới dữ liệu
                loadPendingData();
                loadApprovedData();
                loadDisapprovedData();
                updateDataCounts();
            });
        })
        .withFailureHandler(function(error) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: error.message || 'Không thể cập nhật dữ liệu. Vui lòng thử lại sau.'
            });
            $('#editUpdateBtn').prop('disabled', false).html('Cập nhật');
        })
        .editData(formData);
}

function deleteData(id) {
    var userEmail = $('#user-email').text();
    
    // Nhanh chóng kiểm tra quyền từ UI (có thể từ dữ liệu đã hiển thị)
    var dataTable = $('#dataTable2').DataTable();
    var rowData = dataTable.rows().data().toArray().find(row => row[0] == id);
    
    if (rowData && (rowData[2] === userEmail || isAdmin)) {
        showDeleteConfirmation(id);
    } else {
        // Kiểm tra thêm từ server
        google.script.run
            .withSuccessHandler(function(data) {
                if (data && (data[2] === userEmail || isAdmin)) {
                    showDeleteConfirmation(id);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Không được phép!',
                        text: 'Bạn không có quyền xóa dữ liệu này.'
                    });
                }
            })
            .withFailureHandler(function(error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi!',
                    text: 'Không thể kiểm tra quyền: ' + error
                });
            })
            .getDataById(id);
    }
}

function showDeleteConfirmation(id) {
    Swal.fire({
        title: 'Xác nhận xóa:',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
    }).then((result) => {
        if (result.isConfirmed) {
            google.script.run
                .withSuccessHandler((response) => {
                    showSuccessFlash(response, function() {
                        loadPendingData();
                        updateDataCounts();
                    });
                })
                .withFailureHandler((error) => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi!',
                        text: error.message
                    });
                })
                .deleteData(id);
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const sidebarToggle = document.querySelector("#sidebar-toggle");
    sidebarToggle.addEventListener("click", function () {
        document.querySelector("#sidebar").classList.toggle("collapsed");
    });

    document.querySelector(".theme-toggle").addEventListener("click", () => {
        toggleLocalStorage();
        toggleRootClass();
    });
});

function toggleRootClass() {
    const current = document.documentElement.getAttribute('data-bs-theme');
    const inverted = current == 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', inverted);
}

function toggleLocalStorage() {
    if (isLight()) {
        localStorage.removeItem("light");
    } else {
        localStorage.setItem("light", "set");
    }
}

function isLight() {
    return localStorage.getItem("light");
}

function showContent(section) {
    var sections = document.getElementsByClassName('content-section');
    for (var i = 0; i < sections.length; i++) {
        sections[i].style.display = 'none';
    }
    document.getElementById(section).style.display = 'block';

    // Tải dữ liệu không hiển thị loading
    switch (section) {
        case 'userData':
            if (isAdmin) {
                loadUserData();
            }
            break;
        case 'dataPending':
            loadPendingData();
            break;
        case 'dataApproved':
            loadApprovedData();
            break;
        case 'dataDisapproved':
            loadDisapprovedData();
            break;
        default:
            break;
    }
}

function updateDataCounts() {
  google.script.run
    .withSuccessHandler(function(data) {
      $('#totalData').text(data.total);
      $('#pendingCount').text(data.pending);
      $('#approvedCount').text(data.approved);
      $('#disapprovedCount').text(data.disapproved); 
    })
    .withFailureHandler(function(error) {
      console.error('Không thể lấy dữ liệu đếm:', error);
    })
    .getTotalDataCounts(currentUserEmail, currentUserRole);
}

function startPolling() {
    updateDataCounts();
    setInterval(updateDataCounts, 30000); // Cập nhật mỗi 30 giây
}

startPolling();

function showDashboardAndUserData() {
    var sections = document.getElementsByClassName('content-section');
    for (var i = 0; i < sections.length; i++) {
        sections[i].style.display = 'none';
    }
    document.getElementById('dashboard').style.display = 'block';
    
    if (isAdmin) {
        document.getElementById('userData').style.display = 'block';
        loadUserData();
    }
}

function populateFields() {
    var userNameElement = document.getElementById('user-name');
    var userEmailElement = document.getElementById('user-email');
    var nameInput = document.getElementById('name');
    var emailInput = document.getElementById('email');
    
    if (userNameElement && nameInput) {
        nameInput.value = userNameElement.textContent.trim();
    }

    if (userEmailElement && emailInput) {
        emailInput.value = userEmailElement.textContent.trim();
    }
}

var addDataModal = document.getElementById('addDataModal');
addDataModal.addEventListener('shown.bs.modal', function () {
    populateFields();
    google.script.run.withSuccessHandler(populatePositionDropdowns).doGetPositionOptions();
});

var editDataModal = document.getElementById('editDataModal');
editDataModal.addEventListener('shown.bs.modal', function() {
    google.script.run.withSuccessHandler(populatePositionDropdowns).doGetPositionOptions();
});

function populatePositionDropdowns(positionOptions) {
    var positionDropdown = document.getElementById('position');
    var editPositionDropdown = document.getElementById('editPosition');

    if (positionDropdown) {
        positionDropdown.innerHTML = "";
        positionOptions.forEach(function(option) {
            var optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            positionDropdown.appendChild(optionElement);
        });
    }

    if (editPositionDropdown) {
        editPositionDropdown.innerHTML = "";
        positionOptions.forEach(function(option) {
            var optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            editPositionDropdown.appendChild(optionElement);
        });
    }
}
</script>
