// ===== State Management =====
const state = {
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    notes: JSON.parse(localStorage.getItem('notes')) || [],
    stats: JSON.parse(localStorage.getItem('stats')) || {
        tasksCompleted: 0,
        focusMinutes: 0,
        streak: 0,
        lastActiveDate: null
    },
    pomodoro: {
        mode: 'focus',
        isRunning: false,
        timeRemaining: 25 * 60,
        sessions: 0,
        totalFocusMinutes: 0,
        settings: {
            focus: 25,
            shortBreak: 5,
            longBreak: 15
        }
    },
    calendar: {
        currentDate: new Date(),
        selectedDate: null
    },
    currentNoteId: null,
    theme: localStorage.getItem('theme') || 'light'
};

// ===== DOM Elements =====
const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    sections: document.querySelectorAll('.content-section'),
    themeToggle: document.getElementById('themeToggle'),
    
    // Dashboard
    currentDate: document.getElementById('currentDate'),
    tasksCompleted: document.getElementById('tasksCompleted'),
    focusTime: document.getElementById('focusTime'),
    streak: document.getElementById('streak'),
    notesCount: document.getElementById('notesCount'),
    dashboardTasks: document.getElementById('dashboardTasks'),
    quickTimer: document.getElementById('quickTimer'),
    quickStartBtn: document.getElementById('quickStartBtn'),
    
    // Tasks
    taskList: document.getElementById('taskList'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    taskModal: document.getElementById('taskModal'),
    closeTaskModal: document.getElementById('closeTaskModal'),
    taskForm: document.getElementById('taskForm'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    
    // Pomodoro
    pomodoroDisplay: document.getElementById('pomodoroDisplay'),
    timerProgress: document.getElementById('timerProgress'),
    timerLabel: document.getElementById('timerLabel'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    startPauseTimer: document.getElementById('startPauseTimer'),
    resetTimer: document.getElementById('resetTimer'),
    skipTimer: document.getElementById('skipTimer'),
    sessionCount: document.getElementById('sessionCount'),
    totalFocus: document.getElementById('totalFocus'),
    focusDuration: document.getElementById('focusDuration'),
    shortBreakDuration: document.getElementById('shortBreakDuration'),
    longBreakDuration: document.getElementById('longBreakDuration'),
    
    // Notes
    notesGrid: document.getElementById('notesGrid'),
    addNoteBtn: document.getElementById('addNoteBtn'),
    noteModal: document.getElementById('noteModal'),
    closeNoteModal: document.getElementById('closeNoteModal'),
    noteTitle: document.getElementById('noteTitle'),
    noteContent: document.getElementById('noteContent'),
    noteColor: document.getElementById('noteColor'),
    saveNote: document.getElementById('saveNote'),
    noteSearch: document.getElementById('noteSearch'),
    toolbarBtns: document.querySelectorAll('.toolbar-btn'),
    
    // Calendar
    calendarMonth: document.getElementById('calendarMonth'),
    calendarDays: document.getElementById('calendarDays'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    eventList: document.getElementById('eventList')
};

// ===== Utility Functions =====
function saveToStorage() {
    localStorage.setItem('tasks', JSON.stringify(state.tasks));
    localStorage.setItem('notes', JSON.stringify(state.notes));
    localStorage.setItem('stats', JSON.stringify(state.stats));
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastActive = state.stats.lastActiveDate;
    
    if (!lastActive) {
        state.stats.streak = 1;
    } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActive === today) {
            // Same day, no change
        } else if (lastActive === yesterday.toDateString()) {
            state.stats.streak++;
        } else {
            state.stats.streak = 1;
        }
    }
    
    state.stats.lastActiveDate = today;
    saveToStorage();
}

// ===== Theme Management =====
function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeButton();
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    updateThemeButton();
}

function updateThemeButton() {
    const themeIcon = elements.themeToggle.querySelector('.theme-icon');
    const themeText = elements.themeToggle.querySelector('span:last-child');
    
    if (state.theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Light Mode';
    } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Dark Mode';
    }
}

// ===== Navigation =====
function switchSection(sectionId) {
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    
    elements.sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
}

