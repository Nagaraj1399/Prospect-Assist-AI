import { Transaction } from "./types";

// Mock Borrowers with 6-month transaction registers
export interface BorrowerProfile {
  id: string;
  name: string;
  occupation: string;
  requestedLoanType: string;
  requestedLoanAmount: number;
  description: string;
  transactions: Transaction[];
}

export const MOCK_BORROWERS: BorrowerProfile[] = [
  {
    id: "aman_sharma",
    name: "Aman Sharma",
    occupation: "Senior Software Architect",
    requestedLoanType: "Home Loan",
    requestedLoanAmount: 4000000, // ₹40 Lakhs
    description: "Stable professional with a clean record, high payroll, and structured rents/savings.",
    transactions: [
      { month: 1, type: "credit", amount: 150000, category: "Salary", description: "Direct Deposit - TechCorp Systems" },
      { month: 1, type: "debit", amount: 30000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 1, type: "debit", amount: 12000, category: "EMI", description: "HDFC Auto Loan EMI" },
      { month: 1, type: "debit", amount: 15000, category: "Living", description: "Groceries & Swiggy Delivery" },
      { month: 1, type: "debit", amount: 5000, category: "Utilities", description: "Power, Internet, Gas bills" },
      
      { month: 2, type: "credit", amount: 150000, category: "Salary", description: "Direct Deposit - TechCorp Systems" },
      { month: 2, type: "debit", amount: 30000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 2, type: "debit", amount: 12000, category: "EMI", description: "HDFC Auto Loan EMI" },
      { month: 2, type: "debit", amount: 18000, category: "Living", description: "Groceries & Swiggy Delivery" },
      { month: 2, type: "debit", amount: 5000, category: "Utilities", description: "Power, Internet, Gas bills" },

      { month: 3, type: "credit", amount: 150000, category: "Salary", description: "Direct Deposit - TechCorp Systems" },
      { month: 3, type: "debit", amount: 30000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 3, type: "debit", amount: 12000, category: "EMI", description: "HDFC Auto Loan EMI" },
      { month: 3, type: "debit", amount: 14000, category: "Living", description: "Groceries & Swiggy Delivery" },
      { month: 3, type: "debit", amount: 5000, category: "Utilities", description: "Power, Internet, Gas bills" },

      { month: 4, type: "credit", amount: 150000, category: "Salary", description: "Direct Deposit - TechCorp Systems" },
      { month: 4, type: "debit", amount: 30000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 4, type: "debit", amount: 12000, category: "EMI", description: "HDFC Auto Loan EMI" },
      { month: 4, type: "debit", amount: 20000, category: "Living", description: "Amazon Purchases & Dining Out" },
      { month: 4, type: "debit", amount: 5000, category: "Utilities", description: "Power, Internet, Gas bills" },

      { month: 5, type: "credit", amount: 150000, category: "Salary", description: "Direct Deposit - TechCorp Systems" },
      { month: 5, type: "debit", amount: 30000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 5, type: "debit", amount: 12000, category: "EMI", description: "HDFC Auto Loan EMI" },
      { month: 5, type: "debit", amount: 15000, category: "Living", description: "Groceries & Swiggy Delivery" },
      { month: 5, type: "debit", amount: 5000, category: "Utilities", description: "Power, Internet, Gas bills" },

      { month: 6, type: "credit", amount: 150000, category: "Salary", description: "Direct Deposit - TechCorp Systems" },
      { month: 6, type: "debit", amount: 30000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 6, type: "debit", amount: 12000, category: "EMI", description: "HDFC Auto Loan EMI" },
      { month: 6, type: "debit", amount: 16000, category: "Living", description: "Groceries & Swiggy Delivery" },
      { month: 6, type: "debit", amount: 5000, category: "Utilities", description: "Power, Internet, Gas bills" }
    ]
  },
  {
    id: "rajesh_patel",
    name: "Rajesh Patel",
    occupation: "Freelance Brand Consultant",
    requestedLoanType: "Personal Loan",
    requestedLoanAmount: 600000, // ₹6 Lakhs
    description: "Highly variable cash inflow, frequent large ATM cash drains, and high lifestyle spending. Has several overdraft penalty instances.",
    transactions: [
      { month: 1, type: "credit", amount: 120000, category: "Revenue", description: "Client Deposit - Apex Brands" },
      { month: 1, type: "debit", amount: 25000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 1, type: "debit", amount: 10000, category: "EMI", description: "Consumer Durable EMI" },
      { month: 1, type: "debit", amount: 35000, category: "Living", description: "High Frequency Clubbing & Swiggy" },
      { month: 1, type: "debit", amount: 15000, category: "Cash Drain", description: "ATM Cash Withdrawal" },
      
      { month: 2, type: "credit", amount: 40000, category: "Revenue", description: "Client Deposit - Short Consulting" },
      { month: 2, type: "debit", amount: 25000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 2, type: "debit", amount: 10000, category: "EMI", description: "Consumer Durable EMI" },
      { month: 2, type: "debit", amount: 500, category: "Penalty", description: "Overdraft Penalty Fee" },
      { month: 2, type: "debit", amount: 18000, category: "Living", description: "Groceries & Delivery" },

      { month: 3, type: "credit", amount: 130000, category: "Revenue", description: "Client Deposit - Apex Brands" },
      { month: 3, type: "debit", amount: 25000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 3, type: "debit", amount: 10000, category: "EMI", description: "Consumer Durable EMI" },
      { month: 3, type: "debit", amount: 42000, category: "Living", description: "High-end Electronics Purchase" },
      { month: 3, type: "debit", amount: 20000, category: "Cash Drain", description: "ATM Cash Withdrawal" },

      { month: 4, type: "credit", amount: 30000, category: "Revenue", description: "Minor Project Payment" },
      { month: 4, type: "debit", amount: 25000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 4, type: "debit", amount: 10000, category: "EMI", description: "Consumer Durable EMI" },
      { month: 4, type: "debit", amount: 500, category: "Penalty", description: "Overdraft Penalty Fee" },
      { month: 4, type: "debit", amount: 12000, category: "Living", description: "Minimal Groceries" },

      { month: 5, type: "credit", amount: 180000, category: "Revenue", description: "Retainer Launch - Core Media" },
      { month: 5, type: "debit", amount: 25000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 5, type: "debit", amount: 10000, category: "EMI", description: "Consumer Durable EMI" },
      { month: 5, type: "debit", amount: 55000, category: "Living", description: "Luxury Resort Booking" },
      { month: 5, type: "debit", amount: 30000, category: "Cash Drain", description: "ATM Cash Withdrawal" },

      { month: 6, type: "credit", amount: 50000, category: "Revenue", description: "Client Project Payment" },
      { month: 6, type: "debit", amount: 25000, category: "Rent", description: "Apartment Rental Payment" },
      { month: 6, type: "debit", amount: 10000, category: "EMI", description: "Consumer Durable EMI" },
      { month: 6, type: "debit", amount: 500, category: "Penalty", description: "Overdraft Penalty Fee" },
      { month: 6, type: "debit", amount: 22000, category: "Living", description: "Groceries & Utilities" }
    ]
  },
  {
    id: "priya_mehta",
    name: "Priya Mehta",
    occupation: "Boutique Retail Owner",
    requestedLoanType: "Mortgage Loan",
    requestedLoanAmount: 8000000, // ₹80 Lakhs
    description: "Consistent business income but burdened with high existing structural liabilities (heavy commercial rent, utility overheads, and car loan EMI).",
    transactions: [
      { month: 1, type: "credit", amount: 250000, category: "Revenue", description: "Retail Merchant Settlement" },
      { month: 1, type: "debit", amount: 80000, category: "Rent", description: "Commercial Store Rent" },
      { month: 1, type: "debit", amount: 30000, category: "EMI", description: "Hyundai SUV Auto EMI" },
      { month: 1, type: "debit", amount: 40000, category: "Utilities", description: "Commercial Power & Staff Internet" },
      { month: 1, type: "debit", amount: 25000, category: "Living", description: "Personal living expenses" },
      
      { month: 2, type: "credit", amount: 235000, category: "Revenue", description: "Retail Merchant Settlement" },
      { month: 2, type: "debit", amount: 80000, category: "Rent", description: "Commercial Store Rent" },
      { month: 2, type: "debit", amount: 30000, category: "EMI", description: "Hyundai SUV Auto EMI" },
      { month: 2, type: "debit", amount: 42000, category: "Utilities", description: "Commercial Power & Maintenance" },
      { month: 2, type: "debit", amount: 20000, category: "Living", description: "Personal living expenses" },

      { month: 3, type: "credit", amount: 270000, category: "Revenue", description: "Retail Merchant Settlement" },
      { month: 3, type: "debit", amount: 80000, category: "Rent", description: "Commercial Store Rent" },
      { month: 3, type: "debit", amount: 30000, category: "EMI", description: "Hyundai SUV Auto EMI" },
      { month: 3, type: "debit", amount: 38000, category: "Utilities", description: "Commercial Power & Staff Internet" },
      { month: 3, type: "debit", amount: 30000, category: "Living", description: "Dining Out & Domestic Travel" },

      { month: 4, type: "credit", amount: 220000, category: "Revenue", description: "Retail Merchant Settlement" },
      { month: 4, type: "debit", amount: 80000, category: "Rent", description: "Commercial Store Rent" },
      { month: 4, type: "debit", amount: 30000, category: "EMI", description: "Hyundai SUV Auto EMI" },
      { month: 4, type: "debit", amount: 45000, category: "Utilities", description: "Commercial Power & Summer AirCon" },
      { month: 4, type: "debit", amount: 15000, category: "Living", description: "Personal living expenses" },

      { month: 5, type: "credit", amount: 260000, category: "Revenue", description: "Retail Merchant Settlement" },
      { month: 5, type: "debit", amount: 80000, category: "Rent", description: "Commercial Store Rent" },
      { month: 5, type: "debit", amount: 30000, category: "EMI", description: "Hyundai SUV Auto EMI" },
      { month: 5, type: "debit", amount: 40000, category: "Utilities", description: "Commercial Power & Staff Internet" },
      { month: 5, type: "debit", amount: 22000, category: "Living", description: "Personal living expenses" },

      { month: 6, type: "credit", amount: 245000, category: "Revenue", description: "Retail Merchant Settlement" },
      { month: 6, type: "debit", amount: 80000, category: "Rent", description: "Commercial Store Rent" },
      { month: 6, type: "debit", amount: 30000, category: "EMI", description: "Hyundai SUV Auto EMI" },
      { month: 6, type: "debit", amount: 41000, category: "Utilities", description: "Commercial Power & Gas" },
      { month: 6, type: "debit", amount: 28000, category: "Living", description: "Personal living expenses" }
    ]
  }
];

