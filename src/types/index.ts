export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string | null;
  type: "income" | "expense";
  created_at: string;
}

export interface HealthLog {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number | null;
  activity_minutes: number | null;
  sleep_hours: number | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "done";
  category: "trabalho" | "estudos" | "ambas";
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  plan_label: string;
  topic: string;
  session_date: string;
  duration_minutes: number;
  xp_value: number;
  completed: boolean;
  completed_at: string | null;
  calendar_event_link: string | null;
  created_at: string;
}

export interface StudySource {
  title: string;
  url: string;
}

export interface DailySummary {
  id: string;
  user_id: string;
  log_date: string;
  content: string;
  created_at: string;
}

export interface StudyMaterial {
  id: string;
  user_id: string;
  plan_label: string | null;
  topic: string;
  content: string;
  sources: StudySource[];
  base_material: string | null;
  created_at: string;
}
