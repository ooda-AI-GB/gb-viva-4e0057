document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.querySelector('.timer-display');
    const projectInput = document.getElementById('projectInput');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const addProjectInput = document.getElementById('addProjectInput');
    const addStartTimeInput = document.getElementById('addStartTimeInput');
    const addEndTimeInput = document.getElementById('addEndTimeInput');
    const addEntryButton = document.getElementById('addEntryButton');
    const timelineChart = document.getElementById('timelineChart');
    const analyticsChart = document.getElementById('analyticsChart');

    let timerInterval;
    let startTime = null;

    const formatTime = (seconds) => {
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const updateTimerDisplay = () => {
        if (startTime) {
            const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
            timerDisplay.textContent = formatTime(elapsedSeconds);
        }
    };

    startButton.addEventListener('click', async () => {
        const project = projectInput.value.trim();
        if (!project) {
            alert('Please enter a project name.');
            return;
        }

        try {
            const response = await fetch('/api/start_timer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ project }),
            });
            const data = await response.json();
            console.log(data.message);

            startTime = new Date();
            timerInterval = setInterval(updateTimerDisplay, 1000);
            startButton.disabled = true;
            stopButton.disabled = false;
            projectInput.disabled = true;
            loadTimeline();
            loadAnalytics();
        } catch (error) {
            console.error('Error starting timer:', error);
            alert('Failed to start timer.');
        }
    });

    stopButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/stop_timer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            console.log(data.message);

            clearInterval(timerInterval);
            startTime = null;
            timerDisplay.textContent = '00:00:00';
            startButton.disabled = false;
            stopButton.disabled = true;
            projectInput.disabled = false;
            projectInput.value = '';
            loadTimeline();
            loadAnalytics();
        } catch (error) {
            console.error('Error stopping timer:', error);
            alert('Failed to stop timer.');
        }
    });

    addEntryButton.addEventListener('click', async () => {
        const project = addProjectInput.value.trim();
        const start_time = addStartTimeInput.value;
        const end_time = addEndTimeInput.value;

        if (!project || !start_time || !end_time) {
            alert('Please fill in all fields for the forgotten entry.');
            return;
        }

        try {
            const response = await fetch('/api/add_entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ project, start_time, end_time }),
            });
            const data = await response.json();
            console.log(data.message);
            alert('Entry added successfully!');
            addProjectInput.value = '';
            addStartTimeInput.value = '';
            addEndTimeInput.value = '';
            loadTimeline();
            loadAnalytics();
        } catch (error) {
            console.error('Error adding entry:', error);
            alert('Failed to add entry.');
        }
    });

    const loadTimeline = async () => {
        try {
            const response = await fetch('/api/timeline');
            const entries = await response.json();
            timelineChart.innerHTML = ''; // Clear previous content

            if (entries.length === 0) {
                timelineChart.textContent = 'No time entries yet for today.';
                return;
            }

            // Group entries by day if needed, for now just list them
            const today = new Date().toDateString();
            const todayEntries = entries.filter(entry => new Date(entry.start_time).toDateString() === today);

            if (todayEntries.length === 0) {
                timelineChart.textContent = 'No time entries yet for today.';
                return;
            }

            const timelineList = document.createElement('ul');
            timelineList.className = 'timeline-list';
            todayEntries.forEach(entry => {
                const li = document.createElement('li');
                const start = new Date(entry.start_time);
                const end = entry.end_time ? new Date(entry.end_time) : new Date(); // If ongoing, use current time
                const durationMs = end - start;
                const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

                li.innerHTML = `<strong>${entry.project_name}</strong>: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()} (${durationHours} hours)`;
                timelineList.appendChild(li);
            });
            timelineChart.appendChild(timelineList);

        } catch (error) {
            console.error('Error loading timeline:', error);
            timelineChart.textContent = 'Failed to load timeline.';
        }
    };

    const loadAnalytics = async () => {
        try {
            const response = await fetch('/api/analytics');
            const projectTimes = await response.json();
            analyticsChart.innerHTML = ''; // Clear previous content

            if (Object.keys(projectTimes).length === 0) {
                analyticsChart.textContent = 'No analytics data for this week yet.';
                return;
            }

            const analyticsList = document.createElement('ul');
            analyticsList.className = 'analytics-list';
            for (const project in projectTimes) {
                const li = document.createElement('li');
                li.textContent = `${project}: ${projectTimes[project].toFixed(2)} hours`;
                analyticsList.appendChild(li);
            }
            analyticsChart.appendChild(analyticsList);

        } catch (error) {
            console.error('Error loading analytics:', error);
            analyticsChart.textContent = 'Failed to load analytics.';
        }
    };

    // Initial loads
    loadTimeline();
    loadAnalytics();
});