// Mock Documents for OCR testing
export interface MockDocument {
  id: string;
  title: string;
  type: string;
  description: string;
  suggestedPromptText: string;
}

export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: "salary_slip_1",
    title: "John Doe - Salary Slip",
    type: "Salary Slip",
    description: "A legitimate software developer salary slip from Google India. Standard details, consistent naming.",
    suggestedPromptText: `DOCUMENT TYPE: Salary Slip
EMPLOYEE LEGAL NAME: Johnathan Doe
EMPLOYER NAME: Google India Private Limited
MONTH: October 2025
UNIQUE SLIP ID: G-IND-OCT-9988
BASIC EARNINGS: ₹1,65,000
PROVIDENT FUND: ₹12,000
NET PAY PAYABLE: ₹1,53,000
ISSUE DATE: 2025-10-31
SECURITY DETAILS: Edge margins intact, official digital signature watermark present.`
  },
  {
    id: "identity_proof_2",
    title: "Jane Smith - Permanent Account Number (PAN)",
    type: "Identity Proof",
    description: "A high-confidence, standard national ID document header.",
    suggestedPromptText: `DOCUMENT TYPE: Government Tax Identity Card (PAN)
HOLDER LEGAL NAME: Jane Marissa Smith
UNIQUE ID NUMBER: BPSPS8877K
DATE OF BIRTH: 1989-11-14
ISSUE DATE: 2018-05-12
ISSUING AUTHORITY: Income Tax Department of India
SECURITY DETAILS: Micro-text validation holds, holographic chip segment verified. No signs of tampering.`
  },
  {
    id: "tampered_statement_3",
    title: "Suspected Altered Statement Header (Tampered)",
    type: "Suspicious Document",
    description: "A salary certificate showing suspicious name discrepancy and missing crop margins.",
    suggestedPromptText: `DOCUMENT TYPE: Salary & Service Certificate
STATEMENT HEADER NAME: Robert F. Kennedy Jr.
UNIQUE EMPLOYEE ID: EMP-RFK-7711
ISSUED TO LEGAL NAME: Bobby Kennedy (Discrepancy: Header names don't fully align with official system profile)
EMPLOYER NAME: Apex Consulting Corp
ISSUE DATE: 2026-01-10
WARNING INDICATORS: Left border and security signature lines have been heavily CROPPED or truncated. High risk of photo-editing alteration detected along the bottom margin.`
  }
];
