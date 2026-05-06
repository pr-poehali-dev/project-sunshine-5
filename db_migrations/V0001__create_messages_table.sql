CREATE TABLE t_p43524458_project_sunshine_5.messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT NOW()
);