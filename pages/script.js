import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, doc, getDoc, addDoc, 
    updateDoc, deleteDoc, setDoc, query, where
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-jf9O0q7XcWPv6XsKiiVpfk_PWtxLUpo",
  authDomain: "dgkd-61f70.firebaseapp.com",
  projectId: "dgkd-61f70",
  storageBucket: "dgkd-61f70.firebasestorage.app",
  messagingSenderId: "1076873818581",
  appId: "1:1076873818581:web:fc320dde761af4c0574d5c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let state = {
    paymentRates: [], 
    faculties: [], degrees: [], semesters: [], courses: [], teachers: [],
    courseSections: [], assignments: [], teacherCoefficients: [],
    currentEntity: null, currentId: null,
    facultyChart: null, degreeChart: null, semesterChart: null,
    currentReportData: [] 
};

// =================================================================================
// AUTHENTICATION
// =================================================================================
onAuthStateChanged(auth, user => {
    if (user) {
        document.body.classList.add('auth-visible');
        document.getElementById('user-email').textContent = user.email;
        initializeAppLogic();
    } else {
        window.location.replace('login.html');
    }
});

const logout = () => signOut(auth).catch(error => console.error("Sign out error:", error));

// =================================================================================
// APP INITIALIZATION
// =================================================================================
const initializeAppLogic = () => {
    setupEventListeners();
    fetchAllData();
};

