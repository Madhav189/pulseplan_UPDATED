import { db } from '../../lib/db';
import redis from '../../lib/redis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { encryptText, decryptText } from '../../lib/encryption'; // ✨ NEW

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  const userId = session.user.id; 
  const CACHE_KEY = `todos_user_${userId}`;

  try {
    if (req.method === 'GET') {
      const cachedTodos = await redis.get(CACHE_KEY);
      if (cachedTodos) return res.status(200).json(JSON.parse(cachedTodos));

      const [todos] = await db.query('SELECT * FROM todos WHERE user_id = ?', [userId]);

      // ✨ NEW: Decrypt the tasks before sending them to the user and cache
      const decryptedTodos = todos.map(todo => ({
        ...todo,
        task: decryptText(todo.task)
      }));

      await redis.set(CACHE_KEY, JSON.stringify(decryptedTodos), 'EX', 3600);
      return res.status(200).json(decryptedTodos);
    }

    if (req.method === 'POST') {
      const { task, deadline, priority } = req.body;
      
      // ✨ NEW: Encrypt the task before saving it to the database
      const secureTask = encryptText(task);

      await db.query(
        'INSERT INTO todos (user_id, task, deadline, priority) VALUES (?, ?, ?, ?)',
        [userId, secureTask, deadline, priority]
      );
      
      await redis.del(CACHE_KEY); 
      return res.status(201).json({ message: 'Pulse added securely!' });
    }

    // --- INSIDE pages/api/todos.js ---

    if (req.method === 'PUT') {
      // ✨ NEW: Bulk Complete All Action
      if (req.body.action === 'completeAll') {
        await db.query('UPDATE todos SET is_completed = true WHERE user_id = ?', [userId]);
        await redis.del(CACHE_KEY);
        return res.status(200).json({ message: 'All pulses marked as completed!' });
      }

      // Existing single update logic
      const { id, is_completed, task, deadline, priority } = req.body;
      const secureTask = task ? encryptText(task) : undefined;

      await db.query(
        'UPDATE todos SET is_completed = IFNULL(?, is_completed), task = IFNULL(?, task), deadline = IFNULL(?, deadline), priority = IFNULL(?, priority) WHERE id = ? AND user_id = ?',
        [is_completed, secureTask, deadline, priority, id, userId]
      );
      
      await redis.del(CACHE_KEY); 
      return res.status(200).json({ message: 'Pulse updated!' });
    }

    if (req.method === 'DELETE') {
      // ✨ NEW: Bulk Delete All Action
      if (req.query.action === 'deleteAll') {
        await db.query('DELETE FROM todos WHERE user_id = ?', [userId]);
        await redis.del(CACHE_KEY);
        return res.status(200).json({ message: 'All pulses securely wiped.' });
      }

      // Existing single delete logic
      const { id } = req.query;
      await db.query('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, userId]);
      await redis.del(CACHE_KEY); 
      return res.status(200).json({ message: 'Pulse removed.' });
    }

    return res.status(405).end();
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}