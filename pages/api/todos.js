import { db } from '../../lib/db';
import redis from '../../lib/redis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { encryptText, decryptText } from '../../lib/encryption';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  const userId = session.user.id; 
  const CACHE_KEY = `todos_user_${userId}`;

  try {
    // ==========================================
    // 📖 GET: Fetch Tasks (The Redis Speed Test)
    // ==========================================
    if (req.method === 'GET') {
      console.log(`\n========================================`);
      console.log(`👤 User Requesting Pulses: ${userId}`);
      console.log(`🔍 Checking Redis Cache first...`);
      
      console.time("⏱️ Total Response Time"); 

      const cachedTodos = await redis.get(CACHE_KEY);

      if (cachedTodos) {
        // ✨ CACHE HIT
        console.log(`🟢 CACHE HIT! Loaded directly from Redis memory.`);
        console.timeEnd("⏱️ Total Response Time");
        console.log(`========================================\n`);
        return res.status(200).json(JSON.parse(cachedTodos));
      }

      // 🚨 CACHE MISS
      console.log(`🔴 CACHE MISS! Querying MySQL Database...`);
      const [todos] = await db.query('SELECT * FROM todos WHERE user_id = ? ORDER BY id DESC', [userId]);
      const decryptedTodos = todos.map(todo => ({ ...todo, task: decryptText(todo.task) }));

      console.log(`💾 MySQL data retrieved. Caching in Redis for next time...`);
      await redis.set(CACHE_KEY, JSON.stringify(decryptedTodos), 'EX', 3600);
      
      console.timeEnd("⏱️ Total Response Time");
      console.log(`========================================\n`);
      return res.status(200).json(decryptedTodos);
    }

    // ==========================================
    // ✍️ POST: Add a new task
    // ==========================================
    if (req.method === 'POST') {
      const { task, deadline, priority } = req.body;
      const secureTask = encryptText(task);
      await db.query('INSERT INTO todos (user_id, task, deadline, priority) VALUES (?, ?, ?, ?)', [userId, secureTask, deadline, priority]);
      
      console.log(`🧹 DATABASE UPDATED (New Task): Wiping Redis Cache to prevent stale data!`);
      await redis.del(CACHE_KEY); 
      return res.status(201).json({ message: 'Added securely' });
    }

    // ==========================================
    // 🔄 PUT: Update an existing task or Mark All
    // ==========================================
    if (req.method === 'PUT') {
      if (req.body.action === 'completeAll') {
        await db.query('UPDATE todos SET is_completed = true WHERE user_id = ?', [userId]);
        
        console.log(`🧹 DATABASE UPDATED (Complete All): Wiping Redis Cache!`);
        await redis.del(CACHE_KEY);
        return res.status(200).json({ message: 'All marked completed' });
      }

      const { id, is_completed, task, deadline, priority } = req.body;
      const secureTask = task ? encryptText(task) : undefined;
      await db.query('UPDATE todos SET is_completed = IFNULL(?, is_completed), task = IFNULL(?, task), deadline = IFNULL(?, deadline), priority = IFNULL(?, priority) WHERE id = ? AND user_id = ?', [is_completed, secureTask, deadline, priority, id, userId]);
      
      console.log(`🧹 DATABASE UPDATED (Edit Task): Wiping Redis Cache!`);
      await redis.del(CACHE_KEY); 
      return res.status(200).json({ message: 'Updated' });
    }

    // ==========================================
    // 🗑️ DELETE: Remove a task or Secure Wipe
    // ==========================================
    if (req.method === 'DELETE') {
      if (req.query.action === 'deleteAll') {
        await db.query('DELETE FROM todos WHERE user_id = ?', [userId]);
        
        console.log(`🧹 DATABASE UPDATED (Secure Wipe): Wiping Redis Cache!`);
        await redis.del(CACHE_KEY);
        return res.status(200).json({ message: 'Wiped' });
      }

      await db.query('DELETE FROM todos WHERE id = ? AND user_id = ?', [req.query.id, userId]);
      
      console.log(`🧹 DATABASE UPDATED (Delete Task): Wiping Redis Cache!`);
      await redis.del(CACHE_KEY); 
      return res.status(200).json({ message: 'Removed' });
    }

    return res.status(405).end();
  } catch (error) {
    console.error("❌ API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}