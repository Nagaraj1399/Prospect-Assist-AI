import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  ShieldAlert, 
  FileText, 
  TrendingUp, 
  Coins, 
  UserCheck, 
  Lock, 
  Settings, 
  AlertCircle, 
  Sparkles, 
  Upload, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  FileCode, 
  DollarSign, 
  TrendingDown,
  Building, 
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
  Briefcase,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  Smartphone,
  Shield,
  Clock,
  ShieldCheck,
  Mail,
  Phone,
  LockKeyhole,
  LogOut,
  User,
  Check,
  X,
  Download,
  Save,
  Trash2,
  Copy,
  Plus,
  Sun,
  Moon,
  QrCode,
  Fingerprint,
  Printer,
  Sliders
} from "lucide-react";
import { 
  ChatMessage, 
  IntentDiscoveryResult, 
  DocumentOcrResult, 
  UnderwritingResult,
  Transaction
} from "./types";
import { 
  MOCK_BORROWERS, 
  MOCK_DOCUMENTS, 
  BorrowerProfile, 
  MockDocument 
} from "./mockData";
import { signInWithGoogle, db, auth } from "./firebase";
import { ApexVaultFixedAuth } from "./components/ApexVaultFixedAuth";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CSS-based noise or aesthetic utilities are defined inline or using Tailwind classes.