// =================================================================================
// DATA HANDLING
// =================================================================================
const fetchData = async (collectionName) => {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const fetchAllData = async () => {
    try {
        const dataPromises = Object.keys(GENERIC_CONFIG).map(key => fetchData(GENERIC_CONFIG[key].collection));
        const results = await Promise.all(dataPromises);
        Object.keys(GENERIC_CONFIG).forEach((key, index) => {
            state[key] = results[index];
        });
        renderAllDynamicSections();
        updateDashboard();
        populateReportFilters();
    } catch (error) {
        console.error("Error fetching all data:", error);
        alert("Lỗi tải dữ liệu từ server. Vui lòng kiểm tra lại Firestore Rules và kết nối mạng.");
    }
};

const findById = (array, id) => array.find(item => item.id === id);

// =================================================================================
// CONFIGURATION OBJECT
// =================================================================================
const GENERIC_CONFIG = {
    paymentRates: {
        key: 'paymentRates', name: "Định mức", collection: "payment_rates",
        fields: [
            { name: 'semesterId', label: 'Kỳ học', type: 'select', options: () => state.semesters, optionLabel: (s) => `${s.name} (${s.schoolYear})`, required: true },
            { name: 'pricePerUnit', label: 'Định mức tiền/tiết (VNĐ)', type: 'number', required: true, min: 0 }
        ],
        columns: [
            { header: 'Kỳ học', render: i => { const s = findById(state.semesters, i.semesterId); return s ? `${s.name} (${s.schoolYear})` : 'N/A'; }},
            { header: 'Định mức (VNĐ/tiết)', render: i => i.pricePerUnit.toLocaleString('vi-VN') },
            { header: 'Ngày cập nhật', render: i => i.timestamp ? new Date(i.timestamp.seconds * 1000).toLocaleDateString('vi-VN') : 'N/A' }
        ]
    },
    faculties: {
        key: 'faculties', name: "Khoa", collection: "faculties",
        fields: [
            { name: 'name', label: 'Tên đầy đủ', type: 'text', required: true },
            { name: 'shortName', label: 'Tên viết tắt', type: 'text', required: true },
            { name: 'description', label: 'Mô tả nhiệm vụ', type: 'textarea' }
        ],
        columns: [
            { header: 'Tên đầy đủ', render: i => i.name },
            { header: 'Tên viết tắt', render: i => i.shortName },
            { header: 'Mô tả', render: i => i.description }
        ]
    },
    degrees: {
        key: 'degrees', name: "Bằng cấp", collection: "degrees",
        fields: [
            { name: 'name', label: 'Tên đầy đủ', type: 'text', required: true },
            { name: 'shortName', label: 'Tên viết tắt', type: 'text', required: true }
        ],
        columns: [
            { header: 'Tên đầy đủ', render: i => i.name },
            { header: 'Tên viết tắt', render: i => i.shortName }
        ]
    },
    teachers: {
        key: 'teachers', name: "Giáo viên", collection: "teachers",
        fields: [
            { name: 'teacherId', label: 'Mã số giáo viên', type: 'text', placeholder: 'Để trống để tự sinh mã GVxxxx' },
            { name: 'name', label: 'Họ và tên', type: 'text', required: true },
            { name: 'dob', label: 'Ngày sinh', type: 'date', required: true },
            { name: 'phone', label: 'Điện thoại', type: 'tel', required: true, pattern: "\\d{9,11}", title: "Số điện thoại phải có từ 9-11 chữ số." },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'facultyId', label: 'Thuộc khoa', type: 'select', options: () => state.faculties, required: true },
            { name: 'degreeId', label: 'Bằng cấp', type: 'select', options: () => state.degrees, required: true }
        ],
        columns: [
            { header: 'Mã số', render: i => i.teacherId },
            { header: 'Họ tên', render: i => i.name },
            { header: 'Khoa', render: i => findById(state.faculties, i.facultyId)?.name || 'N/A' },
            { header: 'Bằng cấp', render: i => findById(state.degrees, i.degreeId)?.name || 'N/A' },
            { header: 'Email', render: i => i.email },
            { header: 'Điện thoại', render: i => i.phone }
        ]
    },
    courses: {
        key: 'courses', name: "Học phần", collection: "courses",
        fields: [
            { name: 'courseCode', label: 'Mã học phần', type: 'text', required: true },
            { name: 'name', label: 'Tên học phần', type: 'text', required: true, pattern: "^[^0-9]*$", title: "Tên học phần không được chứa số." },
            { name: 'credits', label: 'Số tín chỉ', type: 'number', required: true, min: 0 },
            { name: 'periods', label: 'Số tiết', type: 'number', required: true, min: 0 },
            { name: 'coefficient', label: 'Hệ số học phần', type: 'number', required: true, min: 1, max: 1.5, step: 0.1 }
        ],
        columns: [
            { header: 'Mã HP', render: i => i.courseCode },
            { header: 'Tên Học phần', render: i => i.name },
            { header: 'Số tín chỉ', render: i => i.credits },
            { header: 'Số tiết', render: i => i.periods },
            { header: 'Hệ số HP', render: i => i.coefficient }
        ]
    },
    semesters: {
        key: 'semesters', name: "Kỳ học", collection: "semesters",
        fields: [
            { name: 'name', label: 'Tên kỳ', type: 'text', required: true, placeholder: "Ví dụ: 1" },
            { name: 'schoolYear', label: 'Năm học', type: 'text', required: true, placeholder: "Ví dụ: 2024-2025", pattern: "^\\d{4}-\\d{4}$", title: "Năm học phải có định dạng YYYY-YYYY" },
            { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
            { name: 'endDate', label: 'Ngày kết thúc', type: 'date', required: true }
        ],
        columns: [
            { header: 'Tên kỳ', render: i => i.name },
            { header: 'Năm học', render: i => i.schoolYear },
            { header: 'Bắt đầu', render: i => i.startDate },
            { header: 'Kết thúc', render: i => i.endDate }
        ]
    },
    courseSections: {
        key: 'courseSections', name: "Lớp học phần", collection: "course_sections",
        fields: [
            { name: 'sectionCode', label: 'Mã lớp', type: 'text', required: true },
            { name: 'className', label: 'Tên lớp', type: 'text', required: true },
            { name: 'courseId', label: 'Học phần', type: 'select', options: () => state.courses, required: true },
            { name: 'semesterId', label: 'Kỳ học', type: 'select', options: () => state.semesters, optionLabel: (s) => `${s.name} (${s.schoolYear})`, required: true },
            { name: 'studentCount', label: 'Sĩ số', type: 'number', required: true, min: 0 },
            { name: 'classCount', label: 'Số lượng lớp mở', type: 'number', required: true, min: 1, max: 50 },
        ],
        columns: [
            { header: 'Mã Lớp', render: i => i.sectionCode },
            { header: 'Tên Lớp', render: i => i.className },
            { header: 'Học phần', render: i => findById(state.courses, i.courseId)?.name || 'N/A' },
            { header: 'Kỳ học', render: i => { const s = findById(state.semesters, i.semesterId); return s ? `${s.name} (${s.schoolYear})` : 'N/A'; }},
            { header: 'Sĩ số', render: i => i.studentCount },
            { header: 'SL Lớp mở', render: i => i.classCount },
        ]
    },
    assignments: {
        key: 'assignments', name: "Phân công", collection: "assignments",
        fields: [
            { name: 'courseSectionId', label: 'Lớp học phần', type: 'select', options: () => state.courseSections, optionLabel: 'sectionCode', required: true },
            { name: 'teacherId', label: 'Giáo viên', type: 'select', options: () => state.teachers, required: true }
        ],
        columns: [
            { header: 'Lớp học phần', render: i => findById(state.courseSections, i.courseSectionId)?.sectionCode || 'N/A' },
            { header: 'Học phần', render: i => findById(state.courses, findById(state.courseSections, i.courseSectionId)?.courseId)?.name || 'N/A' },
            { header: 'Giáo viên được phân công', render: i => findById(state.teachers, i.teacherId)?.name || 'N/A' },
            { 
                header: 'Suất dạy đã gán', 
                render: i => {
                    const section = findById(state.courseSections, i.courseSectionId);
                    if (!section) return 'N/A';
                    const assignedCount = state.assignments.filter(a => a.courseSectionId === i.courseSectionId).length;
                    return `${assignedCount} / ${section.classCount}`;
                } 
            }
        ]
    },
    teacherCoefficients: {
        key: 'teacherCoefficients', name: "Hệ số theo Bằng cấp", collection: "teacher_coefficients",
        fields: [
            { name: 'degreeId', label: 'Bằng cấp', type: 'select', options: () => state.degrees, required: true },
            // THAY ĐỔI DUY NHẤT NẰM Ở DÒNG NÀY
            { name: 'coefficient', label: 'Hệ số', type: 'number', required: true, min: 1, max: 3, step: 0.1 }
        ],
        columns: [
            { header: 'Bằng cấp', render: i => findById(state.degrees, i.degreeId)?.name || 'N/A' },
            { header: 'Hệ số', render: i => i.coefficient }
        ]
    }
};

// =================================================================================
// UI RENDERING
// =================================================================================
const renderAllDynamicSections = () => {
    GENERIC_CONFIG['paymentRates'].name = "Định mức tiền/tiết";
    renderGenericSection('paymentRates', state.paymentRates, 'settings-management-section');
    for (const key in GENERIC_CONFIG) {
        if (key === 'paymentRates') continue;
        const config = GENERIC_CONFIG[key];
        const sectionId = `${config.key}-management-section`;
        renderGenericSection(key, state[key], sectionId);
    }
};
const renderGenericSection = (configKey, data, sectionId) => {
    const config = GENERIC_CONFIG[configKey];
    const container = document.getElementById(sectionId);
    if (!container) return;
    const tableHeaders = config.columns.map(col => `<th>${col.header}</th>`).join('');
    const renderTableBody = (items) => items.map(item => `
        <tr>
            ${config.columns.map(col => `<td>${col.render(item)}</td>`).join('')}
            <td class="action-buttons">
                <button class="btn-edit" title="Sửa" onclick="window.openFormModal('${config.key}', '${item.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" title="Xóa" onclick="window.deleteItem('${config.key}', '${item.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    container.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Quản lý ${config.name}</h2>
            <div class="search-bar">
                <i class="fas fa-search"></i>
                <input type="text" id="${sectionId}-search" placeholder="Tìm kiếm...">
            </div>
            <button class="btn btn-primary" onclick="window.openFormModal('${config.key}')">
                <i class="fas fa-plus"></i> Thêm ${config.name}
            </button>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead><tr>${tableHeaders}<th>Hành động</th></tr></thead>
                <tbody id="${sectionId}-table-body">${renderTableBody(data)}</tbody>
            </table>
        </div>
    `;
    document.getElementById(`${sectionId}-search`).addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = state[configKey].filter(item => 
            config.columns.some(col => String(col.render(item)).toLowerCase().includes(searchTerm))
        );
        document.getElementById(`${sectionId}-table-body`).innerHTML = renderTableBody(filteredData);
    });
};

