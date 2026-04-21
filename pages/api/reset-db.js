import { db } from '../../lib/db';

export default async function handler(req, res) {
  try {
    await db.query('DROP TABLE IF EXISTS todos;');
    const createTableQuery = `
      CREATE TABLE todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        task VARCHAR(255) NOT NULL,
        deadline DATE,
        priority VARCHAR(50) DEFAULT 'medium',
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(createTableQuery);
    res.status(200).json({ message: "🔥 BOOM! Old table destroyed, new table created perfectly!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}