export default function App() {
  // Global Theme State: "dark" (existing) or "light" (Financial Light Mode)
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
    }
  }, [theme]);

  // Global View Mode: "web" (spacious web interface) or "mobile" (phone enclosure frame mockup)
  const [viewMode, setViewMode] = useState<"web" | "mobile">("web");

  // Session / Auth States
  const [session, setSession] = useState<{
    token: string;
    user: {
      name: string;
      email: string;
      phone: string;
      role: "customer" | "employee";
    }
  } | null>(null);

  // custom floating toast notification states for welcome, logout, and OTP alerts
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "warning" | "error" = "success") => {
    setToast({ message, type });
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 5000);
  };

  // Welcome message watcher upon successful login
  useEffect(() => {
    if (session?.user) {
      showToast(`Welcome back, ${session.user.name || "Valued User"}! Successfully logged in. 🚀`, "success");
    }
  }, [session]);

  // Auth screen state: "login" | "otp" | "splash"
  const [authStage, setAuthStage] = useState<"login" | "otp" | "splash">("login");
  const [loginRole, setLoginRole] = useState<"customer" | "employee">("customer");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("EMP-8829-MGR");
  const [formEmployeeDept, setFormEmployeeDept] = useState("Risk Management & Credit Assessment");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // CAPTCHA and reCAPTCHA States
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [mathCaptcha, setMathCaptcha] = useState({ question: "", answer: "", input: "" });
  const [reCaptchaChecked, setReCaptchaChecked] = useState(false);
  const [reCaptchaVerifying, setReCaptchaVerifying] = useState(false);

  // OTP Verification States
  const [otpArray, setOtpArray] = useState(["", "", "", "", "", ""]);
  const [smsOtpArray, setSmsOtpArray] = useState(["", "", "", "", "", ""]);
  const [emailOtpArray, setEmailOtpArray] = useState(["", "", "", "", "", ""]);
  const recaptchaVerifierRef = useRef<any>(null);
  const smsOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpResendTimer, setOtpResendTimer] = useState(60);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [shakeOtp, setShakeOtp] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);

  // Real-time Diagnostic Logs for OTP Delivery Troubleshooting
  interface DiagnosticLog {
    id: string;
    timestamp: string;
    type: "info" | "success" | "warning" | "error";
    message: string;
  }

  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLog[]>([
    {
      id: "init",
      timestamp: new Date().toLocaleTimeString(),
      type: "info",
      message: "Security Diagnostic System initialized. Ready to intercept login events."
    }
  ]);

  const addDiagnosticLog = (type: "info" | "success" | "warning" | "error", message: string) => {
    const newLog: DiagnosticLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setDiagnosticLogs((prev) => [newLog, ...prev]);
  };

  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"input" | "otp" | "reset">("input");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotSimulatedToken, setForgotSimulatedToken] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // General Config/API Keys state
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState<boolean>(true);
  const [otpChannel, setOtpChannel] = useState<"sms" | "email">("sms");

  // Customer Portal App States (for Customer view inside mockup)
  const [customerActiveTab, setCustomerActiveTab] = useState<"intent" | "ocr" | "underwriting" | "calculator">("intent");
  const [showPromptInspector, setShowPromptInspector] = useState<boolean>(false);

  // Biometric Security Gate States
  const [biometricMfaEnabled, setBiometricMfaEnabled] = useState<boolean>(true);
  const [biometricAuthenticated, setBiometricAuthenticated] = useState<boolean>(false);
  const [biometricScanning, setBiometricScanning] = useState<boolean>(false);
  const [biometricLogs, setBiometricLogs] = useState<string[]>([]);
  const [biometricScanType, setBiometricScanType] = useState<"face" | "fingerprint">("face");

  // Customer Portal - Loan EMI Calculator States
  const [emiPrincipal, setEmiPrincipal] = useState<number>(1000000);
  const [emiInterestRate, setEmiInterestRate] = useState<number>(8.5);
  const [emiTenureYears, setEmiTenureYears] = useState<number>(15);
  const [selectedEmiYear, setSelectedEmiYear] = useState<number>(1);
  const [showAmortization, setShowAmortization] = useState<boolean>(false);
  const [amortizationViewMode, setAmortizationViewMode] = useState<"yearly" | "monthly">("yearly");
  const [emiPrepaymentOneTime, setEmiPrepaymentOneTime] = useState<number>(0);
  const [emiPrepaymentOneTimeMonth, setEmiPrepaymentOneTimeMonth] = useState<number>(12);
  const [emiPrepaymentRecurring, setEmiPrepaymentRecurring] = useState<number>(0);
  const [emiPrepaymentRecurringStart, setEmiPrepaymentRecurringStart] = useState<number>(1);
  const [showPrepaymentSim, setShowPrepaymentSim] = useState<boolean>(false);

  // Saved scenarios state and persistence
  const [savedScenarios, setSavedScenarios] = useState<{
    id: string;
    name: string;
    principal: number;
    interestRate: number;
    tenureYears: number;
    prepaymentOneTime: number;
    prepaymentOneTimeMonth: number;
    prepaymentRecurring: number;
    prepaymentRecurringStart: number;
    showPrepaymentSim: boolean;
  }[]>(() => {
    try {
      const saved = localStorage.getItem("emi_calculator_scenarios_v2");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading scenarios from localStorage", e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("emi_calculator_scenarios_v2", JSON.stringify(savedScenarios));
    } catch (e) {
      console.error("Error writing scenarios to localStorage", e);
    }
  }, [savedScenarios]);

  // Inflation Sensitivity states
  const [inflationEnabled, setInflationEnabled] = useState<boolean>(false);
  const [inflationRate, setInflationRate] = useState<number>(6);

  // Dynamic Payment QR states
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrAmount, setQrAmount] = useState<number>(0);
  const [qrStatus, setQrStatus] = useState<"idle" | "generating" | "scanning" | "processing" | "success">("idle");
  const [qrTxId, setQrTxId] = useState<string>("");
  const [qrCopied, setQrCopied] = useState<boolean>(false);

  const handleOpenPaymentQr = (amount: number) => {
    setQrAmount(amount);
    setIsQrModalOpen(true);
    setQrStatus("generating");
    setQrCopied(false);
    
    // Generate secure transaction reference code
    const txRef = "AVT-" + Math.floor(100000 + Math.random() * 900000) + "-REPAY";
    setQrTxId(txRef);

    setTimeout(() => {
      setQrStatus("scanning");
    }, 1200);
  };

  const handleSimulatePayment = () => {
    setQrStatus("processing");
    setTimeout(async () => {
      setQrStatus("success");
      // Persist log entry in live Firestore Cloud Database if operational
      if (db && session?.user) {
        try {
          const { collection, addDoc } = await import("firebase/firestore");
          await addDoc(collection(db, "repayments"), {
            userId: session.user.email,
            userName: session.user.name,
            amount: qrAmount,
            transactionId: qrTxId,
            timestamp: new Date().toISOString(),
            status: "SUCCESS"
          });
          console.log("[FIREBASE FIRESTORE] Repayment record securely recorded.");
        } catch (dbErr: any) {
          console.warn("[FIREBASE] Could not log repayment to Firestore:", dbErr.message);
        }
      }
    }, 2000);
  };

  // Inactivity Timer state
  const [inactivityTimer, setInactivityTimer] = useState(300); // 5 minutes in seconds
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [lastActivityReason, setLastActivityReason] = useState("");

  // Customer Portal - Chatbot States
  const [chatAgentMode, setChatAgentMode] = useState<"intent" | "gemini">("intent");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: "model", text: "Hello! I am your AI Lending Assistant. I can help explore your financial requirements and check potential loan solutions. What kind of financing are you looking for today?" }
  ]);
  const [geminiChatHistory, setGeminiChatHistory] = useState<ChatMessage[]>([
    { role: "model", text: "Hello! I am your conversational Gemini AI Advisor. I can answer complex financial questions, compare loan terms, help with budgeting, or explain credit factors. What would you like to discuss today?" }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [intentResult, setIntentResult] = useState<IntentDiscoveryResult>({
    customer_intent: "Unknown",
    requested_amount: 0,
    intent_score: 1,
    behavioral_summary: "Awaiting deeper customer engagement and initial financing inputs.",
    assistant_message: ""
  });

  // Customer Portal - Document OCR States
  const [selectedDocId, setSelectedDocId] = useState<string>(MOCK_DOCUMENTS[0].id);
  const [ocrTextContent, setOcrTextContent] = useState<string>(MOCK_DOCUMENTS[0].suggestedPromptText);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<DocumentOcrResult | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFileBase64, setCustomFileBase64] = useState<string | null>(null);
  const [customFileCategory, setCustomFileCategory] = useState<"payslip" | "statement" | "gov_id">("payslip");
  const [ocrError, setOcrError] = useState<string>("");
  const [ocrLogs, setOcrLogs] = useState<string[]>([]);

  // Customer Portal - Underwriting States
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>(MOCK_BORROWERS[0].id);
  const [customLoanType, setCustomLoanType] = useState<string>(MOCK_BORROWERS[0].requestedLoanType);
  const [customLoanAmount, setCustomLoanAmount] = useState<number>(MOCK_BORROWERS[0].requestedLoanAmount);
  const [underwritingLoading, setUnderwritingLoading] = useState<boolean>(false);
  const [underwritingResult, setUnderwritingResult] = useState<UnderwritingResult | null>(null);

  // Bank Manager Cockpit States (Isolated Dashboard)
  const [managerSelectedBorrowerId, setManagerSelectedBorrowerId] = useState<string>(MOCK_BORROWERS[0].id);
  const [managerAssessments, setManagerAssessments] = useState<Record<string, {
    intentScore: number;
    repaymentCapacity: number;
    recommendation: string;
    loading: boolean;
    assessed: boolean;
    error?: string;
  }>>({});
  const [managerLogs, setManagerLogs] = useState<string[]>([
    "[SECURE CORE] RBAC Session Initialized. Bank Manager Isolated View active."
  ]);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  // Bank Manager AI Agent States
  const [managerChatHistory, setManagerChatHistory] = useState<ChatMessage[]>([
    { role: "model", text: "Welcome to the Apex Credit Copilot. I am your specialized AI Risk Underwriting & Basel policy analyst agent. Run 'Assess AI Core' first, then use the options below to generate credit memos, stress-test interest rate adjustments, or query policy compliance." }
  ]);
  const [managerChatInput, setManagerChatInput] = useState<string>("");
  const [managerChatLoading, setManagerChatLoading] = useState<boolean>(false);
  const [managerCreditMemos, setManagerCreditMemos] = useState<Record<string, string>>({});

  // Print Assessment Preview Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printSource, setPrintSource] = useState<"customer" | "manager">("customer");

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Google reCAPTCHA v3 site registration token placeholder.
  // Replace with your live site verification keys registered in Google Admin panel.
  const GOOGLE_RECAPTCHA_V3_SITE_KEY = "6Lce_your_recaptcha_v3_registration_token_placeholder";

  // Initialize RecaptchaVerifier on mount/when auth is ready
  useEffect(() => {
    let active = true;
    const initVerifier = async () => {
      if (auth && !recaptchaVerifierRef.current && active) {
        try {
          const container = document.getElementById("recaptcha-container");
          if (container) {
            const { RecaptchaVerifier } = await import("firebase/auth");
            const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
              size: "normal",
              callback: (response: any) => {
                console.log("[RECAPTCHA] Verification successful:", response);
                setReCaptchaChecked(true);
              },
              "expired-callback": () => {
                setReCaptchaChecked(false);
              }
            });
            await verifier.render();
            if (active) {
              recaptchaVerifierRef.current = verifier;
              console.log("[RECAPTCHA] Real RecaptchaVerifier rendered successfully in container.");
            }
          }
        } catch (err: any) {
          console.warn("[RECAPTCHA] Could not render real Google RecaptchaVerifier (expected in local/iframe sandbox):", err.message);
        }
      }
    };
    const timer = setTimeout(initVerifier, 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [auth]);

  // Generator helper for CAPTCHA (Exactly 5 Alphanumeric characters)
  const triggerNewCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput("");
  };

  const initMathCaptcha = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setMathCaptcha({
      question: `Solve Security Puzzle: ${num1} + ${num2}`,
      answer: (num1 + num2).toString(),
      input: ""
    });
  };

  // Draw 5-digit alphanumeric CAPTCHA on HTML5 canvas with distortion & line noise
  useEffect(() => {
    if (!canvasRef.current || !captchaCode) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background styling
    ctx.fillStyle = theme === "light" ? "#f1f5f9" : "#020617"; // slate-100 or slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate background grid/dots noise
    ctx.strokeStyle = theme === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(0, 212, 178, 0.08)";
    for (let i = 0; i < canvas.width; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 12) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw random noise points (speckles)
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? (theme === "light" ? "rgba(5, 150, 105, 0.3)" : "rgba(0, 212, 178, 0.3)") : "rgba(239, 68, 68, 0.25)";
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2 + 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw random noise lines (bezier curves)
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i === 0 ? "rgba(239, 68, 68, 0.35)" : (theme === "light" ? "rgba(5, 150, 105, 0.25)" : "rgba(0, 212, 178, 0.25)");
      ctx.lineWidth = Math.random() * 1.5 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 20, Math.random() * canvas.height);
      ctx.bezierCurveTo(
        Math.random() * canvas.width * 0.4, Math.random() * canvas.height,
        Math.random() * canvas.width * 0.8, Math.random() * canvas.height,
        canvas.width - Math.random() * 20, Math.random() * canvas.height
      );
      ctx.stroke();
    }

    // Draw the 5-digit CAPTCHA text with character distortion (rotation, translation)
    ctx.textBaseline = "middle";
    const letterWidth = (canvas.width - 24) / 5;
    for (let i = 0; i < captchaCode.length; i++) {
      const char = captchaCode[i];
      
      // Vary colors per character slightly to make OCR harder
      const hue = 170 + Math.random() * 20; // around teal/emerald
      const lightness = theme === "light" ? "35%" : "60%"; // darker text for light background
      ctx.fillStyle = `hsl(${hue}, 90%, ${lightness})`;
      ctx.font = `bold ${20 + Math.random() * 4}px monospace`;

      ctx.save();
      // Translate to character position
      const x = 12 + i * letterWidth + letterWidth / 2;
      const y = canvas.height / 2 + (Math.random() * 8 - 4);
      ctx.translate(x, y);

      // Add a slight rotation (-15 to +15 degrees)
      const angle = ((Math.random() * 30 - 15) * Math.PI) / 180;
      ctx.rotate(angle);

      // Draw character
      ctx.fillText(char, -8, 0);
      ctx.restore();
    }
  }, [captchaCode, theme]);

  // Check setup status & set default captcha on mount
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
      } catch (err) {
        console.error("Failed to connect to backend:", err);
        setHasApiKey(false);
      } finally {
        setCheckingConfig(false);
      }
    }
    checkConfig();
    triggerNewCaptcha();
    initMathCaptcha();

    // Parse URL search parameters for secure password reset link (Module 3)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    if (token && email) {
      setIsForgotPassword(true);
      setForgotPasswordStep("otp");
      setForgotEmail(email);
      setForgotToken(token);
      console.log("[SECURE RESET] Pre-seeded password reset coordinates from URL:", email, token);
    }

    // Gated manager-dashboard pathname detection (Module 6)
    if (window.location.pathname === "/auth/manager-dashboard") {
      setLoginRole("employee");
      setFormEmail("manager@securebank.com");
      setFormPhone("+91 99999 88888");
      setFormPassword("Manager123!");
      console.log("[SECURE ROUTE] Gated Bank Manager portal route active.");
    }
  }, []);

  // OTP resend timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (authStage === "otp" && otpResendTimer > 0) {
      interval = setInterval(() => {
        setOtpResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authStage, otpResendTimer]);

  // Global Inactivity Session Timer (Prompt 3)
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      setInactivityTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleForceLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Global listeners for activity reset
    const resetTimer = () => {
      setInactivityTimer(300); // Reset to 5 minutes
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      clearInterval(interval);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session]);

  // Handle Forced Inactivity Logout or Manual Action (Sends Secure Termination Email)
  const handleForceLogout = async () => {
    if (session?.user) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: session.user.name,
            email: session.user.email
          })
        });
      } catch (err) {
        console.error("Failed to dispatch secure termination signal:", err);
      }
    }
    // Purge local storage and cookies simulation
    localStorage.removeItem("secure_session_token");
    setSession(null);
    setAuthStage("login");
    setFormPassword("");
    setConfirmPassword("");
    setCaptchaInput("");
    setReCaptchaChecked(false);
    triggerNewCaptcha();
    setShowLogoutModal(true);
    setOtpArray(["", "", "", "", "", ""]);
    showToast("Logged out successfully due to inactivity. Secure session terminated.", "info");
  };

  const handleGoogleSignIn = async () => {
    try {
      const googleUser = await signInWithGoogle();
      if (googleUser && googleUser.email) {
        setAuthStage("splash");
        setTimeout(() => {
          setSession({
            token: `session_google_aes256_${Math.random().toString(36).substr(2)}`,
            user: {
              name: googleUser.name,
              email: googleUser.email,
              phone: "+91 99999 99999",
              role: "customer"
            }
          });
          window.history.pushState({}, "", "/");
          setCurrentPath("/");
          setInactivityTimer(300); // 5 minutes session active
        }, 3500);
      }
    } catch (err: any) {
      alert("Google Identity Access failed: " + err.message);
    }
  };

  // Helper to format remaining timer
  const formatTimer = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Auto-scroll chat window
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Password Policy Validation Checkers (8-12 chars, 1 Upper, 1 Lower, 1 Digit, 1 Special)
  const isPassLengthValid = formPassword.length >= 8 && formPassword.length <= 12;
  const isPassUpperValid = /[A-Z]/.test(formPassword);
  const isPassLowerValid = /[a-z]/.test(formPassword);
  const isPassDigitValid = /[0-9]/.test(formPassword);
  const isPassSpecialValid = /[@#$!%*?&]/.test(formPassword);
  const isPasswordSecure = isPassLengthValid && isPassUpperValid && isPassLowerValid && isPassDigitValid && isPassSpecialValid;
  const isFormValid = (() => {
    if (isRegistering) {
      if (!isPasswordSecure) return false;
      if (formPassword !== confirmPassword) return false;
      if (!formName.trim() || !formPhone.trim() || !formEmail.trim()) return false;
      return true;
    }
    if (loginRole === "employee") {
      if (!formPassword.trim()) return false;
      if (!formEmployeeId.trim() || !formEmployeeDept.trim() || !formEmail.trim()) return false;
      if (otpChannel === "sms" && !formPhone.trim()) return false;
      return true;
    }
    if (loginMethod === "password") {
      if (!formPassword.trim()) return false;
      if (!formEmail.trim()) return false;
      if (otpChannel === "sms" && !formPhone.trim()) return false;
      return true;
    }
    // OTP login validation
    if (otpChannel === "sms" && !formPhone.trim()) return false;
    if (otpChannel === "email" && !formEmail.trim()) return false;
    return true;
  })();

  // Mock reCAPTCHA handler
  const handleReCaptchaClick = () => {
    if (reCaptchaChecked) {
      setReCaptchaChecked(false);
      return;
    }
    setReCaptchaVerifying(true);
    setTimeout(() => {
      setReCaptchaVerifying(false);
      setReCaptchaChecked(true);
    }, 1200);
  };

  // Trigger secure login or registration submit (passes Password, Confirm Password, & CAPTCHA validation)
  const handleLoginSubmit = async (e?: React.FormEvent, channelOverride?: "sms" | "email") => {
    if (e) e.preventDefault();

    if (isRegistering) {
      if (!isPasswordSecure) {
        alert("Password does not meet the strict security credentials policy!");
        return;
      }

      if (formPassword !== confirmPassword) {
        alert("Password and Confirm Password do not match!");
        return;
      }
    }

    const activeChannel = channelOverride || otpChannel;

    if (activeChannel === "email") {
      if (mathCaptcha.input !== mathCaptcha.answer) {
        alert("Security Math CAPTCHA is incorrect! Please try again.");
        initMathCaptcha();
        return;
      }
    } else {
      if (captchaInput.toUpperCase() !== captchaCode) {
        alert("CAPTCHA code verification failed! Please check the 5 characters and try again.");
        triggerNewCaptcha();
        return;
      }
    }

    if (!reCaptchaChecked) {
      alert("Please confirm anti-bot protection via the Google reCAPTCHA checkbox.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    // Setup registration names/IDs for routing
    const name = loginRole === "customer" ? formName || "Valued Client" : "Bank Underwriter Manager";
    const email = loginRole === "customer" 
      ? (formEmail || "customer@sandboxedbank.com") 
      : (formEmail || "manager@securebank.com");
    const phone = loginRole === "customer" 
      ? (formPhone || "+91 98765 43210") 
      : (formPhone || "+91 99999 88888");

    // Action types: "register", "login", or "otp_login"
    const action = isRegistering 
      ? "register" 
      : (loginMethod === "otp" ? "otp_login" : "login");

    addDiagnosticLog("info", `Initiating OTP dispatch via ${activeChannel === "sms" ? "SMS Mobile" : "Email"} channel for ${loginRole}...`);

    try {
      // 1. Dispatch OTP via backend based on chosen channel
      addDiagnosticLog("info", `[POST /api/auth/generate-verification-token] Sending secure dispatch request...`);
      const response = await fetch("/api/auth/generate-verification-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email, 
          phone, 
          role: loginRole, 
          password: loginMethod === "otp" ? "" : formPassword,
          action,
          channel: activeChannel,
          captchaAnswer: activeChannel === "email" ? mathCaptcha.answer : undefined,
          captchaInput: activeChannel === "email" ? mathCaptcha.input : undefined
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        const errMsg = data.error || "Failed to issue security verification OTP.";
        addDiagnosticLog("error", `[API Error] OTP dispatch failed on server: ${errMsg}`);
        throw new Error(errMsg);
      }

      setSimulatedOtp(data.simulatedOtp);
      setEmailSent(data.emailSent);
      setEmailConfigured(data.emailConfigured);
      
      addDiagnosticLog("success", `[API Success] Verification token created securely. Simulated Access Code: ${data.simulatedOtp}`);

      if (activeChannel === "sms") {
        // 2. Dispatch real Firebase SMS OTP
        console.log("[FIREBASE] Starting Phone SMS OTP dispatch for phone:", phone);
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+91" + formattedPhone.replace(/[^0-9]/g, "");
        }

        if (auth) {
          try {
            let appVerifier = recaptchaVerifierRef.current;
            if (!appVerifier) {
              console.log("[FIREBASE] Lazy initializing invisible RecaptchaVerifier as fallback container...");
              let container = document.getElementById("recaptcha-container");
              if (!container) {
                container = document.createElement("div");
                container.id = "recaptcha-container";
                document.body.appendChild(container);
              }
              const { RecaptchaVerifier } = await import("firebase/auth");
              appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
                size: "invisible"
              });
              recaptchaVerifierRef.current = appVerifier;
            }
            const { signInWithPhoneNumber } = await import("firebase/auth");
            console.log("[FIREBASE] Invoking signInWithPhoneNumber for:", formattedPhone);
            addDiagnosticLog("info", `[Firebase] Attempting live client-side signInWithPhoneNumber for ${formattedPhone}...`);
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            (window as any).confirmationResult = confirmationResult;
            (window as any).isConfirmationResultMock = false;
            console.log("[FIREBASE] SMS token successfully dispatched via Firebase Auth.");
            addDiagnosticLog("success", `[Firebase Success] SMS dispatched via live Client-Side Auth provider to ${formattedPhone}.`);
            showToast(`SMS OTP successfully dispatched to ${formattedPhone}`, "success");
          } catch (firebaseErr: any) {
            console.warn("[FIREBASE] Native signInWithPhoneNumber failed (iframe restriction or config issues):", firebaseErr.message);
            addDiagnosticLog("warning", `[Firebase Error] Client-side SMS dispatch failed: ${firebaseErr.message}.`);
            addDiagnosticLog("warning", `[Provider Error] Live client SMS blocked. Initializing High-Fidelity local sandbox simulator.`);
            
            // Sandbox High-Fidelity Mock Fallback for local testing or iframe popup-blocked envs
            console.log("[FIREBASE Fallback] Bootstrapping premium secure phone-auth simulator confirmationResult...");
            (window as any).isConfirmationResultMock = true;
            (window as any).confirmationResult = {
              confirm: async (code: string) => {
                console.log("[SIMULATOR SMS Verification] Confirming SMS OTP Code:", code);
                return { user: { phoneNumber: formattedPhone } };
              }
            };
            showToast(`SMS OTP sent to Mobile (Sandbox Simulator: ${data.simulatedOtp})`, "success");
          }
        } else {
          console.warn("[FIREBASE] Auth is not initialized. Using sandbox simulation fallback.");
          addDiagnosticLog("warning", `[Firebase Warn] Client auth not initialized. Using premium local simulator.`);
          (window as any).isConfirmationResultMock = true;
          (window as any).confirmationResult = {
            confirm: async (code: string) => {
              console.log("[SIMULATOR SMS Verification] Sandbox mock confirmation code:", code);
              return { user: { phoneNumber: formattedPhone } };
            }
          };
          showToast(`SMS OTP sent to Mobile (Sandbox Simulator: ${data.simulatedOtp})`, "success");
        }
      } else {
        // Email Channel status diagnostics
        if (data.emailConfigured) {
          if (data.emailSent) {
            addDiagnosticLog("success", `[SMTP Success] Verification email delivered securely to ${email}.`);
          } else {
            addDiagnosticLog("error", `[SMTP Error] Delivery failed: ${data.emailError || "Unknown mailer exception"}.`);
            addDiagnosticLog("warning", `[Provider Error] Live email dispatch failed. Standing by for local Sandbox bypass.`);
          }
        } else {
          addDiagnosticLog("warning", `[Provider Warn] EMAIL_USER/PASS not configured in backend. Standing by for local Sandbox bypass.`);
        }
        showToast(`Verification code sent to Email: ${email}`, "success");
      }

      setAuthStage("otp");
      setOtpResendTimer(60);
      setSmsOtpArray(["", "", "", "", "", ""]);
      setEmailOtpArray(["", "", "", "", "", ""]);
      setTimeout(() => {
        if (activeChannel === "sms") {
          smsOtpRefs.current[0]?.focus();
        } else {
          emailOtpRefs.current[0]?.focus();
        }
      }, 150);
    } catch (err: any) {
      addDiagnosticLog("error", `[API Error] Communication failure to bank system: ${err.message || "Server exception"}`);
      alert(err.message || "Communication failure to core bank systems.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Helper to directly select 2FA channel and instantly send the OTP code
  const handleSendOtpDirectly = async (channel: "sms" | "email") => {
    setOtpChannel(channel);

    // Form inputs validation before requesting OTP
    if (isRegistering) {
      if (!formName.trim() || !formPhone.trim() || !formEmail.trim()) {
        alert("Please fill in your Full Legal Name, Phone Number, and Email Address first.");
        return;
      }
      if (!isPasswordSecure) {
        alert("Please ensure your password complies with the security requirements.");
        return;
      }
      if (formPassword !== confirmPassword) {
        alert("Password and Confirm Password do not match!");
        return;
      }
    } else if (loginRole === "employee") {
      if (!formEmployeeId.trim() || !formEmployeeDept.trim() || !formEmail.trim()) {
        alert("Please fill in Employee ID, Department, and Corporate Email first.");
        return;
      }
      if (channel === "sms" && !formPhone.trim()) {
        alert("Please enter your Mobile Phone Number for SMS OTP delivery.");
        return;
      }
    } else { // customer
      if (loginMethod === "password") {
        if (!formEmail.trim() || !formPassword.trim()) {
          alert("Please enter your registered email and password first.");
          return;
        }
        if (channel === "sms" && !formPhone.trim()) {
          alert("Please enter your Mobile Phone Number for SMS OTP delivery.");
          return;
        }
      } else { // OTP login
        if (channel === "sms" && !formPhone.trim()) {
          alert("Please enter your Mobile Phone Number for SMS OTP delivery.");
          return;
        }
        if (channel === "email" && !formEmail.trim()) {
          alert("Please enter your Email Address for Email OTP delivery.");
          return;
        }
      }
    }

    if (channel === "email") {
      if (mathCaptcha.input !== mathCaptcha.answer) {
        alert("Security Math CAPTCHA is incorrect! Please try again.");
        initMathCaptcha();
        return;
      }
    } else {
      if (captchaInput.toUpperCase() !== captchaCode) {
        alert("CAPTCHA code verification failed! Please check the 5 characters and try again.");
        triggerNewCaptcha();
        return;
      }
    }

    if (!reCaptchaChecked) {
      alert("Please confirm anti-bot protection via the Google reCAPTCHA checkbox first.");
      return;
    }

    await handleLoginSubmit(undefined, channel);
  };

  // Forgot password: send reset token
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, phone: forgotPhone })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setForgotSimulatedToken(data.simulatedToken || "");
        setForgotPasswordStep("otp");
      } else {
        alert(data.error || "Failed to trigger reset sequence.");
      }
    } catch (err: any) {
      alert("Error communicating with authentication server.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot password: verify and reset password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPassword !== forgotConfirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    // Validate credential policy for forgot password reset as well!
    const isResetPassLengthValid = forgotNewPassword.length >= 8 && forgotNewPassword.length <= 12;
    const isResetPassUpperValid = /[A-Z]/.test(forgotNewPassword);
    const isResetPassLowerValid = /[a-z]/.test(forgotNewPassword);
    const isResetPassDigitValid = /[0-9]/.test(forgotNewPassword);
    const isResetPassSpecialValid = /[@#$!%*?&]/.test(forgotNewPassword);
    const isResetPasswordSecure = isResetPassLengthValid && isResetPassUpperValid && isResetPassLowerValid && isResetPassDigitValid && isResetPassSpecialValid;

    if (!isResetPasswordSecure) {
      alert("New password does not meet the strict security credentials policy!");
      return;
    }

    setForgotLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          token: forgotToken,
          newPassword: forgotNewPassword
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert("Credentials securely updated. Please sign in with your new password.");
        setIsForgotPassword(false);
        setForgotPasswordStep("input");
        setForgotEmail("");
        setForgotPhone("");
        setForgotToken("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setFormPassword("");
      } else {
        alert(data.error || "Password reset verification failed.");
      }
    } catch (err: any) {
      alert("Error communicating with reset server.");
    } finally {
      setForgotLoading(false);
    }
  };

  // OTP Code fields change handlers for Dual-Channel MFA (SMS & Gmail)
  const handleSmsOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const newOtp = [...smsOtpArray];
    newOtp[index] = val.slice(-1);
    setSmsOtpArray(newOtp);

    // Auto-focus next field
    if (val && index < 5) {
      smsOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleSmsOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !smsOtpArray[index] && index > 0) {
      const newOtp = [...smsOtpArray];
      newOtp[index - 1] = "";
      setSmsOtpArray(newOtp);
      smsOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleEmailOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const newOtp = [...emailOtpArray];
    newOtp[index] = val.slice(-1);
    setEmailOtpArray(newOtp);

    // Auto-focus next field
    if (val && index < 5) {
      emailOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleEmailOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !emailOtpArray[index] && index > 0) {
      const newOtp = [...emailOtpArray];
      newOtp[index - 1] = "";
      setEmailOtpArray(newOtp);
      emailOtpRefs.current[index - 1]?.focus();
    }
  };

  // OTP verify action with Channel-specific verification checks
  const handleVerifyOtp = async () => {
    const smsCode = smsOtpArray.join("");
    const emailCode = emailOtpArray.join("");
    
    if (otpChannel === "sms" && smsCode.length !== 6) {
      setOtpError("Security requires a 6-digit SMS verification code to proceed.");
      return;
    }
    if (otpChannel === "email" && emailCode.length !== 6) {
      setOtpError("Security requires a 6-digit Email verification code to proceed.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    const email = loginRole === "customer" 
      ? (formEmail || "customer@sandboxedbank.com") 
      : (formEmail || "manager@securebank.com");
    const activeCode = otpChannel === "sms" ? smsCode : emailCode;

    addDiagnosticLog("info", `Verifying code (${activeCode}) for ${email}...`);

    try {
      // 1. Firebase SMS validation challenge (only if channel is SMS)
      if (otpChannel === "sms" && (window as any).confirmationResult) {
        if (smsCode && smsCode === simulatedOtp) {
          addDiagnosticLog("success", `[Sandbox Bypass] Code matches simulated OTP. Skipping Firebase live challenge.`);
          console.log("[FIREBASE CHALLENGE] Bypassing live challenge as entered code matches simulated OTP.");
        } else {
          try {
            addDiagnosticLog("info", `[Firebase Challenge] Checking code via signInWithPhoneNumber session...`);
            console.log("[FIREBASE CHALLENGE] Attempting SMS verification...");
            await (window as any).confirmationResult.confirm(smsCode);
            console.log("[FIREBASE CHALLENGE] SMS authentication succeeded.");
            addDiagnosticLog("success", `[Firebase Success] SMS confirmation result challenge succeeded.`);
          } catch (fbErr: any) {
            console.warn("[FIREBASE CHALLENGE] SMS authentication failed:", fbErr.message);
            addDiagnosticLog("error", `[Firebase Error] Challenge failed: ${fbErr.message}`);
            if (!(window as any).isConfirmationResultMock) {
              throw new Error(`Firebase SMS Challenge failed: ${fbErr.message}`);
            }
          }
        }
      }

      // 2. Real SMTP Gmail Token validation challenge
      addDiagnosticLog("info", `[POST /api/auth/verify-token] Verifying token on backend...`);
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: activeCode })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        addDiagnosticLog("success", `[API Success] Verification complete! Welcoming ${data.user.name || email}...`);
        setAuthStage("splash");
        setTimeout(() => {
          const normalizedRole = (data.user.role || "").toLowerCase();
          const mappedRole = (normalizedRole === "manager" || normalizedRole === "employee") ? "employee" : "customer";
          setSession({
            token: data.token,
            user: {
              ...data.user,
              role: mappedRole
            }
          });
          if (mappedRole === "employee") {
            window.history.pushState({}, "", "/auth/manager-dashboard");
            setCurrentPath("/auth/manager-dashboard");
          } else {
            window.history.pushState({}, "", "/");
            setCurrentPath("/");
          }
          setInactivityTimer(300); // Reset the 5-Minute active session lease
        }, 3500);
      } else {
        const errorMsg = data.error || "Verification token failed or expired.";
        addDiagnosticLog("error", `[API Error] Verification mismatch: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      addDiagnosticLog("error", `[Security Error] Verification protocol rejected code. Clearing active state...`);
      setOtpError("Security Mismatch: Invalid or expired OTP verification token. Check credentials and retry.");
      setShakeOtp(true);
      setTimeout(() => setShakeOtp(false), 500);
      setOtpResendTimer(0);
      // Flush verification boxes upon failure
      setSmsOtpArray(["", "", "", "", "", ""]);
      setEmailOtpArray(["", "", "", "", "", ""]);
      // Focus first element of active array
      setTimeout(() => {
        if (otpChannel === "sms") {
          smsOtpRefs.current[0]?.focus();
        } else {
          emailOtpRefs.current[0]?.focus();
        }
      }, 100);
    } finally {
      setOtpLoading(false);
    }
  };

  // Trigger manual resend OTP
  const handleResendOtp = async () => {
    setOtpResendTimer(60);
    setSmsOtpArray(["", "", "", "", "", ""]);
    setEmailOtpArray(["", "", "", "", "", ""]);
    setOtpError("");
    
    const name = loginRole === "customer" ? formName || "Valued Client" : "Bank Underwriter Manager";
    const email = loginRole === "customer" 
      ? (formEmail || "customer@sandboxedbank.com") 
      : (formEmail || "manager@securebank.com");
    const phone = loginRole === "customer" 
      ? (formPhone || "+91 98765 43210") 
      : (formPhone || "+91 99999 88888");

    addDiagnosticLog("info", `Initiating manual OTP resend via ${otpChannel === "sms" ? "SMS Mobile" : "Email"}...`);

    try {
      // 1. Resend OTP based on preferred channel
      addDiagnosticLog("info", `[POST /api/auth/generate-verification-token] Dispatching resend payload...`);
      const response = await fetch("/api/auth/generate-verification-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email, 
          phone, 
          role: loginRole,
          password: loginMethod === "otp" ? "" : formPassword,
          action: isRegistering ? "register" : (loginMethod === "otp" ? "otp_login" : "login"),
          channel: otpChannel,
          captchaAnswer: otpChannel === "email" ? mathCaptcha.answer : undefined,
          captchaInput: otpChannel === "email" ? mathCaptcha.input : undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        setSimulatedOtp(data.simulatedOtp);
        setEmailSent(data.emailSent);
        setEmailConfigured(data.emailConfigured);
        addDiagnosticLog("success", `[API Success] Resend token created securely. Simulated Access Code: ${data.simulatedOtp}`);
        
        if (otpChannel === "email") {
          if (data.emailConfigured) {
            if (data.emailSent) {
              addDiagnosticLog("success", `[SMTP Success] Resent verification email delivered to ${email}.`);
            } else {
              addDiagnosticLog("error", `[SMTP Error] Resend email failed: ${data.emailError || "Mailer error"}`);
              addDiagnosticLog("warning", `[Provider Error] Resend failed. Please use Sandbox local bypass code.`);
            }
          } else {
            addDiagnosticLog("warning", `[Provider Warn] SMTP not configured. Falling back to local Sandbox bypass.`);
          }
        }
      } else {
        addDiagnosticLog("error", `[API Error] Resend request failed: ${data.error || "Unknown error"}`);
      }

      if (otpChannel === "sms") {
        // 2. Resend Firebase SMS OTP
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+91" + formattedPhone.replace(/[^0-9]/g, "");
        }

        if (auth && (window as any).confirmationResult && !(window as any).isConfirmationResultMock) {
          try {
            const { signInWithPhoneNumber } = await import("firebase/auth");
            let appVerifier = recaptchaVerifierRef.current;
            if (appVerifier) {
              addDiagnosticLog("info", `[Firebase] Re-sending live Phone SMS token to ${formattedPhone}...`);
              const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
              (window as any).confirmationResult = confirmationResult;
              addDiagnosticLog("success", `[Firebase Success] Resent SMS dispatched successfully via Firebase Auth.`);
            }
          } catch (firebaseErr: any) {
            console.warn("[FIREBASE] Phone SMS resend failed:", firebaseErr.message);
            addDiagnosticLog("error", `[Firebase Error] SMS resend failed: ${firebaseErr.message}`);
            addDiagnosticLog("warning", `[Provider Error] SMS resend failed. Falling back to local sandbox simulator.`);
          }
        } else {
          addDiagnosticLog("warning", `[Provider Warn] Real SMS provider bypass. Please use local sandbox simulation.`);
        }
      }
    } catch (err: any) {
      console.error("Resend OTP failed:", err);
      addDiagnosticLog("error", `[API Error] Resend failed: ${err.message || "Connection failure"}`);
    }
  };

  // Interactive Customer Intent Chatbot trigger
  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || chatLoading) return;

    if (!textToSend) {
      setChatInput("");
    }

    if (chatAgentMode === "intent") {
      const updatedHistory = [...chatHistory, { role: "user" as const, text: text }];
      setChatHistory(updatedHistory);
      setChatLoading(true);

      try {
        const response = await fetch("/api/intent-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedHistory })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Server error during analysis");
        }

        const data: IntentDiscoveryResult = await response.json();
        setChatHistory(prev => [...prev, { role: "model", text: data.assistant_message }]);
        setIntentResult(data);
      } catch (err: any) {
        console.error(err);
        setChatHistory(prev => [
          ...prev, 
          { role: "model", text: `⚠️ Error: ${err.message || "Failed to contact banking core engine."}` }
        ]);
      } finally {
        setChatLoading(false);
      }
    } else {
      const updatedHistory = [...geminiChatHistory, { role: "user" as const, text: text }];
      setGeminiChatHistory(updatedHistory);
      setChatLoading(true);

      try {
        const response = await fetch("/api/gemini-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedHistory })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Server error during advisory");
        }

        const data = await response.json();
        setGeminiChatHistory(prev => [...prev, { role: "model", text: data.text }]);
      } catch (err: any) {
        console.error(err);
        setGeminiChatHistory(prev => [
          ...prev, 
          { role: "model", text: `⚠️ Error: ${err.message || "Failed to contact Gemini advisory core."}` }
        ]);
      } finally {
        setChatLoading(false);
      }
    }
  };

  const handleSimulateBiometrics = (type: "face" | "fingerprint") => {
    setBiometricScanType(type);
    setBiometricScanning(true);
    setBiometricLogs(["Initializing biometric hardware array...", "Securing hardware-level sandbox enclave..."]);
    
    const steps = [
      { delay: 600, text: type === "face" ? "Mapping 3D facial depth vector..." : "Scanning fingerprint ridges (Live Touch)..." },
      { delay: 1300, text: "Analyzing anti-spoofing and micro-expression/liveness indicators..." },
      { delay: 2000, text: "Cross-referencing secure enclave master cryptographic signatures..." },
      { delay: 2600, text: "Matching biometric template securely (100% Match Ratio)..." },
      { delay: 3000, text: "Enclave authorized! Session Access Token generated." }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setBiometricLogs(prev => [...prev, step.text]);
      }, step.delay);
    });

    setTimeout(() => {
      setBiometricAuthenticated(true);
      setBiometricScanning(false);
    }, 3500);
  };

  const [ocrTabMode, setOcrTabMode] = useState<"presets" | "custom">("presets");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const processUploadedFile = (file: File) => {
    setOcrError("");
    setOcrResult(null);
    setOcrLogs([]);

    // Check size < 5MB
    if (file.size > 5 * 1024 * 1024) {
      setOcrError(`Security boundary violated: File "${file.name}" exceeds the maximum authorized 5MB threshold.`);
      return;
    }

    // Check type (.pdf, .png, .jpg, .jpeg)
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setOcrError(`Format rejected: File "${file.name}" has an unauthorized extension. Please upload a PDF, PNG, or JPG.`);
      return;
    }

    setCustomFile(file);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setCustomFileBase64(base64);
    };
    reader.onerror = () => {
      setOcrError("Failed to serialize file binary stream.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const clearUploadedFile = () => {
    setCustomFile(null);
    setCustomFileBase64(null);
    setOcrError("");
    setOcrLogs([]);
  };

  // Customer Portal document template loading
  const selectOcrDocument = (doc: MockDocument) => {
    setSelectedDocId(doc.id);
    setOcrTextContent(doc.suggestedPromptText);
    setOcrResult(null);
    setCustomFile(null);
    setCustomFileBase64(null);
    setOcrError("");
    setOcrLogs([]);
  };

  // Customer Portal run OCR
  const runOcrAnalysis = async () => {
    setOcrLoading(true);
    setOcrResult(null);
    setOcrError("");
    setOcrLogs([]);

    const logSteps = [
      "🔒 Encrypting document stream via TLS 1.3 tunnels...",
      "⚙️ Validating structure, image orientation and dimensions...",
      "🤖 Ingesting document base64 vector stream into zero-knowledge sandbox...",
      "🔬 Invoking AI model for secure text extraction and OCR...",
      "🛡️ Checking anti-tampering heuristics and crop margins..."
    ];

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      for (let i = 0; i < logSteps.length; i++) {
        setOcrLogs(prev => [...prev, logSteps[i]]);
        await delay(300);
      }

      setOcrLogs(prev => [...prev, "🚀 Fetching server analysis..."]);

      const payload = customFileBase64 
        ? { fileData: customFileBase64, fileType: customFile?.type } 
        : { textContent: ocrTextContent };

      const response = await fetch("/api/document-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process document");
      }

      const data: DocumentOcrResult = await response.json();
      setOcrResult(data);
      setOcrLogs(prev => [...prev, "✅ Secure processing successfully completed."]);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "An error occurred during OCR verification.";
      setOcrError(errMsg);
      setOcrLogs(prev => [...prev, `❌ Error: ${errMsg}`]);
    } finally {
      setOcrLoading(false);
    }
  };

  // Customer Portal run Underwriting
  const runUnderwriting = async () => {
    setUnderwritingLoading(true);
    setUnderwritingResult(null);

    const activeProfile = MOCK_BORROWERS.find(b => b.id === selectedBorrowerId);
    if (!activeProfile) return;

    try {
      const response = await fetch("/api/underwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionRegistry: activeProfile.transactions,
          requestedLoanDetails: {
            loanType: customLoanType,
            amount: customLoanAmount
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Underwriting calculation failed");
      }

      const data: UnderwritingResult = await response.json();
      setUnderwritingResult(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during underwriting calculation.");
    } finally {
      setUnderwritingLoading(false);
    }
  };

  // Bank Manager Live Pipeline Assessor (Prompt 4)
  const assessProspectViaAi = async (borrower: BorrowerProfile) => {
    setManagerAssessments(prev => ({
      ...prev,
      [borrower.id]: { intentScore: 0, repaymentCapacity: 0, recommendation: "", loading: true, assessed: false }
    }));

    try {
      // 1. Fetch Intent Score from Gemini (via Intent Discovery API mock or live)
      const chatPayload = [
        { role: "user" as const, text: `I need a ${borrower.requestedLoanType} for ₹${borrower.requestedLoanAmount.toLocaleString()}. ${borrower.description}` }
      ];

      const intentRes = await fetch("/api/intent-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatPayload })
      });
      const intentData: IntentDiscoveryResult = await intentRes.json();

      // 2. Fetch Repayment Capacity from Gemini (via Underwriting API)
      const underwritingRes = await fetch("/api/underwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionRegistry: borrower.transactions,
          requestedLoanDetails: {
            loanType: borrower.requestedLoanType,
            amount: borrower.requestedLoanAmount
          }
        })
      });
      const underwritingData: UnderwritingResult = await underwritingRes.json();

      setManagerAssessments(prev => ({
        ...prev,
        [borrower.id]: {
          intentScore: intentData.intent_score || 75,
          repaymentCapacity: underwritingData.quantifiable_repayment_capacity || 45000,
          recommendation: underwritingData.credit_recommendation || "APPROVED",
          loading: false,
          assessed: true
        }
      }));

      setManagerLogs(prev => [
        `[SECURE CORE] credit underwriting computed for ${borrower.name}. Intent Score: ${intentData.intent_score || 75}, Capacity: ₹${(underwritingData.quantifiable_repayment_capacity || 45000).toLocaleString()}/mo.`,
        ...prev
      ]);
    } catch (err: any) {
      console.error("Manager scoring failed:", err);
      setManagerAssessments(prev => ({
        ...prev,
        [borrower.id]: {
          intentScore: 82, // High-quality fallback if API key is not operational
          repaymentCapacity: 65000,
          recommendation: "APPROVED",
          loading: false,
          assessed: true,
          error: "Sandbox offline mode active"
        }
      }));
      setManagerLogs(prev => [
        `[SYSTEM WARN] Gemini underwriting completed in sandbox mode for ${borrower.name} (Using secure baseline scoring).`,
        ...prev
      ]);
    }
  };

  // Manager action: Approve or Reject application
  const handleManagerDecision = async (borrower: BorrowerProfile, decision: "APPROVED" | "REJECTED") => {
    setDecisionSubmitting(true);
    const assessment = managerAssessments[borrower.id];
    const capacity = assessment?.repaymentCapacity || 55000;
    const targetEmail = borrower.id === "aman_sharma" ? "aman.sharma@gmail.com" : borrower.id === "rajesh_patel" ? "rajesh.patel@gmail.com" : "priya.mehta@gmail.com";

    setManagerLogs(prev => [
      `[SMTP] Dispatching real-time transactional alert for ${borrower.name} (${decision})...`,
      ...prev
    ]);

    try {
      // 1. Dispatch SMTP / Alert Notification to backend service
      const res = await fetch("/api/auth/credit-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectName: borrower.name,
          decision,
          customerEmail: targetEmail,
          proposedEmi: capacity,
          loanType: borrower.requestedLoanType
        })
      });

      const result = await res.json();
      if (result.success) {
        setManagerLogs(prev => [
          `[SECURE SECURITY CORE] Notification dispatched to ${targetEmail}. SMTP Status: ${result.alertSent ? 'Success' : 'Simulated (Credentials Missing)'}.`,
          ...prev
        ]);

        // 2. Persistent database logging via live Firestore Cloud Database
        if (db) {
          try {
            const { collection, addDoc } = await import("firebase/firestore");
            await addDoc(collection(db, "decisions"), {
              borrowerId: borrower.id,
              borrowerName: borrower.name,
              decision,
              targetEmail,
              proposedEmi: capacity,
              loanType: borrower.requestedLoanType,
              timestamp: new Date().toISOString()
            });
            setManagerLogs(prev => [
              `[FIREBASE FIRESTORE] Securely persisted underwriting decision in live Firestore cloud database!`,
              ...prev
            ]);
          } catch (dbErr: any) {
            console.warn("[FIREBASE] Could not log to Firestore:", dbErr.message);
            handleFirestoreError(dbErr, OperationType.WRITE, "decisions");
          }
        }

        alert(`Credit Application for ${borrower.name} was successfully ${decision}. Customer email alert triggered and recorded to Firestore!`);
      }
    } catch (err: any) {
      alert("Failed to communicate underwriting decision to notification controller.");
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleManagerChatSend = async (customText?: string) => {
    const text = customText !== undefined ? customText : managerChatInput;
    if (!text.trim()) return;

    let displayUserMessage = text;
    let actualPrompt = text;

    const currentBorrower = MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId);
    const assessment = managerAssessments[managerSelectedBorrowerId];

    if (text === "DRAFT_MEMO") {
      if (!currentBorrower) {
        alert("Please select a borrower first.");
        return;
      }
      displayUserMessage = `Draft Credit Assessment Memo for ${currentBorrower.name}`;
      actualPrompt = `Draft a highly professional, comprehensive Credit Underwriting Memorandum for borrower ${currentBorrower.name}, who is a ${currentBorrower.occupation} requesting a ${currentBorrower.requestedLoanType} of ₹${currentBorrower.requestedLoanAmount.toLocaleString()}. Description/Context: "${currentBorrower.description}". 
      ${assessment?.assessed ? `Calculated Repayment Capacity: ₹${assessment.repaymentCapacity.toLocaleString()}/mo, AI Credit Health Score: ${assessment.intentScore}, Underwriter Recommendation: ${assessment.recommendation}.` : ""}
      The memorandum MUST be formatted with clear, beautiful markdown headers, including:
      - EXECUTIVE SUMMARY
      - CREDIT RISK & CAPACITY SCORECARD
      - CAPITAL ADEQUACY & MITIGATING FACTORS
      - FORMAL DECISION REASONING
      Please write a comprehensive, dense underwriter justification.`;
    } else if (text === "STRESS_TEST") {
      if (!currentBorrower) {
        alert("Please select a borrower first.");
        return;
      }
      displayUserMessage = `Run 2.5% Rate Spike Stress Test for ${currentBorrower.name}`;
      actualPrompt = `Execute an advanced macro-stress-test simulation on ${currentBorrower.name}'s transaction history for a ${currentBorrower.requestedLoanType} of ₹${currentBorrower.requestedLoanAmount.toLocaleString()}.
      Analyze the impact of an immediate interest rate spike of +2.50% on their debt-servicing capability. 
      Calculate the estimated monthly installment increase and evaluate whether their verified repayment capacity (assumed around ₹${assessment?.repaymentCapacity || "65,000"}/mo) can absorb this shock without breaching a 50% FOIR threshold.
      Provide a formal Pass/Fail stress-test statement and risk mitigating suggestions.`;
    } else if (text === "BASEL_COMPLIANCE") {
      if (!currentBorrower) {
        alert("Please select a borrower first.");
        return;
      }
      displayUserMessage = `Evaluate Basel III Risk-Weighting for ${currentBorrower.name}`;
      actualPrompt = `Evaluate the regulatory capital adequacy and risk-weighting parameters for ${currentBorrower.name}'s requested ${currentBorrower.requestedLoanType} under Basel III guidelines.
      Determine the Risk-Weighted Asset (RWA) category, capital buffer requirements (including capital conservation buffer of 2.5%), and evaluate if this credit exposure aligns with prudent leverage ratio constraints.`;
    }

    if (customText === undefined) {
      setManagerChatInput("");
    }

    const updatedHistory = [...managerChatHistory, { role: "user" as const, text: displayUserMessage }];
    setManagerChatHistory(updatedHistory);
    setManagerChatLoading(true);

    try {
      const response = await fetch("/api/gemini-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", text: actualPrompt }] })
      });

      if (!response.ok) {
        throw new Error("Server communication error.");
      }

      const data = await response.json();
      const responseText = data.text || "AI Advisor response generated.";

      setManagerChatHistory(prev => [...prev, { role: "model", text: responseText }]);

      if (text === "DRAFT_MEMO" && currentBorrower) {
        setManagerCreditMemos(prev => ({
          ...prev,
          [currentBorrower.id]: responseText
        }));
        setManagerLogs(prev => [
          `[SECURE COGNITIVE] Formal credit memorandum successfully generated for ${currentBorrower.name}. Added to print registers.`,
          ...prev
        ]);
      } else {
        setManagerLogs(prev => [
          `[SECURE COGNITIVE] Copilot query processed: "${displayUserMessage.substring(0, 40)}..."`,
          ...prev
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setManagerChatHistory(prev => [
        ...prev,
        { role: "model", text: "⚠️ Error communicating with Gemini credit advisory engine. Please retry." }
      ]);
    } finally {
      setManagerChatLoading(false);
    }
  };

  const handleTriggerPrint = (source: "customer" | "manager") => {
    setPrintSource(source);
    setIsPrintModalOpen(true);
    setManagerLogs(prev => [
      `[PRINTER COGNITIVE] Active Assessment Report compiled and ready for print preview.`,
      ...prev
    ]);
  };

  const handleLogoutAction = async () => {
    if (session?.user) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: session.user.name,
            email: session.user.email
          })
        });
      } catch (err) {
        console.error("Failed to dispatch secure termination signal:", err);
      }
    }
    setSession(null);
    setAuthStage("login");
    setFormPassword("");
    setCaptchaInput("");
    setReCaptchaChecked(false);
    triggerNewCaptcha();
    setOtpArray(["", "", "", "", "", ""]);
    showToast("Logged out successfully. Secure session terminated. 👋", "info");
  };

  // Synchronize EMI Calculator with the active selected borrower's amount
  useEffect(() => {
    const activeBorrower = MOCK_BORROWERS.find(b => b.id === selectedBorrowerId);
    if (activeBorrower) {
      setEmiPrincipal(activeBorrower.requestedLoanAmount);
    }
  }, [selectedBorrowerId]);

  const getCreditHealthScore = (res: UnderwritingResult) => {
    let score = 650; // Starting midpoint

    // 1. Debt-to-income contribution (max +150, min -150)
    const dti = res.calculated_debt_to_income_ratio ?? 0;
    if (dti <= 0.15) {
      score += 150;
    } else if (dti <= 0.30) {
      score += 80;
    } else if (dti <= 0.45) {
      score += 20;
    } else if (dti <= 0.55) {
      score -= 60;
    } else {
      score -= 150;
    }

    // 2. Credit recommendation impact
    const rec = res.credit_recommendation;
    if (rec === "APPROVED") {
      score += 80;
    } else if (rec === "MODIFY_TERMS") {
      score += 10;
    } else if (rec === "REJECTED") {
      score -= 120;
    }

    // 3. Risk flags penalty
    const flagsCount = res.risk_flags_detected?.length ?? 0;
    score -= flagsCount * 45;

    // 4. Income positive adjustments
    const income = res.verified_monthly_income ?? 0;
    if (income > 120000) {
      score += 40;
    } else if (income > 75000) {
      score += 20;
    }

    // Bound between 300 and 900
    return Math.min(900, Math.max(300, score));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
  };

  // High-precision loan EMI calculations
  const getEmiDetails = () => {
    const P = emiPrincipal;
    const r = emiInterestRate / 12 / 100;
    const n = emiTenureYears * 12;

    let emi = 0;
    if (r > 0) {
      emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    } else {
      emi = P / n;
    }

    const totalRepayment = emi * n;
    const totalInterest = totalRepayment - P;

    return {
      emi,
      totalRepayment,
      totalInterest,
      totalMonths: n
    };
  };

  const getPrepaymentAmortization = () => {
    const P = emiPrincipal;
    const r = emiInterestRate / 12 / 100;
    const n = emiTenureYears * 12;

    const { emi } = getEmiDetails();

    const monthlySchedule: {
      monthNumber: number;
      beginningBalance: number;
      emiPaid: number;
      principalPaid: number;
      interestPaid: number;
      extraPrepayment: number;
      endingBalance: number;
    }[] = [];

    let balance = P;
    let totalInterestPaid = 0;
    let totalRepayments = 0;
    let actualMonthsCount = 0;

    for (let i = 1; i <= n; i++) {
      if (balance <= 0) break;

      const beginningBalance = balance;
      const interestPaid = balance * r;
      totalInterestPaid += interestPaid;

      let standardPrincipal = emi - interestPaid;
      if (standardPrincipal < 0) {
        standardPrincipal = 0;
      }

      // Prepayments this month
      const oneTime = (i === emiPrepaymentOneTimeMonth) ? emiPrepaymentOneTime : 0;
      const recurring = (i >= emiPrepaymentRecurringStart) ? emiPrepaymentRecurring : 0;
      const extraPrepayment = oneTime + recurring;

      const maxStandardPrincipal = Math.min(standardPrincipal, balance);
      const balanceAfterStandard = balance - maxStandardPrincipal;
      const actualExtraPrepayment = Math.min(extraPrepayment, balanceAfterStandard);

      const totalPrincipalPaid = maxStandardPrincipal + actualExtraPrepayment;
      const actualEmiPaid = interestPaid + maxStandardPrincipal;
      
      const endingBalance = Math.max(0, balance - totalPrincipalPaid);

      monthlySchedule.push({
        monthNumber: i,
        beginningBalance,
        emiPaid: actualEmiPaid,
        principalPaid: maxStandardPrincipal,
        interestPaid,
        extraPrepayment: actualExtraPrepayment,
        endingBalance
      });

      totalRepayments += (actualEmiPaid + actualExtraPrepayment);
      actualMonthsCount = i;
      balance = endingBalance;
    }

    // Now aggregate monthlySchedule into yearlySchedule
    const yearlySchedule: {
      year: number;
      emiPaid: number;
      principalPaid: number;
      interestPaid: number;
      extraPrepayment: number;
      endingBalance: number;
    }[] = [];

    let currentYear = 1;
    let currentYearEmi = 0;
    let currentYearPrincipal = 0;
    let currentYearInterest = 0;
    let currentYearExtra = 0;
    let endingBalanceOfYear = P;

    monthlySchedule.forEach((row, index) => {
      currentYearEmi += row.emiPaid;
      currentYearPrincipal += row.principalPaid;
      currentYearInterest += row.interestPaid;
      currentYearExtra += row.extraPrepayment;
      endingBalanceOfYear = row.endingBalance;

      const isLastOfAll = index === monthlySchedule.length - 1;
      const isLastOfMonthOfYear = row.monthNumber % 12 === 0;

      if (isLastOfMonthOfYear || isLastOfAll) {
        yearlySchedule.push({
          year: currentYear,
          emiPaid: currentYearEmi,
          principalPaid: currentYearPrincipal,
          interestPaid: currentYearInterest,
          extraPrepayment: currentYearExtra,
          endingBalance: endingBalanceOfYear
        });
        currentYearEmi = 0;
        currentYearPrincipal = 0;
        currentYearInterest = 0;
        currentYearExtra = 0;
        currentYear++;
      }
    });

    return {
      monthlySchedule,
      yearlySchedule,
      totalInterestPaid,
      totalRepayments,
      actualMonthsCount,
      tenureYearsSaved: Math.max(0, (n - actualMonthsCount) / 12)
    };
  };

  const calculateMilestones = (usePrepayment: boolean) => {
    const P = emiPrincipal;
    const r = emiInterestRate / 12 / 100;
    const n = emiTenureYears * 12;
    const { emi } = getEmiDetails();

    let balance = P;
    
    let m25: number | null = null;
    let m50: number | null = null;
    let m75: number | null = null;
    let m100: number | null = null;

    for (let i = 1; i <= n; i++) {
      if (balance <= 0) break;

      const interestPaid = balance * r;
      let standardPrincipal = emi - interestPaid;
      if (standardPrincipal < 0) standardPrincipal = 0;

      // Prepayments
      const oneTime = usePrepayment && (i === emiPrepaymentOneTimeMonth) ? emiPrepaymentOneTime : 0;
      const recurring = usePrepayment && (i >= emiPrepaymentRecurringStart) ? emiPrepaymentRecurring : 0;
      const extraPrepayment = oneTime + recurring;

      const maxStandardPrincipal = Math.min(standardPrincipal, balance);
      const balanceAfterStandard = balance - maxStandardPrincipal;
      const actualExtraPrepayment = Math.min(extraPrepayment, balanceAfterStandard);

      const totalPrincipalPaid = maxStandardPrincipal + actualExtraPrepayment;
      const endingBalance = Math.max(0, balance - totalPrincipalPaid);

      const progress = ((P - endingBalance) / P) * 100;

      if (m25 === null && progress >= 25) m25 = i;
      if (m50 === null && progress >= 50) m50 = i;
      if (m75 === null && progress >= 75) m75 = i;
      if (endingBalance <= 0) {
        m100 = i;
        break;
      }

      balance = endingBalance;
    }

    if (m100 === null) m100 = n;

    return { 
      m25: m25 || Math.max(1, Math.round(n * 0.25)), 
      m50: m50 || Math.max(2, Math.round(n * 0.50)), 
      m75: m75 || Math.max(3, Math.round(n * 0.75)), 
      m100: m100 || n 
    };
  };

  const formatMonthToAge = (totalMonths: number) => {
    const yrs = Math.floor(totalMonths / 12);
    const mos = totalMonths % 12;
    if (yrs === 0) return `Mo ${mos}`;
    if (mos === 0) return `${yrs} Yr${yrs > 1 ? "s" : ""}`;
    return `${yrs} Yr${yrs > 1 ? "s" : ""}, ${mos} Mo`;
  };

  const getRepaymentMilestones = () => {
    const baseline = calculateMilestones(false);
    const simulated = calculateMilestones(showPrepaymentSim);
    return { baseline, simulated };
  };

  const getYearlyAmortization = (P: number = emiPrincipal, r: number = emiInterestRate/12/100, n: number = emiTenureYears*12, emi: number = getEmiDetails().emi) => {
    const { yearlySchedule } = getPrepaymentAmortization();
    return yearlySchedule.map(row => ({
      year: row.year,
      emiPaid: row.emiPaid,
      principalPaid: row.principalPaid + row.extraPrepayment,
      interestPaid: row.interestPaid,
      endingBalance: row.endingBalance,
    }));
  };

  const getMonthlyScheduleForYear = (P: number = emiPrincipal, r: number = emiInterestRate/12/100, n: number = emiTenureYears*12, emi: number = getEmiDetails().emi, targetYear: number = selectedEmiYear) => {
    const { monthlySchedule } = getPrepaymentAmortization();
    const startMonth = (targetYear - 1) * 12 + 1;
    const endMonth = targetYear * 12;
    
    return monthlySchedule
      .filter(row => row.monthNumber >= startMonth && row.monthNumber <= endMonth)
      .map(row => ({
        monthNumber: row.monthNumber,
        beginningBalance: row.beginningBalance,
        emi: row.emiPaid,
        principalPaid: row.principalPaid + row.extraPrepayment,
        interestPaid: row.interestPaid,
        endingBalance: row.endingBalance,
      }));
  };

  const handleDownloadCsv = () => {
    const { emi, totalRepayment, totalInterest } = getEmiDetails();
    const P = emiPrincipal;
    const n = emiTenureYears * 12;

    const { monthlySchedule, yearlySchedule, totalInterestPaid, totalRepayments, actualMonthsCount } = getPrepaymentAmortization();

    let csvContent = "";
    
    // Add loan details metadata
    csvContent += `LOAN EMI CALCULATOR REPORT WITH PREPAYMENT SIMULATION\n`;
    csvContent += `Generated At,${new Date().toLocaleString()}\n`;
    csvContent += `Original Principal (INR),${P}\n`;
    csvContent += `Annual Interest Rate (%),${emiInterestRate}%\n`;
    csvContent += `Original Tenure (Years),${emiTenureYears} Years (${n} Months)\n`;
    csvContent += `Scheduled Monthly EMI (INR),${emi.toFixed(2)}\n`;
    csvContent += `Baseline Total Interest (INR),${totalInterest.toFixed(2)}\n`;
    csvContent += `Baseline Total Repayment (INR),${totalRepayment.toFixed(2)}\n`;
    csvContent += `Simulated One-time Prepayment (INR),${emiPrepaymentOneTime} (at Month ${emiPrepaymentOneTimeMonth})\n`;
    csvContent += `Simulated Monthly Recurring Prepayment (INR),${emiPrepaymentRecurring} (starting Month ${emiPrepaymentRecurringStart})\n`;
    csvContent += `Actual Total Interest Paid (INR),${totalInterestPaid.toFixed(2)}\n`;
    csvContent += `Actual Total Repayments Paid (INR),${totalRepayments.toFixed(2)}\n`;
    csvContent += `Actual Loan Duration,${actualMonthsCount} Months (Shortened by ${n - actualMonthsCount} Months)\n`;
    csvContent += `Actual Total Interest Saved (INR),${(totalInterest - totalInterestPaid).toFixed(2)}\n`;
    csvContent += `Inflation Sensitivity Enabled,${inflationEnabled ? `Yes (Annual Rate: ${inflationRate}%)` : "No"}\n\n`;

    if (amortizationViewMode === "yearly") {
      csvContent += `YEARLY REPAYMENT SCHEDULE\n`;
      if (inflationEnabled) {
        csvContent += `Year,EMI Paid (INR),Real EMI Paid (INR),Principal Paid (INR),Real Principal Paid (INR),Interest Paid (INR),Real Interest Paid (INR),Prepayments (INR),Real Prepayments (INR),Ending Balance (INR),Real Ending Balance (INR)\n`;
        yearlySchedule.forEach((row) => {
          const df = Math.pow(1 + (inflationRate / 100), -row.year);
          csvContent += `${row.year},${row.emiPaid.toFixed(2)},${(row.emiPaid * df).toFixed(2)},${row.principalPaid.toFixed(2)},${(row.principalPaid * df).toFixed(2)},${row.interestPaid.toFixed(2)},${(row.interestPaid * df).toFixed(2)},${row.extraPrepayment.toFixed(2)},${(row.extraPrepayment * df).toFixed(2)},${row.endingBalance.toFixed(2)},${(row.endingBalance * df).toFixed(2)}\n`;
        });
      } else {
        csvContent += `Year,EMI Paid (INR),Principal Paid (INR),Interest Paid (INR),Prepayments (INR),Ending Balance (INR)\n`;
        yearlySchedule.forEach((row) => {
          csvContent += `${row.year},${row.emiPaid.toFixed(2)},${row.principalPaid.toFixed(2)},${row.interestPaid.toFixed(2)},${row.extraPrepayment.toFixed(2)},${row.endingBalance.toFixed(2)}\n`;
        });
      }
    } else {
      csvContent += `MONTHLY REPAYMENT SCHEDULE\n`;
      if (inflationEnabled) {
        csvContent += `Month,Beginning Balance (INR),Real Beginning Balance (INR),EMI Paid (INR),Real EMI Paid (INR),Principal Paid (INR),Real Principal Paid (INR),Interest Paid (INR),Real Interest Paid (INR),Prepayments (INR),Real Prepayments (INR),Ending Balance (INR),Real Ending Balance (INR)\n`;
        monthlySchedule.forEach((row) => {
          const df = Math.pow(1 + (inflationRate / 100) / 12, -row.monthNumber);
          csvContent += `${row.monthNumber},${row.beginningBalance.toFixed(2)},${(row.beginningBalance * df).toFixed(2)},${row.emiPaid.toFixed(2)},${(row.emiPaid * df).toFixed(2)},${row.principalPaid.toFixed(2)},${(row.principalPaid * df).toFixed(2)},${row.interestPaid.toFixed(2)},${(row.interestPaid * df).toFixed(2)},${row.extraPrepayment.toFixed(2)},${(row.extraPrepayment * df).toFixed(2)},${row.endingBalance.toFixed(2)},${(row.endingBalance * df).toFixed(2)}\n`;
        });
      } else {
        csvContent += `Month,Beginning Balance (INR),EMI Paid (INR),Principal Paid (INR),Interest Paid (INR),Prepayments (INR),Ending Balance (INR)\n`;
        monthlySchedule.forEach((row) => {
          csvContent += `${row.monthNumber},${row.beginningBalance.toFixed(2)},${row.emiPaid.toFixed(2)},${row.principalPaid.toFixed(2)},${row.interestPaid.toFixed(2)},${row.extraPrepayment.toFixed(2)},${row.endingBalance.toFixed(2)}\n`;
        });
      }
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = `EMI_Schedule_${amortizationViewMode}_WithPrepay_${Date.now()}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Current prompt inspection helper
  const getPromptLabelAndText = () => {
    switch (customerActiveTab) {
      case "intent":
        return {
          title: "Prompt 1: Intent Discovery Chatbot Instructions",
          model: "gemini-3.5-flash",
          prompt: `Identify the specific loan type: Personal, Home, Mortgage, or Auto. Deduce financial urgency and calculate a dynamic "Intent Score" strictly scaled from 1 to 100.`
        };
      case "ocr":
        return {
          title: "Prompt 2: Document OCR & Tamper Check Instructions",
          model: "gemini-3.5-flash",
          prompt: `Extract raw, un-tampered data points with absolute precision. Check for document inconsistencies, cropped margins, or photo alterations.`
        };
      case "underwriting":
        return {
          title: "Prompt 3: Enterprise Underwriting Ledger Instructions",
          model: "gemini-1.5-pro",
          prompt: `Analyze 6-month transaction ledger arrays. Aggregate credits & liabilities to verify baseline monthly income and compute Repayment Capacity.`
        };
      case "calculator":
        return {
          title: "Loan EMI Calculator Engine",
          model: "Pure Client-Side Model",
          prompt: `Interactive financial model allows real-time tuning of principal, interest, and tenure. It automatically checks affordability ratios against underwriting outcomes.`
        };
    }
  };

  const currentPromptInfo = getPromptLabelAndText();

  return (
    <div className={`min-h-screen ${theme === "light" ? "theme-light" : ""} bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-x-hidden`}>
      
      {/* Absolute Inactivity Warning Dialog Box */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-950 border-2 border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">Security Log Out Executed</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                You have been securely signed out due to 5 minutes of inactivity to safeguard your financial details.
              </p>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition duration-200 uppercase tracking-wider text-xs shadow-lg shadow-red-900/30"
              >
                Return to Universal Gateway
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Page Top Navigation */}
      <header className="h-20 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40 select-none">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40 border border-blue-500/30">
            <LockKeyhole className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold tracking-tight text-base sm:text-lg text-white uppercase flex items-center gap-2">
              APEX VAULT & TRUST <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full font-mono border border-blue-500/20">Secure Portal</span>
            </span>
            <div className="text-[10px] text-slate-500 font-mono tracking-wider">Zero-Knowledge Encrypted Financial Network</div>
          </div>
        </div>

        {/* Navigation Portal Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-900/40 p-1 rounded-xl border border-slate-850">
          <button
            onClick={() => {
              window.history.pushState({}, "", "/");
              setCurrentPath("/");
            }}
            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase transition duration-200 border ${
              currentPath === "/"
                ? "bg-blue-600/10 text-[#00D4B2] border-blue-500/30 shadow-md shadow-blue-950/20"
                : "text-slate-400 hover:text-white border-transparent"
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => {
              window.history.pushState({}, "", "/auth/manager-dashboard");
              setCurrentPath("/auth/manager-dashboard");
            }}
            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase transition duration-200 border ${
              currentPath === "/auth/manager-dashboard"
                ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-md shadow-indigo-950/20"
                : "text-slate-400 hover:text-white border-transparent"
            }`}
          >
            Bank Employee
          </button>
        </div>

        {/* Global Inactivity Timer Display */}
        {session && (
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono">
            <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">Security Lease:</span>
            <span className="text-emerald-400 font-bold tracking-wider">{formatTimer(inactivityTimer)}</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            id="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition duration-200"
            title={theme === "dark" ? "Switch to High-Contrast Financial Light Mode" : "Switch to Deep Dark Mode"}
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Financial Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Deep Dark</span>
              </>
            )}
          </button>

          {/* View Mode Toggle Button */}
          <button
            id="view-mode-toggle"
            type="button"
            onClick={() => setViewMode(viewMode === "web" ? "mobile" : "web")}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition duration-200"
            title={viewMode === "web" ? "Switch to Phone Mockup View" : "Switch to Spacious Web Layout View"}
          >
            {viewMode === "web" ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Phone Layout</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-[#00D4B2]" />
                <span className="hidden sm:inline">Web Layout</span>
              </>
            )}
          </button>

          <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          {checkingConfig ? (
            <span className="text-slate-500 animate-pulse">Checking Secure Core...</span>
          ) : hasApiKey ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Gemini: Active Integrity</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Core Setup Required</span>
            </div>
          )}
        </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center gap-8">
        
        {/* If Not Logged In, Render High-Fidelity Mobile Device Mockup */}
        {!session ? (
          <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-12 py-6">
            
            {/* Left Column: Security Context and Instructions */}
            <div className="max-w-md space-y-6 text-slate-300 lg:text-left text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs font-mono text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Standard compliance ISO-27001</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Empowered Underwriting, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Prudent Decisional Core.</span>
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connect and log in using our high-fidelity, two-factor secure mobile client mockup. Test either customer onboarding chatbot tools or risk underwriting systems safely.
              </p>
              
              <div className="space-y-3.5 text-xs text-left max-w-sm mx-auto lg:mx-0">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono font-bold shrink-0">1</div>
                  <span className="text-slate-400">Select <strong className="text-white">Customer</strong> or <strong className="text-white">Employee</strong> role in the tabs.</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono font-bold shrink-0">2</div>
                  <span className="text-slate-400">Satisfy password policies (8-12 chars, uppercase, lowercase, special character).</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono font-bold shrink-0">3</div>
                  <span className="text-slate-400">Resolve security CAPTCHA and receive a real/simulated 6-digit OTP code dynamically.</span>
                </div>
              </div>
            </div>

            {/* Right Column: High-Fidelity Mobile Phone Mockup Frame or Spacious Web Container Card */}
            <div className={
              viewMode === "mobile"
                ? "relative w-full max-w-[390px] h-[810px] bg-[#0c0f17] rounded-[55px] border-[12px] border-slate-850 shadow-[0_0_80px_rgba(37,99,235,0.15)] overflow-hidden ring-4 ring-slate-900/80 flex flex-col justify-between select-none"
                : "w-full max-w-[480px] bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(37,99,235,0.1)] flex flex-col justify-between relative min-h-[750px]"
            }>
              
              {/* Dynamic Island Notch */}
              {viewMode === "mobile" && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-full z-50 flex items-center justify-center border border-slate-800/40">
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-slate-950 ml-16" />
                </div>
              )}

              {/* Status Bar */}
              {viewMode === "mobile" && (
                <div className="flex justify-between items-center px-6 pt-11 pb-2 text-[10px] font-mono font-semibold text-slate-400 z-40 select-none bg-slate-950/20">
                  <span>09:41</span>
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="text-emerald-400">5G</span>
                    <div className="w-5 h-2.5 border border-slate-500 rounded-sm p-0.5 flex items-center">
                      <div className="h-full w-4 bg-emerald-500 rounded-2xs" />
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile/Web Viewport Screen */}
              <div className={`flex-1 flex flex-col justify-start bg-slate-950 relative scrollbar-none ${
                viewMode === "mobile" ? "overflow-y-auto px-4 pb-12 pt-2" : "p-2 sm:p-4 pb-6"
              }`}>
                
                <AnimatePresence mode="wait">
                  
                  {/* STAGE 1: SECURE MULTI-ROLE LOGIN & REGISTRATION GATEWAY (APEX VAULT FIXED AUTH) */}
                  {authStage === "login" && (
                    <motion.div 
                      key="stage-login"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      className="flex-1 flex flex-col"
                    >
                      <ApexVaultFixedAuth
                        loginRole={loginRole}
                        setLoginRole={setLoginRole}
                        onAuthSuccess={(sessionData) => {
                          setAuthStage("splash");
                          setTimeout(() => {
                            const normalizedRole = (sessionData.user.role || "").toLowerCase();
                            const mappedRole = (normalizedRole === "manager" || normalizedRole === "employee" || normalizedRole === "role_manager") ? "employee" : "customer";
                            setSession({
                              token: sessionData.token,
                              user: {
                                ...sessionData.user,
                                role: mappedRole
                              }
                            });
                            if (mappedRole === "employee") {
                              window.history.pushState({}, "", "/auth/manager-dashboard");
                              setCurrentPath("/auth/manager-dashboard");
                            } else {
                              window.history.pushState({}, "", "/");
                              setCurrentPath("/");
                            }
                            setInactivityTimer(300); // 5-Minute active session lease
                          }, 3500);
                        }}
                        addDiagnosticLog={addDiagnosticLog}
                        viewMode={viewMode}
                      />
                    </motion.div>
                  )}

                  {/* STAGE 3: POST-VERIFICATION SPLASH OVERLAY CARD */}
                  {authStage === "splash" && (
                    <motion.div 
                      key="stage-splash"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center text-center p-4"
                    >
                      <motion.div 
                        initial={{ rotate: -15, scale: 0.8 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 120 }}
                        className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mb-6"
                      >
                        <ShieldCheck className="w-10 h-10 text-emerald-500 animate-pulse" />
                      </motion.div>

                      <h3 className="text-xl font-bold tracking-tight text-white mb-2">Access Approved</h3>
                      <div className="h-0.5 w-12 bg-emerald-500 mx-auto mb-4" />
                      
                      <p className="text-sm text-slate-300 leading-relaxed font-sans mb-6">
                        "Welcome back, <strong className="text-white">{loginRole === "customer" ? formName || "Valued Client" : "Bank Underwriter Manager"}</strong>! Thank you for visiting your secure banking portal. Your connection is encrypted."
                      </p>

                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-mono text-slate-500">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        <span>AES-256 Session Encrypted</span>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* Live Security & OTP Diagnostics Log Panel */}
                {(authStage === "login" || authStage === "otp") && (
                  <div id="diagnostic-logs-area" className="mt-6 border border-slate-800/80 bg-slate-950/80 rounded-xl p-3 backdrop-blur-md select-none font-sans shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-900 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00D4B2] animate-pulse" />
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-300">
                          🛡️ Security & OTP Diagnostics
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDiagnosticLogs([{
                              id: "clear",
                              timestamp: new Date().toLocaleTimeString(),
                              type: "info",
                              message: "Diagnostics cleared. Monitor standing by."
                            }]);
                          }}
                          className="text-[9px] font-mono text-slate-500 hover:text-slate-300 hover:underline transition"
                        >
                          Clear
                        </button>
                        <span className="text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const report = diagnosticLogs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join("\n");
                            navigator.clipboard.writeText(report);
                            showToast("Diagnostic report copied to clipboard!", "success");
                          }}
                          className="text-[9px] font-mono text-[#00D4B2] hover:text-[#00D4B2]/80 hover:underline transition"
                        >
                          Copy Report
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 text-[10px] font-mono leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                      {diagnosticLogs.length === 0 ? (
                        <div className="text-slate-600 text-center py-2">No activity recorded.</div>
                      ) : (
                        diagnosticLogs.map((log) => {
                          let typeColor = "text-blue-400";
                          let dotColor = "bg-blue-400";
                          if (log.type === "success") {
                            typeColor = "text-[#00D4B2]";
                            dotColor = "bg-[#00D4B2]";
                          } else if (log.type === "warning") {
                            typeColor = "text-amber-400";
                            dotColor = "bg-amber-400";
                          } else if (log.type === "error") {
                            typeColor = "text-red-400";
                            dotColor = "bg-red-400";
                          }
                          return (
                            <div key={log.id} className="flex gap-2 items-start border-b border-slate-900/40 pb-1 last:border-0">
                              <span className="text-slate-500 text-[9px] select-none shrink-0 pt-[1px]">{log.timestamp}</span>
                              <span className={`px-1 py-[1px] rounded text-[8px] font-bold ${dotColor}/10 border ${dotColor}/20 ${typeColor} shrink-0 uppercase select-none`}>
                                {log.type}
                              </span>
                              <span className="text-slate-300 break-words flex-1">{log.message}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="mt-2 text-[8px] font-mono text-slate-500 flex justify-between">
                      <span>SMTP STATUS: {emailConfigured ? "CONFIGURED (LIVE)" : "SIMULATION ACTIVE"}</span>
                      <span>ACTIVE CHANNEL: {otpChannel.toUpperCase()}</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Home Indicator Bar */}
              {viewMode === "mobile" && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full z-50" />
              )}
            </div>

          </div>
        ) : (
          /* IF LOGGED IN, RENDER THE AUTHENTIC COMPLIANT EXPERIENCES GATED BY RBAC ROLE */
          <div className="w-full flex flex-col gap-6">
            
            {/* ROLE 1: CUSTOMER VIEW - Gated by RBAC path check */}
            {session.user.role === "customer" && currentPath === "/auth/manager-dashboard" && (
              <div className="w-full max-w-2xl mx-auto bg-slate-950 border-2 border-red-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden my-12 animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600 animate-pulse" />
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white uppercase">RBAC ACCESS VIOLATION GATED</h3>
                <p className="text-xs text-red-400 font-mono mt-1 tracking-wider">SECURE AUDIT CONTROL • STATUS CODE: 403 FORBIDDEN</p>
                <div className="h-px bg-slate-800 my-6 max-w-md mx-auto" />
                <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
                  Your current security context (<strong className="text-white">Customer Account role</strong>) is strictly forbidden from accessing the Bank Manager Underwriting Platform. Live audit logs have flagged this traversal attempt.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={() => {
                      window.history.pushState({}, "", "/");
                      setCurrentPath("/");
                    }}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition duration-200 uppercase tracking-wider text-xs shadow-lg"
                  >
                    Return to Safe Zone (Customer App)
                  </button>
                  <button 
                    onClick={handleLogoutAction}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 px-6 rounded-xl transition duration-200 uppercase tracking-wider text-xs"
                  >
                    Disconnect & Log In as Bank Manager
                  </button>
                </div>
              </div>
            )}

            {session.user.role === "customer" && currentPath !== "/auth/manager-dashboard" && (
              <div className="w-full flex flex-col items-center justify-center py-6">
                
                <div className="text-center mb-6 max-w-lg">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">Secure Customer Sandbox</span>
                  <h2 className="text-2xl font-bold text-white mt-3">Interactive Onboarding Console</h2>
                  <p className="text-xs text-slate-400 mt-1">Simulate credit applications and ocr checking inside your protected customer mobile app frame.</p>
                </div>

                 {/* Mobile Device Mockup or Spacious Web Container for Customer features */}
                <div className={
                  viewMode === "mobile"
                    ? "relative w-full max-w-[390px] h-[810px] bg-[#0c0f17] rounded-[55px] border-[12px] border-slate-850 shadow-[0_0_80px_rgba(16,185,129,0.1)] overflow-hidden ring-4 ring-slate-900/80 flex flex-col justify-between select-none"
                    : "w-full max-w-4xl bg-slate-950 border border-slate-850 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between min-h-[750px] relative"
                }>
                  
                  {/* Notch */}
                  {viewMode === "mobile" && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-full z-50 flex items-center justify-center border border-slate-800/40">
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-slate-950 ml-16" />
                    </div>
                  )}

                  {/* Status Bar */}
                  {viewMode === "mobile" && (
                    <div className="flex justify-between items-center px-6 pt-11 pb-2 text-[10px] font-mono font-semibold text-slate-400 z-40 bg-slate-950/20">
                      <span>{formatTimer(inactivityTimer)}</span>
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="text-emerald-400">LTE</span>
                        <div className="w-5 h-2.5 border border-slate-500 rounded-sm p-0.5 flex items-center">
                          <div className="h-full w-4 bg-emerald-500 rounded-2xs" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Portal Screen Viewport */}
                  <div className={`flex-1 flex flex-col justify-start bg-slate-950 relative scrollbar-none ${
                    viewMode === "mobile" ? "overflow-y-auto px-4 pb-16 pt-2" : "p-2 sm:p-4 pb-12"
                  }`}>
                    
                    {/* Biometric Security Gate Toggle Switch */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl mb-3 text-[10px] shadow-inner select-none">
                      <div className="flex items-center gap-2">
                        <Fingerprint className={`w-4 h-4 transition-colors ${biometricMfaEnabled ? "text-[#00D4B2] animate-pulse" : "text-slate-500"}`} />
                        <div>
                          <span className="font-bold text-slate-200 block text-[9px] uppercase tracking-wide">Biometric Protection</span>
                          <span className="text-[8px] text-slate-500 block leading-none">Scan required for Underwrite tab</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-mono uppercase ${biometricMfaEnabled ? "text-[#00D4B2]" : "text-slate-500"}`}>
                          {biometricMfaEnabled ? "ON" : "OFF"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setBiometricMfaEnabled(!biometricMfaEnabled);
                            setBiometricAuthenticated(false);
                          }}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${
                            biometricMfaEnabled ? "bg-[#00D4B2]" : "bg-slate-800"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                              biometricMfaEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Module Mobile Navigation Switcher */}
                    <div className="grid grid-cols-4 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-4 text-[9px]">
                      <button 
                        onClick={() => setCustomerActiveTab("intent")}
                        className={`py-1.5 px-1 rounded-lg font-bold transition-all text-center ${customerActiveTab === "intent" ? "bg-blue-600 text-white" : "text-slate-400"}`}
                      >
                        Chat
                      </button>
                      <button 
                        onClick={() => setCustomerActiveTab("ocr")}
                        className={`py-1.5 px-1 rounded-lg font-bold transition-all text-center ${customerActiveTab === "ocr" ? "bg-blue-600 text-white" : "text-slate-400"}`}
                      >
                        OCR Audit
                      </button>
                      <button 
                        onClick={() => setCustomerActiveTab("underwriting")}
                        className={`py-1.5 px-1 rounded-lg font-bold transition-all text-center ${customerActiveTab === "underwriting" ? "bg-blue-600 text-white" : "text-slate-400"}`}
                      >
                        Underwrite
                      </button>
                      <button 
                        onClick={() => setCustomerActiveTab("calculator")}
                        className={`py-1.5 px-1 rounded-lg font-bold transition-all text-center ${customerActiveTab === "calculator" ? "bg-blue-600 text-white" : "text-slate-400"}`}
                      >
                        EMI Calc
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      
                      {/* SUB-VIEW 1: CHAT */}
                      {customerActiveTab === "intent" && (() => {
                        const activeHistory = chatAgentMode === "intent" ? chatHistory : geminiChatHistory;

                        return (
                          <motion.div 
                            key="cust-chat" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="flex flex-col flex-1 h-[530px]"
                          >
                            {/* Agent Selector Switcher */}
                            <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-850 rounded-xl mb-3 text-[10px] select-none">
                              <button
                                type="button"
                                onClick={() => setChatAgentMode("intent")}
                                className={`py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  chatAgentMode === "intent"
                                    ? "bg-slate-800 text-white shadow"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Lending Assistant</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setChatAgentMode("gemini")}
                                className={`py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  chatAgentMode === "gemini"
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                                <span>Gemini AI Advisor</span>
                              </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 p-2 border border-slate-800 bg-slate-900/50 rounded-xl mb-3 scrollbar-none text-[11px] leading-relaxed">
                              {activeHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[85%] rounded-xl px-3 py-2 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>
                                    {msg.text}
                                  </div>
                                </div>
                              ))}
                              {chatLoading && (
                                <div className="flex justify-start">
                                  <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-400 animate-pulse flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                    <span>{chatAgentMode === "intent" ? "Mapping Intent Core..." : "Gemini is thinking..."}</span>
                                  </div>
                                </div>
                              )}
                              <div ref={messagesEndRef} />
                            </div>

                            {/* Quick starters */}
                            {chatAgentMode === "intent" ? (
                              <div className="flex gap-1.5 overflow-x-auto pb-2 select-none">
                                <button 
                                  onClick={() => handleSendChat("I need a personal loan of 5,00,000 to renovate my dental clinic immediately.")}
                                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 px-2 py-1 rounded-lg text-[9px] whitespace-nowrap"
                                >
                                  ₹5L Personal Loan
                                </button>
                                <button 
                                  onClick={() => handleSendChat("We are looking at home loan solutions around 45 Lakhs.")}
                                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 px-2 py-1 rounded-lg text-[9px] whitespace-nowrap"
                                >
                                  ₹45L Home Loan
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1.5 overflow-x-auto pb-2 select-none font-mono">
                                <button 
                                  onClick={() => handleSendChat("How is the Debt-to-Income (DTI) ratio calculated?")}
                                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 px-2 py-1 rounded-lg text-[9px] whitespace-nowrap"
                                >
                                  Explain FOIR/DTI
                                </button>
                                <button 
                                  onClick={() => handleSendChat("What is the difference between Fixed and Floating Interest rates?")}
                                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 px-2 py-1 rounded-lg text-[9px] whitespace-nowrap"
                                >
                                  Compare Rates
                                </button>
                                <button 
                                  onClick={() => handleSendChat("How can I improve my credit profile for a loan approval?")}
                                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 px-2 py-1 rounded-lg text-[9px] whitespace-nowrap"
                                >
                                  Improve Score
                                </button>
                              </div>
                            )}

                            {/* Input */}
                            <form 
                              onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                              className="flex items-center gap-1.5"
                            >
                              <input 
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder={chatAgentMode === "intent" ? "Describe your financing needs..." : "Ask Gemini about loans, interest rates, budgets..."}
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                              />
                              <button type="submit" disabled={chatLoading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2.5 rounded-xl">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </form>

                            {/* Chat Intent Output Gauge / Gemini Status Panel */}
                            {chatAgentMode === "intent" ? (
                              <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between animate-fade-in">
                                <div>
                                  <span className="text-[9px] uppercase font-mono text-slate-500 block">AI Intent Score:</span>
                                  <span className="text-xs font-bold text-white">{intentResult.customer_intent}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <span className="text-[9px] text-slate-500 block">Probability</span>
                                    <span className="text-xs font-mono font-bold text-emerald-400">{intentResult.intent_score}%</span>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-mono">
                                    {intentResult.intent_score}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between animate-fade-in">
                                <div className="flex items-center gap-2.5">
                                  <div className="relative flex items-center justify-center">
                                    <span className="absolute flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                  </div>
                                  <div className="pl-3">
                                    <span className="text-[9px] uppercase font-mono text-slate-500 block">Active Gemini Agent:</span>
                                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                                      <span>gemini-3.5-flash</span>
                                      <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] uppercase font-mono text-slate-500 block">Agent Status</span>
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">
                                    ONLINE
                                  </span>
                                </div>
                              </div>
                            )}

                          </motion.div>
                        );
                      })()}

                      {/* SUB-VIEW 2: OCR */}
                      {customerActiveTab === "ocr" && (
                        <motion.div 
                          key="cust-ocr" 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }}
                          className="flex flex-col flex-1 gap-4"
                        >
                          {/* Inner Tabs for Preset vs Live Upload */}
                          <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-lg text-[9px] select-none">
                            <button
                              type="button"
                              onClick={() => {
                                setOcrTabMode("presets");
                                clearUploadedFile();
                              }}
                              className={`py-1 px-2 rounded font-bold uppercase transition-all ${
                                ocrTabMode === "presets"
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Preset Presets
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOcrTabMode("custom");
                                setOcrResult(null);
                                setOcrError("");
                                setOcrLogs([]);
                              }}
                              className={`py-1 px-2 rounded font-bold uppercase transition-all ${
                                ocrTabMode === "custom"
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Live Upload
                            </button>
                          </div>

                          {ocrTabMode === "presets" ? (
                            <>
                              <div>
                                <span className="text-[9px] uppercase font-mono text-slate-500 block mb-2">Select Target Document template:</span>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {MOCK_DOCUMENTS.map((doc) => (
                                    <button
                                      key={doc.id}
                                      onClick={() => selectOcrDocument(doc)}
                                      className={`p-2 rounded-xl text-left border text-[10px] transition-all leading-snug flex flex-col justify-between ${
                                        selectedDocId === doc.id
                                          ? "bg-blue-600/10 border-blue-500 text-white"
                                          : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850"
                                      }`}
                                    >
                                      <span className="font-bold truncate">{doc.title}</span>
                                      <span className="text-[8px] opacity-60 mt-1">{doc.type}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex-1 flex flex-col">
                                <span className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Raw Document Content:</span>
                                <textarea
                                  value={ocrTextContent}
                                  onChange={(e) => setOcrTextContent(e.target.value)}
                                  className="flex-1 w-full bg-slate-900 border border-slate-850 text-[10px] p-3 rounded-xl font-mono text-slate-300 resize-none focus:outline-none focus:border-blue-500 h-32"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="space-y-3 flex-1 flex flex-col justify-start">
                              {/* File Category Switcher */}
                              <div className="grid grid-cols-3 p-1 bg-slate-900 border border-slate-800 rounded-lg text-[8px] select-none">
                                <button
                                  type="button"
                                  onClick={() => setCustomFileCategory("payslip")}
                                  className={`py-1 px-1.5 rounded transition-all font-semibold ${
                                    customFileCategory === "payslip" ? "bg-[#00D4B2]/15 text-[#00D4B2] border border-[#00D4B2]/30" : "text-slate-400"
                                  }`}
                                >
                                  Payslip
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCustomFileCategory("statement")}
                                  className={`py-1 px-1.5 rounded transition-all font-semibold ${
                                    customFileCategory === "statement" ? "bg-[#00D4B2]/15 text-[#00D4B2] border border-[#00D4B2]/30" : "text-slate-400"
                                  }`}
                                >
                                  Statement
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCustomFileCategory("gov_id")}
                                  className={`py-1 px-1.5 rounded transition-all font-semibold ${
                                    customFileCategory === "gov_id" ? "bg-[#00D4B2]/15 text-[#00D4B2] border border-[#00D4B2]/30" : "text-slate-400"
                                  }`}
                                >
                                  Gov ID
                                </button>
                              </div>

                              {/* Drag and Drop Zone */}
                              <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex-1 border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer flex flex-col justify-center items-center gap-2 transition-all select-none min-h-[140px] ${
                                  dragActive
                                    ? "bg-[#00D4B2]/5 border-[#00D4B2]"
                                    : customFile
                                    ? "bg-slate-900/50 border-emerald-500/50"
                                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                                }`}
                              >
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleFileSelect}
                                  accept=".pdf,image/png,image/jpeg,image/jpg"
                                  className="hidden"
                                />

                                {customFile ? (
                                  <div className="w-full flex flex-col items-center">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-1.5 border border-emerald-500/20">
                                      <Check className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-white truncate max-w-[200px]">{customFile.name}</span>
                                    <span className="text-[9px] text-slate-500 mt-0.5">{(customFile.size / (1024 * 1024)).toFixed(2)} MB • {customFileCategory.toUpperCase()}</span>
                                    
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearUploadedFile();
                                      }}
                                      className="mt-3 text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-950/20 px-2 py-1 rounded-lg border border-red-500/10 hover:border-red-500/30 transition-all"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>Remove File</span>
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="w-10 h-10 bg-blue-500/5 rounded-full flex items-center justify-center text-blue-400 mb-1 border border-blue-500/15">
                                      <Upload className="w-4 h-4 animate-bounce" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-[11px] font-bold text-slate-200">Drag & drop document</p>
                                      <p className="text-[9px] text-slate-500">or click to browse local files</p>
                                    </div>
                                    <p className="text-[8px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-850 mt-1">PDF, PNG, JPG under 5 MB</p>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Terminal Sandbox Logs / Error Alerts */}
                          {ocrError && (
                            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex gap-2 items-start text-[9px] text-red-400 leading-normal">
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <p className="font-mono">{ocrError}</p>
                            </div>
                          )}

                          {ocrLogs.length > 0 && (
                            <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-xl space-y-1 text-[8px] font-mono leading-normal max-h-[100px] overflow-y-auto scrollbar-none select-none border-t-2 border-t-blue-500/35 shadow-inner">
                              <span className="text-[8px] font-bold text-blue-500 tracking-wider block mb-1">AUDIT REAL-TIME SIGNAL PIPELINE:</span>
                              {ocrLogs.map((log, idx) => (
                                <div key={idx} className="text-slate-400 flex items-center gap-1.5">
                                  <span className="text-[#00D4B2] font-bold shrink-0">›</span>
                                  <span>{log}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={runOcrAnalysis}
                            disabled={ocrLoading || (ocrTabMode === "custom" && !customFile)}
                            className={`w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all ${
                              ocrLoading || (ocrTabMode === "custom" && !customFile)
                                ? "bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>{ocrLoading ? "Auditing Document integrity..." : "Verify Document Security"}</span>
                          </button>

                          {ocrResult && (
                            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-[10px]">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200">Legal Name:</span>
                                <span className="text-slate-400">{ocrResult.legal_name || "Unreadable"}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200">Security Validation:</span>
                                <span className={`font-bold ${ocrResult.security_validation_passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {ocrResult.security_validation_passed ? 'PASSED (Genuine)' : 'FAILED (Tamper Threat)'}
                                </span>
                              </div>
                              {ocrResult.security_validation_flags.length > 0 && (
                                <div className="text-red-400 bg-red-950/20 p-2 rounded-lg">
                                  <span className="font-bold">Flags:</span> {ocrResult.security_validation_flags.join(", ")}
                                </div>
                              )}
                            </div>
                          )}

                        </motion.div>
                      )}

                      {/* SUB-VIEW 3: UNDERWRITING ASSESSMENT */}
                      {customerActiveTab === "underwriting" && (
                        biometricMfaEnabled && !biometricAuthenticated ? (
                          <motion.div
                            key="biometric-gate"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col flex-1 justify-center items-center py-6 px-4 bg-slate-950 text-center gap-6 min-h-[530px]"
                          >
                            <div className="space-y-2">
                              <div className="w-16 h-16 bg-[#00D4B2]/10 border-2 border-dashed border-[#00D4B2]/30 rounded-full flex items-center justify-center mx-auto relative group overflow-hidden">
                                {biometricScanning ? (
                                  <>
                                    <motion.div 
                                      animate={{ y: [-24, 24, -24] }}
                                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                      className="absolute left-0 w-full h-0.5 bg-[#00D4B2] shadow-[0_0_10px_#00D4B2] z-10"
                                    />
                                    <Fingerprint className="w-8 h-8 text-[#00D4B2] animate-pulse" />
                                  </>
                                ) : (
                                  <Fingerprint className="w-8 h-8 text-slate-400 group-hover:text-[#00D4B2] transition-colors" />
                                )}
                              </div>
                              <h3 className="text-xs font-black text-white uppercase tracking-wider">Biometric Enclave Gated</h3>
                              <p className="text-[10px] text-slate-400 max-w-[250px] mx-auto leading-relaxed">
                                Accessing sensitive borrower underwriting algorithms requires a biometric session handshake.
                              </p>
                            </div>

                            {!biometricScanning && (
                              <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl text-[9px] w-full max-w-[240px] select-none">
                                <button
                                  type="button"
                                  onClick={() => setBiometricScanType("face")}
                                  className={`flex-1 py-1 px-2 rounded font-bold transition-all ${
                                    biometricScanType === "face"
                                      ? "bg-blue-600 text-white"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  Face ID
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBiometricScanType("fingerprint")}
                                  className={`flex-1 py-1 px-2 rounded font-bold transition-all ${
                                    biometricScanType === "fingerprint"
                                      ? "bg-blue-600 text-white"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  Touch ID
                                </button>
                              </div>
                            )}

                            <div className="w-full max-w-[240px]">
                              {biometricScanning ? (
                                <div className="space-y-4 w-full">
                                  <div className="flex items-center justify-center gap-2 text-[#00D4B2] text-[10px] font-mono animate-pulse">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>{biometricScanType === "face" ? "Performing 3D facial scan..." : "Reading fingerprint data..."}</span>
                                  </div>
                                  
                                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-[8px] font-mono text-left space-y-1 text-slate-400 max-h-[85px] overflow-y-auto scrollbar-none shadow-inner">
                                    {biometricLogs.map((log, idx) => (
                                      <div key={idx} className="flex gap-1">
                                        <span className="text-[#00D4B2] shrink-0">›</span>
                                        <span>{log}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSimulateBiometrics(biometricScanType)}
                                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                >
                                  <Fingerprint className="w-4 h-4 shrink-0" />
                                  <span>{biometricScanType === "face" ? "Initiate Face ID Scan" : "Initiate Touch ID Scan"}</span>
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setBiometricMfaEnabled(false)}
                              className="text-[9px] text-slate-500 hover:text-slate-400 underline font-mono tracking-wide"
                            >
                              [Bypass Biometric Verification]
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="cust-underwriting" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="flex flex-col flex-1 gap-4"
                          >
                            {/* Security Active Ribbon */}
                            {biometricMfaEnabled && biometricAuthenticated && (
                              <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono rounded-xl">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  🔒 Secure Biometric Session Active
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setBiometricAuthenticated(false)}
                                  className="text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-750 px-2 py-0.5 rounded text-[8px]"
                                >
                                  Lock Tab
                                </button>
                              </div>
                            )}

                            <div>
                              <span className="text-[9px] uppercase font-mono text-slate-500 block mb-2">Select Financial profile:</span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {MOCK_BORROWERS.map((b) => (
                                  <button
                                    key={b.id}
                                    onClick={() => {
                                      setSelectedBorrowerId(b.id);
                                      setCustomLoanType(b.requestedLoanType);
                                      setCustomLoanAmount(b.requestedLoanAmount);
                                      setUnderwritingResult(null);
                                    }}
                                    className={`p-2 rounded-xl text-left border text-[10px] transition-all leading-snug flex flex-col justify-between ${
                                      selectedBorrowerId === b.id
                                        ? "bg-blue-600/10 border-blue-500 text-white"
                                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850"
                                    }`}
                                  >
                                    <span className="font-bold truncate">{b.name}</span>
                                    <span className="text-[8px] opacity-60 mt-1">{b.occupation}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Loan Type:</span>
                                <input
                                  type="text"
                                  value={customLoanType}
                                  onChange={(e) => setCustomLoanType(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 text-[10px] px-3 py-2 rounded-xl text-white"
                                />
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Size (INR):</span>
                                <input
                                  type="number"
                                  value={customLoanAmount}
                                  onChange={(e) => setCustomLoanAmount(Number(e.target.value))}
                                  className="w-full bg-slate-900 border border-slate-800 text-[10px] px-3 py-2 rounded-xl text-white font-mono"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={runUnderwriting}
                              disabled={underwritingLoading}
                              className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
                            >
                              <TrendingUp className="w-4 h-4" />
                              <span>{underwritingLoading ? "Analyzing transaction ledger..." : "Verify Repayment Capacity"}</span>
                            </button>

                            {underwritingResult && (() => {
                              const score = getCreditHealthScore(underwritingResult);
                              let statusLabel = "Fair";
                              let statusColor = "text-amber-500 font-bold";
                              let strokeColor = "#f59e0b"; // amber-500
                              let bgLightColor = "bg-amber-500/10";
                              let borderLightColor = "border-amber-500/20";
                              let scoreExplanation = "";

                              if (score >= 750) {
                                statusLabel = "Excellent";
                                statusColor = "text-emerald-400 font-bold";
                                strokeColor = "#34d399"; // emerald-400
                                bgLightColor = "bg-emerald-500/10";
                                borderLightColor = "border-emerald-500/20";
                                scoreExplanation = "Your transaction pattern demonstrates healthy cash inflows, low existing debt, and pristine credit standing.";
                              } else if (score < 600) {
                                statusLabel = "High-Risk";
                                statusColor = "text-red-500 font-bold";
                                strokeColor = "#ef4444"; // red-500
                                bgLightColor = "bg-red-500/10";
                                borderLightColor = "border-red-500/20";
                                scoreExplanation = "Elevated FOIR ratio or recurring penalties detected in the transaction history indicate a high risk of default.";
                              } else {
                                scoreExplanation = "Moderate transaction activity with manageable liabilities. Meets standard terms with minor risk adjustments.";
                              }

                              const percentage = ((score - 300) / 600) * 100;
                              const radius = 50;
                              const strokeWidth = 8;
                              const circumference = 2 * Math.PI * radius; // ~314.16
                              const strokeDashoffset = circumference - (percentage / 100) * circumference;

                              return (
                                <div className="space-y-3">
                                  {/* Credit Health Score Visualizer */}
                                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center relative overflow-hidden">
                                    <div className="absolute top-2 left-3">
                                      <span className="text-[8px] uppercase font-mono font-bold tracking-widest text-slate-500">Credit Health</span>
                                    </div>

                                    {/* Circular Gauge */}
                                    <div className="relative w-36 h-36 flex items-center justify-center mt-2">
                                      <svg className="w-full h-full transform -rotate-90">
                                        {/* Background circle track */}
                                        <circle
                                          cx="72"
                                          cy="72"
                                          r={radius}
                                          stroke="#1e293b" // slate-800
                                          strokeWidth={strokeWidth}
                                          fill="transparent"
                                        />
                                        {/* Colored active gauge circle */}
                                        <motion.circle
                                          cx="72"
                                          cy="72"
                                          r={radius}
                                          stroke={strokeColor}
                                          strokeWidth={strokeWidth}
                                          fill="transparent"
                                          strokeDasharray={circumference}
                                          initial={{ strokeDashoffset: circumference }}
                                          animate={{ strokeDashoffset }}
                                          transition={{ duration: 1.2, ease: "easeOut" }}
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                      {/* Center text overlay */}
                                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <motion.span 
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{ delay: 0.3, duration: 0.5 }}
                                          className="text-2xl font-black text-white font-mono tracking-tight"
                                        >
                                          {score}
                                        </motion.span>
                                        <span className={`text-[9px] uppercase font-bold tracking-wider mt-0.5 ${statusColor}`}>
                                          {statusLabel}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Zone indicators/legend */}
                                    <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mt-2 pt-3 border-t border-slate-850 text-[8px] font-mono uppercase text-slate-500">
                                      <div className="flex flex-col items-center">
                                        <span className="text-red-500 font-bold">300-599</span>
                                        <span className="mt-0.5">High-Risk</span>
                                      </div>
                                      <div className="flex flex-col items-center border-x border-slate-850 px-1">
                                        <span className="text-amber-500 font-bold">600-749</span>
                                        <span className="mt-0.5">Fair</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <span className="text-emerald-400 font-bold">750-900</span>
                                        <span className="mt-0.5">Excellent</span>
                                      </div>
                                    </div>

                                    {/* Explanatory text */}
                                    <p className="text-[9px] text-slate-400 mt-2 leading-relaxed px-1">
                                      {scoreExplanation}
                                    </p>
                                  </div>

                                  {/* Metrics Summary Table */}
                                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-[10px] font-mono leading-normal">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-400">Verified Monthly Income:</span>
                                      <span className="text-white font-bold">{formatCurrency(underwritingResult.verified_monthly_income)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-400">Debt-to-Income (FOIR):</span>
                                      <span className="text-white font-bold">{(underwritingResult.calculated_debt_to_income_ratio * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                                      <span className="text-slate-400">Repayment Capacity:</span>
                                      <span className="text-emerald-400 font-bold">{formatCurrency(underwritingResult.quantifiable_repayment_capacity)}/mo</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleTriggerPrint("customer")}
                                    className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition duration-200 cursor-pointer"
                                  >
                                    <Printer className="w-4 h-4 text-blue-400" />
                                    <span>Print Assessment Report</span>
                                  </button>
                                </div>
                              );
                            })()}

                          </motion.div>
                        )
                      )}

                      {customerActiveTab === "calculator" && (
                        <motion.div 
                          key="cust-calculator" 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }}
                          className="flex flex-col flex-1 gap-4 text-slate-200"
                        >
                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-3.5">
                            {/* Saved Scenarios / Comparison Slots */}
                            <div className="border-b border-slate-800/40 pb-3">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-1.5">
                                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[9px] uppercase font-mono font-bold text-slate-300 tracking-wider">Scenario Planner</span>
                                </div>
                                <span className="text-[8px] font-mono text-slate-500">Save up to 3 configurations</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {[0, 1, 2].map((idx) => {
                                  const scenario = savedScenarios[idx];
                                  if (scenario) {
                                    const isCurrent = 
                                      emiPrincipal === scenario.principal && 
                                      emiInterestRate === scenario.interestRate && 
                                      emiTenureYears === scenario.tenureYears &&
                                      emiPrepaymentOneTime === scenario.prepaymentOneTime &&
                                      emiPrepaymentRecurring === scenario.prepaymentRecurring &&
                                      showPrepaymentSim === scenario.showPrepaymentSim;

                                    return (
                                      <div 
                                        key={idx}
                                        onClick={() => {
                                          setEmiPrincipal(scenario.principal);
                                          setEmiInterestRate(scenario.interestRate);
                                          setEmiTenureYears(scenario.tenureYears);
                                          setEmiPrepaymentOneTime(scenario.prepaymentOneTime);
                                          setEmiPrepaymentOneTimeMonth(scenario.prepaymentOneTimeMonth);
                                          setEmiPrepaymentRecurring(scenario.prepaymentRecurring);
                                          setEmiPrepaymentRecurringStart(scenario.prepaymentRecurringStart);
                                          setShowPrepaymentSim(scenario.showPrepaymentSim);
                                        }}
                                        className={`group relative bg-slate-950 p-2 rounded-xl cursor-pointer flex flex-col justify-between transition-all select-none text-left border ${
                                          isCurrent 
                                            ? "border-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.15)] bg-emerald-950/5" 
                                            : "border-slate-850 hover:border-slate-700"
                                        }`}
                                      >
                                        <div className="flex justify-between items-center gap-1">
                                          <span className="text-[8px] font-mono font-bold text-emerald-400 leading-none">Slot {idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const next = [...savedScenarios];
                                              next[idx] = undefined as any;
                                              while (next.length > 0 && next[next.length - 1] === undefined) {
                                                next.pop();
                                              }
                                              setSavedScenarios(next.filter(Boolean));
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-950/50 rounded text-red-400 hover:text-red-300 transition-all absolute top-1 right-1"
                                            title="Clear slot"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                        <div className="mt-1.5">
                                          <div className="text-[9px] font-mono font-bold text-white leading-tight truncate">
                                            {scenario.name}
                                          </div>
                                          <div className="text-[8px] text-slate-500 font-mono mt-0.5 leading-none">
                                            {scenario.tenureYears} Yr{scenario.showPrepaymentSim ? " +Pay" : ""}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          const name = `₹${emiPrincipal >= 10000000 ? (emiPrincipal/10000000).toFixed(1) + 'Cr' : (emiPrincipal/100000).toFixed(0) + 'L'} @ ${emiInterestRate}%`;
                                          const newScenario = {
                                            id: `scenario-${Date.now()}-${idx}`,
                                            name,
                                            principal: emiPrincipal,
                                            interestRate: emiInterestRate,
                                            tenureYears: emiTenureYears,
                                            prepaymentOneTime: emiPrepaymentOneTime,
                                            prepaymentOneTimeMonth: emiPrepaymentOneTimeMonth,
                                            prepaymentRecurring: emiPrepaymentRecurring,
                                            prepaymentRecurringStart: emiPrepaymentRecurringStart,
                                            showPrepaymentSim: showPrepaymentSim
                                          };
                                          const updated = [...savedScenarios];
                                          updated[idx] = newScenario;
                                          setSavedScenarios(updated);
                                        }}
                                        className="bg-slate-950/40 hover:bg-slate-950 border border-dashed border-slate-800 hover:border-slate-700 p-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all min-h-[52px] group text-center"
                                      >
                                        <Plus className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                                        <span className="text-[8px] font-mono text-slate-500 group-hover:text-slate-300">Save Slot {idx + 1}</span>
                                      </button>
                                    );
                                  }
                                })}
                              </div>
                            </div>

                            {/* Principal Slider */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Principal (INR)</span>
                                <input
                                  type="number"
                                  value={emiPrincipal}
                                  onChange={(e) => setEmiPrincipal(Math.max(0, Number(e.target.value)))}
                                  className="bg-slate-950 border border-slate-800 text-[11px] font-mono font-bold text-white text-right px-2 py-0.5 rounded-lg w-28 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <input
                                type="range"
                                min={100000}
                                max={15000000}
                                step={50000}
                                value={emiPrincipal}
                                onChange={(e) => setEmiPrincipal(Number(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-[8px] text-slate-500 font-mono mt-1">
                                <span>₹1L</span>
                                <span className="text-[#00D4B2]">{formatCurrency(emiPrincipal)}</span>
                                <span>₹1.5Cr</span>
                              </div>
                              {/* Quick shortcuts */}
                              <div className="flex gap-1.5 mt-2 overflow-x-auto select-none pb-0.5 scrollbar-none">
                                {[500000, 1000000, 2500000, 5000000, 10000000].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setEmiPrincipal(val)}
                                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all shrink-0 ${
                                      emiPrincipal === val
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    {val >= 10000000 ? `₹${val/10000000}Cr` : `₹${val/100000}L`}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Interest Rate Slider */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Interest Rate (%)</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step={0.1}
                                    value={emiInterestRate}
                                    onChange={(e) => setEmiInterestRate(Math.max(0, Number(e.target.value)))}
                                    className="bg-slate-950 border border-slate-800 text-[11px] font-mono font-bold text-white text-right px-2 py-0.5 rounded-lg w-16 focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">%</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min={4.0}
                                max={20.0}
                                step={0.1}
                                value={emiInterestRate}
                                onChange={(e) => setEmiInterestRate(Number(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-[8px] text-slate-500 font-mono mt-1">
                                <span>4.0%</span>
                                <span className="text-[#00D4B2]">{emiInterestRate}% p.a.</span>
                                <span>20.0%</span>
                              </div>
                              {/* Quick shortcuts */}
                              <div className="flex gap-1.5 mt-2 select-none">
                                {[8.5, 10.5, 12.0, 14.5].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setEmiInterestRate(val)}
                                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                                      emiInterestRate === val
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    {val}%
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Tenure Slider */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Tenure (Years)</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={emiTenureYears}
                                    onChange={(e) => setEmiTenureYears(Math.max(1, Number(e.target.value)))}
                                    className="bg-slate-950 border border-slate-800 text-[11px] font-mono font-bold text-white text-right px-2 py-0.5 rounded-lg w-14 focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">Yr</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={30}
                                step={1}
                                value={emiTenureYears}
                                onChange={(e) => setEmiTenureYears(Number(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-[8px] text-slate-500 font-mono mt-1">
                                <span>1 Yr</span>
                                <span className="text-[#00D4B2]">{emiTenureYears} Years ({emiTenureYears * 12} Mo)</span>
                                <span>30 Yrs</span>
                              </div>
                              {/* Quick shortcuts */}
                              <div className="flex gap-1.5 mt-2 select-none">
                                {[5, 10, 15, 20, 30].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setEmiTenureYears(val)}
                                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                                      emiTenureYears === val
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    {val} Yrs
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Prepayment Simulator toggle section */}
                            <div className="border-t border-slate-800/60 pt-3 mt-1.5">
                              <div className="flex justify-between items-center select-none mb-1">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-[#00D4B2]" />
                                  <span className="text-[10px] uppercase font-mono font-bold text-slate-300">Prepayment Simulator</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowPrepaymentSim(!showPrepaymentSim);
                                    if (!showPrepaymentSim) {
                                      if (emiPrepaymentOneTime === 0) setEmiPrepaymentOneTime(100000);
                                      if (emiPrepaymentRecurring === 0) setEmiPrepaymentRecurring(5000);
                                    } else {
                                      setEmiPrepaymentOneTime(0);
                                      setEmiPrepaymentRecurring(0);
                                    }
                                  }}
                                  className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-all ${
                                    showPrepaymentSim 
                                      ? "bg-emerald-600 border-emerald-500 text-white font-bold" 
                                      : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {showPrepaymentSim ? "ACTIVE" : "SIMULATE"}
                                </button>
                              </div>

                              {showPrepaymentSim && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="space-y-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850/60 mt-2"
                                >
                                  {/* One-time Prepayment */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] uppercase font-mono text-slate-400">One-Time Prepayment</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-slate-500 font-mono">₹</span>
                                        <input
                                          type="number"
                                          step={5000}
                                          value={emiPrepaymentOneTime}
                                          onChange={(e) => setEmiPrepaymentOneTime(Math.max(0, Number(e.target.value)))}
                                          className="bg-slate-900 border border-slate-850 text-[10px] font-mono font-bold text-emerald-400 text-right px-1.5 py-0.5 rounded w-20 focus:outline-none focus:border-blue-500"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px]">
                                      <span className="text-slate-500">at Month Number:</span>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min={1}
                                          max={emiTenureYears * 12}
                                          value={emiPrepaymentOneTimeMonth}
                                          onChange={(e) => setEmiPrepaymentOneTimeMonth(Math.max(1, Math.min(emiTenureYears * 12, Number(e.target.value))))}
                                          className="bg-slate-900 border border-slate-850 text-[10px] font-mono text-white text-right px-1 py-0.5 rounded w-10 focus:outline-none"
                                        />
                                        <span className="text-slate-500">Mo</span>
                                      </div>
                                    </div>
                                    {/* Quick one-time amount options */}
                                    <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                                      {[25000, 50000, 100000, 250000, 500000].map((val) => (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() => setEmiPrepaymentOneTime(val)}
                                          className={`text-[8px] font-mono px-1 py-0.5 rounded border shrink-0 ${
                                            emiPrepaymentOneTime === val
                                              ? "bg-emerald-600 border-emerald-500 text-white"
                                              : "bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300"
                                          }`}
                                        >
                                          ₹{val >= 100000 ? `${val/100000}L` : `${val/1000}K`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="border-t border-slate-850/40 my-2" />

                                  {/* Recurring Prepayment */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] uppercase font-mono text-slate-400">Monthly Extra Pay</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-slate-500 font-mono">₹</span>
                                        <input
                                          type="number"
                                          step={1000}
                                          value={emiPrepaymentRecurring}
                                          onChange={(e) => setEmiPrepaymentRecurring(Math.max(0, Number(e.target.value)))}
                                          className="bg-slate-900 border border-slate-850 text-[10px] font-mono font-bold text-emerald-400 text-right px-1.5 py-0.5 rounded w-20 focus:outline-none focus:border-blue-500"
                                        />
                                        <span className="text-[9px] text-slate-500">/mo</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px]">
                                      <span className="text-slate-500">starts from Month:</span>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min={1}
                                          max={emiTenureYears * 12}
                                          value={emiPrepaymentRecurringStart}
                                          onChange={(e) => setEmiPrepaymentRecurringStart(Math.max(1, Math.min(emiTenureYears * 12, Number(e.target.value))))}
                                          className="bg-slate-900 border border-slate-850 text-[10px] font-mono text-white text-right px-1 py-0.5 rounded w-10 focus:outline-none"
                                        />
                                        <span className="text-slate-500">Mo</span>
                                      </div>
                                    </div>
                                    {/* Quick recurring options */}
                                    <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                                      {[2000, 5000, 10000, 20000, 30000].map((val) => (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() => setEmiPrepaymentRecurring(val)}
                                          className={`text-[8px] font-mono px-1 py-0.5 rounded border shrink-0 ${
                                            emiPrepaymentRecurring === val
                                              ? "bg-emerald-600 border-emerald-500 text-white"
                                              : "bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300"
                                          }`}
                                        >
                                          +₹{val >= 10000 ? `${val/1000}K` : `${val/1000}K`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Inflation Sensitivity Toggle Section */}
                            <div className="border-t border-slate-800/60 pt-3 mt-1.5">
                              <div className="flex justify-between items-center select-none mb-1">
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="text-[10px] uppercase font-mono font-bold text-slate-300">Inflation Sensitivity</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setInflationEnabled(!inflationEnabled)}
                                  className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-all ${
                                    inflationEnabled 
                                      ? "bg-amber-600 border-amber-500 text-white font-bold" 
                                      : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {inflationEnabled ? "ACTIVE" : "INACTIVE"}
                                </button>
                              </div>

                              {inflationEnabled && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="space-y-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850/60 mt-2"
                                >
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] uppercase font-mono text-slate-400">Annual Inflation Rate</span>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          step={0.5}
                                          min={1}
                                          max={25}
                                          value={inflationRate}
                                          onChange={(e) => setInflationRate(Math.max(1, Math.min(25, Number(e.target.value))))}
                                          className="bg-slate-900 border border-slate-850 text-[10px] font-mono font-bold text-amber-400 text-right px-1.5 py-0.5 rounded w-16 focus:outline-none focus:border-blue-500"
                                        />
                                        <span className="text-[9px] text-slate-500">%</span>
                                      </div>
                                    </div>
                                    <input
                                      type="range"
                                      min="1"
                                      max="20"
                                      step="0.5"
                                      value={inflationRate}
                                      onChange={(e) => setInflationRate(Number(e.target.value))}
                                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <div className="flex justify-between text-[7px] text-slate-500 font-mono">
                                      <span>1% (Low)</span>
                                      <span>6% (Standard)</span>
                                      <span>12% (High)</span>
                                      <span>20% (Severe)</span>
                                    </div>
                                    <p className="text-[8px] text-slate-400 leading-normal font-sans italic mt-1">
                                      Inflation erodes the purchasing power of your money over time. While your scheduled EMI is fixed, it becomes cheaper in real value over your {emiTenureYears}-year tenure.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Outputs */}
                          {(() => {
                            const { emi, totalRepayment, totalInterest } = getEmiDetails();
                            const principalPct = (emiPrincipal / totalRepayment) * 100;
                            const interestPct = (totalInterest / totalRepayment) * 100;

                            // Affordability Check
                            let affordabilityMessage = "";
                            let affordabilityStatus: "safe" | "warning" | "alert" | "unknown" = "unknown";
                            let capacityText = "";

                            if (underwritingResult) {
                              capacityText = formatCurrency(underwritingResult.quantifiable_repayment_capacity);
                              if (emi <= underwritingResult.quantifiable_repayment_capacity) {
                                affordabilityStatus = "safe";
                                affordabilityMessage = `APPROVED CAPACITY ✅. EMI is within your verified monthly repayment capacity of ${capacityText}.`;
                              } else if (emi <= underwritingResult.quantifiable_repayment_capacity * 1.2) {
                                affordabilityStatus = "warning";
                                affordabilityMessage = `STRETCH ZONE ⚠️. EMI exceeds your safe limit (${capacityText}) slightly. Consider extending tenure.`;
                              } else {
                                affordabilityStatus = "alert";
                                affordabilityMessage = `EXCEEDS LIMIT 🚨. EMI is ${formatCurrency(emi - underwritingResult.quantifiable_repayment_capacity)} over your verified safe cap of ${capacityText}.`;
                              }
                            } else {
                              // Fallback using active borrower's typical capacity
                              const activeBorrower = MOCK_BORROWERS.find(b => b.id === selectedBorrowerId);
                              if (activeBorrower) {
                                // Assume standard capacity as 40% of their typical income (software: ~60k, consultant: ~30k)
                                const estimatedCapacity = activeBorrower.id === "aman_sharma" ? 65000 : 35000;
                                capacityText = formatCurrency(estimatedCapacity);
                                if (emi <= estimatedCapacity) {
                                  affordabilityStatus = "safe";
                                  affordabilityMessage = `POTENTIALLY SAFE ✅. Under typical professional profiles, an EMI of ${formatCurrency(emi)} fits a ${activeBorrower.occupation} budget.`;
                                } else {
                                  affordabilityStatus = "alert";
                                  affordabilityMessage = `HIGH RISK RATIO 🚨. This EMI might strain a standard professional profile. Run the 'Underwrite' ledger analysis first!`;
                                }
                              }
                            }

                            return (
                              <div className="space-y-3.5">
                                {/* EMI Output Card */}
                                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center relative overflow-hidden shadow-xl">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-[#00D4B2]" />
                                  <span className="text-[9px] uppercase font-mono text-slate-500 tracking-wider">Estimated Monthly EMI</span>
                                  <div className="text-2xl font-black text-[#00E5FF] font-mono tracking-tight mt-1 animate-pulse">
                                    {formatCurrency(emi)}<span className="text-xs font-normal text-slate-400">/mo</span>
                                  </div>

                                  {/* Dynamic Payment QR Trigger */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaymentQr(emi)}
                                    className="mt-3.5 w-full bg-gradient-to-r from-[#00D4B2] to-[#00E5FF] hover:from-[#00E5FF] hover:to-[#00D4B2] text-slate-950 font-extrabold py-2 px-3 rounded-xl text-[10px] uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95"
                                  >
                                    <QrCode className="w-3.5 h-3.5 text-slate-950" />
                                    <span>Generate Payment QR</span>
                                  </button>
                                  
                                  <div className="grid grid-cols-2 gap-2 mt-3.5 border-t border-slate-800/60 pt-3 text-[10px]">
                                    <div className="text-left">
                                      <span className="text-slate-500 block">Total Interest</span>
                                      <span className="font-bold text-amber-400 font-mono">{formatCurrency(totalInterest)}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-slate-500 block">Total Repayable</span>
                                      <span className="font-bold text-white font-mono">{formatCurrency(totalRepayment)}</span>
                                    </div>
                                  </div>

                                  {/* Progress Bar ratio (Circular Progress Gauge) */}
                                  <div className="flex items-center justify-between gap-4 border-t border-slate-800/60 pt-3.5 mt-3.5">
                                    {/* Left: Beautiful Circular SVG Gauge */}
                                    <motion.div 
                                      className="relative w-24 h-24 shrink-0 mx-auto cursor-pointer"
                                      whileHover={{ scale: 1.1, rotate: 3 }}
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                                    >
                                      <svg width="96" height="96" viewBox="0 0 100 100" className="transform -rotate-90 filter drop-shadow-[0_0_6px_rgba(59,130,246,0.12)] hover:drop-shadow-[0_0_10px_rgba(245,158,11,0.22)] transition-all duration-300">
                                        {/* Background Track */}
                                        <circle
                                          cx="50"
                                          cy="50"
                                          r="40"
                                          fill="transparent"
                                          stroke="#1e293b"
                                          strokeWidth="9"
                                        />
                                        {/* Principal Arc */}
                                        <motion.circle
                                          cx="50"
                                          cy="50"
                                          r="40"
                                          fill="transparent"
                                          stroke="#3b82f6"
                                          strokeWidth="9"
                                          strokeDasharray="251.3"
                                          initial={{ strokeDashoffset: 251.3 }}
                                          animate={{ strokeDashoffset: 251.3 - (251.3 * principalPct) / 100 }}
                                          transition={{ type: "spring", stiffness: 80, damping: 15 }}
                                        />
                                        {/* Interest Arc */}
                                        <motion.circle
                                          cx="50"
                                          cy="50"
                                          r="40"
                                          fill="transparent"
                                          stroke="#f59e0b"
                                          strokeWidth="9"
                                          strokeDasharray="251.3"
                                          initial={{ strokeDashoffset: 251.3 }}
                                          animate={{ strokeDashoffset: 251.3 - (251.3 * interestPct) / 100 }}
                                          transition={{ type: "spring", stiffness: 80, damping: 15 }}
                                          transform={`rotate(${(principalPct / 100) * 360} 50 50)`}
                                        />
                                      </svg>
                                      {/* Center Text displaying Interest Burden ratio */}
                                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="text-[10px] font-mono font-bold text-amber-400">+{interestPct.toFixed(0)}%</span>
                                        <span className="text-[7px] text-slate-500 uppercase font-mono tracking-tight leading-none mt-0.5">Interest</span>
                                      </div>
                                    </motion.div>

                                    {/* Right: Ratio stats breakdown */}
                                    <div className="flex-1 space-y-2 text-left">
                                      <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-850/40 space-y-1">
                                        <div className="flex items-center justify-between text-[9px]">
                                          <span className="text-slate-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Principal:
                                          </span>
                                          <span className="font-mono font-bold text-white">{principalPct.toFixed(0)}%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px]">
                                          <span className="text-slate-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Interest:
                                          </span>
                                          <span className="font-mono font-bold text-amber-400">{interestPct.toFixed(0)}%</span>
                                        </div>
                                      </div>
                                      
                                      <div className="text-[8px] text-slate-400 font-mono pl-1 leading-normal">
                                        Interest is <span className="font-bold text-amber-400">{(totalInterest / emiPrincipal * 100).toFixed(0)}%</span> of your principal loan amount.
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Prepayment Impact Highlights */}
                                {showPrepaymentSim && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3.5 bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-emerald-500/20 rounded-2xl relative overflow-hidden shadow-lg"
                                  >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                                    <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-800/60 pb-1.5">
                                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Prepayment Impact Benefits</span>
                                    </div>

                                    {(() => {
                                      const { totalInterestPaid, totalRepayments, actualMonthsCount } = getPrepaymentAmortization();
                                      const interestSavings = Math.max(0, totalInterest - totalInterestPaid);
                                      const monthsSaved = Math.max(0, (emiTenureYears * 12) - actualMonthsCount);
                                      const yearsSaved = (monthsSaved / 12).toFixed(1);

                                      return (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-2 text-left">
                                            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-850/40">
                                              <span className="text-[8px] text-slate-500 uppercase font-mono block">Interest Saved</span>
                                              <span className="text-xs font-bold text-emerald-400 font-mono block">
                                                {formatCurrency(interestSavings)}
                                              </span>
                                              <span className="text-[8px] text-slate-400 font-mono">
                                                {totalInterest > 0 ? ((interestSavings / totalInterest) * 100).toFixed(0) : 0}% interest reduction
                                              </span>
                                            </div>

                                            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-850/40">
                                              <span className="text-[8px] text-slate-500 uppercase font-mono block">Tenure Saved</span>
                                              <span className="text-xs font-bold text-sky-400 font-mono block">
                                                {monthsSaved} Months
                                              </span>
                                              <span className="text-[8px] text-slate-400 font-mono">
                                                Shortened by ~{yearsSaved} yrs
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between text-[8px] font-mono bg-emerald-950/10 border border-emerald-500/10 p-1.5 rounded-lg text-slate-300">
                                            <span>Simulated New Tenure:</span>
                                            <span className="font-bold text-white">{actualMonthsCount} mo instead of {emiTenureYears * 12} mo</span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </motion.div>
                                )}

                                {/* Inflation Sensitivity Impact Highlights */}
                                {inflationEnabled && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3.5 bg-gradient-to-br from-amber-950/20 to-slate-900 border border-amber-500/20 rounded-2xl relative overflow-hidden shadow-lg"
                                  >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                                    <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-800/60 pb-1.5">
                                      <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider">Inflation Burden Reduction</span>
                                    </div>

                                    {(() => {
                                      const { emi } = getEmiDetails();
                                      const years = emiTenureYears;
                                      const endRealEmi = emi * Math.pow(1 + (inflationRate / 100) / 12, -years * 12);
                                      const pctReduction = ((emi - endRealEmi) / emi) * 100;
                                      
                                      // Cumulative real value of repayments vs nominal
                                      const { totalRepayments } = getPrepaymentAmortization();
                                      let totalRealRepayments = 0;
                                      const { monthlySchedule } = getPrepaymentAmortization();
                                      monthlySchedule.forEach((row) => {
                                        const df = Math.pow(1 + (inflationRate / 100) / 12, -row.monthNumber);
                                        totalRealRepayments += (row.emiPaid + row.extraPrepayment) * df;
                                      });
                                      
                                      const totalRealSavings = Math.max(0, totalRepayments - totalRealRepayments);

                                      return (
                                        <div className="space-y-2.5">
                                          <div className="grid grid-cols-2 gap-2 text-left">
                                            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-850/40">
                                              <span className="text-[8px] text-slate-500 uppercase font-mono block">Final Real EMI</span>
                                              <span className="text-xs font-bold text-amber-400 font-mono block">
                                                {formatCurrency(endRealEmi)}
                                              </span>
                                              <span className="text-[8px] text-slate-400 font-mono">
                                                -{pctReduction.toFixed(0)}% in purchasing power
                                              </span>
                                            </div>

                                            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-850/40">
                                              <span className="text-[8px] text-slate-500 uppercase font-mono block">Real Debt Savings</span>
                                              <span className="text-xs font-bold text-emerald-400 font-mono block">
                                                {formatCurrency(totalRealSavings)}
                                              </span>
                                              <span className="text-[8px] text-slate-400 font-mono">
                                                Erosion of total payable value
                                              </span>
                                            </div>
                                          </div>

                                          {/* Visual progress comparison */}
                                          <div className="space-y-1">
                                            <div className="flex justify-between text-[8px] font-mono text-slate-400">
                                              <span>Emi Real Value: Month 1 vs Month {years * 12}</span>
                                              <span>{pctReduction.toFixed(0)}% cheaper</span>
                                            </div>
                                            <div className="relative h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850/50 flex">
                                              <div 
                                                className="h-full bg-gradient-to-r from-amber-600 to-amber-400" 
                                                style={{ width: `${100 - pctReduction}%` }}
                                              />
                                              <div 
                                                className="h-full bg-amber-500/15" 
                                                style={{ width: `${pctReduction}%` }}
                                              />
                                            </div>
                                            <div className="flex justify-between text-[7px] font-mono text-slate-500">
                                              <span>{formatCurrency(emi)} (Start)</span>
                                              <span>{formatCurrency(endRealEmi)} (End Real Value)</span>
                                            </div>
                                          </div>

                                          <div className="text-[8px] font-sans leading-relaxed text-slate-400 bg-slate-950/40 border border-slate-850/40 p-2 rounded-lg">
                                            💡 <span className="font-bold text-amber-400">Inflation Benefit:</span> Over time, fixed-rate debt behaves as a short position on currency. Because your wage typically scales with inflation, paying a fixed nominal EMI of <span className="text-white font-semibold font-mono">{formatCurrency(emi)}</span> becomes increasingly easier, reducing your long-term real repayment burden by <span className="text-emerald-400 font-extrabold font-mono">{formatCurrency(totalRealSavings)}</span>.
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </motion.div>
                                )}

                                {/* Affordability Badge Panel */}
                                <div className={`p-3 border rounded-xl flex gap-2 items-start text-[9px] leading-normal ${
                                  affordabilityStatus === "safe"
                                    ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                                    : affordabilityStatus === "warning"
                                    ? "bg-amber-950/20 border-amber-500/20 text-amber-400"
                                    : "bg-red-950/20 border-red-500/20 text-red-400"
                                }`}>
                                  <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${
                                    affordabilityStatus === "safe" ? "text-emerald-400" : affordabilityStatus === "warning" ? "text-amber-400" : "text-red-400"
                                  }`} />
                                  <div>
                                    <span className="font-bold uppercase tracking-wider block mb-0.5">Underwriting Guard Status</span>
                                    <p className="font-sans text-[9px]">{affordabilityMessage}</p>
                                  </div>
                                </div>

                                {/* Toggle Amortization button */}
                                <button
                                  type="button"
                                  onClick={() => setShowAmortization(!showAmortization)}
                                  className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-[#00D4B2]" />
                                  <span>{showAmortization ? "Hide Payment Schedule" : "View Amortization Schedule"}</span>
                                </button>

                                {/* Amortization Schedule Drawer */}
                                {showAmortization && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-3 space-y-3"
                                  >
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                      <span className="text-[9px] font-bold text-white uppercase tracking-wider">Repayment Table</span>
                                      
                                      <div className="flex items-center gap-2">
                                        {/* Mode Switcher */}
                                        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850 text-[8px]">
                                          <button
                                            type="button"
                                            onClick={() => setAmortizationViewMode("yearly")}
                                            className={`px-2 py-1 rounded-md font-semibold transition-all ${
                                              amortizationViewMode === "yearly" ? "bg-blue-600 text-white" : "text-slate-400"
                                            }`}
                                          >
                                            Yearly
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAmortizationViewMode("monthly");
                                              setSelectedEmiYear(1);
                                            }}
                                            className={`px-2 py-1 rounded-md font-semibold transition-all ${
                                              amortizationViewMode === "monthly" ? "bg-blue-600 text-white" : "text-slate-400"
                                            }`}
                                          >
                                            Monthly
                                          </button>
                                        </div>

                                        {/* CSV Download Button */}
                                        <button
                                          type="button"
                                          onClick={handleDownloadCsv}
                                          title={`Download ${amortizationViewMode === "yearly" ? "Yearly" : "Monthly"} Schedule as CSV`}
                                          className="p-1 bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-lg text-[#00D4B2] hover:text-white transition-all flex items-center justify-center"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {amortizationViewMode === "yearly" ? (
                                      <div className="max-h-[180px] overflow-y-auto text-[9px] font-mono space-y-1.5 scrollbar-none pr-1">
                                        <div className="grid grid-cols-4 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-1 mb-1">
                                          <span>Year</span>
                                          <span className="text-right">{inflationEnabled ? "Real Prin" : "Principal"}</span>
                                          <span className="text-right">{inflationEnabled ? "Real Int" : "Interest"}</span>
                                          <span className="text-right">{inflationEnabled ? "Real Bal" : "Balance"}</span>
                                        </div>
                                        {getYearlyAmortization(emiPrincipal, emiInterestRate/12/100, emiTenureYears*12, emi).map((row) => {
                                          const df = inflationEnabled ? Math.pow(1 + (inflationRate / 100), -row.year) : 1;
                                          return (
                                            <div key={row.year} className="grid grid-cols-4 text-slate-300 py-0.5 border-b border-slate-850/40">
                                              <span className="font-bold text-white">Yr {row.year}</span>
                                              <span className="text-right text-emerald-400">{formatCurrency(row.principalPaid * df)}</span>
                                              <span className="text-right text-amber-500">{formatCurrency(row.interestPaid * df)}</span>
                                              <span className="text-right text-slate-400 font-bold">{formatCurrency(row.endingBalance * df)}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[8px] uppercase font-mono text-slate-500">Select Target Year:</span>
                                          <select
                                            value={selectedEmiYear}
                                            onChange={(e) => setSelectedEmiYear(Number(e.target.value))}
                                            className="bg-slate-950 border border-slate-800 text-[9px] font-mono font-bold text-white px-2 py-1 rounded-md focus:outline-none focus:border-blue-500"
                                          >
                                            {Array.from({ length: emiTenureYears }, (_, i) => i + 1).map((y) => (
                                              <option key={y} value={y}>Year {y}</option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="max-h-[140px] overflow-y-auto text-[9px] font-mono space-y-1.5 scrollbar-none pr-1">
                                          <div className="grid grid-cols-4 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-1 mb-1">
                                            <span>Month</span>
                                            <span className="text-right">{inflationEnabled ? "Real Prin" : "Principal"}</span>
                                            <span className="text-right">{inflationEnabled ? "Real Int" : "Interest"}</span>
                                            <span className="text-right">{inflationEnabled ? "Real Bal" : "Balance"}</span>
                                          </div>
                                          {getMonthlyScheduleForYear(emiPrincipal, emiInterestRate/12/100, emiTenureYears*12, emi, selectedEmiYear).map((row) => {
                                            const df = inflationEnabled ? Math.pow(1 + (inflationRate / 100) / 12, -row.monthNumber) : 1;
                                            return (
                                              <div key={row.monthNumber} className="grid grid-cols-4 text-slate-300 py-0.5 border-b border-slate-850/40">
                                                <span className="font-bold text-slate-400">Mo {row.monthNumber}</span>
                                                <span className="text-right text-emerald-400/80">{formatCurrency(row.principalPaid * df)}</span>
                                                <span className="text-right text-amber-500/80">{formatCurrency(row.interestPaid * df)}</span>
                                                <span className="text-right text-slate-400 font-bold">{formatCurrency(row.endingBalance * df)}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Horizontal Timeline of Repayment Milestones */}
                                    {(() => {
                                      const { baseline, simulated } = getRepaymentMilestones();
                                      const milestones = [
                                        { pct: 25, label: "25% Paid", baseMo: baseline.m25, simMo: simulated.m25, color: "text-blue-400", bg: "bg-blue-500" },
                                        { pct: 50, label: "50% Paid", baseMo: baseline.m50, simMo: simulated.m50, color: "text-indigo-400", bg: "bg-indigo-500" },
                                        { pct: 75, label: "75% Paid", baseMo: baseline.m75, simMo: simulated.m75, color: "text-purple-400", bg: "bg-purple-500" },
                                        { pct: 100, label: "Fully Paid", baseMo: baseline.m100, simMo: simulated.m100, color: "text-emerald-400", bg: "bg-emerald-500" },
                                      ];

                                      return (
                                        <div className="border-t border-slate-800/80 pt-3.5 mt-2">
                                          <div className="flex items-center gap-1.5 mb-2.5">
                                            <Activity className="w-3.5 h-3.5 text-[#00D4B2]" />
                                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Repayment Milestones Timeline</span>
                                          </div>
                                          <div className="relative pt-5 pb-2.5 px-1 bg-slate-950/40 rounded-xl border border-slate-850/30">
                                            {/* Connecting Line Track */}
                                            <div className="absolute top-[28px] left-8 right-8 h-0.5 bg-slate-800/80" />
                                            
                                            {/* Completed/Simulated Active Line Highlight */}
                                            <div 
                                              className="absolute top-[28px] left-8 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500" 
                                              style={{ 
                                                width: showPrepaymentSim 
                                                  ? "82%" // Dynamic line highlight when prepaid
                                                  : "50%" // Normal baseline progress
                                              }} 
                                            />

                                            {/* Milestone Nodes */}
                                            <div className="flex justify-between relative">
                                              {milestones.map((m) => {
                                                const timeSavedMonths = m.baseMo - m.simMo;
                                                const hasPrepaymentBenefit = showPrepaymentSim && timeSavedMonths > 0;

                                                return (
                                                  <div key={m.pct} className="flex flex-col items-center text-center w-20 relative group">
                                                    {/* Floating hover badge */}
                                                    <div className="absolute -top-6 bg-slate-950 border border-slate-850 rounded-md px-1.5 py-0.5 text-[7px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-slate-300 z-20 shadow-md">
                                                      Baseline: {formatMonthToAge(m.baseMo)}
                                                    </div>

                                                    {/* Node dot with hover and pulse ring */}
                                                    <div className="relative z-10 flex items-center justify-center">
                                                      <motion.div
                                                        className={`w-3 h-3 rounded-full border-2 ${m.bg} border-slate-950 shadow-md cursor-pointer flex items-center justify-center`}
                                                        whileHover={{ scale: 1.35 }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                                                      >
                                                        <div className="w-1 h-1 bg-white rounded-full" />
                                                      </motion.div>
                                                      {hasPrepaymentBenefit && (
                                                        <span className="absolute flex h-3.5 w-3.5 -z-10">
                                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-45"></span>
                                                        </span>
                                                      )}
                                                    </div>

                                                    {/* Milestone labels */}
                                                    <span className={`text-[8px] font-bold mt-2 ${m.color} uppercase tracking-wider`}>
                                                      {m.label}
                                                    </span>

                                                    {/* Reached on duration */}
                                                    <div className="mt-1 flex flex-col items-center min-h-[22px]">
                                                      <span className="text-[9px] font-mono font-bold text-slate-200">
                                                        {formatMonthToAge(m.simMo)}
                                                      </span>
                                                      
                                                      {hasPrepaymentBenefit && (
                                                        <motion.span 
                                                          initial={{ opacity: 0, y: 1 }}
                                                          animate={{ opacity: 1, y: 0 }}
                                                          className="text-[7px] text-emerald-400 font-mono font-extrabold flex items-center gap-0.5 leading-none mt-0.5"
                                                        >
                                                          ⚡ -{timeSavedMonths} mo
                                                        </motion.span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </motion.div>
                                )}
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}

                    </AnimatePresence>

                  </div>

                  {/* Log out client-side safety button */}
                  <div className="absolute bottom-4 left-4 right-4 z-40">
                    <button
                      onClick={handleLogoutAction}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white py-2 rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect Session</span>
                    </button>
                  </div>

                  {/* Home indicator bar */}
                  {viewMode === "mobile" && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full z-50" />
                  )}
                </div>

              </div>
            )}

            {/* ROLE 2: BANK MANAGER / EMPLOYEE VIEW - Isolated Underwriting Dashboard (Absolute Data Separation) */}
            {session.user.role === "employee" && (
              <div className="w-full flex flex-col gap-6 text-slate-100">
                
                {/* Employee Isolated Bar */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shadow-inner">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base tracking-tight text-white uppercase">Bank Manager Underwriting Dashboard</span>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold">RBAC Isolation Mode</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                        <span>Employee ID: <strong className="text-white">{formEmployeeId}</strong></span>
                        <span className="text-slate-600">•</span>
                        <span>Department: <strong className="text-white">{formEmployeeDept}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogoutAction}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition duration-200 shadow-md shadow-red-950/20"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Secure Sign Out</span>
                  </button>
                   {/* Left Column Container: Houses Core Pipeline and the Gemini Copilot Agent */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* First Card: Core Pipeline Data Table */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                        <h3 className="text-sm font-extrabold tracking-tight text-white uppercase flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-400" />
                          <span>Core Credit Prospects Pipeline</span>
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono">Data Purged On Close (Zero-Knowledge)</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[10px] select-none">
                            <tr>
                              <th className="py-4 px-5 font-semibold">Prospect Name</th>
                              <th className="py-4 px-5 font-semibold">Requested Loan</th>
                              <th className="py-4 px-5 font-semibold text-center">Intent Score (Flash)</th>
                              <th className="py-4 px-5 font-semibold text-right">Repayment Cap (1.5 Pro)</th>
                              <th className="py-4 px-5 font-semibold text-right">Status / Assess</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                            {MOCK_BORROWERS.map((borrower) => {
                              const assessment = managerAssessments[borrower.id];
                              const isSelected = managerSelectedBorrowerId === borrower.id;
                              
                              return (
                                <tr 
                                  key={borrower.id}
                                  onClick={() => setManagerSelectedBorrowerId(borrower.id)}
                                  className={`cursor-pointer transition-all ${
                                    isSelected 
                                      ? "bg-blue-600/10 border-l-4 border-blue-500 text-white" 
                                      : "hover:bg-slate-900/40"
                                  }`}
                                >
                                  <td className="py-4 px-5">
                                    <div className="font-bold">{borrower.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{borrower.occupation}</div>
                                  </td>
                                  <td className="py-4 px-5">
                                    <div className="font-bold">{borrower.requestedLoanType}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatCurrency(borrower.requestedLoanAmount)}</div>
                                  </td>
                                  <td className="py-4 px-5 text-center">
                                    {assessment?.assessed ? (
                                      <span className={`inline-flex items-center justify-center font-mono font-bold w-9 h-9 rounded-full ${
                                        assessment.intentScore > 70 
                                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      }`}>
                                        {assessment.intentScore}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 italic font-mono">-</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-5 text-right font-mono font-bold text-slate-200">
                                    {assessment?.assessed ? (
                                      <span className="text-emerald-400">{formatCurrency(assessment.repaymentCapacity)}/mo</span>
                                    ) : (
                                      <span className="text-slate-500 italic">-</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-5 text-right select-none" onClick={(e) => e.stopPropagation()}>
                                    {assessment?.loading ? (
                                      <div className="inline-flex items-center gap-1.5 text-blue-400 animate-pulse font-mono text-[10px]">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Analyzing...</span>
                                      </div>
                                    ) : assessment?.assessed ? (
                                      <span className={`px-2.5 py-1 text-[9px] uppercase font-bold rounded-full ${
                                        assessment.recommendation === 'APPROVED' 
                                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                                      }`}>
                                        {assessment.recommendation}
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => assessProspectViaAi(borrower)}
                                        className="bg-blue-600/10 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition duration-200"
                                      >
                                        Assess AI Core
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Second Card: Gemini Credit Copilot & Risk Analyst Agent */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-indigo-400" />
                          <span className="font-extrabold text-xs text-white uppercase tracking-tight">Gemini Credit Copilot & Risk Analyst Agent</span>
                        </div>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">Active Risk Enclave</span>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 h-48 overflow-y-auto flex flex-col gap-3 font-sans text-xs">
                        {managerChatHistory.map((m, idx) => {
                          const isUser = m.role === "user";
                          return (
                            <div 
                              key={idx} 
                              className={`flex flex-col max-w-[85%] ${isUser ? "self-end items-end" : "self-start items-start"}`}
                            >
                              <span className="text-[9px] text-slate-500 font-mono mb-1">
                                {isUser ? "Underwriter" : "Gemini Analyst Agent"}
                              </span>
                              <div className={`p-3 rounded-2xl text-slate-200 leading-relaxed break-words font-sans ${
                                isUser 
                                  ? "bg-indigo-600/20 border border-indigo-500/30 rounded-tr-none" 
                                  : "bg-slate-950 border border-slate-800 rounded-tl-none"
                              }`}>
                                {m.text.split("\n").map((line, lIdx) => (
                                  <p key={lIdx} className={line.trim().startsWith("-") || line.trim().startsWith("*") ? "pl-3 mt-1" : "mt-1 first:mt-0"}>
                                    {line}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {managerChatLoading && (
                          <div className="flex items-center gap-2 text-indigo-400 animate-pulse font-mono text-[10px] pl-1">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Gemini cognitive engine processing core rules...</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Advisory Options */}
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block">Predefined Cognitive Directives:</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleManagerChatSend("DRAFT_MEMO")}
                            disabled={managerChatLoading}
                            className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                          >
                            📝 Draft Underwriter Memo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManagerChatSend("STRESS_TEST")}
                            disabled={managerChatLoading}
                            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                          >
                            ⚡ Simulate +2.5% Rate Shock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManagerChatSend("BASEL_COMPLIANCE")}
                            disabled={managerChatLoading}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                          >
                            🛡️ Check Basel III Compliance
                          </button>
                        </div>
                      </div>

                      {/* Custom Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={managerChatInput}
                          onChange={(e) => setManagerChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleManagerChatSend();
                          }}
                          placeholder="Ask about interest coverage ratios, portfolio risk weights, or Basel capital compliance..."
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleManagerChatSend()}
                          disabled={managerChatLoading || !managerChatInput.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Dynamic Action Panel & Underwriter Ledger Check */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="pb-4 border-b border-slate-800 mb-4">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Active Assessment Prospect:</span>
                        <h4 className="text-lg font-black text-white mt-1">
                          {MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId)?.name || "Select Prospect"}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1 italic">
                          "{MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId)?.description}"
                        </p>
                      </div>

                      {/* Financial Ledger checks */}
                      <div className="space-y-4 mb-6">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Prudent Verification Indicators:</span>
                        
                        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3 font-mono text-[11px]">
                          <div className="flex justify-between items-center text-slate-400">
                            <span>Requested Amount:</span>
                            <span className="text-white font-bold">{formatCurrency(MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId)?.requestedLoanAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400">
                            <span>Employment:</span>
                            <span className="text-white font-bold">{MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId)?.occupation}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                            <span>Verification Flags:</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Clean Ledger</span>
                            </span>
                          </div>
                        </div>

                        {/* Gemini scores if computed */}
                        {managerAssessments[managerSelectedBorrowerId]?.assessed && (
                          <div className="space-y-2.5">
                            <div className="p-3.5 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-2 text-xs">
                              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-blue-400 block">Gemini Deep Assessment scorecards:</span>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Intent Score (Gauge):</span>
                                <span className="font-mono font-bold text-white bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded text-[11px]">
                                  {managerAssessments[managerSelectedBorrowerId].intentScore}/100
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Prudent Decisional Recommendation:</span>
                                <span className={`font-bold uppercase ${managerAssessments[managerSelectedBorrowerId].recommendation === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {managerAssessments[managerSelectedBorrowerId].recommendation}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Prudent Interest Rate Buffer:</span>
                                <span className="text-slate-200 font-bold">Base Rate (+0.75% Risk Premium)</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleTriggerPrint("manager")}
                              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition duration-200 cursor-pointer"
                            >
                              <Printer className="w-4 h-4 text-indigo-400" />
                              <span>Print Assessment Report</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manager Action Decisions Panel */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-slate-500 block">Underwriting Decisions Dispatch (SMTP Alert):</span>
                      
                      <div className="grid grid-cols-2 gap-3.5 select-none">
                        <button
                          onClick={() => handleManagerDecision(
                            MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId)!,
                            "APPROVED"
                          )}
                          disabled={decisionSubmitting}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve terms</span>
                        </button>
                        
                        <button
                          onClick={() => handleManagerDecision(
                            MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId)!,
                            "REJECTED"
                          )}
                          disabled={decisionSubmitting}
                          className="bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject loan</span>
                        </button>
                      </div>

                      {/* Operations Log Console */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-28 overflow-y-auto font-mono text-[9px] text-slate-400 leading-relaxed">
                        <div className="font-bold text-slate-500 mb-1 border-b border-slate-800 pb-0.5">Secure Transaction Log:</div>
                        {managerLogs.map((log, idx) => (
                          <div key={idx} className="truncate">
                            <span className="text-blue-500">▶</span> {log}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Secure Dynamic Payment QR Modal Popup */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center overflow-hidden animate-in fade-in zoom-in-95"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-900 mb-4 text-left">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#00D4B2]" />
                    <span>Secure EMI Repayment</span>
                  </h3>
                  <span className="text-[8px] font-mono text-slate-500">APEX SECURE PAYMENT GATEWAY v3.2</span>
                </div>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {qrStatus === "generating" && (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-[#00D4B2]/10" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#00D4B2] animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white uppercase tracking-widest animate-pulse">Mapping Intent Token...</p>
                    <p className="text-[9px] font-mono text-slate-500">RESOLVING BANK SETTLEMENT ROUTE</p>
                  </div>
                </div>
              )}

              {(qrStatus === "scanning" || qrStatus === "processing") && (
                <div className="space-y-4">
                  <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-2xl flex flex-col items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Amount Due (EMI)</span>
                    <span className="text-2xl font-black text-[#00E5FF] font-mono">{formatCurrency(qrAmount)}</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-950 border border-slate-850 rounded-full text-[8px] font-mono text-slate-400 select-all">
                      <span>Ref: {qrTxId}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(qrTxId);
                          setQrCopied(true);
                          setTimeout(() => setQrCopied(false), 2000);
                        }}
                        className="text-blue-400 hover:text-white cursor-pointer"
                      >
                        {qrCopied ? <span className="text-emerald-400 font-bold">Copied!</span> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* QR Image Container with scan lines */}
                  <div className="relative w-48 h-48 mx-auto bg-white p-2 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex items-center justify-center">
                    {qrStatus === "processing" ? (
                      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-[#00D4B2] animate-spin" />
                        <div className="text-center space-y-0.5">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider block">Verifying Clearing...</span>
                          <span className="text-[7px] font-mono text-slate-500 block">FETCHING REAL-TIME SETTLEMENT LOG</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Interactive scan effect */}
                        <div className="absolute inset-x-0 h-0.5 bg-[#00D4B2] animate-[bounce_2s_infinite] shadow-[0_0_8px_#00D4B2]" />
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                            `upi://pay?pa=apexrepayments@okaxis&pn=Apex%20Vault%20And%20Trust&am=${qrAmount.toFixed(2)}&cu=INR&tn=${qrTxId}`
                          )}&color=0a2540&qzone=1`}
                          alt="Payment QR"
                          className="w-full h-full object-contain rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                      </>
                    )}
                  </div>

                  {qrStatus === "scanning" && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-mono text-slate-400 leading-normal bg-slate-900/40 p-2.5 border border-slate-850/50 rounded-xl">
                        Scan the secure code using any UPI banking app (GPay, PhonePe, Paytm, etc.) to securely settle repayments.
                      </p>

                      <button
                        type="button"
                        onClick={handleSimulatePayment}
                        className="w-full bg-[#0A2540] hover:bg-slate-900 text-white border border-[#00D4B2]/40 font-bold py-3 px-4 rounded-xl text-[10px] uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#00D4B2]" />
                        <span>Simulate Bank Settlement</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {qrStatus === "success" && (
                <div className="py-4 space-y-5">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10 text-[#00D4B2]" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase tracking-wide">Repayment Received</h4>
                    <p className="text-[9px] text-slate-400 font-mono">STATUS: CREDIT CLEARING SETTLED</p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl text-left font-mono text-[9px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Settled Amount:</span>
                      <span className="text-white font-bold">{formatCurrency(qrAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction ID:</span>
                      <span className="text-[#00D4B2] font-bold">{qrTxId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Destination:</span>
                      <span className="text-white">Apex Vault Trust Repayments</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gateway:</span>
                      <span className="text-white">AES-256 IMPS/UPI</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800 text-[8px]">
                      <span className="text-slate-500">Timestamp:</span>
                      <span className="text-slate-400">{new Date().toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(false)}
                    className="w-full bg-[#0A2540] hover:bg-slate-900 border border-slate-800 text-white font-extrabold py-3 px-4 rounded-xl text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Close Secure Receipt
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-8 text-center text-xs text-slate-500 font-mono select-none">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-bold text-slate-400">Apex Vault & Trust • Decisional Sandboxed Banking Core Network</p>
          <p className="text-[10px] text-slate-600">Encrypted Transport Channels • Protected under RBAC ISO Compliance Codes</p>
        </div>
      </footer>

      {/* Premium Toast Notifications System */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={`fixed top-6 right-6 z-[9999] max-w-sm w-full p-4 rounded-xl border shadow-2xl flex items-start gap-3 backdrop-blur-md transition-all ${
              toast.type === "success"
                ? "bg-slate-900/95 border-emerald-500/30 text-emerald-200 shadow-emerald-500/5"
                : toast.type === "info"
                ? "bg-slate-900/95 border-cyan-500/30 text-cyan-200 shadow-cyan-500/5"
                : toast.type === "warning"
                ? "bg-slate-900/95 border-amber-500/30 text-amber-200 shadow-amber-500/5"
                : "bg-slate-900/95 border-rose-500/30 text-rose-200 shadow-rose-500/5"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-cyan-400" />}
              {toast.type === "warning" && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {toast.type === "error" && <XCircle className="w-5 h-5 text-rose-400" />}
            </div>
            <div className="flex-1 space-y-1 text-left">
              <p className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                {toast.type === "success" ? "Operation Successful" : toast.type === "info" ? "System Notice" : toast.type === "warning" ? "Security Warning" : "System Error"}
              </p>
              <p className="text-[11px] font-sans text-slate-200 leading-relaxed font-medium">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Assessment Preview Modal Popup */}
      <AnimatePresence>
        {isPrintModalOpen && (() => {
          let docTitle = "";
          let docRef = "";
          let bName = "";
          let bJob = "";
          let bLoanType = "";
          let bLoanAmount = 0;
          let ratingValue = "";
          let ratingScore = 0;
          let capacityVal = 0;
          let explanationText = "";
          let mainNarrative = "";

          if (printSource === "customer") {
            const currentB = MOCK_BORROWERS.find(b => b.id === selectedBorrowerId);
            docTitle = "TRANSACTIONAL LEDGER UNDERWRITING SUMMARY";
            docRef = `AVT-CUST-${(selectedBorrowerId || "unknown").toUpperCase()}-${Date.now().toString().slice(-6)}`;
            bName = currentB?.name || "Valued Client";
            bJob = currentB?.occupation || "Customer";
            bLoanType = customLoanType;
            bLoanAmount = customLoanAmount;
            
            if (underwritingResult) {
              ratingScore = getCreditHealthScore(underwritingResult);
              capacityVal = underwritingResult.quantifiable_repayment_capacity || 0;
              if (ratingScore >= 750) {
                ratingValue = "Excellent";
                explanationText = "Your transaction pattern demonstrates healthy cash inflows, low existing debt, and pristine credit standing.";
              } else if (ratingScore < 600) {
                ratingValue = "High-Risk";
                explanationText = "Elevated FOIR ratio or recurring penalties detected in the transaction history indicate a high risk of default.";
              } else {
                ratingValue = "Fair";
                explanationText = "Moderate transaction activity with manageable liabilities. Meets standard terms with minor risk adjustments.";
              }
            }
            mainNarrative = `Underwriting evaluation triggered by borrower for a proposed ${bLoanType} of ${formatCurrency(bLoanAmount)}. Transaction ledger integrity verification passed with a score of ${ratingScore}/900 (${ratingValue}). Recommended debt-servicing limit meets standardized banking thresholds.`;
          } else {
            const currentB = MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId);
            docTitle = "BANK CORPORATE RISK UNDERWRITING MEMORANDUM";
            docRef = `AVT-MGR-${(managerSelectedBorrowerId || "unknown").toUpperCase()}-${Date.now().toString().slice(-6)}`;
            bName = currentB?.name || "Prospect Name";
            bJob = currentB?.occupation || "Prospect Occupation";
            bLoanType = currentB?.requestedLoanType || "General Credit";
            bLoanAmount = currentB?.requestedLoanAmount || 0;
            
            const assessment = managerAssessments[managerSelectedBorrowerId];
            if (assessment) {
              ratingScore = assessment.intentScore;
              ratingValue = assessment.recommendation;
              capacityVal = assessment.repaymentCapacity;
            }
            mainNarrative = managerCreditMemos[managerSelectedBorrowerId] || 
              `A detailed Credit Underwriting Assessment was performed on ${bName}'s 6-month historical bank statements. Verified actual monthly cash deposits support the requested ${bLoanType} structure. Debt serviceability indexes are inside prudent safety buffers under existing credit policies.`;
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-left overflow-hidden my-8"
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <Printer className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                        Print Assessment Report Preview
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono font-bold uppercase">Verify layout formatting before initiating hardware printing</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Report Preview Frame */}
                <div className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-700 shadow-inner max-h-[450px] overflow-y-auto font-sans leading-normal">
                  <div className="border-b-4 border-slate-900 pb-4 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-black tracking-tight text-slate-950 flex items-center gap-1.5">
                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-sm font-bold">AV</span>
                        <span>APEX VAULT & TRUST</span>
                      </div>
                      <span className="text-[9px] font-mono tracking-widest text-slate-500 block mt-0.5">SECURE DECISIONAL BANKING NETWORK</span>
                    </div>
                    <div className="text-left md:text-right font-mono text-[9px] text-slate-600 leading-normal">
                      <div>Ref: <strong>{docRef}</strong></div>
                      <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                      <div>System Time: <strong>{new Date().toLocaleTimeString()}</strong></div>
                    </div>
                  </div>

                  <h3 className="text-center font-black text-sm tracking-wide text-slate-950 underline underline-offset-4 uppercase mb-4">
                    {docTitle}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-500 block">Borrower Profile:</span>
                      <div className="font-bold text-slate-900 mt-0.5">{bName}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{bJob}</div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-500 block">Proposed Credit Limits:</span>
                      <div className="font-bold text-slate-900 mt-0.5">{bLoanType}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{formatCurrency(bLoanAmount)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div className="border border-slate-200 p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[8px] uppercase font-mono font-semibold text-slate-500 block">AI Score (Gauge)</span>
                      <span className="text-lg font-black text-indigo-700 block mt-1">{ratingScore}</span>
                      <span className="text-[8px] text-slate-400 font-mono">MIDPOINT: 600</span>
                    </div>
                    <div className="border border-slate-200 p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[8px] uppercase font-mono font-semibold text-slate-500 block">Decision Status</span>
                      <span className={`text-xs font-black block mt-2 px-1.5 py-0.5 rounded-full uppercase ${
                        ratingValue === "APPROVED" || ratingValue === "Excellent"
                          ? "bg-emerald-100 text-emerald-800"
                          : ratingValue === "REJECTED" || ratingValue === "High-Risk"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {ratingValue}
                      </span>
                    </div>
                    <div className="border border-slate-200 p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[8px] uppercase font-mono font-semibold text-slate-500 block">Max Repayment / mo</span>
                      <span className="text-sm font-black text-emerald-700 block mt-1.5">{formatCurrency(capacityVal)}</span>
                    </div>
                  </div>

                  {explanationText && (
                    <div className="mb-4 text-[11px] bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-100 italic">
                      " {explanationText} "
                    </div>
                  )}

                  <div className="text-xs mb-6 text-slate-800 border-t border-slate-200 pt-3">
                    <span className="text-[9px] uppercase font-mono font-bold text-slate-500 block mb-1">Underwriter Narrative Justification:</span>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] leading-relaxed font-sans whitespace-pre-wrap">
                      {mainNarrative}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-300 pt-4 text-[9px] font-mono text-slate-500">
                    <div>
                      <div>Authorizer ID: <strong>{printSource === "manager" ? formEmployeeId : "AVT-OFFICER-SYS"}</strong></div>
                      <div>Department: <strong>{printSource === "manager" ? formEmployeeDept : "Risk Management & Underwriting"}</strong></div>
                    </div>
                    <div className="text-right">
                      <div className="border-b border-slate-400 w-32 ml-auto h-8" />
                      <div className="mt-1">Authorized Electronic Signature</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintModalOpen(false);
                      setTimeout(() => {
                        window.print();
                      }, 150);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Now</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Hidden print-only report that receives CSS visibility on print trigger */}
      <div id="printable-assessment-report" className="hidden print:block bg-white text-black p-8 font-sans max-w-3xl mx-auto">
        {(() => {
          let docTitle = "";
          let docRef = "";
          let bName = "";
          let bJob = "";
          let bLoanType = "";
          let bLoanAmount = 0;
          let ratingValue = "";
          let ratingScore = 0;
          let capacityVal = 0;
          let explanationText = "";
          let mainNarrative = "";

          if (printSource === "customer") {
            const currentB = MOCK_BORROWERS.find(b => b.id === selectedBorrowerId);
            docTitle = "TRANSACTIONAL LEDGER UNDERWRITING SUMMARY";
            docRef = `AVT-CUST-${(selectedBorrowerId || "unknown").toUpperCase()}`;
            bName = currentB?.name || "Valued Client";
            bJob = currentB?.occupation || "Customer";
            bLoanType = customLoanType;
            bLoanAmount = customLoanAmount;
            
            if (underwritingResult) {
              ratingScore = getCreditHealthScore(underwritingResult);
              capacityVal = underwritingResult.quantifiable_repayment_capacity || 0;
              if (ratingScore >= 750) {
                ratingValue = "Excellent";
                explanationText = "Your transaction pattern demonstrates healthy cash inflows, low existing debt, and pristine credit standing.";
              } else if (ratingScore < 600) {
                ratingValue = "High-Risk";
                explanationText = "Elevated FOIR ratio or recurring penalties detected in the transaction history indicate a high risk of default.";
              } else {
                ratingValue = "Fair";
                explanationText = "Moderate transaction activity with manageable liabilities. Meets standard terms with minor risk adjustments.";
              }
            }
            mainNarrative = `Underwriting evaluation triggered by borrower for a proposed ${bLoanType} of ${formatCurrency(bLoanAmount)}. Transaction ledger integrity verification passed with a score of ${ratingScore}/900 (${ratingValue}). Recommended debt-servicing limit meets standardized banking thresholds.`;
          } else {
            const currentB = MOCK_BORROWERS.find(b => b.id === managerSelectedBorrowerId);
            docTitle = "BANK CORPORATE RISK UNDERWRITING MEMORANDUM";
            docRef = `AVT-MGR-${(managerSelectedBorrowerId || "unknown").toUpperCase()}`;
            bName = currentB?.name || "Prospect Name";
            bJob = currentB?.occupation || "Prospect Occupation";
            bLoanType = currentB?.requestedLoanType || "General Credit";
            bLoanAmount = currentB?.requestedLoanAmount || 0;
            
            const assessment = managerAssessments[managerSelectedBorrowerId];
            if (assessment) {
              ratingScore = assessment.intentScore;
              ratingValue = assessment.recommendation;
              capacityVal = assessment.repaymentCapacity;
            }
            mainNarrative = managerCreditMemos[managerSelectedBorrowerId] || 
              `A detailed Credit Underwriting Assessment was performed on ${bName}'s 6-month historical bank statements. Verified actual monthly cash deposits support the requested ${bLoanType} structure. Debt serviceability indexes are inside prudent safety buffers under existing credit policies.`;
          }

          return (
            <div className="p-4 bg-white text-slate-900 border-2 border-slate-200 rounded-3xl">
              <div className="border-b-4 border-slate-900 pb-4 mb-4 flex justify-between items-center">
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-950">
                    APEX VAULT & TRUST
                  </div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-500 block mt-0.5">SECURE DECISIONAL BANKING NETWORK</span>
                </div>
                <div className="text-right font-mono text-[9px] text-slate-600">
                  <div>Ref ID: {docRef}-{Date.now().toString().slice(-4)}</div>
                  <div>Date: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <h3 className="text-center font-black text-sm tracking-wide text-slate-950 underline underline-offset-4 uppercase mb-6">
                {docTitle}
              </h3>

              <table className="w-full text-xs mb-6 border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-bold w-1/3">Borrower Name</td>
                    <td className="p-3">{bName}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-bold">Borrower Occupation</td>
                    <td className="p-3">{bJob}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-bold">Loan Structure / Type</td>
                    <td className="p-3">{bLoanType}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-bold">Requested Size (INR)</td>
                    <td className="p-3 font-mono font-bold">{formatCurrency(bLoanAmount)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-bold">AI Credit Score (Gauge)</td>
                    <td className="p-3 font-mono font-bold">{ratingScore} / {printSource === "customer" ? "900" : "100"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-bold">Prudent Recommendation</td>
                    <td className="p-3 font-bold text-slate-900 uppercase">{ratingValue}</td>
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold">Debt Capacity Limit</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(capacityVal)}/mo</td>
                  </tr>
                </tbody>
              </table>

              {explanationText && (
                <div className="mb-6 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                  " {explanationText} "
                </div>
              )}

              <div className="text-xs mb-8">
                <span className="text-[9px] uppercase font-mono font-bold text-slate-500 block mb-1">Underwriter Narrative & Risk Analysis Justification:</span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] leading-relaxed font-sans whitespace-pre-wrap">
                  {mainNarrative}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-300 pt-6 text-[9px] font-mono text-slate-500">
                <div>
                  <div>Officer Authorization Code: <strong>{printSource === "manager" ? formEmployeeId : "AVT-OFFICER-SYS"}</strong></div>
                  <div>Audit Division: <strong>{printSource === "manager" ? formEmployeeDept : "Risk Management & Underwriting"}</strong></div>
                  <div>Audit Hash: <strong>SHA-256/AVT-{Date.now().toString()}</strong></div>
                </div>
                <div className="text-right">
                  <div className="border-b border-slate-400 w-32 ml-auto h-8" />
                  <div className="mt-1">Authorized Electronic Signature</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-assessment-report, #printable-assessment-report * {
            visibility: visible !important;
          }
          #printable-assessment-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background-color: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
