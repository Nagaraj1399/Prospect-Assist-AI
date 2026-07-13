// TypeScript Definitions for the Credit Intelligence Suite

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface IntentDiscoveryResult {
  customer_intent: "Personal Loan" | "Home Loan" | "Mortgage Loan" | "Auto Loan" | "Unknown";
  requested_amount: number;
  intent_score: number;
  behavioral_summary: string;
  assistant_message: string;
}

export interface DocumentOcrResult {
  legal_name: string | null;
  document_type: string;
  unique_id_number: string | null;
  issue_date: string | null;
  employer_name: string | null;
  security_validation_passed: boolean;
  security_validation_flags: string[];
  extraction_confidence_percentage: number;
}

export interface Transaction {
  month: number;
  type: "credit" | "debit";
  amount: number;
  category: string;
  description: string;
}

export interface UnderwritingResult {
  verified_monthly_income?: number;
  total_fixed_liabilities?: number;
  quantifiable_repayment_capacity?: number;
  calculated_debt_to_income_ratio?: number;
  risk_flags_detected?: string[];
  credit_recommendation?: "APPROVED" | "REJECTED" | "MODIFY_TERMS";
  proposed_max_safe_emi?: number;
  recommended_interest_rate_adjustment?: string;
  underwriter_executive_summary?: string;

  authStatus?: string;
  role?: string;
  underwritingReport?: {
    verifiedIncomeMonthly: number;
    detectedUndisclosedEmis: number;
    calculatedFoirPercentage: number;
    conversionProbability: "High" | "Medium" | "Low";
    justification: string;
  };
}