// ===== Dashboard =====
function updateDashboard() {
    // Update date
    elements.currentDate.textContent = formatDate(new Date());
    
    // Update stats
    elements.tasksCompleted.textContent = state.stats.tasksCompleted;
    elements.focusTime.textContent = `${Math.floor(state.stats.focusMinutes / 60)}h`;
    elements.streak.textContent = state.stats.streak;
    elements.notesCount.textContent = state.notes.length;
    
    // Update today's tasks
    const today = new Date().toDateString();
    const todaysTasks = state.tasks.filter(task => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate).toDateString() === today && !task.completed;
    });
    
    if (todaysTasks.length === 0) {
        elements.dashboardTasks.innerHTML = '<li class="empty-state">No tasks for today</li>';
    } else {
        elements.dashboardTasks.innerHTML = todaysTasks.slice(0, 5).map(task => `
            <li class="quick-task-item">
                <span class="task-priority priority-${task.priority}">●</span>
                ${task.title}
            </li>
        `).join('');
    }
}

// ===== Tasks =====
function renderTasks(filter = 'all') {
    let filteredTasks = [...state.tasks];
    
    if (filter === 'pending') {
        filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (filter === 'completed') {
        filteredTasks = filteredTasks.filter(task => task.completed);
    }
    
    // Sort: incomplete first, then by priority, then by due date
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        return 0;
    });
    
    if (filteredTasks.length === 0) {
        elements.taskList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>No tasks yet. Add your first task!</p>
            </div>
        `;
        return;
    }
    
    elements.taskList.innerHTML = filteredTasks.map(task => `
        <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                ${task.completed ? '✓' : ''}
            </div>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span class="task-priority priority-${task.priority}">${task.priority}</span>
                    ${task.dueDate ? `<span>📅 ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                    <span>📁 ${task.category}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn delete" onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
        </li>
    `).join('');
}

function addTask(taskData) {
    const task = {
        id: generateId(),
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        category: taskData.category,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    state.tasks.push(task);
    saveToStorage();
    renderTasks();
    updateDashboard();
    renderCalendar();
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            state.stats.tasksCompleted++;
            updateStreak();
        } else {
            state.stats.tasksCompleted = Math.max(0, state.stats.tasksCompleted - 1);
        }
        saveToStorage();
        renderTasks();
        updateDashboard();
    }
}

function deleteTask(id) {
    const index = state.tasks.findIndex(t => t.id === id);
    if (index > -1) {
        state.tasks.splice(index, 1);
        saveToStorage();
        renderTasks();
        updateDashboard();
        renderCalendar();
    }
}

// ===== Pomodoro Timer =====
let timerInterval = null;

function updateTimerDisplay() {
    elements.pomodoroDisplay.textContent = formatTime(state.pomodoro.timeRemaining);
    elements.quickTimer.textContent = formatTime(state.pomodoro.timeRemaining);
    
    // Update progress circle
    const totalTime = state.pomodoro.settings[state.pomodoro.mode === 'focus' ? 'focus' : 
                      state.pomodoro.mode === 'short' ? 'shortBreak' : 'longBreak'] * 60;
    const progress = (totalTime - state.pomodoro.timeRemaining) / totalTime;
    const circumference = 2 * Math.PI * 90;
    elements.timerProgress.style.strokeDashoffset = circumference * (1 - progress);
    
    // Update session info
    elements.sessionCount.textContent = (state.pomodoro.sessions % 4) + 1;
    elements.totalFocus.textContent = state.pomodoro.totalFocusMinutes;
}

function setTimerMode(mode) {
    state.pomodoro.mode = mode;
    state.pomodoro.isRunning = false;
    clearInterval(timerInterval);
    
    const durations = {
        focus: state.pomodoro.settings.focus,
        short: state.pomodoro.settings.shortBreak,
        long: state.pomodoro.settings.longBreak
    };
    
    state.pomodoro.timeRemaining = durations[mode] * 60;
    
    // Update UI
    elements.modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    elements.timerLabel.textContent = mode === 'focus' ? 'Focus Time' : 
                                       mode === 'short' ? 'Short Break' : 'Long Break';
    elements.startPauseTimer.textContent = 'Start';
    
    updateTimerDisplay();
}

