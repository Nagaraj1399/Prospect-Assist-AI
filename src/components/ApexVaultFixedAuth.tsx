import React, { useState, useEffect, useRef } from "react";
import { Smartphone, Mail, Shield, ShieldCheck, Check, AlertCircle, XCircle, RefreshCw, User, ArrowLeft, Lock, Briefcase } from "lucide-react";
import { auth, signInWithGoogle } from "../firebase";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

interface ApexVaultFixedAuthProps {
  loginRole: "customer" | "employee";
  setLoginRole: (role: "customer" | "employee") => void;
  onAuthSuccess: (sessionData: { token: string; user: { name: string; email: string; phone: string; role: string } }) => void;
  addDiagnosticLog: (type: "info" | "success" | "warning" | "error", message: string) => void;
  viewMode: "mobile" | "web";
}

export const ApexVaultFixedAuth: React.FC<ApexVaultFixedAuthProps> = ({
  loginRole,
  setLoginRole,
  onAuthSuccess,
  addDiagnosticLog,
  viewMode
}) => {
  const [mode, setMode] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [activeTab, setActiveTab] = useState<"MOBILE" | "EMAIL">("MOBILE");
  const [step, setStep] = useState<"SEND_STAGE" | "VERIFY_STAGE">("SEND_STAGE");
  
  // Form states
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  // Mechanics
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // 30-Second countdown timer for Resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // Set initial pre-fills and active tabs based on role selection
  useEffect(() => {
    if (loginRole === "employee") {
      setActiveTab("EMAIL");
      setMode("SIGN_IN");
      setEmail("manager@securebank.com");
    } else {
      setActiveTab("MOBILE");
      setEmail("");
    }
    setOtpError("");
  }, [loginRole]);

  // Lazy initialize invisible RecaptchaVerifier for Firebase Mobile Auth
  const initRecaptcha = () => {
    if (!auth) {
      addDiagnosticLog("error", "[Firebase] Authentication core not initialized.");
      return null;
    }
    try {
      if (!recaptchaVerifierRef.current) {
        let container = document.getElementById("recaptcha-container");
        if (!container) {
          container = document.createElement("div");
          container.id = "recaptcha-container";
          container.className = "hidden";
          document.body.appendChild(container);
        }
        
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {
            addDiagnosticLog("info", "[Firebase] reCAPTCHA solved silently.");
          },
          "expired-callback": () => {
            addDiagnosticLog("warning", "[Firebase] reCAPTCHA expired. Re-initializing.");
            recaptchaVerifierRef.current = null;
          }
        });
        addDiagnosticLog("info", "[Firebase] Invisible RecaptchaVerifier successfully initialized.");
      }
      return recaptchaVerifierRef.current;
    } catch (err: any) {
      addDiagnosticLog("error", `[Firebase Recaptcha] Initialization failed: ${err.message}`);
      return null;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOtpError("");
    addDiagnosticLog("info", `Initiating OTP generation for ${activeTab === "MOBILE" ? phone : email}...`);

    if (activeTab === "MOBILE") {
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith("+")) {
        // Assume default Indian country code +91 if not specified
        formattedPhone = "+91" + formattedPhone.replace(/[^0-9]/g, "");
      }
      
      try {
        const appVerifier = initRecaptcha();
        if (!appVerifier || !auth) {
          throw new Error("Firebase Auth client or Recaptcha verifier is offline.");
        }
        
        addDiagnosticLog("info", `[Firebase] Triggering client-side SMS dispatch via signInWithPhoneNumber for ${formattedPhone}...`);
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        (window as any).confirmationResult = confirmationResult;
        (window as any).isConfirmationResultMock = false;
        
        addDiagnosticLog("success", `[Firebase Success] SMS dynamically sent to ${formattedPhone}.`);
        setStep("VERIFY_STAGE");
        setTimer(30);
      } catch (err: any) {
        addDiagnosticLog("warning", `[Firebase Warning] Native SMS dispatch bypassed: ${err.message}`);
        addDiagnosticLog("info", `Standardizing secure sandbox environment fallback for testing.`);
        
        // Generate high-fidelity simulated OTP for sandbox and iframe compliance
        const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setSimulatedOtp(randomOtp);
        (window as any).isConfirmationResultMock = true;
        
        addDiagnosticLog("success", `[Sandbox System] Simulated OTP dispatched: ${randomOtp}`);
        setStep("VERIFY_STAGE");
        setTimer(30);
      } finally {
        setLoading(false);
      }
    } else {
      // Email dynamic OTP flow (completely avoids SMTP protocol loop via server proxy)
      try {
        addDiagnosticLog("info", `[POST /api/auth/email-send-otp] Sending secure dispatch request...`);
        const response = await fetch("/api/auth/email-send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
          setSimulatedOtp(data.simulatedOtp || "123456");
          addDiagnosticLog("success", `[Email OTP] Access token dispatched. Simulated code: ${data.simulatedOtp}`);
          setStep("VERIFY_STAGE");
          setTimer(30);
        } else {
          throw new Error(data.message || "Failed to dispatch email verification code.");
        }
      } catch (err: any) {
        addDiagnosticLog("error", `[API Error] OTP dispatch failed: ${err.message}`);
        setOtpError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setOtpError("Security code must be exactly 6 digits.");
      return;
    }
    
    setLoading(true);
    setOtpError("");
    addDiagnosticLog("info", `Submitting security MFA challenge for validation...`);

    try {
      if (activeTab === "MOBILE") {
        const isMock = (window as any).isConfirmationResultMock;
        if (!isMock && (window as any).confirmationResult) {
          addDiagnosticLog("info", `[Firebase] Verifying native confirmation result...`);
          const result = await (window as any).confirmationResult.confirm(otpCode);
          addDiagnosticLog("success", `[Firebase Success] Session authorized: ${result.user.uid}`);
          await handleFinalize(phone || result.user.phoneNumber || "customer@sandboxedbank.com");
        } else {
          // Sandbox verification match
          if (otpCode === simulatedOtp || otpCode === "123456") {
            addDiagnosticLog("success", `[Sandbox Success] Dynamic code validated successfully.`);
            await handleFinalize(phone || "+91 98765 43210");
          } else {
            throw new Error("Invalid security challenge credentials mismatch.");
          }
        }
      } else {
        // Verify via backend route
        addDiagnosticLog("info", `[POST /api/auth/email-verify-otp] Challenging validation token...`);
        const response = await fetch("/api/auth/email-verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), otp: otpCode })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
          addDiagnosticLog("success", `[Validation Success] Security clearance granted.`);
          await handleFinalize(email.trim());
        } else {
          throw new Error(data.message || "Incorrect verification token. Integrity breach rejected.");
        }
      }
    } catch (err: any) {
      addDiagnosticLog("error", `[Security Error] Verification failed: ${err.message}`);
      setOtpError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (identifier: string) => {
    try {
      addDiagnosticLog("info", `[POST /api/auth/session-finalize] Establishing secure banking session lease...`);
      const response = await fetch("/api/auth/session-finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        addDiagnosticLog("success", `[Session Lease Active] Connected securely to banking node.`);
        
        const userEmail = identifier.includes("@") ? identifier : `${identifier.replace("+", "")}@sandboxedbank.com`;
        const userPhone = identifier.startsWith("+") ? identifier : "+91 98765 43210";
        let userName = "Apex Client";
        if (loginRole === "employee") {
          userName = userEmail.includes("manager") ? "Bank Underwriter Manager" : "Apex Vault Banker";
        } else if (mode === "SIGN_UP") {
          userName = name || "Apex Client";
        }

        onAuthSuccess({
          token: data.backendJwt,
          user: {
            name: userName,
            email: userEmail,
            phone: userPhone,
            role: data.role || (loginRole === "employee" ? "MANAGER" : "ROLE_CUSTOMER")
          }
        });
      } else {
        throw new Error(data.error || "Failed to finalize session lease.");
      }
    } catch (err: any) {
      addDiagnosticLog("error", `[Session Failure] Sync rejected: ${err.message}`);
      setOtpError(err.message);
    }
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setOtpError("");
    addDiagnosticLog("info", "Spawning secure Google Identity authentication window popup...");
    try {
      const gUser = await signInWithGoogle();
      addDiagnosticLog("success", `[Google Auth Success] Authorized as: ${gUser.email}`);
      await handleFinalize(gUser.email);
    } catch (err: any) {
      addDiagnosticLog("error", `[Google Auth Error] Flow cancelled or interrupted: ${err.message}`);
      setOtpError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setTimer(30);
    setOtpCode("");
    setOtpError("");
    // Re-trigger submit logic to obtain new token
    const fakeEvent = { preventDefault: () => {} } as any;
    handleSendOtp(fakeEvent);
  };

  return (
    <div className="flex-1 flex flex-col justify-between" id="apex_vault_fixed_auth_card">
      <div id="recaptcha-container" className="hidden"></div>
      
      <div>
        {/* Logo and Brand */}
        <div className="text-center my-3" id="auth_header_brand">
          <div className="w-10 h-10 bg-gradient-to-b from-[#0A2540] to-[#0d3b66] rounded-2xl flex items-center justify-center mx-auto mb-1.5 shadow-lg shadow-blue-500/10 border border-[#00D4B2]/30">
            <ShieldCheck className="w-5.5 h-5.5 text-[#00D4B2]" />
          </div>
          <h2 className="text-sm font-black tracking-wider text-[#00D4B2] uppercase">Apex Vault & Trust</h2>
          <p className="text-[8px] text-slate-300 font-mono uppercase mt-0.5 tracking-widest">
            Core Identity & Financial Intelligence Gateway
          </p>
        </div>

        {/* Portal Role Switcher: Customer Hub vs Employee Gateway */}
        {step === "SEND_STAGE" && (
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800 animate-fade-in" id="auth_portal_role_tabs">
            <button
              type="button"
              onClick={() => {
                setLoginRole("customer");
                setOtpError("");
              }}
              className={`py-2 px-1 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === "customer"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/30 shadow-md shadow-blue-500/5"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer Hub</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginRole("employee");
                setOtpError("");
              }}
              className={`py-2 px-1 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === "employee"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/5"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Employee Gateway</span>
            </button>
          </div>
        )}

        {/* Master Gateway Toggle: Sign In vs Sign Up (Only shown for customer, employees don't register) */}
        {step === "SEND_STAGE" && loginRole === "customer" && (
          <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-3.5 select-none" id="auth_gateway_mode_toggle">
            <button
              type="button"
              onClick={() => {
                setMode("SIGN_IN");
                setOtpError("");
              }}
              className={`py-1.5 px-1 text-[9px] font-bold rounded-lg transition-all uppercase tracking-wider text-center cursor-pointer ${
                mode === "SIGN_IN"
                  ? "bg-[#0A2540] text-white border border-[#00D4B2]/30 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Access Portal (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("SIGN_UP");
                setOtpError("");
              }}
              className={`py-1.5 px-1 text-[9px] font-bold rounded-lg transition-all uppercase tracking-wider text-center cursor-pointer ${
                mode === "SIGN_UP"
                  ? "bg-[#0A2540] text-white border border-[#00D4B2]/30 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account (Sign Up)
            </button>
          </div>
        )}

        {/* Underwriter Demo Credentials Panel */}
        {step === "SEND_STAGE" && loginRole === "employee" && (
          <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-[10px] text-slate-400 mb-3.5 space-y-1.5 animate-fade-in" id="employee_quick_fill">
            <div className="font-semibold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Underwriter Mock Credentials:</span>
            </div>
            <p className="leading-normal text-slate-400 text-[9.5px]">
              Click to quick-fill authentic credentials for standard underwriting clearance:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmail("manager@securebank.com");
                  addDiagnosticLog("info", "Quick-filled: manager@securebank.com (Underwriter Manager)");
                }}
                className="bg-emerald-900/25 hover:bg-emerald-900/45 text-emerald-400 border border-emerald-800/40 px-2 py-1 rounded text-[9px] font-mono transition-all cursor-pointer"
              >
                manager@securebank.com
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("banker@idbi.com");
                  addDiagnosticLog("info", "Quick-filled: banker@idbi.com (Bank Underwriter)");
                }}
                className="bg-emerald-900/25 hover:bg-emerald-900/45 text-emerald-400 border border-emerald-800/40 px-2 py-1 rounded text-[9px] font-mono transition-all cursor-pointer"
              >
                banker@idbi.com
              </button>
            </div>
          </div>
        )}

        {/* Customer Demo Credentials Panel */}
        {step === "SEND_STAGE" && loginRole === "customer" && mode === "SIGN_IN" && (
          <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/30 text-[10px] text-slate-400 mb-3.5 space-y-1.5 animate-fade-in" id="customer_quick_fill">
            <div className="font-semibold text-blue-400 font-mono uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Customer Demo Credentials:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmail("customer@gmail.com");
                  setActiveTab("EMAIL");
                  addDiagnosticLog("info", "Quick-filled: customer@gmail.com");
                }}
                className="bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-800/40 px-2 py-1 rounded text-[9px] font-mono transition-all cursor-pointer"
              >
                customer@gmail.com
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhone("+91 98765 43210");
                  setActiveTab("MOBILE");
                  addDiagnosticLog("info", "Quick-filled: +91 98765 43210");
                }}
                className="bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-800/40 px-2 py-1 rounded text-[9px] font-mono transition-all cursor-pointer"
              >
                +91 98765 43210
              </button>
            </div>
          </div>
        )}

        {/* Google Sign-In (Only on Send Stage and Sign In Mode for Customers) */}
        {step === "SEND_STAGE" && mode === "SIGN_IN" && loginRole === "customer" && (
          <div className="mb-3.5" id="google_sso_section">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white border border-slate-800 hover:border-slate-700 font-semibold py-2 px-3 rounded-xl text-[10px] flex items-center justify-center gap-2 transition duration-200 shadow-md shadow-black/25 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            
            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-slate-850" />
              <span className="px-2 text-[8px] text-slate-500 font-mono uppercase tracking-wider">Or Secure Credentials</span>
              <div className="flex-1 border-t border-slate-850" />
            </div>
          </div>
        )}

        {/* TWO-TAB LAYOUT FOR SIGN IN (Only shown for customer as employees are email-only) */}
        {step === "SEND_STAGE" && mode === "SIGN_IN" && loginRole === "customer" && (
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800" id="auth_dynamic_channel_tabs">
            <button
              type="button"
              onClick={() => {
                setActiveTab("MOBILE");
                setOtpError("");
              }}
              className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "MOBILE"
                  ? "bg-[#0A2540] text-[#00D4B2] border border-[#00D4B2]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In via Mobile
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("EMAIL");
                setOtpError("");
              }}
              className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "EMAIL"
                  ? "bg-[#0A2540] text-[#00D4B2] border border-[#00D4B2]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In via Email
            </button>
          </div>
        )}

        {/* FORM CONTAINER */}
        {step === "SEND_STAGE" ? (
          <form onSubmit={handleSendOtp} className="space-y-3.5" id="send_otp_form">
            {mode === "SIGN_UP" && loginRole === "customer" ? (
              <>
                {/* Name field for registration */}
                <div className="relative animate-fade-in">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Legal Name"
                    className="w-full bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#00D4B2] transition-all placeholder-slate-500"
                  />
                </div>
                
                {/* Dual-inputs for registrations - ask for Phone */}
                <div className="relative animate-fade-in">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mobile Phone Number (e.g. +91 98765 43210)"
                    className="w-full bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#00D4B2] transition-all placeholder-slate-500"
                  />
                </div>

                <div className="relative animate-fade-in">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#00D4B2] transition-all placeholder-slate-500"
                  />
                </div>
              </>
            ) : (
              /* Sign In Fields */
              <>
                {activeTab === "MOBILE" && loginRole === "customer" ? (
                  <div className="relative animate-fade-in">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter Registered Mobile (+91 XXXXX XXXXX)"
                      className="w-full bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#00D4B2] transition-all placeholder-slate-500"
                    />
                  </div>
                ) : (
                  <div className="relative animate-fade-in">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={loginRole === "employee" ? "Enter Bank Underwriter Email" : "Enter Registered Email Address"}
                      className="w-full bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#00D4B2] transition-all placeholder-slate-500"
                    />
                  </div>
                )}
              </>
            )}

            {otpError && (
              <div className="text-[10px] text-red-400 font-mono bg-red-950/40 border border-red-900/40 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {/* SEND OTP BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A2540] hover:bg-slate-900 border border-[#00D4B2]/30 text-white font-bold py-3 px-5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00D4B2]" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-[#00D4B2]" />
              )}
              <span>{loading ? "Requesting Dynamic Code..." : "Send OTP Securely"}</span>
            </button>
          </form>
        ) : (
          /* STEP 2: VERIFICATION STAGE (automatically replaces inputs dynamically) */
          <form onSubmit={handleVerifyOtp} className="space-y-4" id="verify_otp_form">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="w-9 h-9 bg-[#00D4B2]/10 border border-[#00D4B2]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="w-4.5 h-4.5 text-[#00D4B2] animate-pulse" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Enter 6-Digit OTP</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                A verification challenge has been dispatched to{" "}
                <span className="text-[#00D4B2] font-mono">
                  {activeTab === "MOBILE" ? phone : email}
                </span>
                .
              </p>
            </div>

            {/* Verification input field */}
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="000000"
                className="w-full bg-slate-950 border border-slate-800 text-white py-3 rounded-xl text-center text-lg font-bold font-mono tracking-[1em] pl-[1em] focus:outline-none focus:border-[#00D4B2] transition-all placeholder:text-slate-700"
              />
            </div>

            {/* Sandbox panel for preview convenience */}
            {simulatedOtp && (
              <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/30 text-[10px] text-slate-400 space-y-1">
                <div className="font-semibold text-blue-400 font-mono uppercase tracking-wider">Sandbox Security Bypass Panel:</div>
                <p className="leading-normal">
                  Dispatched verification code is:{" "}
                  <strong className="text-[#00D4B2] font-mono text-xs select-all">
                    {simulatedOtp}
                  </strong>
                </p>
              </div>
            )}

            {otpError && (
              <div className="text-[10px] text-red-400 font-mono bg-red-950/40 border border-red-900/40 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 animate-fade-in">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {/* RESEND OTP BUTTON with 30s Countdown */}
            <div className="text-center py-1">
              {timer > 0 ? (
                <span className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-600" />
                  Resend OTP in <strong className="text-slate-300">{timer}s...</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-[10px] text-[#00D4B2] hover:text-emerald-400 font-bold underline transition-all flex items-center gap-1 mx-auto cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resend OTP
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("SEND_STAGE");
                  setOtpCode("");
                  setOtpError("");
                }}
                className="flex-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-2 bg-[#00D4B2] hover:bg-emerald-400 disabled:bg-slate-800 text-[#0A2540] font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-[#00D4B2]/10 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{loading ? "Authenticating..." : "Verify & Sign In"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
