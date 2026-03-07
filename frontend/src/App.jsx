import React, { useState, useEffect, useRef } from "react";
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

// --- MINIMIZED CHAT ---
const ChatBox = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  useEffect(() => {
    socket.on("message", (d) => setChat((v) => [...v, d]));
    return () => socket.off("message");
  }, []);

  const send = (e) => {
    e.preventDefault();
    if (msg.trim()) {
      socket.emit("message", { user: user.username, text: msg });
      setMsg("");
    }
  };

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full font-black shadow-xl z-50"
      >
        💬
      </button>
    );

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-slate-900 rounded-[2rem] flex flex-col overflow-hidden z-50 shadow-2xl border border-white/10">
      <div className="bg-blue-600 p-4 text-white font-black text-[10px] flex justify-between">
        <span>CHAT</span>
        <button onClick={() => setOpen(false)}>×</button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-slate-950/50">
        {chat.map((c, i) => (
          <div
            key={i}
            className={c.user === user.username ? "text-right" : "text-left"}
          >
            <span
              className={`inline-block p-2 rounded-xl text-xs ${c.user === user.username ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}
            >
              {c.text}
            </span>
          </div>
        ))}
      </div>
      <form
        onSubmit={send}
        className="p-2 flex gap-2 bg-slate-900 border-t border-white/5"
      >
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="flex-1 bg-white/5 rounded-lg px-3 py-1 text-xs text-white"
        />
        <button className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black">
          SEND
        </button>
      </form>
    </div>
  );
};

// --- DYNAMIC QUIZ OVERLAY ---
const QuizOverlay = ({ user, topic, ano, onClose }) => {
  const [qs, setQs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [ai, setAi] = useState("");

  useEffect(() => {
    axios
      .get(`http://localhost:5000/student/quiz/${ano}`)
      .then((r) => setQs(r.data));
  }, [ano]);

  const handle = async (a) => {
    let s = score;
    if (a === qs[idx].correct) s += 1;
    if (idx + 1 < qs.length) {
      setScore(s);
      setIdx(idx + 1);
    } else {
      const pct = Math.round((s / qs.length) * 100);
      const r = await axios.post("http://localhost:5000/submit_quiz", {
        username: user.username,
        topic,
        score: pct,
      });
      setAi(r.data.prediction);
      setScore(pct);
      setDone(true);
    }
  };

  if (!qs.length)
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center text-white font-black">
        No quiz for this Assignment.
      </div>
    );

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl">
        {!done ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-black italic">
              Assignment {ano}: {topic}
            </h2>
            <p className="text-xl font-bold">Q: {qs[idx].text}</p>
            <div className="grid gap-3">
              <button
                onClick={() => handle("A")}
                className="p-5 bg-slate-100 rounded-2xl font-black hover:bg-blue-600 hover:text-white transition"
              >
                A: {qs[idx].a}
              </button>
              <button
                onClick={() => handle("B")}
                className="p-5 bg-slate-100 rounded-2xl font-black hover:bg-blue-600 hover:text-white transition"
              >
                B: {qs[idx].b}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-black italic">Score: {score}%</h2>
            <div className="bg-blue-600 p-6 rounded-[2rem] text-white">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                ML Prediction
              </p>
              <p className="text-2xl font-black">{ai}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- AUTH ---
const Auth = ({ setAuth }) => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "student",
  });
  const navigate = useNavigate();
  const sub = async (e) => {
    e.preventDefault();
    const r = await axios.post("http://localhost:5000/login", form);
    setAuth({ loggedIn: true, ...r.data });
    navigate(`/${r.data.role}`);
  };
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <form
        onSubmit={sub}
        className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/10 w-full max-w-sm shadow-2xl"
      >
        <h1 className="text-4xl font-black italic text-white text-center mb-8">
          SIGN<span className="text-blue-500">LEARN</span>
        </h1>
        <input
          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white mb-3"
          placeholder="Username"
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white mb-3"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select
          className="w-full p-4 bg-slate-800 border border-white/10 rounded-2xl text-white mb-6"
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <button className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase">
          Login
        </button>
      </form>
    </div>
  );
};