function startTimer() {
    state.pomodoro.isRunning = true;
    elements.startPauseTimer.textContent = 'Pause';
    
    timerInterval = setInterval(() => {
        state.pomodoro.timeRemaining--;
        
        if (state.pomodoro.timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerComplete();
        }
        
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    state.pomodoro.isRunning = false;
    clearInterval(timerInterval);
    elements.startPauseTimer.textContent = 'Start';
}

function resetTimer() {
    pauseTimer();
    setTimerMode(state.pomodoro.mode);
}

function skipTimer() {
    timerComplete();
}

function timerComplete() {
    clearInterval(timerInterval);
    state.pomodoro.isRunning = false;
    
    // Play notification sound
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbHN1dnV0c3JxcHBwcHFyc3R1dnd4eXl6e3x9fH18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8');
        audio.play().catch(() => {});
    } catch (e) {}
    
    if (state.pomodoro.mode === 'focus') {
        state.pomodoro.sessions++;
        state.pomodoro.totalFocusMinutes += state.pomodoro.settings.focus;
        state.stats.focusMinutes += state.pomodoro.settings.focus;
        updateStreak();
        saveToStorage();
        
        // Switch to break
        if (state.pomodoro.sessions % 4 === 0) {
            setTimerMode('long');
        } else {
            setTimerMode('short');
        }
    } else {
        setTimerMode('focus');
    }
    
    updateDashboard();
    
    // Show notification
    if (Notification.permission === 'granted') {
        new Notification('Timer Complete!', {
            body: state.pomodoro.mode === 'focus' ? 'Time for a break!' : 'Ready to focus?',
            icon: '⏱️'
        });
    }
}

function updateTimerSettings() {
    state.pomodoro.settings.focus = parseInt(elements.focusDuration.value) || 25;
    state.pomodoro.settings.shortBreak = parseInt(elements.shortBreakDuration.value) || 5;
    state.pomodoro.settings.longBreak = parseInt(elements.longBreakDuration.value) || 15;
    
    if (!state.pomodoro.isRunning) {
        setTimerMode(state.pomodoro.mode);
    }
}

// ===== Notes =====
function renderNotes(searchTerm = '') {
    let filteredNotes = [...state.notes];
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredNotes = filteredNotes.filter(note => 
            note.title.toLowerCase().includes(term) || 
            note.content.toLowerCase().includes(term)
        );
    }
    
    // Sort by most recent
    filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    if (filteredNotes.length === 0) {
        elements.notesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>${searchTerm ? 'No notes found' : 'No notes yet. Create your first note!'}</p>
            </div>
        `;
        return;
    }
    
    elements.notesGrid.innerHTML = filteredNotes.map(note => `
        <div class="note-card" style="background-color: ${note.color}" onclick="openNote('${note.id}')">
            <h4>${note.title || 'Untitled'}</h4>
            <p>${stripHtml(note.content).substring(0, 150)}...</p>
            <div class="note-card-footer">
                <span class="note-date">${new Date(note.updatedAt).toLocaleDateString()}</span>
                <button class="note-delete" onclick="event.stopPropagation(); deleteNote('${note.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function openNoteModal(noteId = null) {
    state.currentNoteId = noteId;
    
    if (noteId) {
        const note = state.notes.find(n => n.id === noteId);
        if (note) {
            elements.noteTitle.value = note.title;
            elements.noteContent.innerHTML = note.content;
            elements.noteColor.value = note.color;
        }
    } else {
        elements.noteTitle.value = '';
        elements.noteContent.innerHTML = '';
        elements.noteColor.value = '#ffffff';
    }
    
    elements.noteModal.classList.add('active');
}

function closeNoteModal() {
    elements.noteModal.classList.remove('active');
    state.currentNoteId = null;
}

function saveNote() {
    const title = elements.noteTitle.value.trim() || 'Untitled';
    const content = elements.noteContent.innerHTML;
    const color = elements.noteColor.value;
    
    if (state.currentNoteId) {
        // Update existing note
        const note = state.notes.find(n => n.id === state.currentNoteId);
        if (note) {
            note.title = title;
            note.content = content;
            note.color = color;
            note.updatedAt = new Date().toISOString();
        }
    } else {
        // Create new note
        const note = {
            id: generateId(),
            title,
            content,
            color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        state.notes.push(note);
    }
    
    saveToStorage();
    renderNotes();
    updateDashboard();
    closeNoteModal();
}

function openNote(id) {
    openNoteModal(id);
}

function deleteNote(id) {
    if (confirm('Delete this note?')) {
        const index = state.notes.findIndex(n => n.id === id);
        if (index > -1) {
            state.notes.splice(index, 1);
            saveToStorage();
            renderNotes();
            updateDashboard();
        }
    }
}

function execCommand(command) {
    document.execCommand(command, false, null);
    elements.noteContent.focus();
}

// ===== Calendar =====
function renderCalendar() {
    const date = state.calendar.currentDate;
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Update header
    elements.calendarMonth.textContent = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Get tasks with due dates for this month
    const taskDates = state.tasks
        .filter(t => t.dueDate && !t.completed)
        .map(t => new Date(t.dueDate).toDateString());
    
    let days = [];
    const today = new Date().toDateString();
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        days.push(`<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`);
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = new Date(year, month, i).toDateString();
        const isToday = dateStr === today;
        const hasEvent = taskDates.includes(dateStr);
        
        days.push(`
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">
                ${i}
            </div>
        `);
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
        days.push(`<div class="calendar-day other-month">${i}</div>`);
    }
    
    elements.calendarDays.innerHTML = days.join('');
    
    // Update events list
    renderUpcomingEvents();
}

function renderUpcomingEvents() {
    const upcoming = state.tasks
        .filter(t => t.dueDate && !t.completed && new Date(t.dueDate) >= new Date())
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
    
    if (upcoming.length === 0) {
        elements.eventList.innerHTML = '<li class="empty-state">No upcoming deadlines</li>';
        return;
    }
    
    elements.eventList.innerHTML = upcoming.map(task => {
        const date = new Date(task.dueDate);
        return `
            <li class="event-item">
                <div class="event-date">
                    <span class="day">${date.getDate()}</span>
                    <span class="month">${date.toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div class="event-info">
                    <h4>${task.title}</h4>
                    <span>${task.category}</span>
                </div>
            </li>
        `;
    }).join('');
}

function changeMonth(delta) {
    state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() + delta);
    renderCalendar();
}

