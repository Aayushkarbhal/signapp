import os
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename

app = Flask(__name__)

# --- CONFIG ---
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///signlearn_final.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173")

# --- MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True)
    password = db.Column(db.String(120))
    role = db.Column(db.String(20))

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assignment_no = db.Column(db.Integer)
    title = db.Column(db.String(100))
    filename = db.Column(db.String(200))

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assignment_no = db.Column(db.Integer)
    text = db.Column(db.String(300))
    image_url = db.Column(db.String(500), nullable=True)
    opt_a = db.Column(db.String(100))
    opt_b = db.Column(db.String(100))
    opt_c = db.Column(db.String(100))
    opt_d = db.Column(db.String(100))
    correct_opt = db.Column(db.String(1))

class QuizResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(80))
    topic = db.Column(db.String(100))
    score = db.Column(db.Integer)
    prediction = db.Column(db.String(50))
    suggestion = db.Column(db.String(300))

with app.app_context():
    db.create_all()

# --- ANALYZER LOGIC ---
def get_analysis(score):
    if score >= 90:
        return {"pred": "Exceptional Mastery", "sugg": "Outstanding! You've mastered these signs perfectly.", "color": "green"}
    elif score >= 70:
        return {"pred": "Strong Progress", "sugg": "Great job! Watch the video once more to fix small errors.", "color": "blue"}
    elif score >= 40:
        return {"pred": "Developing", "sugg": "Good effort! Spend 5 more minutes with the video and try again.", "color": "orange"}
    else:
        return {"pred": "Needs Review", "sugg": "Don't give up! Let's watch the video together again.", "color": "red"}

# --- ROUTES ---
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "User already exists"}), 400
    user = User(username=data['username'], password=data['password'], role=data['role'])
    db.session.add(user)
    db.session.commit()
    return jsonify({"msg": "Success"})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if not user: return jsonify({"error": "Invalid login"}), 401
    return jsonify({"role": user.role, "username": user.username})

@app.route('/teacher/upload', methods=['POST'])
def upload_video():
    file = request.files['file']
    title = request.form.get('title')
    ano = request.form.get('assignment_no')
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    db.session.add(Session(title=title, filename=filename, assignment_no=int(ano)))
    db.session.commit()
    return jsonify({"msg": "Saved"})

@app.route('/teacher/upload_image', methods=['POST'])
def upload_image():
    file = request.files['file']
    filename = secure_filename(f"img_{datetime.datetime.now().timestamp()}_{file.filename}")
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"url": f"http://localhost:5000/uploads/{filename}"})

@app.route('/teacher/add_question', methods=['POST'])
def add_q():
    data = request.json
    db.session.add(Question(
        assignment_no=int(data['assignment_no']),
        text=data['text'], image_url=data.get('image_url'),
        opt_a=data['opt_a'], opt_b=data['opt_b'], opt_c=data['opt_c'], opt_d=data['opt_d'],
        correct_opt=data['correct_opt']
    ))
    db.session.commit()
    return jsonify({"msg": "Saved"})

@app.route('/student/quiz/<int:ano>', methods=['GET'])
def get_quiz(ano):
    qs = Question.query.filter_by(assignment_no=ano).all()
    return jsonify([{
        "text": q.text, "image": q.image_url, "correct": q.correct_opt,
        "a": q.opt_a, "b": q.opt_b, "c": q.opt_c, "d": q.opt_d
    } for q in qs])

@app.route('/submit_quiz', methods=['POST'])
def submit():
    data = request.json
    score = int(data['score'])
    analysis = get_analysis(score)
    res = QuizResult(student_name=data['username'], topic=data['topic'], score=score, 
                     prediction=analysis['pred'], suggestion=analysis['sugg'])
    db.session.add(res)
    db.session.commit()
    
    payload = {"name": data['username'], "topic": data['topic'], "score": score, 
               "prediction": analysis['pred'], "suggestion": analysis['sugg'], "color": analysis['color']}
    socketio.emit('new_stat', payload)
    return jsonify(payload)

@app.route('/sessions', methods=['GET'])
def get_sessions():
    s = Session.query.order_by(Session.assignment_no.asc()).all()
    return jsonify([{"title": x.title, "url": f"http://localhost:5000/uploads/{x.filename}", "ano": x.assignment_no} for x in s])

@app.route('/teacher/stats', methods=['GET'])
def get_stats():
    res = QuizResult.query.order_by(QuizResult.id.desc()).all()
    return jsonify([{"name": r.student_name, "topic": r.topic, "score": r.score, 
                     "prediction": r.prediction, "suggestion": r.suggestion} for r in res])

@app.route('/uploads/<filename>')
def serve(filename): return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
