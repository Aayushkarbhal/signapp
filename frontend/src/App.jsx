import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

// --- ACCESSIBLE QUIZ OVERLAY ---
const QuizOverlay = ({ user, topic, ano, onClose }) => {
  const [qs, setQs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    axios
      .get(`http://localhost:5000/student/quiz/${ano}`)
      .then((r) => setQs(r.data));
  }, [ano]);

  const submitForm = async () => {
    let hits = 0;
    qs.forEach((q, i) => {
      if (answers[i] === q.correct) hits++;
    });
    const pct = Math.round((hits / (qs.length || 1)) * 100);
    const r = await axios.post("http://localhost:5000/submit_quiz", {
      username: user.username,
      topic,
      score: pct,
    });
    setResult(r.data);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[200] overflow-y-auto p-4 md:p-10">
      <div className="max-w-4xl mx-auto space-y-10 pb-20">
        {!result ? (
          <>
            <div className="bg-white p-12 rounded-[3rem] border-b-8 border-blue-600 shadow-xl flex justify-between items-center">
              <h1 className="text-4xl font-black uppercase italic">
                Assignment {ano}: {topic}
              </h1>
              <button
                onClick={() => onClose(null)}
                className="text-xl font-bold text-red-500"
              >
                EXIT
              </button>
            </div>
            {qs.map((q, i) => (
              <div
                key={i}
                className="bg-white p-10 rounded-[3.5rem] shadow-lg border-4 border-transparent"
              >
                <h2 className="text-4xl font-black mb-8">
                  {i + 1}. {q.text}
                </h2>
                {q.image && (
                  <img
                    src={q.image}
                    className="w-full max-w-md rounded-3xl mb-8 border-4 shadow-sm mx-auto block"
                    alt="Question"
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {["A", "B", "C", "D"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers({ ...answers, [i]: opt })}
                      className={`p-10 rounded-[2.5rem] text-left text-3xl font-black border-4 transition-all 
                      ${answers[i] === opt ? "border-blue-600 bg-blue-50 shadow-md" : "border-slate-100 bg-slate-50"}`}
                    >
                      {opt}. {q[opt.toLowerCase()]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={submitForm}
              className="w-full bg-blue-600 text-white p-12 rounded-[3rem] text-4xl font-black uppercase shadow-2xl"
            >
              SUBMIT TEST 🚀
            </button>
          </>
        ) : (
          <div
            className={`p-16 rounded-[4rem] text-white text-center space-y-8 shadow-2xl
            ${result.color === "green" ? "bg-green-600" : result.color === "blue" ? "bg-blue-600" : result.color === "orange" ? "bg-orange-500" : "bg-red-600"}`}
          >
            <h2 className="text-8xl font-black italic">{result.score}%</h2>
            <div className="bg-white/20 p-8 rounded-[3rem]">
              <p className="text-4xl font-black mb-2 uppercase italic">
                {result.prediction}
              </p>
              <p className="text-2xl font-bold">"{result.suggestion}"</p>
            </div>
            <button
              onClick={() => onClose(result.suggestion)}
              className="bg-white text-slate-900 px-16 py-6 rounded-full text-2xl font-black uppercase shadow-xl"
            >
              Back to Lessons
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- AUTH ---
const Auth = ({ setAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "student",
  });
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    try {
      const r = await axios.post(
        `http://localhost:5000/${isLogin ? "login" : "register"}`,
        form,
      );
      if (isLogin) {
        localStorage.setItem(
          "user",
          JSON.stringify({ loggedIn: true, ...r.data }),
        );
        setAuth({ loggedIn: true, ...r.data });
        navigate(`/${r.data.role}`);
      } else {
        alert("Account Created! Login now.");
        setIsLogin(true);
      }
    } catch (err) {
      alert("Invalid Credentials or User Exists");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <form
        onSubmit={handle}
        className="bg-white p-12 rounded-[3.5rem] w-full max-w-md shadow-2xl space-y-6"
      >
        <h1 className="text-5xl font-black text-center italic tracking-tighter">
          Sign<span className="text-blue-600">Learn</span>
        </h1>
        <input
          required
          className="w-full p-5 bg-slate-100 rounded-2xl font-bold"
          placeholder="Username"
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          required
          type="password"
          className="w-full p-5 bg-slate-100 rounded-2xl font-bold"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select
          className="w-full p-5 bg-slate-100 rounded-2xl font-bold"
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <button className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black uppercase text-xl">
          {isLogin ? "Sign In" : "Create Account"}
        </button>
        <p
          onClick={() => setIsLogin(!isLogin)}
          className="text-center font-bold text-slate-400 cursor-pointer"
        >
          {isLogin
            ? "Need an account? Join Us"
            : "Already have an account? Login"}
        </p>
      </form>
    </div>
  );
};

// --- TEACHER VIEW ---
const TeacherView = ({ user }) => {
  const [file, setFile] = useState(null);
  const [qImg, setQImg] = useState("");
  const [stats, setStats] = useState([]);
  const [q, setQ] = useState({
    assignment_no: 1,
    topic: "",
    text: "",
    opt_a: "",
    opt_b: "",
    opt_c: "",
    opt_d: "",
    correct_opt: "A",
  });

  useEffect(() => {
    axios
      .get("http://localhost:5000/teacher/stats")
      .then((r) => setStats(r.data));
    socket.on("new_stat", (d) => setStats((v) => [d, ...v]));
    return () => socket.off("new_stat");
  }, []);

  const uploadV = async () => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", q.topic);
    fd.append("assignment_no", q.assignment_no);
    await axios.post("http://localhost:5000/teacher/upload", fd);
    alert("Lesson Saved!");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col lg:flex-row gap-6">
      <div className="bg-white p-8 rounded-3xl border shadow-sm w-full lg:w-1/3 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-black text-blue-600 uppercase">
            Teacher Console
          </h2>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/";
            }}
            className="text-xs font-bold text-red-500"
          >
            LOGOUT
          </button>
        </div>
        <input
          type="number"
          className="w-full p-3 bg-slate-50 border rounded-lg"
          placeholder="Asgn No."
          onChange={(e) => setQ({ ...q, assignment_no: e.target.value })}
        />
        <input
          className="w-full p-3 bg-slate-50 border rounded-lg"
          placeholder="Lesson Topic"
          onChange={(e) => setQ({ ...q, topic: e.target.value })}
        />
        <input
          type="file"
          className="text-xs"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button
          onClick={uploadV}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold"
        >
          SAVE VIDEO
        </button>
        <hr />
        <input
          type="file"
          className="text-xs"
          onChange={(e) =>
            axios
              .post(
                "http://localhost:5000/teacher/upload_image",
                { file: e.target.files[0] },
                { headers: { "Content-Type": "multipart/form-data" } },
              )
              .then((r) => setQImg(r.data.url))
          }
        />
        <input
          className="w-full p-3 bg-slate-50 border rounded-lg"
          placeholder="Question Text"
          onChange={(e) => setQ({ ...q, text: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          {["a", "b", "c", "d"].map((l) => (
            <input
              key={l}
              className="p-3 bg-slate-100 border rounded-lg text-xs"
              placeholder={`Opt ${l.toUpperCase()}`}
              onChange={(e) => setQ({ ...q, [`opt_${l}`]: e.target.value })}
            />
          ))}
        </div>
        <select
          className="w-full p-3 bg-slate-900 text-white rounded-lg"
          onChange={(e) => setQ({ ...q, correct_opt: e.target.value })}
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
        <button
          onClick={() =>
            axios
              .post("http://localhost:5000/teacher/add_question", {
                ...q,
                image_url: qImg,
              })
              .then(() => alert("Question Added"))
          }
          className="w-full bg-slate-900 text-white p-3 rounded-lg font-bold"
        >
          ADD TO QUIZ
        </button>
      </div>

      <div className="flex-1 bg-slate-900 p-8 rounded-3xl text-white overflow-y-auto h-[700px]">
        <h2 className="text-blue-400 font-black mb-6 uppercase text-xs tracking-widest">
          Global Student Progress
        </h2>
        <div className="space-y-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="p-6 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center"
            >
              <div>
                <p className="text-2xl font-black">{s.name}</p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {s.topic}
                </p>
                <p className="text-sm italic text-blue-300 mt-2 font-medium">
                  "{s.suggestion}"
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black">{s.score}%</p>
                <p
                  className={`text-xs font-bold uppercase ${s.score >= 70 ? "text-green-400" : "text-red-400"}`}
                >
                  {s.prediction}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- ACCESSIBLE STUDENT VIEW ---
const StudentView = ({ user }) => {
  const [vids, setVids] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:5000/sessions").then((r) => setVids(r.data));
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      {activeQuiz && (
        <QuizOverlay
          user={user}
          topic={activeQuiz.title}
          ano={activeQuiz.ano}
          onClose={(t) => {
            if (t) setTip(t);
            setActiveQuiz(null);
          }}
        />
      )}

      <header className="max-w-5xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-5xl font-black italic tracking-tighter">
          MY <span className="text-blue-600">STUDY ROOM</span>
        </h1>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = "/";
          }}
          className="bg-white px-8 py-3 rounded-full font-black text-red-500 shadow-sm border border-red-100"
        >
          LOGOUT
        </button>
      </header>

      {tip && (
        <div className="max-w-5xl mx-auto mb-10 bg-blue-600 p-10 rounded-[3rem] text-white shadow-2xl">
          <p className="text-sm font-black uppercase opacity-70 mb-2">
            Teacher's Tip 💡
          </p>
          <p className="text-3xl font-black italic">"{tip}"</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-16">
        {vids.map((v, i) => (
          <div
            key={i}
            className="bg-white rounded-[4rem] overflow-hidden shadow-2xl border-b-[20px] border-slate-200"
          >
            <div className="p-10 bg-slate-50 border-b-2 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black">
                  {v.ano}
                </div>
                <h2 className="text-4xl font-black uppercase italic">
                  {v.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveQuiz(v)}
                className="bg-blue-600 text-white px-12 py-5 rounded-full text-2xl font-black shadow-xl hover:scale-105 transition"
              >
                START TEST 📝
              </button>
            </div>
            <div className="p-8">
              <div className="bg-black rounded-[3rem] overflow-hidden border-[15px] border-white aspect-video shadow-inner">
                <video
                  key={v.url}
                  controls
                  className="w-full h-full"
                  src={v.url}
                />
              </div>
              <p className="text-center mt-6 text-xl font-bold text-slate-400 italic uppercase">
                Watch the video above, then take your quiz!
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [auth, setAuth] = useState(() => {
    const s = localStorage.getItem("user");
    return s ? JSON.parse(s) : { loggedIn: false };
  });

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            auth.loggedIn ? (
              <Navigate to={`/${auth.role}`} />
            ) : (
              <Auth setAuth={setAuth} />
            )
          }
        />
        <Route
          path="/teacher"
          element={
            auth.loggedIn && auth.role === "teacher" ? (
              <TeacherView user={auth} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/student"
          element={
            auth.loggedIn && auth.role === "student" ? (
              <StudentView user={auth} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}
