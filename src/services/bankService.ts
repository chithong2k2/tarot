import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BankTransaction } from '../types';

const PAYOS_CLIENT_ID = process.env.VITE_PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.VITE_PAYOS_API_KEY;
const PAYOS_CHECKSUM_KEY = process.env.VITE_PAYOS_CHECKSUM_KEY;

export const bankService = {
  /**
   * Fetch latest transactions from PayOS (Free API)
   * Note: In a production app, these calls should be proxied through a backend
   * to protect API keys and handle HMAC signatures.
   */
  fetchLatestFromBank: async (): Promise<BankTransaction[]> => {
    if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY) {
      console.warn("PayOS credentials missing. Returning empty list.");
      return [];
    }

    try {
      // PayOS API endpoint for transaction history
      // Note: This is a simplified representation. PayOS usually works with payment links,
      // but they also provide transaction history APIs for verified merchants.
      const response = await fetch('https://api-merchant.payos.vn/v2/transactions', {
        headers: {
          'x-client-id': PAYOS_CLIENT_ID,
          'x-api-key': PAYOS_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error("Failed to fetch from PayOS API");
      
      const result = await response.json();
      
      if (result.error !== 0) throw new Error(result.message || "PayOS API Error");

      // Map PayOS response to our BankTransaction type
      return result.data.map((record: any) => ({
        id: String(record.id || record.reference),
        amount: Number(record.amount),
        description: record.description || 'Chuyển khoản MBBank',
        transaction_date: record.transactionDateTime || new Date().toISOString(),
        account_number: record.counterAccountName || 'N/A',
        reference_number: record.reference || record.id,
        type: record.amount > 0 ? 'IN' : 'OUT',
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error("PayOS fetch error:", error);
      return [];
    }
  },

  /**
   * Sync bank transactions to Firestore
   */
  syncTransactions: async (): Promise<{ success: boolean; count: number }> => {
    const latest = await bankService.fetchLatestFromBank();
    if (latest.length === 0) return { success: false, count: 0 };

    let count = 0;
    for (const tx of latest) {
      // Check if transaction already exists in Firestore
      const q = query(collection(db, 'bank_transactions'), where('id', '==', tx.id));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        await addDoc(collection(db, 'bank_transactions'), tx);
        count++;
      }
    }

    return { success: true, count };
  },

  /**
   * Get transactions from Firestore for a specific day
   */
  getTransactionsByDay: async (dateStr: string): Promise<BankTransaction[]> => {
    // dateStr format: YYYY-MM-DD
    const q = query(
      collection(db, 'bank_transactions'),
      where('transaction_date', '>=', `${dateStr}T00:00:00`),
      where('transaction_date', '<=', `${dateStr}T23:59:59`),
      orderBy('transaction_date', 'desc')
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BankTransaction));
  },

  /**
   * Get all transactions for the current week
   */
  getWeeklyTransactions: async (): Promise<BankTransaction[]> => {
    const q = query(
      collection(db, 'bank_transactions'),
      orderBy('transaction_date', 'desc'),
      limit(100)
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BankTransaction));
  }
};