// ===== Event Listeners =====
function initEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchSection(item.dataset.section);
        });
    });
    
    // Theme
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Tasks
    elements.addTaskBtn.addEventListener('click', () => {
        elements.taskModal.classList.add('active');
    });
    
    elements.closeTaskModal.addEventListener('click', () => {
        elements.taskModal.classList.remove('active');
    });
    
    elements.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTask({
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            dueDate: document.getElementById('taskDueDate').value,
            priority: document.getElementById('taskPriority').value,
            category: document.getElementById('taskCategory').value
        });
        elements.taskForm.reset();
        elements.taskModal.classList.remove('active');
    });
    
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTasks(btn.dataset.filter);
        });
    });
    
    // Pomodoro
    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => setTimerMode(btn.dataset.mode));
    });
    
    elements.startPauseTimer.addEventListener('click', () => {
        if (state.pomodoro.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });
    
    elements.quickStartBtn.addEventListener('click', () => {
        switchSection('pomodoro');
        if (!state.pomodoro.isRunning) {
            startTimer();
        }
    });
    
    elements.resetTimer.addEventListener('click', resetTimer);
    elements.skipTimer.addEventListener('click', skipTimer);
    
    elements.focusDuration.addEventListener('change', updateTimerSettings);
    elements.shortBreakDuration.addEventListener('change', updateTimerSettings);
    elements.longBreakDuration.addEventListener('change', updateTimerSettings);
    
    // Notes
    elements.addNoteBtn.addEventListener('click', () => openNoteModal());
    elements.closeNoteModal.addEventListener('click', closeNoteModal);
    elements.saveNote.addEventListener('click', saveNote);
    
    elements.noteSearch.addEventListener('input', (e) => {
        renderNotes(e.target.value);
    });
    
    elements.toolbarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            execCommand(btn.dataset.command);
        });
    });
    
    // Calendar
    elements.prevMonth.addEventListener('click', () => changeMonth(-1));
    elements.nextMonth.addEventListener('click', () => changeMonth(1));
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Make functions globally accessible
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.openNote = openNote;
window.deleteNote = deleteNote;

// ===== Initialize App =====
function init() {
    initTheme();
    initEventListeners();
    updateStreak();
    updateDashboard();
    renderTasks();
    renderNotes();
    setTimerMode('focus');
    renderCalendar();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
