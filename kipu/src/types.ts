/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense';
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'kipu';
  content: string;
  timestamp: string;
}

export interface FinanceAnalysis {
  score: number;
  analysis: string;
  recommendations: string[];
}
