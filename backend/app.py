import os
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename

app = Flask(__name__)

# --- CONFIG ---
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///signlearn_assignments.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'amey_assignment_pro_2026'

CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})
db = SQLAlchemy(app)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173")

# --- MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True)
    password = db.Column(db.String(120))
    role = db.Column(db.String(20))

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assignment_no = db.Column(db.Integer) # NEW: Sequence order
    title = db.Column(db.String(100))
    filename = db.Column(db.String(200))

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assignment_no = db.Column(db.Integer) # NEW: Link to assignment
    topic = db.Column(db.String(100))
    text = db.Column(db.String(200))
    alt_a = db.Column(db.String(100))
    alt_b = db.Column(db.String(100))
    correct = db.Column(db.String(1))

class QuizResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(80))
    topic = db.Column(db.String(100))
    score = db.Column(db.Integer)
    prediction = db.Column(db.String(50))

with app.app_context():
    db.create_all()

# --- AUTH ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if not user:
        user = User(username=data['username'], password=data['password'], role=data['role'])
        db.session.add(user)
        db.session.commit()
    token = create_access_token(identity=user.username)
    return jsonify(token=token, role=user.role, username=user.username)

# --- TEACHER ASSIGNMENT CONTROL ---
@app.route('/teacher/upload', methods=['POST'])
def upload():
    file = request.files['file']
    title = request.form.get('title')
    ano = request.form.get('assignment_no', 1)
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    db.session.add(Session(title=title, filename=filename, assignment_no=int(ano)))
    db.session.commit()
    return jsonify({"msg": "Uploaded"})

@app.route('/teacher/add_question', methods=['POST'])
def add_q():
    data = request.json
    db.session.add(Question(
        assignment_no=int(data['assignment_no']),
        topic=data['topic'], text=data['text'], 
        alt_a=data['alt_a'], alt_b=data['alt_b'], correct=data['correct']
    ))
    db.session.commit()
    return jsonify({"msg": "Saved"})

@app.route('/teacher/stats', methods=['GET'])
def get_stats():
    res = QuizResult.query.order_by(QuizResult.id.desc()).all()
    return jsonify([{"name": r.student_name, "topic": r.topic, "score": r.score, "prediction": r.prediction} for r in res])

# --- STUDENT ASSIGNMENT PATH ---
@app.route('/sessions', methods=['GET'])
def sessions():
    s = Session.query.order_by(Session.assignment_no.asc()).all()
    return jsonify([{"title": x.title, "url": f"http://localhost:5000/uploads/{x.filename}", "ano": x.assignment_no} for x in s])

@app.route('/uploads/<filename>')
def serve(filename): return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/student/quiz/<int:ano>', methods=['GET'])
def get_quiz(ano):
    qs = Question.query.filter_by(assignment_no=ano).all()
    return jsonify([{"id": q.id, "text": q.text, "a": q.alt_a, "b": q.alt_b, "correct": q.correct} for q in qs])

@app.route('/submit_quiz', methods=['POST'])
def submit():
    data = request.json
    score = int(data['score'])
    pred = "High Potential" if score >= 75 else "Needs Review"
    res = QuizResult(student_name=data['username'], topic=data['topic'], score=score, prediction=pred)
    db.session.add(res)
    db.session.commit()
    socketio.emit('new_stat', {"name": data['username'], "topic": data['topic'], "score": score, "prediction": pred})
    return jsonify({"prediction": pred, "score": score})

@socketio.on('message')
def chat(data):
    data['time'] = datetime.datetime.now().strftime("%I:%M %p")
    emit('message', data, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)