// =================================================================================
// DASHBOARD & CHARTS
// =================================================================================
const updateDashboard = () => {
    document.getElementById('total-teachers').textContent = state.teachers.length;
    document.getElementById('total-courses').textContent = state.courses.length;
    document.getElementById('total-courseSections').textContent = state.courseSections.length;
    document.getElementById('total-assignments').textContent = state.assignments.length;
    updateChart('facultyChart', 'faculty-chart', 'doughnut', state.faculties, state.teachers, 'facultyId', 'Giáo viên theo Khoa');
    updateChart('degreeChart', 'degree-chart', 'bar', state.degrees, state.teachers, 'degreeId', 'Giáo viên theo Bằng cấp');
    updateChart('semesterChart', 'semester-chart', 'pie', state.semesters, state.courseSections, 'semesterId', 'Lớp học phần theo Kỳ học');
};
const updateChart = (chartStateKey, canvasId, type, masterData, countData, countField, label) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const counts = masterData.map(masterItem => ({
        name: masterItem.name,
        count: countData.filter(item => item[countField] === masterItem.id).length
    }));
    if (state[chartStateKey]) state[chartStateKey].destroy();
    state[chartStateKey] = new Chart(ctx, {
        type: type,
        data: { 
            labels: counts.map(c => c.name), 
            datasets: [{ 
                label: label, 
                data: counts.map(c => c.count), 
                backgroundColor: ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#34495e', '#1abc9c', '#e67e22', '#ecf0f1'] 
            }] 
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

// =================================================================================
// PAYMENT CALCULATION & REPORTS
// =================================================================================
const getClassCoefficient = (studentCount) => {
    if (studentCount < 20) return -0.3;
    if (studentCount <= 29) return -0.2;
    if (studentCount <= 39) return -0.1;
    if (studentCount <= 49) return 0;
    if (studentCount <= 59) return 0.1;
    if (studentCount <= 69) return 0.2;
    if (studentCount <= 79) return 0.3; 
    return 0.3;
};

const calculateTeacherPaymentForSemester = (teacherId, semesterId) => {
    const paymentRateDoc = state.paymentRates.find(rate => rate.semesterId === semesterId);
    const pricePerUnit = paymentRateDoc ? paymentRateDoc.pricePerUnit : 0;
    
    if (pricePerUnit === 0) {
        return { details: [], totalPayment: 0, missingRate: true };
    }

    const teacher = findById(state.teachers, teacherId);
    if (!teacher) return { details: [], totalPayment: 0 };
    
    const teacherCoeffItem = state.teacherCoefficients.find(tc => tc.degreeId === teacher.degreeId);
    const teacherCoeff = teacherCoeffItem ? teacherCoeffItem.coefficient : 0;

    const relevantAssignments = state.assignments.filter(a => a.teacherId === teacherId);
    const paymentDetails = [];
    let totalPayment = 0;

    relevantAssignments.forEach(assignment => {
        const courseSection = findById(state.courseSections, assignment.courseSectionId);
        if (courseSection && courseSection.semesterId === semesterId) {
            const course = findById(state.courses, courseSection.courseId);
            if (course) {
                const classCoeff = getClassCoefficient(courseSection.studentCount);
                const courseCoeff = course.coefficient || 0;
                const periods = course.periods || 0;
                const paymentForClass = periods * (classCoeff + courseCoeff) * teacherCoeff * pricePerUnit;
                totalPayment += paymentForClass;
                paymentDetails.push({
                    sectionCode: courseSection.sectionCode,
                    courseName: course.name,
                    periods: periods,
                    classCoefficient: classCoeff,
                    courseCoefficient: courseCoeff,
                    teacherCoefficient: teacherCoeff,
                    payment: paymentForClass
                });
            }
        }
    });

    return { details: paymentDetails, totalPayment: totalPayment };
};

const displayPaymentCalculationResult = () => {
    const teacherId = document.getElementById('calc-teacher-select').value;
    const semesterId = document.getElementById('calc-semester-select').value;
    const container = document.getElementById('payment-result-container');

    if (!teacherId || !semesterId) {
        container.innerHTML = `<p style="padding: 20px; text-align: center;">Vui lòng chọn giáo viên và kỳ học.</p>`;
        return;
    }
    const paymentRateDoc = state.paymentRates.find(rate => rate.semesterId === semesterId);
    if (!paymentRateDoc || paymentRateDoc.pricePerUnit === 0) {
        alert(`Kỳ học này chưa được thiết lập định mức tiền/tiết. Vui lòng thiết lập để tính lương.`);
        container.innerHTML = `<p style="padding: 20px; text-align: center;">Chưa có định mức cho kỳ học này. Vui lòng vào mục 'Tính tiền & Hệ số' > 'Định mức tiền/tiết' để thiết lập.</p>`;
        return;
    }
    
    const { details, totalPayment } = calculateTeacherPaymentForSemester(teacherId, semesterId);

    if (details.length === 0) {
        container.innerHTML = `<p style="padding: 20px; text-align: center;">Không có dữ liệu phân công cho giáo viên này trong kỳ học đã chọn.</p>`;
        return;
    }

    const tableRows = details.map(d => `
        <tr>
            <td>${d.sectionCode}</td>
            <td>${d.courseName}</td>
            <td>${d.periods}</td>
            <td>${d.classCoefficient}</td>
            <td>${d.courseCoefficient}</td>
            <td>${d.teacherCoefficient}</td>
            <td style="font-weight: bold;">${d.payment.toLocaleString('vi-VN')} VNĐ</td>
        </tr>
    `).join('');
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã Lớp HP</th><th>Tên Học phần</th><th>Số tiết</th><th>HS Lớp</th>
                    <th>HS Học phần</th><th>HS Bằng cấp (GV)</th><th>Tiền lớp</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
        <div class="payment-summary">
            <h3>Tổng tiền dạy (ước tính): <span>${totalPayment.toLocaleString('vi-VN')} VNĐ</span></h3>
        </div>
    `;
};

const renderReportTable = (data) => {
    const container = document.getElementById('report-content-container');
    if (data.length === 0) {
        container.innerHTML = `<p style="padding: 20px; text-align: center;">Không có dữ liệu thanh toán cho các lựa chọn này.</p>`;
        return;
    }
    const tableRows = data.sort((a,b) => b.totalPayment - a.totalPayment).map(d => `
        <tr>
            <td>${d.teacherName}</td>
            <td>${d.facultyName}</td>
            <td style="font-weight: bold;">${d.totalPayment.toLocaleString('vi-VN')} VNĐ</td>
        </tr>
    `).join('');
    container.innerHTML = `
         <table class="data-table">
            <thead>
                <tr>
                    <th>Tên Giáo viên</th>
                    <th>Khoa</th>
                    <th>Tổng tiền dạy (ước tính)</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>`;
};

const displayReportSummary = (data) => {
    const summaryContainer = document.getElementById('report-summary-container');
    const totalSalary = data.reduce((sum, item) => sum + item.totalPayment, 0);
    
    if (totalSalary > 0) {
        summaryContainer.innerHTML = `
            <div class="report-summary">
                <h3>Tổng lương báo cáo: <span>${totalSalary.toLocaleString('vi-VN')} VNĐ</span></h3>
            </div>
        `;
    } else {
        summaryContainer.innerHTML = '';
    }
};

const generateReport = () => {
    const reportType = document.getElementById('report-type-select').value;
    const schoolYear = document.getElementById('report-year-select').value;
    const container = document.getElementById('report-content-container');
    const summaryContainer = document.getElementById('report-summary-container');
    const searchInput = document.getElementById('report-search-input');
    const exportBtn = document.getElementById('export-report-btn');

    container.innerHTML = '';
    summaryContainer.innerHTML = '';
    searchInput.value = '';
    state.currentReportData = [];
    exportBtn.disabled = true;

    if (!schoolYear) {
        container.innerHTML = `<p style="padding: 20px; text-align: center;">Vui lòng chọn năm học để xem báo cáo.</p>`;
        return;
    }

    const semestersInYear = state.semesters.filter(s => s.schoolYear === schoolYear);
    if (semestersInYear.length === 0) {
        container.innerHTML = `<p style="padding: 20px; text-align: center;">Không có dữ liệu kỳ học cho năm ${schoolYear}.</p>`;
        return;
    }

    let teachersToReport = [];
    if (reportType === 'school') {
        teachersToReport = state.teachers;
    } else {
        const facultyId = document.getElementById('report-faculty-select').value;
        if (!facultyId) {
             container.innerHTML = `<p style="padding: 20px; text-align: center;">Vui lòng chọn khoa để xem báo cáo.</p>`;
             return;
        }
        teachersToReport = state.teachers.filter(t => t.facultyId === facultyId);
    }

    const reportData = teachersToReport.map(teacher => {
        let totalYearlyPayment = 0;
        semestersInYear.forEach(semester => {
            const { totalPayment } = calculateTeacherPaymentForSemester(teacher.id, semester.id);
            totalYearlyPayment += totalPayment;
        });
        return {
            teacherName: teacher.name,
            facultyName: findById(state.faculties, teacher.facultyId)?.name || 'N/A',
            totalPayment: totalYearlyPayment
        };
    }).filter(d => d.totalPayment > 0);
    
    state.currentReportData = reportData;
    renderReportTable(state.currentReportData);
    displayReportSummary(state.currentReportData);

    if (reportData.length > 0) {
        exportBtn.disabled = false;
    }
};

const populateReportFilters = () => {
    const teacherSelect = document.getElementById('calc-teacher-select');
    const semesterSelect = document.getElementById('calc-semester-select');
    const facultyReportSelect = document.getElementById('report-faculty-select');
    const yearReportSelect = document.getElementById('report-year-select');

    teacherSelect.innerHTML = '<option value="">-- Chọn giáo viên --</option>' + state.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    semesterSelect.innerHTML = '<option value="">-- Chọn kỳ học --</option>' + state.semesters.map(s => `<option value="${s.id}">${s.name} (${s.schoolYear})</option>`).join('');
    facultyReportSelect.innerHTML = '<option value="">-- Chọn khoa --</option>' + state.faculties.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    
    const schoolYears = [...new Set(state.semesters.map(s => s.schoolYear))].sort().reverse();
    yearReportSelect.innerHTML = '<option value="">-- Chọn năm học --</option>' + schoolYears.map(y => `<option value="${y}">${y}</option>`).join('');
};

const exportReportToCSV = () => {
    if (!state.currentReportData || state.currentReportData.length === 0) {
        alert("Không có dữ liệu báo cáo để xuất.");
        return;
    }

    const headers = ['Tên Giáo viên', 'Khoa', 'Tổng tiền dạy (VNĐ)'];
    
    const csvRows = state.currentReportData.map(row => {
        const teacherName = `"${row.teacherName.replace(/"/g, '""')}"`;
        const facultyName = `"${row.facultyName.replace(/"/g, '""')}"`;
        const totalPayment = row.totalPayment;
        return [teacherName, facultyName, totalPayment].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const reportDate = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
        link.setAttribute("href", url);
        link.setAttribute("download", `Bao_cao_tien_day_${reportDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// =================================================================================
// MODAL & FORM HANDLING
// =================================================================================
window.openFormModal = (configKey, id = null) => {
    state.currentEntity = configKey;
    state.currentId = id;
    const config = GENERIC_CONFIG[configKey];
    let currentData = id ? findById(state[configKey], id) || {} : {};
    document.getElementById('modal-title').textContent = `${id ? 'Chỉnh sửa' : 'Thêm'} ${config.name}`;
    const formContainer = document.getElementById('modal-form');
    formContainer.innerHTML = config.fields.map(field => {
        const value = currentData[field.name] || '';
        const required = field.required ? 'required' : '';
        const title = field.title ? `title="${field.title}"` : '';
        const pattern = field.pattern ? `pattern="${field.pattern}"` : '';
        const min = field.min !== undefined ? `min="${field.min}"` : '';
        const max = field.max !== undefined ? `max="${field.max}"` : '';
        const step = field.step ? `step="${field.step}"` : '';
        if (field.type === 'select') {
            const options = field.options();
            const optionLabelFunc = typeof field.optionLabel === 'function' ? field.optionLabel : (opt) => opt[field.optionLabel || 'name'];
            return `<div class="form-group"><label for="${field.name}">${field.label}</label><select id="${field.name}" name="${field.name}" ${required}><option value="">-- Chọn ${field.label} --</option>${options.map(opt => `<option value="${opt.id}" ${opt.id === value ? 'selected' : ''}>${optionLabelFunc(opt)}</option>`).join('')}</select></div>`;
        }
        if (field.type === 'textarea') {
            return `<div class="form-group"><label for="${field.name}">${field.label}</label><textarea id="${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}" ${required}>${value}</textarea></div>`;
        }
        return `<div class="form-group"><label for="${field.name}">${field.label}</label><input type="${field.type}" id="${field.name}" name="${field.name}" value="${value}" placeholder="${field.placeholder || ''}" ${required} ${title} ${pattern} ${min} ${max} ${step}></div>`;
    }).join('');
    document.getElementById('form-modal').style.display = 'flex';
};
const closeModal = () => {
    document.getElementById('form-modal').style.display = 'none';
    document.getElementById('modal-form').innerHTML = '';
};
const saveForm = async () => {
    const config = GENERIC_CONFIG[state.currentEntity];
    const form = document.getElementById('modal-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    const data = {};
    for (const field of config.fields) {
        const input = document.getElementById(field.name);
        data[field.name] = input.type === 'number' ? Number(input.value) : input.value;
    }
    try {
        if (config.key === 'teachers' && !data.teacherId) {
            data.teacherId = `GV${Math.floor(1000 + Math.random() * 9000)}`;
        }
        if (config.key === 'paymentRates') {
            data.timestamp = new Date();
        }
        const uniqueChecks = [
            { key: 'teachers', field: 'teacherId' }, { key: 'courses', field: 'courseCode' },
            { key: 'courseSections', field: 'sectionCode' }, { key: 'teacherCoefficients', field: 'degreeId' },
            { key: 'faculties', field: 'name' }, { key: 'faculties', field: 'shortName' },
            { key: 'degrees', field: 'name' }, { key: 'degrees', field: 'shortName' },
            { key: 'paymentRates', field: 'semesterId'}
        ];
        for (const check of uniqueChecks) {
            if (config.key === check.key) {
                if (state[check.key].some(item => item[check.field] === data[check.field] && item.id !== state.currentId)) {
                    throw new Error(`Giá trị '${data[check.field]}' cho trường này đã tồn tại.`);
                }
            }
        }
        if (config.key === 'semesters') {
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            if (endDate < startDate) throw new Error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
            const threeMonthsLater = new Date(new Date(data.startDate).setMonth(new Date(data.startDate).getMonth() + 3));
            if (endDate > threeMonthsLater) throw new Error("Kỳ học phải diễn ra trong vòng 3 tháng.");
        }
        if (config.key === 'assignments') {
            const courseSection = findById(state.courseSections, data.courseSectionId);
            if (!courseSection) throw new Error("Không tìm thấy lớp học phần đã chọn.");
            const maxSlots = courseSection.classCount || 1;
            const currentAssignments = state.assignments.filter(a => a.courseSectionId === data.courseSectionId).length;
            if (currentAssignments >= maxSlots && !state.currentId) {
                throw new Error(`Lớp học phần này đã được phân công đủ ${maxSlots} giáo viên.`);
            }
        }
        if (state.currentId) {
            await updateDoc(doc(db, config.collection, state.currentId), data);
        } else {
            await addDoc(collection(db, config.collection), data);
        }
        alert(`Đã lưu ${config.name} thành công!`);
        closeModal();
        fetchAllData();
    } catch (error) {
        console.error("Error saving data: ", error);
        alert(`Lỗi khi lưu dữ liệu: ${error.message}`);
    }
};
window.deleteItem = async (configKey, id) => {
    const config = GENERIC_CONFIG[configKey];
    if (!confirm(`Bạn có chắc chắn muốn xóa ${config.name} này không? Thao tác này không thể hoàn tác.`)) return;
    try {
        if (config.key === 'faculties' && state.teachers.some(t => t.facultyId === id)) {
            throw new Error("Không thể xóa Khoa vì vẫn còn giáo viên thuộc khoa này.");
        }
        if (config.key === 'degrees' && (state.teachers.some(t => t.degreeId === id) || state.teacherCoefficients.some(tc => tc.degreeId === id))) {
             throw new Error("Không thể xóa Bằng cấp vì vẫn còn giáo viên hoặc hệ số đang sử dụng bằng cấp này.");
        }
        if (config.key === 'courses' && state.courseSections.some(cs => cs.courseId === id)) {
            throw new Error("Không thể xóa Học phần vì vẫn còn Lớp học phần thuộc học phần này.");
        }
        if (config.key === 'semesters' && (state.courseSections.some(cs => cs.semesterId === id) || state.paymentRates.some(pr => pr.semesterId === id))) {
            throw new Error("Không thể xóa Kỳ học vì vẫn còn Lớp học phần hoặc Định mức thuộc kỳ học này.");
        }
        if (config.key === 'teachers' && state.assignments.some(a => a.teacherId === id)) {
            throw new Error("Không thể xóa Giáo viên vì vẫn còn phân công giảng dạy cho giáo viên này.");
        }
        if (config.key === 'courseSections' && state.assignments.some(a => a.courseSectionId === id)) {
            throw new Error("Không thể xóa Lớp học phần vì đã có phân công giảng dạy cho lớp này.");
        }
        await deleteDoc(doc(db, config.collection, id));
        alert(`${config.name} đã được xóa.`);
        fetchAllData();
    } catch (error) {
        console.error("Error deleting document: ", error);
        alert(`Lỗi khi xóa: ${error.message}`);
    }
};

// =================================================================================
// EVENT LISTENERS
// =================================================================================
const setupEventListeners = () => {
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('calculate-payment-btn').addEventListener('click', displayPaymentCalculationResult);
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
    
    document.getElementById('export-report-btn').addEventListener('click', exportReportToCSV);
    
    document.getElementById('report-type-select').addEventListener('change', e => {
        document.getElementById('report-faculty-filter-group').style.display = e.target.value === 'faculty' ? 'block' : 'none';
    });

    document.getElementById('report-search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const dataToFilter = state.currentReportData || [];
        if (dataToFilter.length > 0) {
            const filteredData = dataToFilter.filter(item => 
                item.teacherName.toLowerCase().includes(searchTerm)
            );
            renderReportTable(filteredData);
            displayReportSummary(filteredData);
        }
    });

    const menuItems = document.querySelectorAll('.menu-item, .submenu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionIdToShow = this.dataset.section;
            if (this.classList.contains('has-submenu')) {
                this.classList.toggle('active');
                this.nextElementSibling.classList.toggle('open');
                return;
            }
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            let parentMenu = this.closest('.submenu')?.previousElementSibling;
            if(parentMenu) {
                parentMenu.classList.add('active');
            }
            if (sectionIdToShow) {
                document.querySelectorAll('.main-content .section').forEach(s => s.classList.remove('active'));
                let targetSection = document.getElementById(`${sectionIdToShow}-section`);
                if (!targetSection) {
                    targetSection = document.getElementById(sectionIdToShow);
                }
                if (targetSection) {
                    targetSection.classList.add('active');
                    document.getElementById('header-title').textContent = this.textContent.trim();
                }
            }
        });
    });

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('modal-save-btn').addEventListener('click', saveForm);
};

// Expose functions to global scope
window.openFormModal = openFormModal;
window.deleteItem = deleteItem;