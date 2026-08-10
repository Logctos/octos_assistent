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

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "done";
  category: "trabalho" | "estudos" | "ambas";
  created_at: string;
}
