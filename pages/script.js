import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, doc, getDoc, 
    addDoc, updateDoc, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-jf9O0q7XcWPv6XsKiiVpfk_PWtxLUpo",
  authDomain: "dgkd-61f70.firebaseapp.com",
  projectId: "dgkd-61f70",
  storageBucket: "dgkd-61f70.firebasestorage.app",
  messagingSenderId: "1076873818581",
  appId: "1:1076873818581:web:fc320dde761af4c0574d5c"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Biến toàn cục để lưu trữ dữ liệu và trạng thái
let state = {
    settings: { pricePerUnit: 0 },
    faculties: [],
    degrees: [],
    semesters: [],
    courses: [],
    teachers: [],
    courseSections: [],
    assignments: [],
    currentEntity: null,
    currentId: null,
    facultyChart: null,
    degreeChart: null
};

// =================================================================================
// AUTHENTICATION (XÁC THỰC)
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
// APP INITIALIZATION (KHỞI TẠO LOGIC ỨNG DỤNG)
// =================================================================================
const initializeAppLogic = () => {
    setupEventListeners();
    fetchAllData();
};

// =================================================================================
// DATA HANDLING (XỬ LÝ DỮ LIỆU)
// =================================================================================
const fetchData = async (collectionName) => {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const fetchSettings = async () => {
    const docRef = doc(db, 'settings', 'main');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return { pricePerUnit: 0 }; // Default value
};

const fetchAllData = async () => {
    try {
        const dataPromises = Object.keys(GENERIC_CONFIG).map(key => fetchData(GENERIC_CONFIG[key].collection));
        dataPromises.unshift(fetchSettings()); // Thêm promise lấy settings vào đầu
        
        const results = await Promise.all(dataPromises);
        
        state.settings = results[0]; // Lấy settings từ kết quả đầu tiên
        Object.keys(GENERIC_CONFIG).forEach((key, index) => {
            state[key] = results[index + 1];
        });

        renderAllSections();
        updateDashboard();
    } catch (error) {
        console.error("Error fetching all data:", error);
        alert("Không thể tải dữ liệu từ server.");
    }
};

const findById = (array, id) => array.find(item => item.id === id);

// =================================================================================
// CONFIGURATION OBJECT (CẤU HÌNH CÁC MODULE)
// =================================================================================
const GENERIC_CONFIG = {
    faculties: {
        key: 'faculties', name: "Khoa", collection: "faculties", sectionId: "faculty-management",
        fields: [{ name: 'name', label: 'Tên Khoa', type: 'text' }],
        columns: [{ header: 'Tên Khoa', render: i => i.name }]
    },
    degrees: {
        key: 'degrees', name: "Bằng cấp", collection: "degrees", sectionId: "degree-management",
        fields: [{ name: 'name', label: 'Tên Bằng cấp', type: 'text' }],
        columns: [{ header: 'Tên Bằng cấp', render: i => i.name }]
    },
    semesters: {
        key: 'semesters', name: "Kỳ học", collection: "semesters", sectionId: "semester-management",
        fields: [{ name: 'name', label: 'Tên Kỳ học', type: 'text', placeholder: 'Ví dụ: Học kỳ 1 năm học 2024-2025' }],
        columns: [{ header: 'Tên Kỳ học', render: i => i.name }]
    },
    courses: {
        key: 'courses', name: "Học phần", collection: "courses", sectionId: "course-management",
        fields: [{ name: 'name', label: 'Tên Học phần', type: 'text' }, { name: 'credits', label: 'Số tín chỉ', type: 'number' }],
        columns: [{ header: 'Tên Học phần', render: i => i.name }, { header: 'Số tín chỉ', render: i => i.credits }]
    },
    teachers: {
        key: 'teachers', name: "Giáo viên", collection: "teachers", sectionId: "teacher-management",
        fields: [
            { name: 'name', label: 'Họ và tên', type: 'text' },
            { name: 'facultyId', label: 'Khoa', type: 'select', options: () => state.faculties },
            { name: 'degreeId', label: 'Bằng cấp', type: 'select', options: () => state.degrees },
            { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Số điện thoại', type: 'tel' }
        ],
        columns: [
            { header: 'Họ và tên', render: i => i.name },
            { header: 'Khoa', render: i => findById(state.faculties, i.facultyId)?.name || 'N/A' },
            { header: 'Bằng cấp', render: i => findById(state.degrees, i.degreeId)?.name || 'N/A' }, { header: 'Email', render: i => i.email }
        ]
    },
    courseSections: {
        key: 'courseSections', name: "Lớp học phần", collection: "course_sections", sectionId: "course-section-management",
        fields: [
            { name: 'sectionCode', label: 'Mã Lớp học phần', type: 'text' }, { name: 'courseId', label: 'Học phần', type: 'select', options: () => state.courses },
            { name: 'semesterId', label: 'Kỳ học', type: 'select', options: () => state.semesters },
            { name: 'classType', label: 'Loại lớp', type: 'text', placeholder: 'Lý thuyết, Thực hành...' }, { name: 'studentCount', label: 'Sĩ số', type: 'number' }
        ],
        columns: [
            { header: 'Mã LHP', render: i => i.sectionCode }, { header: 'Tên Học phần', render: i => findById(state.courses, i.courseId)?.name || 'N/A' },
            { header: 'Kỳ học', render: i => findById(state.semesters, i.semesterId)?.name || 'N/A' },
            { header: 'Loại lớp', render: i => i.classType }
        ]
    },
    assignments: {
        key: 'assignments', name: "Phân công", collection: "assignments", sectionId: "assignment-management",
        fields: [
            { name: 'teacherId', label: 'Giáo viên', type: 'select', options: () => state.teachers },
            { name: 'courseSectionId', label: 'Lớp học phần', type: 'select', options: () => state.courseSections, optionLabel: 'sectionCode' },
            { name: 'teachingHours', label: 'Số tiết quy đổi', type: 'number' }
        ],
        columns: [
            { header: 'Giáo viên', render: i => findById(state.teachers, i.teacherId)?.name || 'N/A' },
            { header: 'Lớp học phần', render: i => findById(state.courseSections, i.courseSectionId)?.sectionCode || 'N/A' },
            { header: 'Học phần', render: i => findById(state.courses, findById(state.courseSections, i.courseSectionId)?.courseId)?.name || 'N/A' },
            { header: 'Số tiết', render: i => i.teachingHours }
        ]
    }
};

// =================================================================================
// UI RENDERING (HIỂN THỊ DỮ LIỆU)
// =================================================================================
const renderAllSections = () => {
    for (const key in GENERIC_CONFIG) {
        renderGenericSection(key, state[key]);
    }
    renderSettingsSection();
    renderReportsSection();
};

const renderGenericSection = (configKey, data) => {
    const config = GENERIC_CONFIG[configKey];
    const container = document.getElementById(`${config.sectionId}-section`);
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
                <input type="text" id="${config.sectionId}-search" placeholder="Tìm kiếm theo tất cả các cột...">
            </div>
            <button class="btn btn-primary" onclick="window.openFormModal('${config.key}')">
                <i class="fas fa-plus"></i> Thêm ${config.name}
            </button>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead><tr>${tableHeaders}<th>Hành động</th></tr></thead>
                <tbody id="${config.sectionId}-table-body">${renderTableBody(data)}</tbody>
            </table>
        </div>
    `;

    document.getElementById(`${config.sectionId}-search`).addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = state[configKey].filter(item => {
            return config.columns.some(col => {
                const cellValue = col.render(item);
                return String(cellValue).toLowerCase().includes(searchTerm);
            });
        });
        document.getElementById(`${config.sectionId}-table-body`).innerHTML = renderTableBody(filteredData);
    });
};

const renderSettingsSection = () => {
    const container = document.getElementById('settings-management-section');
    container.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Thiết lập Định mức Tiền dạy</h2>
        </div>
        <div class="data-table-container" style="padding: 25px;">
             <div class="form-group">
                <label for="pricePerUnit">Định mức tiền cho một tiết dạy (VNĐ)</label>
                <input type="number" id="pricePerUnit" name="pricePerUnit" value="${state.settings.pricePerUnit || 0}">
            </div>
            <button class="btn btn-success" id="save-settings-btn"><i class="fas fa-save"></i> Lưu thiết lập</button>
        </div>
    `;
    document.getElementById('save-settings-btn').addEventListener('click', async () => {
        const price = Number(document.getElementById('pricePerUnit').value);
        try {
            await setDoc(doc(db, "settings", "main"), { pricePerUnit: price });
            state.settings.pricePerUnit = price;
            alert("Đã lưu thiết lập thành công!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Lỗi khi lưu thiết lập.");
        }
    });
};

const renderReportsSection = () => {
    const select = document.getElementById('report-semester-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Vui lòng chọn kỳ học --</option>' + 
        state.semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    document.getElementById('report-content-container').innerHTML = 
        `<p style="padding: 20px; text-align: center;">Hãy chọn một kỳ học để xem báo cáo.</p>`;
};

// =================================================================================
// DASHBOARD & REPORTS
// =================================================================================
const updateDashboard = () => {
    document.getElementById('total-teachers').textContent = state.teachers.length;
    document.getElementById('total-courses').textContent = state.courses.length;
    document.getElementById('total-courseSections').textContent = state.courseSections.length;
    document.getElementById('total-assignments').textContent = state.assignments.length;
    updateChart('facultyChart', 'faculty-chart', 'doughnut', state.faculties, state.teachers, 'facultyId');
    updateChart('degreeChart', 'degree-chart', 'bar', state.degrees, state.teachers, 'degreeId');
};

const updateChart = (chartStateKey, canvasId, type, masterData, countData, countField) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
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
                label: 'Số lượng giáo viên', 
                data: counts.map(c => c.count), 
                backgroundColor: ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#34495e', '#1abc9c'] 
            }] 
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

const calculateAndDisplayReport = (semesterId) => {
    if (!semesterId) {
        renderReportsSection(); // Reset to default message
        return;
    }

    const pricePerUnit = state.settings.pricePerUnit || 0;
    if (pricePerUnit === 0) {
        alert("Vui lòng thiết lập định mức tiền cho một tiết dạy trong mục 'Thiết lập' trước.");
    }

    // 1. Tìm các lớp học phần thuộc kỳ học đã chọn
    const relevantCourseSections = state.courseSections.filter(cs => cs.semesterId === semesterId);
    const relevantCourseSectionIds = new Set(relevantCourseSections.map(cs => cs.id));

    // 2. Tìm các phân công thuộc các lớp học phần đó
    const relevantAssignments = state.assignments.filter(a => relevantCourseSectionIds.has(a.courseSectionId));

    // 3. Gom nhóm theo giáo viên và tính tổng số tiết
    const teacherPaymentData = {};
    relevantAssignments.forEach(assignment => {
        const teacherId = assignment.teacherId;
        if (!teacherPaymentData[teacherId]) {
            teacherPaymentData[teacherId] = {
                teacher: findById(state.teachers, teacherId),
                totalHours: 0
            };
        }
        teacherPaymentData[teacherId].totalHours += (assignment.teachingHours || 0);
    });

    // 4. Render bảng báo cáo
    const container = document.getElementById('report-content-container');
    const reportData = Object.values(teacherPaymentData);

    if (reportData.length === 0) {
        container.innerHTML = `<p style="padding: 20px; text-align: center;">Không có dữ liệu phân công giảng dạy cho kỳ học này.</p>`;
        return;
    }

    const tableRows = reportData.map(data => {
        const payment = data.totalHours * pricePerUnit;
        return `
            <tr>
                <td>${data.teacher?.name || 'Không rõ'}</td>
                <td>${data.teacher ? (findById(state.faculties, data.teacher.facultyId)?.name || 'N/A') : 'N/A'}</td>
                <td>${data.totalHours.toLocaleString('vi-VN')}</td>
                <td style="font-weight: bold;">${payment.toLocaleString('vi-VN')} VNĐ</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Tên Giáo viên</th>
                    <th>Khoa</th>
                    <th>Tổng số tiết quy đổi</th>
                    <th>Tiền dạy (ước tính)</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
};

// =================================================================================
// MODAL & FORM HANDLING
// =================================================================================
window.openFormModal = async (configKey, id = null) => {
    state.currentEntity = configKey;
    state.currentId = id;
    const config = GENERIC_CONFIG[configKey];
    
    let currentData = id ? (findById(state[configKey], id) || {}) : {};
    
    document.getElementById('modal-title').textContent = `${id ? 'Chỉnh sửa' : 'Thêm'} ${config.name}`;
    document.getElementById('modal-body').innerHTML = config.fields.map(field => {
        const value = currentData[field.name] || '';
        if (field.type === 'select') {
            const options = field.options();
            return `
                <div class="form-group">
                    <label for="${field.name}">${field.label}</label>
                    <select id="${field.name}" name="${field.name}">
                        <option value="">-- Chọn ${field.label} --</option>
                        ${options.map(opt => `<option value="${opt.id}" ${opt.id === value ? 'selected' : ''}>${opt[field.optionLabel || 'name']}</option>`).join('')}
                    </select>
                </div>`;
        }
        return `
            <div class="form-group">
                <label for="${field.name}">${field.label}</label>
                <input type="${field.type}" id="${field.name}" name="${field.name}" value="${value}" placeholder="${field.placeholder || ''}">
            </div>`;
    }).join('');
    document.getElementById('form-modal').style.display = 'flex';
};

const closeModal = () => document.getElementById('form-modal').style.display = 'none';

const saveForm = async () => {
    const config = GENERIC_CONFIG[state.currentEntity];
    const data = {};
    config.fields.forEach(field => {
        const input = document.getElementById(field.name);
        data[field.name] = input.type === 'number' ? Number(input.value) : input.value;
    });

    try {
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
        alert("Lỗi khi lưu dữ liệu.");
    }
};

window.deleteItem = async (configKey, id) => {
    const config = GENERIC_CONFIG[configKey];
    if (!confirm(`Bạn có chắc chắn muốn xóa ${config.name} này không?`)) return;
    try {
        await deleteDoc(doc(db, config.collection, id));
        alert(`${config.name} đã được xóa.`);
        fetchAllData();
    } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Lỗi khi xóa.");
    }
};

// =================================================================================
// EVENT LISTENERS
// =================================================================================
const setupEventListeners = () => {
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('report-semester-select').addEventListener('change', (e) => calculateAndDisplayReport(e.target.value));

    const menuItems = document.querySelectorAll('.menu-item, .submenu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.dataset.section;
            if (this.classList.contains('has-submenu')) {
                this.classList.toggle('active');
                this.nextElementSibling.classList.toggle('open');
                return;
            }
            menuItems.forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.has-submenu').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            if (this.closest('.submenu')) this.closest('.submenu').previousElementSibling.classList.add('active');
            if (sectionId) {
                document.querySelectorAll('.main-content .section').forEach(s => s.classList.remove('active'));
                document.getElementById(`${sectionId}-section`).classList.add('active');
                document.getElementById('header-title').textContent = this.textContent.trim();
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