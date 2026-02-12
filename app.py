from flask import Flask, request, jsonify, render_template, g
import sqlite3
from datetime import datetime, timedelta

app = Flask(__name__)
DATABASE = 'time_tracker.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS time_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                start_time TEXT NOT NULL,
                end_time TEXT,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        ''')
        db.commit()

@app.route('/health')
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/start_timer', methods=['POST'])
def start_timer():
    data = request.json
    project_name = data.get('project')

    db = get_db()
    cursor = db.cursor()

    cursor.execute('INSERT OR IGNORE INTO projects (name) VALUES (?)', (project_name,))
    db.commit()

    cursor.execute('SELECT id FROM projects WHERE name = ?', (project_name,))
    project_id = cursor.fetchone()['id']

    # Stop any currently running timer for simplicity
    cursor.execute('UPDATE time_entries SET end_time = ? WHERE end_time IS NULL', (datetime.now().isoformat(),))
    db.commit()

    cursor.execute('INSERT INTO time_entries (project_id, start_time, end_time) VALUES (?, ?, NULL)',
                   (project_id, datetime.now().isoformat()))
    db.commit()
    return jsonify({"message": "Timer started", "project_id": project_id}), 201

@app.route('/api/stop_timer', methods=['POST'])
def stop_timer():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('UPDATE time_entries SET end_time = ? WHERE end_time IS NULL', (datetime.now().isoformat(),))
    db.commit()
    return jsonify({"message": "Timer stopped"}), 200

@app.route('/api/add_entry', methods=['POST'])
def add_entry():
    data = request.json
    project_name = data.get('project')
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')

    db = get_db()
    cursor = db.cursor()

    cursor.execute('INSERT OR IGNORE INTO projects (name) VALUES (?)', (project_name,))
    db.commit()

    cursor.execute('SELECT id FROM projects WHERE name = ?', (project_name,))
    project_id = cursor.fetchone()['id']

    cursor.execute('INSERT INTO time_entries (project_id, start_time, end_time) VALUES (?, ?, ?)',
                   (project_id, start_time_str, end_time_str))
    db.commit()
    return jsonify({"message": "Entry added"}), 201

@app.route('/api/timeline')
def get_timeline():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT te.id, p.name as project_name, te.start_time, te.end_time
        FROM time_entries te
        JOIN projects p ON te.project_id = p.id
        ORDER BY te.start_time
    ''')
    entries = cursor.fetchall()
    return jsonify([dict(entry) for entry in entries]), 200

@app.route('/api/analytics')
def get_analytics():
    db = get_db()
    cursor = db.cursor()

    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday()) # Monday as start of week
    end_of_week = start_of_week + timedelta(days=6)

    cursor.execute('''
        SELECT p.name as project_name, te.start_time, te.end_time
        FROM time_entries te
        JOIN projects p ON te.project_id = p.id
        WHERE te.start_time BETWEEN ? AND ?
        ORDER BY te.start_time
    ''', (start_of_week.isoformat(), end_of_week.isoformat()))
    entries = cursor.fetchall()

    project_times = {}
    for entry in entries:
        start = datetime.fromisoformat(entry['start_time'])
        end = datetime.fromisoformat(entry['end_time']) if entry['end_time'] else datetime.now()
        duration = (end - start).total_seconds() / 3600  # Duration in hours

        project_name = entry['project_name']
        if project_name not in project_times:
            project_times[project_name] = 0
        project_times[project_name] += duration
    
    # Sort projects by total time for consistent output
    sorted_project_times = dict(sorted(project_times.items(), key=lambda item: item[1], reverse=True))

    return jsonify(sorted_project_times), 200

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(host='0.0.0.0', port=8000, debug=True)
