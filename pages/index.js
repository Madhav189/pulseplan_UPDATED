import { useState, useEffect } from 'react';
import Head from 'next/head'; 
import toast, { Toaster } from 'react-hot-toast';
import { useSession, signIn, signOut } from "next-auth/react"; 

export default function Home() {
  const { data: session, status } = useSession(); 
  
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({ task: '', deadline: '', priority: 'medium' });
  const [editingId, setEditingId] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  // MFA State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  useEffect(() => { 
    if (status === "authenticated") fetchTodos(); 
  }, [status]);

  const fetchTodos = async () => {
    const res = await fetch('/api/todos');
    if (res.ok) {
      const data = await res.json();
      setTodos(data.map(t => ({...t, deadline: t.deadline ? t.deadline.split('T')[0] : ''})));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.task) return toast.error('Enter a task!');
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { ...form, id: editingId, is_completed: todos.find(t => t.id === editingId).is_completed } : form;

    const res = await fetch('/api/todos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success(editingId ? 'Updated!' : 'Pulse Added!');
      setEditingId(null);
      setForm({ task: '', deadline: '', priority: 'medium' });
      fetchTodos();
    } else {
      toast.error('Failed to save task.');
    }
  };

  const toggleComplete = async (todo) => {
    const newStatus = !todo.is_completed;
    setTodos(todos.map(t => t.id === todo.id ? { ...t, is_completed: newStatus } : t));
    await fetch('/api/todos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: todo.id, is_completed: newStatus }) });
    fetchTodos(); 
  };

  const handleDelete = async (id) => {
    if(!confirm("Delete this pulse?")) return;
    await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
    toast.success('Deleted.');
    fetchTodos();
  };

  const handleCompleteAll = async () => {
    if (!confirm("Mark all tasks as completed?")) return;
    await fetch('/api/todos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'completeAll' }) });
    toast.success('All tasks completed!');
    fetchTodos();
  };

  const requestDeleteAll = async () => {
    setIsSendingOtp(true);
    const res = await fetch('/api/send-otp', { method: 'POST' });
    if (res.ok) {
      toast.success('Security code sent to your email!');
      setShowOtpModal(true);
    } else {
      toast.error('Failed to send code.');
    }
    setIsSendingOtp(false);
  };

  const verifyAndExecuteDeleteAll = async () => {
    if (otpCode.length !== 6) return toast.error("Enter 6-digit code");
    const verifyRes = await fetch('/api/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: otpCode }) });
    
    if (verifyRes.ok) {
      await fetch('/api/todos?action=deleteAll', { method: 'DELETE' });
      toast.success('Verification passed. Database wiped.');
      setShowOtpModal(false);
      setOtpCode('');
      fetchTodos();
    } else {
      toast.error('Invalid or expired code!');
    }
  };

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold">Loading Engine...</div>;

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-4">
        <Head><title>PulsePlan | Login</title></Head>
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center">
          <h1 className="text-4xl font-black text-slate-800 mb-2">PulsePlan<span className="text-blue-500">.</span></h1>
          <p className="text-slate-500 mb-8 font-medium">Your Daily Rhythm</p>
          <button onClick={() => signIn("google")} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-4 rounded-xl font-bold transition">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const theme = {
    bg: darkMode ? 'bg-slate-900' : 'bg-gray-50', text: darkMode ? 'text-slate-100' : 'text-gray-800',
    cardBg: darkMode ? 'bg-slate-800' : 'bg-white', cardBorder: darkMode ? 'border-slate-700' : 'border-gray-200',
    subText: darkMode ? 'text-slate-400' : 'text-gray-500', inputBg: darkMode ? 'bg-slate-900' : 'bg-gray-50'
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} py-8 px-4 transition-colors duration-500 flex flex-col`}>
      <Head><title>PulsePlan ⚡</title></Head>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />

      <div className="max-w-4xl mx-auto w-full flex-grow">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg text-white font-bold text-xl">⚡</div>
             <div><h1 className="text-3xl font-extrabold">PulsePlan</h1><p className={`text-xs ${theme.subText} uppercase tracking-widest font-semibold`}>Welcome, {session?.user?.name?.split(' ')[0]}</p></div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-full ${theme.cardBg} border ${theme.cardBorder}`}>{darkMode ? '☀️' : '🌙'}</button>
            <button onClick={() => signOut()} className="p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition">Exit</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`${theme.cardBg} p-6 rounded-2xl shadow-lg mb-8 border ${theme.cardBorder}`}>
          <div className="flex flex-col gap-4">
            <input className={`w-full px-5 py-4 ${theme.inputBg} border ${theme.cardBorder} rounded-xl outline-none text-lg`} value={form.task} onChange={e => setForm({...form, task: e.target.value})} placeholder="What's your next move?" />
            <div className="flex flex-wrap gap-3">
              <input type="date" className={`flex-1 px-4 py-3 ${theme.inputBg} border ${theme.cardBorder} rounded-xl outline-none`} value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
              <select className={`px-4 py-3 ${theme.inputBg} border ${theme.cardBorder} rounded-xl outline-none`} value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="high">🔴 High</option><option value="medium">🟡 Medium</option><option value="low">🔵 Low</option>
              </select>
              <button type="submit" className={`flex-1 px-8 py-3 rounded-xl font-bold text-white transition ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>{editingId ? 'Update' : 'Add Pulse'}</button>
            </div>
          </div>
        </form>

        {todos.length > 0 && (
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className={`text-sm font-bold ${theme.subText} uppercase tracking-wider`}>Your Pulses</h3>
            <div className="flex gap-3">
              <button onClick={handleCompleteAll} className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-lg">✓ Mark All Done</button>
              <button onClick={requestDeleteAll} disabled={isSendingOtp} className="text-xs font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-lg">{isSendingOtp ? "Sending..." : "🗑️ Secure Wipe"}</button>
            </div>
          </div>
        )}

        <div className="space-y-3 pb-20">
          {todos.map(t => (
            <div key={t.id} className={`${theme.cardBg} p-4 rounded-xl border ${theme.cardBorder} flex items-center justify-between shadow-sm`}>
              <div className="flex items-center gap-4">
                <input type="checkbox" checked={t.is_completed} onChange={() => toggleComplete(t)} className="w-5 h-5 accent-blue-500 cursor-pointer" />
                <span className={`text-lg font-medium ${t.is_completed ? 'line-through opacity-50' : ''}`}>{t.task}</span>
              </div>
              <div className="flex items-center gap-3">
                {t.deadline && <span className="text-xs bg-gray-500/10 px-2 py-1 rounded">{t.deadline}</span>}
                <button onClick={() => { setEditingId(t.id); setForm({ task: t.task, deadline: t.deadline || '', priority: t.priority || 'medium' }); }} className="text-blue-500 hover:text-blue-400">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-400">Delete</button>
              </div>
            </div>
          ))}
          {todos.length === 0 && <div className={`text-center py-16 ${theme.subText} border-2 border-dashed ${theme.cardBorder} rounded-2xl`}>No pulses active.</div>}
        </div>
      </div>

      {showOtpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${theme.cardBg} border ${theme.cardBorder} p-8 rounded-2xl max-w-sm w-full text-center`}>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🛡️</div>
            <h2 className="text-2xl font-bold mb-2">High-Risk Action</h2>
            <p className={`text-sm ${theme.subText} mb-6`}>Enter the 6-digit code sent to your email to delete all tasks.</p>
            <input type="text" maxLength="6" className={`w-full text-center text-3xl tracking-[1em] font-mono px-4 py-3 ${theme.inputBg} border ${theme.cardBorder} rounded-xl outline-none mb-4`} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
            <div className="flex gap-3">
              <button onClick={() => setShowOtpModal(false)} className={`flex-1 py-3 rounded-xl font-bold ${theme.subText}`}>Cancel</button>
              <button onClick={verifyAndExecuteDeleteAll} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600">Verify & Wipe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}