// --- TEACHER VIEW ---
const TeacherView = ({ user }) => {
  const [file, setFile] = useState(null);
  const [stats, setStats] = useState([]);
  const [ano, setAno] = useState(1);
  const [q, setQ] = useState({
    assignment_no: 1,
    topic: "",
    text: "",
    alt_a: "",
    alt_b: "",
    correct: "A",
  });

  useEffect(() => {
    axios
      .get("http://localhost:5000/teacher/stats")
      .then((r) => setStats(r.data));
    socket.on("new_stat", (d) => setStats((v) => [d, ...v]));
    return () => socket.off("new_stat");
  }, []);

  const upload = async () => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", q.topic);
    fd.append("assignment_no", q.assignment_no);
    await axios.post("http://localhost:5000/teacher/upload", fd);
    alert("Assignment Uploaded!");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <header className="bg-white p-6 rounded-[2rem] border shadow-sm flex justify-between font-black italic">
        <h1>TEACHER CONTROL</h1>
        <button onClick={() => (window.location.href = "/")}>EXIT</button>
      </header>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-4">
          <h2 className="font-black uppercase text-xs text-slate-400">
            Assignment Management
          </h2>
          <div className="flex gap-2">
            <input
              type="number"
              className="w-20 p-4 bg-slate-50 border rounded-xl"
              placeholder="No."
              onChange={(e) => setQ({ ...q, assignment_no: e.target.value })}
            />
            <input
              className="flex-1 p-4 bg-slate-50 border rounded-xl"
              placeholder="Topic Title"
              onChange={(e) => setQ({ ...q, topic: e.target.value })}
            />
          </div>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-xs"
          />
          <button
            onClick={upload}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-black"
          >
            SAVE ASSIGNMENT
          </button>
          <hr className="my-4" />
          <input
            className="w-full p-4 bg-slate-50 border rounded-xl"
            placeholder="Quiz Question"
            onChange={(e) => setQ({ ...q, text: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              className="flex-1 p-4 bg-slate-50 border rounded-xl"
              placeholder="Option A"
              onChange={(e) => setQ({ ...q, alt_a: e.target.value })}
            />
            <input
              className="flex-1 p-4 bg-slate-50 border rounded-xl"
              placeholder="Option B"
              onChange={(e) => setQ({ ...q, alt_b: e.target.value })}
            />
          </div>
          <button
            onClick={() =>
              axios
                .post("http://localhost:5000/teacher/add_question", q)
                .then(() => alert("Quiz Added"))
            }
            className="w-full bg-slate-900 text-white p-4 rounded-xl font-black"
          >
            SAVE QUIZ
          </button>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white overflow-y-auto h-[550px]">
          <h2 className="text-blue-400 font-black italic mb-6 uppercase text-sm tracking-widest">
            ML Performance Log
          </h2>
          <div className="space-y-3">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5"
              >
                <div className="text-xs">
                  <p className="font-black">{s.name}</p>
                  <p className="text-slate-500">{s.topic}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-[10px] font-black ${s.prediction === "High Potential" ? "text-green-400" : "text-orange-400"}`}
                  >
                    {s.prediction}
                  </p>
                  <p className="font-black">{s.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ChatBox user={user} />
    </div>
  );
};

// --- STUDENT VIEW WITH ASSIGNMENT PATH ---
const StudentView = ({ user }) => {
  const [vids, setVids] = useState([]);
  const [active, setActive] = useState(null);
  const [showQ, setShowQ] = useState(false);
  useEffect(() => {
    axios.get("http://localhost:5000/sessions").then((r) => {
      setVids(r.data);
      if (r.data.length) setActive(r.data[0]);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col lg:flex-row gap-8">
      {showQ && (
        <QuizOverlay
          user={user}
          topic={active?.title}
          ano={active?.ano}
          onClose={() => setShowQ(false)}
        />
      )}

      {/* Path Sidebar */}
      <div className="w-full lg:w-80 space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
          Learning Path
        </h2>
        <div className="space-y-3">
          {vids.map((v, i) => (
            <button
              key={i}
              onClick={() => setActive(v)}
              className={`w-full p-6 rounded-[2rem] text-left border-2 flex items-center gap-4 transition-all ${active?.ano === v.ano ? "bg-blue-600 text-white border-blue-600 shadow-xl scale-105" : "bg-white border-transparent shadow-sm"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${active?.ano === v.ano ? "bg-white text-blue-600" : "bg-slate-100 text-slate-400"}`}
              >
                {v.ano}
              </div>
              <div>
                <p className="text-[9px] font-black opacity-60 uppercase">
                  Assignment
                </p>
                <p className="font-bold text-sm truncate w-32">{v.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 space-y-6">
        {active ? (
          <>
            <div className="bg-white p-8 rounded-[3rem] shadow-sm flex justify-between items-center border">
              <h1 className="text-2xl font-black italic tracking-tighter uppercase">
                {active.title}
              </h1>
              <button
                onClick={() => setShowQ(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-xs"
              >
                TAKE ASSIGNMENT TEST
              </button>
            </div>
            <div className="bg-black rounded-[4rem] overflow-hidden border-[15px] border-white shadow-2xl aspect-video">
              <video
                key={active.url}
                controls
                className="w-full h-full"
                src={active.url}
              />
            </div>
          </>
        ) : (
          <div className="text-center p-20 font-black text-slate-300">
            PATH EMPTY
          </div>
        )}
      </div>
      <ChatBox user={user} />
    </div>
  );
};

export default function App() {
  const [auth, setAuth] = useState({ loggedIn: false });
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth setAuth={setAuth} />} />
        <Route
          path="/teacher"
          element={
            auth.loggedIn ? <TeacherView user={auth} /> : <Navigate to="/" />
          }
        />
        <Route
          path="/student"
          element={
            auth.loggedIn ? <StudentView user={auth} /> : <Navigate to="/" />
          }
        />
      </Routes>
    </Router>
  );
}
