class StudyPlanner {
    constructor() {
        this.tasks = this.loadFromStorage('tasks') || [];
        this.goals = this.loadFromStorage('goals') || [];
        this.currentTaskId = null;
        this.currentGoalId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderTasks();
        this.renderTimeline();
        this.renderGoals();
        this.updateSubjectFilter();
        this.requestNotificationPermission();
        this.checkReminders();
        setInterval(() => this.checkReminders(), 60000);
    }

    sanitize(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    validatePriority(priority) {
        const allowed = { low: 'low', medium: 'medium', high: 'high' };
        return allowed[priority] || 'medium';
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('addGoalBtn').addEventListener('click', () => this.openGoalModal());
        
        document.getElementById('taskForm').addEventListener('submit', (e) => this.saveTask(e));
        document.getElementById('goalForm').addEventListener('submit', (e) => this.saveGoal(e));
        
        document.getElementById('cancelTaskBtn').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('cancelGoalBtn').addEventListener('click', () => this.closeGoalModal());
        
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('show');
            });
        });

        document.getElementById('filterSubject').addEventListener('change', () => this.renderTasks());
        document.getElementById('sortBy').addEventListener('change', () => this.renderTasks());

        document.getElementById('tasksList').addEventListener('click', (e) => {
            const taskCard = e.target.closest('.task-card');
            if (!taskCard) return;
            
            const taskId = taskCard.dataset.taskId;
            
            if (e.target.classList.contains('task-complete-checkbox')) {
                this.toggleTaskComplete(taskId);
            } else if (e.target.classList.contains('task-edit-btn')) {
                this.openTaskModal(taskId);
            } else if (e.target.classList.contains('task-delete-btn')) {
                this.deleteTask(taskId);
            }
        });

        document.getElementById('goalsList').addEventListener('click', (e) => {
            const goalCard = e.target.closest('.goal-card');
            if (!goalCard) return;
            
            const goalId = goalCard.dataset.goalId;
            
            if (e.target.classList.contains('goal-edit-btn')) {
                this.openGoalModal(goalId);
            } else if (e.target.classList.contains('goal-delete-btn')) {
                this.deleteGoal(goalId);
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    openTaskModal(taskId = null) {
        this.currentTaskId = taskId;
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            document.getElementById('modalTitle').textContent = 'Edit Task';
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskSubject').value = task.subject;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskDueDate').value = task.dueDate;
            document.getElementById('taskPriority').value = task.priority;
        } else {
            document.getElementById('modalTitle').textContent = 'Add Task';
            form.reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('taskDueDate').min = today;
        }
        
        modal.classList.add('show');
    }

    closeTaskModal() {
        document.getElementById('taskModal').classList.remove('show');
        document.getElementById('taskForm').reset();
        this.currentTaskId = null;
    }

    saveTask(e) {
        e.preventDefault();
        
        const taskData = {
            id: this.currentTaskId || Date.now().toString(),
            title: document.getElementById('taskTitle').value,
            subject: document.getElementById('taskSubject').value,
            description: document.getElementById('taskDescription').value,
            dueDate: document.getElementById('taskDueDate').value,
            priority: this.validatePriority(document.getElementById('taskPriority').value),
            completed: false,
            createdAt: new Date().toISOString()
        };

        if (this.currentTaskId) {
            const index = this.tasks.findIndex(t => t.id === this.currentTaskId);
            const oldTask = this.tasks[index];
            taskData.completed = oldTask.completed;
            taskData.createdAt = oldTask.createdAt;
            this.tasks[index] = taskData;
        } else {
            this.tasks.push(taskData);
        }

        this.saveToStorage('tasks', this.tasks);
        this.renderTasks();
        this.renderTimeline();
        this.updateSubjectFilter();
        this.closeTaskModal();
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveToStorage('tasks', this.tasks);
            this.renderTasks();
            this.renderTimeline();
            this.updateSubjectFilter();
        }
    }

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        task.completed = !task.completed;
        this.saveToStorage('tasks', this.tasks);
        this.renderTasks();
        this.renderTimeline();
    }

    renderTasks() {
        const container = document.getElementById('tasksList');
        const filterSubject = document.getElementById('filterSubject').value;
        const sortBy = document.getElementById('sortBy').value;

        let filteredTasks = [...this.tasks];

        if (filterSubject !== 'all') {
            filteredTasks = filteredTasks.filter(t => t.subject === filterSubject);
        }

        filteredTasks.sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(a.dueDate) - new Date(b.dueDate);
            } else if (sortBy === 'priority') {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            } else if (sortBy === 'subject') {
                return a.subject.localeCompare(b.subject);
            }
        });

        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks yet</h3>
                    <p>Click "Add Task" to create your first study task</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTasks.map(task => {
            const dueDate = new Date(task.dueDate);
            const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const isOverdue = !task.completed && dueDate < new Date();
            const priority = this.validatePriority(task.priority);
            
            return `
                <div class="task-card priority-${priority} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                    <div class="task-header">
                        <div class="task-title">${this.sanitize(task.title)}</div>
                        <div class="task-badges">
                            <span class="badge badge-subject">${this.sanitize(task.subject)}</span>
                            <span class="badge badge-priority">${this.sanitize(priority.toUpperCase())}</span>
                            <span class="badge badge-date ${isOverdue ? 'overdue' : ''}">${formattedDate}</span>
                        </div>
                    </div>
                    ${task.description ? `<div class="task-description">${this.sanitize(task.description)}</div>` : ''}
                    <div class="task-footer">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" class="task-complete-checkbox" ${task.completed ? 'checked' : ''}>
                            <span>${task.completed ? 'Completed' : 'Mark as complete'}</span>
                        </div>
                        <div class="task-actions">
                            <button class="btn btn-edit task-edit-btn">Edit</button>
                            <button class="btn btn-danger task-delete-btn">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTimeline() {
        const container = document.getElementById('timelineContent');
        const upcomingTasks = this.tasks
            .filter(t => !t.completed)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        if (upcomingTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No upcoming deadlines</h3>
                    <p>All tasks are completed or no tasks scheduled</p>
                </div>
            `;
            return;
        }

        const groupedByDate = upcomingTasks.reduce((acc, task) => {
            const date = task.dueDate;
            if (!acc[date]) acc[date] = [];
            acc[date].push(task);
            return acc;
        }, {});

        container.innerHTML = Object.entries(groupedByDate).map(([date, tasks]) => {
            const dateObj = new Date(date);
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
            
            return `
                <div class="timeline-item">
                    <div class="timeline-date">
                        <div class="day">${day}</div>
                        <div class="month">${month}</div>
                    </div>
                    <div class="timeline-tasks">
                        ${tasks.map(task => {
                            const priority = this.validatePriority(task.priority);
                            return `
                            <div class="timeline-task priority-${priority}">
                                <strong>${this.sanitize(task.title)}</strong><br>
                                <small>${this.sanitize(task.subject)} - ${this.sanitize(priority.toUpperCase())} priority</small>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    openGoalModal(goalId = null) {
        this.currentGoalId = goalId;
        const modal = document.getElementById('goalModal');
        const form = document.getElementById('goalForm');
        
        if (goalId) {
            const goal = this.goals.find(g => g.id === goalId);
            document.getElementById('goalModalTitle').textContent = 'Edit Goal';
            document.getElementById('goalTitle').value = goal.title;
            document.getElementById('goalDescription').value = goal.description || '';
            document.getElementById('goalTarget').value = goal.target;
            document.getElementById('goalCurrent').value = goal.current;
            document.getElementById('goalDeadline').value = goal.deadline || '';
        } else {
            document.getElementById('goalModalTitle').textContent = 'Add Study Goal';
            form.reset();
        }
        
        modal.classList.add('show');
    }

    closeGoalModal() {
        document.getElementById('goalModal').classList.remove('show');
        document.getElementById('goalForm').reset();
        this.currentGoalId = null;
    }

    saveGoal(e) {
        e.preventDefault();
        
        const target = Math.max(1, parseInt(document.getElementById('goalTarget').value) || 1);
        const current = Math.max(0, parseInt(document.getElementById('goalCurrent').value) || 0);
        
        const goalData = {
            id: this.currentGoalId || Date.now().toString(),
            title: document.getElementById('goalTitle').value,
            description: document.getElementById('goalDescription').value,
            target: target,
            current: Math.min(current, target),
            deadline: document.getElementById('goalDeadline').value,
            createdAt: new Date().toISOString()
        };

        if (this.currentGoalId) {
            const index = this.goals.findIndex(g => g.id === this.currentGoalId);
            const oldGoal = this.goals[index];
            goalData.createdAt = oldGoal.createdAt;
            this.goals[index] = goalData;
        } else {
            this.goals.push(goalData);
        }

        this.saveToStorage('goals', this.goals);
        this.renderGoals();
        this.closeGoalModal();
    }

    updateGoalProgress(goalId, newProgress) {
        const goal = this.goals.find(g => g.id === goalId);
        goal.current = Math.min(newProgress, goal.target);
        this.saveToStorage('goals', this.goals);
        this.renderGoals();
    }

    deleteGoal(goalId) {
        if (confirm('Are you sure you want to delete this goal?')) {
            this.goals = this.goals.filter(g => g.id !== goalId);
            this.saveToStorage('goals', this.goals);
            this.renderGoals();
        }
    }

    renderGoals() {
        const container = document.getElementById('goalsList');

        if (this.goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No study goals yet</h3>
                    <p>Click "Add Goal" to set your first study goal</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.goals.map(goal => {
            const progress = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
            const deadlineText = goal.deadline ? 
                new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 
                'No deadline';
            
            return `
                <div class="goal-card" data-goal-id="${goal.id}">
                    <div class="goal-header">
                        <div class="goal-title">${this.sanitize(goal.title)}</div>
                    </div>
                    ${goal.description ? `<div class="goal-description">${this.sanitize(goal.description)}</div>` : ''}
                    <div class="progress-section">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span><strong>Progress:</strong> ${goal.current} / ${goal.target}</span>
                            <span>${progress}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${progress}%">
                                ${progress > 20 ? progress + '%' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="goal-footer">
                        <div>
                            <small style="color: #6c757d;">Deadline: ${deadlineText}</small>
                        </div>
                        <div class="goal-actions">
                            <button class="btn btn-edit goal-edit-btn">Edit</button>
                            <button class="btn btn-danger goal-delete-btn">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateSubjectFilter() {
        const subjects = [...new Set(this.tasks.map(t => t.subject))].sort();
        const filterSelect = document.getElementById('filterSubject');
        const currentValue = filterSelect.value;
        
        filterSelect.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Subjects';
        filterSelect.appendChild(allOption);
        
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            filterSelect.appendChild(option);
        });
        
        if (subjects.includes(currentValue)) {
            filterSelect.value = currentValue;
        }
    }

    checkReminders() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        this.tasks.forEach(task => {
            if (!task.completed && !task.reminded) {
                const dueDate = new Date(task.dueDate);
                if (dueDate <= tomorrow && dueDate >= now) {
                    this.showNotification(task);
                    task.reminded = true;
                    this.saveToStorage('tasks', this.tasks);
                }
            }
        });
    }

    showNotification(task) {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('Study Reminder', {
                    body: `${task.title} is due soon! Subject: ${task.subject}`,
                    icon: '📚'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('Study Reminder', {
                            body: `${task.title} is due soon! Subject: ${task.subject}`,
                            icon: '📚'
                        });
                    }
                });
            }
        }
    }

    saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadFromStorage(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }
}

const planner = new StudyPlanner();