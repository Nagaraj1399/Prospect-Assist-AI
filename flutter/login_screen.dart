import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'responsive_layout.dart';
import 'auth_service.dart';
import 'forgot_password_screen.dart';

enum DeliveryChannel { mobile, email }

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Navigation & Interactive Tabs State: 0 = Email/Password, 1 = Mobile OTP
  int _activeTabIndex = 0;
  bool _isLoading = false;
  bool _obscurePassword = true;

  // Delivery Channel & CAPTCHA state management
  DeliveryChannel _selectedChannel = DeliveryChannel.mobile;
  bool _isSendingOTP = false;
  bool _isCaptchaVerified = false; // dummy captcha state

  // Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final List<TextEditingController> _otpControllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());

  // Firebase auth & SMS validation configurations
  final AuthService _authService = AuthService();
  bool _isSignUpMode = false; // toggle Email Login vs Email Register
  bool _otpSent = false;
  String? _verificationId;
  int? _resendToken;
  String? _simulatedSmsOtp;
  String? _simulatedEmailOtp;

  // SMS Timer Configurations
  Timer? _countdownTimer;
  int _timerSeconds = 30;
  bool _canResend = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    _phoneController.dispose();
    _countdownTimer?.cancel();
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var focusNode in _otpFocusNodes) {
      focusNode.dispose();
    }
    super.dispose();
  }

  /// Begins counting down 30s for the SMS re-transmission
  void _startResendCountdown() {
    setState(() {
      _timerSeconds = 30;
      _canResend = false;
    });
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timerSeconds == 0) {
        setState(() {
          _canResend = true;
          _countdownTimer?.cancel();
        });
      } else {
        setState(() {
          _timerSeconds--;
        });
      }
    });
  }

  /// Triggers a dynamic notification banner
  void _showNotification(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: isError ? Colors.redAccent : const Color(0xFF00E5FF),
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontFamily: 'Roboto',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0B1329),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: isError ? Colors.redAccent.withOpacity(0.3) : const Color(0xFF00E5FF).withOpacity(0.3),
            width: 1.5,
          ),
        ),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  /// 1. Trigger Delivery of Verification Token via chosen Delivery Channel (Mobile/Email)
  Future<void> _triggerDelivery() async {
    // CAPTCHA verification check
    if (!_isCaptchaVerified) {
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            "⚠️ Please verify the CAPTCHA first.",
            style: TextStyle(fontFamily: 'Roboto', fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
        ),
      );
      return;
    }

    // Spam prevention loading guard
    if (_isSendingOTP) return;

    setState(() {
      _isSendingOTP = true;
      _isLoading = true;
      _simulatedSmsOtp = null;
      _simulatedEmailOtp = null;
    });

    try {
      if (_selectedChannel == DeliveryChannel.mobile) {
        final phoneNumber = _phoneController.text.trim();
        if (phoneNumber.isEmpty || phoneNumber.length < 10) {
          _showNotification("Please enter a valid 10-digit mobile phone number.", isError: true);
          setState(() {
            _isSendingOTP = false;
            _isLoading = false;
          });
          return;
        }

        final formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : '+91$phoneNumber';

        // Trigger real or simulated Firebase Phone Auth via our Service layer
        await _authService.verifyPhoneNumber(
          phoneNumber: formattedNumber,
          timeout: const Duration(seconds: 30),
          forceResendingToken: _resendToken,
          onCodeSent: (verificationId, resendToken) {
            setState(() {
              _otpSent = true;
              _verificationId = verificationId;
              _resendToken = resendToken;
              _isSendingOTP = false;
              _isLoading = false;
              if (verificationId.startsWith("mock-")) {
                _simulatedSmsOtp = _authService.lastSimulatedSMSOTP;
              }
            });
            _startResendCountdown();
            
            // Required exact SnackBar response
            final snackText = _simulatedSmsOtp != null 
                ? "✅ SMS OTP Sent to Mobile (Sandbox: $_simulatedSmsOtp)"
                : "✅ SMS OTP Sent to Mobile";
            ScaffoldMessenger.of(context).clearSnackBars();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  snackText,
                  style: const TextStyle(fontFamily: 'Roboto', fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black),
                ),
                backgroundColor: const Color(0xFF00E5FF),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                margin: const EdgeInsets.all(16),
              ),
            );
          },
          onVerificationFailed: (e) {
            setState(() {
              _isSendingOTP = false;
              _isLoading = false;
            });
            _showNotification(e.message ?? "Phone authentication failed.", isError: true);
          },
          onVerificationCompleted: (credential) async {
            final userCred = await _authService.signInWithPhoneCode(
              verificationId: _verificationId ?? '',
              smsCode: credential.smsCode ?? '',
            );
            _showNotification("Instant security validation verified successfully. Logged in!");
          },
        );

      } else {
        // Email Verification Channel
        final email = _emailController.text.trim();
        if (email.isEmpty || !email.contains('@')) {
          _showNotification("Please enter a valid corporate Email ID.", isError: true);
          setState(() {
            _isSendingOTP = false;
            _isLoading = false;
          });
          return;
        }

        // Trigger Email OTP using AuthService
        final otpCode = await _authService.sendEmailOTP(email: email);

        setState(() {
          _otpSent = true;
          _isSendingOTP = false;
          _isLoading = false;
          _simulatedEmailOtp = otpCode;
        });

        // Required exact SnackBar response
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              "✅ Verification Code Sent to Email (Sandbox: $otpCode)",
              style: const TextStyle(fontFamily: 'Roboto', fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black),
            ),
            backgroundColor: const Color(0xFF00E5FF),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isSendingOTP = false;
        _isLoading = false;
      });
      _showNotification(e.toString().replaceAll("Exception: ", ""), isError: true);
    }
  }

  /// 2. Validate OTP code entered by client and authenticate
  Future<void> _verifyOTPAndLogin() async {
    final otpCode = _otpControllers.map((c) => c.text).join();
    if (otpCode.length < 6) {
      _showNotification("Please complete the 6-digit confirmation code.", isError: true);
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      if (_selectedChannel == DeliveryChannel.email) {
        await _authService.verifyEmailOTP(
          email: _emailController.text.trim(),
          otpCode: otpCode,
        );
      } else {
        await _authService.signInWithPhoneCode(
          verificationId: _verificationId ?? '',
          smsCode: otpCode,
        );
      }
      _showNotification("Authentication successful! Welcome back.");
      // Navigate to dashboard
    } catch (e) {
      _showNotification(e.toString().replaceAll("Exception: ", ""), isError: true);
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// 3. Email Authentication Sign In / Sign Up handler
  Future<void> _handleEmailAuthentication() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final name = _fullNameController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      _showNotification("Please enter a valid corporate Email ID.", isError: true);
      return;
    }
    if (password.length < 6) {
      _showNotification("Your security password must be at least 6 characters long.", isError: true);
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      if (_isSignUpMode) {
        if (name.isEmpty) {
          _showNotification("Full name is required for credential creation.", isError: true);
          setState(() => _isLoading = false);
          return;
        }
        await _authService.signUpWithEmail(email: email, password: password, fullName: name);
        _showNotification("Account created successfully! Verification/Welcome email dispatched. 🚀");
        setState(() => _isSignUpMode = false);
      } else {
        await _authService.signInWithEmail(email: email, password: password);
        _showNotification("Prospect Assist authenticated successfully. Welcome!");
      }
    } catch (e) {
      _showNotification(e.toString().replaceAll("Exception: ", ""), isError: true);
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617), // Deep Banking dark blue
      body: ResponsiveLayout(
        mobileBody: _buildAuthFormContainer(isMobile: true),
        tabletBody: Center(
          child: Container(
            width: 500,
            margin: const EdgeInsets.all(24),
            child: _buildAuthFormContainer(isMobile: false),
          ),
        ),
        desktopBody: Row(
          children: [
            // Left Panel: Premium Banking branding & marketing graphic text
            Expanded(
              flex: 11,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF020617), Color(0xFF0B1329), Color(0xFF0A2540)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Stack(
                  children: [
                    // Grid vector graphic lines
                    Opacity(
                      opacity: 0.15,
                      child: Center(
                        child: Icon(
                          Icons.grid_3x3_rounded,
                          size: MediaQuery.of(context).size.width * 0.4,
                          color: const Color(0xFF00E5FF),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(48.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // App Branding
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF00E5FF).withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(12),
                                  border: BorderSide(color: const Color(0xFF00E5FF).withOpacity(0.3)),
                                ),
                                child: const Icon(Icons.analytics_rounded, color: Color(0xFF00E5FF), size: 24),
                              ),
                              const SizedBox(width: 14),
                              const Text(
                                "PROSPECT ASSIST AI",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.black,
                                  letterSpacing: 1.5,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),

                          // Marketing Slogan & Description
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, py: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF00E5FF).withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(20),
                                  border: BorderSide(color: const Color(0xFF00E5FF).withOpacity(0.2)),
                                ),
                                child: const Text(
                                  "★ IDBI BANK HACKATHON SUBMISSION",
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.extrabold,
                                    color: Color(0xFF00E5FF),
                                    letterSpacing: 1.0,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 18),
                              const Text(
                                "Empowering Smarter\nCredit Decisions.",
                                style: TextStyle(
                                  fontSize: 42,
                                  height: 1.2,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  fontFamily: 'Roboto',
                                ),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                "Advanced multi-channel verification and real-time AI modeling interfaces tailored for IDBI Bank operations officers.",
                                style: TextStyle(
                                  fontSize: 15,
                                  color: Color(0xFF94A3B8),
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),

                          // Technical server indicators
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF00D4B2),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 10),
                              const Text(
                                "SECURED CORE ENGINE V3.0 (ACTIVE)",
                                style: TextStyle(
                                  fontSize: 10,
                                  fontFamily: 'monospace',
                                  color: Color(0xFF64748B),
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            ],
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Right Panel: Form
            Expanded(
              flex: 10,
              child: Container(
                color: const Color(0xFF020617),
                child: Center(
                  child: Container(
                    width: 480,
                    margin: const EdgeInsets.all(40),
                    child: _buildAuthFormContainer(isMobile: false),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Builds the premium Glassmorphic Authentication card structure
  Widget _buildAuthFormContainer({required bool isMobile}) {
    return Container(
      padding: EdgeInsets.all(isMobile ? 20 : 32),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1329), // Deep rich card blue
        borderRadius: BorderRadius.circular(24),
        border: BorderSide(
          color: const Color(0xFF1E293B).withOpacity(0.8),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 35,
            offset: const Offset(0, 15),
          )
        ],
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // App symbol row for Mobile Layout
            if (isMobile) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.analytics_rounded, color: Color(0xFF00E5FF), size: 20),
                  const SizedBox(width: 8),
                  const Text(
                    "PROSPECT ASSIST AI",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.black,
                      letterSpacing: 1.5,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],

            const Text(
              "Account Access",
              style: TextStyle(
                fontFamily: 'Roboto',
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              "Access your security dashboard via credentials or mobile OTP token.",
              style: TextStyle(
                fontFamily: 'Roboto',
                fontSize: 13,
                color: Color(0xFF94A3B8),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 28),

            // Tab switch controllers
            Container(
              height: 46,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFF020617),
                borderRadius: BorderRadius.circular(12),
                border: BorderSide(color: const Color(0xFF1E293B), width: 1),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _activeTabIndex = 0),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          color: _activeTabIndex == 0 ? const Color(0xFF1E293B) : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          "Corporate Login",
                          style: TextStyle(
                            color: _activeTabIndex == 0 ? Colors.white : const Color(0xFF64748B),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _activeTabIndex = 1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          color: _activeTabIndex == 1 ? const Color(0xFF1E293B) : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          "Mobile OTP Token",
                          style: TextStyle(
                            color: _activeTabIndex == 1 ? Colors.white : const Color(0xFF64748B),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Toggle active input modules
            _activeTabIndex == 0 ? _buildEmailLoginForm() : _buildMobileOTPForm(),
          ],
        ),
      ),
    );
  }

  /// Interactive Form: Email/Password login & Sign Up toggle
  Widget _buildEmailLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_isSignUpMode) ...[
          const Text(
            "Full Name",
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _fullNameController,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: _getInputDecoration(Icons.person_outline, "e.g. Nagarajan K"),
          ),
          const SizedBox(height: 18),
        ],

        const Text(
          "Corporate Email Address",
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _emailController,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          keyboardType: TextInputType.emailAddress,
          decoration: _getInputDecoration(Icons.alternate_email_rounded, "e.g. officer@idbibank.com"),
        ),
        const SizedBox(height: 18),

        Row(
          mainAxisAlignment: MainAxisAlignment.between,
          children: [
            const Text(
              "Security Password",
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
            ),
            if (!_isSignUpMode)
              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const ForgotPasswordScreen()),
                  );
                },
                child: const Text(
                  "Forgot Password?",
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF00E5FF)),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _getInputDecoration(
            Icons.lock_outline_rounded,
            "••••••",
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                color: const Color(0xFF475569),
                size: 18,
              ),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
        ),
        const SizedBox(height: 32),

        // Action Trigger
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 4,
            ),
            onPressed: _isLoading ? null : _handleEmailAuthentication,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.5, valueColor: AlwaysStoppedAnimation<Color>(Colors.black)),
                  )
                : Text(
                    _isSignUpMode ? "REGISTER & INITIALIZE WELCOME" : "SECURE CLIENT SIGN-IN",
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.extrabold, letterSpacing: 1.0),
                  ),
          ),
        ),
        const SizedBox(height: 20),

        // Switch Mode Link
        Center(
          child: GestureDetector(
            onTap: () => setState(() => _isSignUpMode = !_isSignUpMode),
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                children: [
                  TextSpan(text: _isSignUpMode ? "Already have an account? " : "New to Prospect Assist? "),
                  TextSpan(
                    text: _isSignUpMode ? "Sign In" : "Register Now",
                    style: const TextStyle(color: Color(0xFF00E5FF), fontWeight: FontWeight.extrabold),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// Interactive Form: Mobile Phone verification & 6-digit OTP fields
  Widget _buildMobileOTPForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. DELIVERY CHANNEL Toggle Buttons Section
        const Text(
          "DELIVERY CHANNEL",
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () {
                  if (!_otpSent) {
                    setState(() {
                      _selectedChannel = DeliveryChannel.mobile;
                    });
                  }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  height: 46,
                  decoration: BoxDecoration(
                    color: _selectedChannel == DeliveryChannel.mobile
                        ? const Color(0xFF00E5FF).withOpacity(0.12)
                        : const Color(0xFF020617),
                    borderRadius: BorderRadius.circular(12),
                    border: BorderSide(
                      color: _selectedChannel == DeliveryChannel.mobile
                          ? const Color(0xFF00E5FF)
                          : const Color(0xFF1E293B),
                      width: 1.5,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.phone_iphone_rounded,
                        size: 16,
                        color: _selectedChannel == DeliveryChannel.mobile
                            ? const Color(0xFF00E5FF)
                            : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "Send via Mobile",
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: _selectedChannel == DeliveryChannel.mobile
                              ? Colors.white
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: GestureDetector(
                onTap: () {
                  if (!_otpSent) {
                    setState(() {
                      _selectedChannel = DeliveryChannel.email;
                    });
                  }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  height: 46,
                  decoration: BoxDecoration(
                    color: _selectedChannel == DeliveryChannel.email
                        ? const Color(0xFF00E5FF).withOpacity(0.12)
                        : const Color(0xFF020617),
                    borderRadius: BorderRadius.circular(12),
                    border: BorderSide(
                      color: _selectedChannel == DeliveryChannel.email
                          ? const Color(0xFF00E5FF)
                          : const Color(0xFF1E293B),
                      width: 1.5,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.email_outlined,
                        size: 16,
                        color: _selectedChannel == DeliveryChannel.email
                            ? const Color(0xFF00E5FF)
                            : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "Send via Email",
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: _selectedChannel == DeliveryChannel.email
                              ? Colors.white
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // 2. Dynamic Input Fields based on Selected Channel
        Text(
          _selectedChannel == DeliveryChannel.mobile
              ? "Registered Mobile Phone"
              : "Registered Corporate Email ID",
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
        ),
        const SizedBox(height: 8),
        _selectedChannel == DeliveryChannel.mobile
            ? TextFormField(
                controller: _phoneController,
                enabled: !_otpSent,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                keyboardType: TextInputType.phone,
                decoration: _getInputDecoration(Icons.phone_iphone_rounded, "e.g. +91 98765 43210"),
              )
            : TextFormField(
                controller: _emailController,
                enabled: !_otpSent,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                keyboardType: TextInputType.emailAddress,
                decoration: _getInputDecoration(Icons.alternate_email_rounded, "e.g. officer@idbibank.com"),
              ),
        const SizedBox(height: 16),

        // 3. CAPTCHA Checkbox Card
        if (!_otpSent) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF020617),
              borderRadius: BorderRadius.circular(12),
              border: BorderSide(
                color: const Color(0xFF1E293B),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: Checkbox(
                    value: _isCaptchaVerified,
                    onChanged: (val) {
                      setState(() {
                        _isCaptchaVerified = val ?? false;
                      });
                    },
                    activeColor: const Color(0xFF00E5FF),
                    checkColor: Colors.black,
                    side: const BorderSide(color: Color(0xFF64748B), width: 1.5),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        "I'm not a robot",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        "Google reCAPTCHA v2 Verification",
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 9,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.security_rounded,
                  color: Color(0xFF00E5FF),
                  size: 20,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        // Dynamic Verification Digit Grid (Visible only after SMS dispatch)
        if (_otpSent) ...[
          Text(
            _selectedChannel == DeliveryChannel.mobile
                ? "Enter 6-Digit SMS Token"
                : "Enter 6-Digit Email Token",
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(6, (index) {
              return SizedBox(
                width: 50,
                height: 52,
                child: TextField(
                  controller: _otpControllers[index],
                  focusNode: _otpFocusNodes[index],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  decoration: InputDecoration(
                    counterText: "",
                    fillColor: const Color(0xFF020617),
                    filled: true,
                    contentPadding: EdgeInsets.zero,
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF1E293B), width: 1.5),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF00E5FF), width: 1.5),
                    ),
                  ),
                  onChanged: (val) {
                    if (val.isNotEmpty) {
                      if (index < 5) {
                        FocusScope.of(context).requestFocus(_otpFocusNodes[index + 1]);
                      } else {
                        _otpFocusNodes[index].unfocus();
                      }
                    } else {
                      if (index > 0) {
                        FocusScope.of(context).requestFocus(_otpFocusNodes[index - 1]);
                      }
                    }
                  },
                ),
              );
            }),
          ),
          if (_simulatedSmsOtp != null || _simulatedEmailOtp != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B).withOpacity(0.3),
                borderRadius: BorderRadius.circular(12),
                border: BorderSide(color: const Color(0xFF334155).withOpacity(0.5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "SANDBOX SECURITY BYPASS PANEL:",
                    style: TextStyle(
                      fontFamily: 'Roboto',
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF00E5FF),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _selectedChannel == DeliveryChannel.mobile
                        ? "Sandbox Core SMS Verification OTP token is ${_simulatedSmsOtp}. Enter this code in the input above."
                        : "SMTP Sandbox Core dispatched verification token ${_simulatedEmailOtp}. Enter this code in the input above.",
                    style: const TextStyle(
                      fontFamily: 'Roboto',
                      fontSize: 11,
                      color: Color(0xFF94A3B8),
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
        ],

        // OTP Primary trigger
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _otpSent ? const Color(0xFF00D4B2) : const Color(0xFF00E5FF),
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 4,
            ),
            onPressed: _isLoading ? null : (_otpSent ? _verifyOTPAndLogin : _triggerDelivery),
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.5, valueColor: AlwaysStoppedAnimation<Color>(Colors.black)),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _otpSent ? "VERIFY SECURITY CODE" : "DISPATCH OTP TOKEN",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.extrabold, letterSpacing: 0.8),
                      ),
                      const SizedBox(width: 8),
                      Icon(_otpSent ? Icons.shield_rounded : Icons.sms_outlined, size: 14),
                    ],
                  ),
          ),
        ),

        // Countdown Timer & Resend Option triggers
        if (_otpSent) ...[
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.timer_outlined, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              _canResend
                  ? GestureDetector(
                      onTap: _isLoading ? null : _triggerDelivery,
                      child: const Text(
                        "Resend Security OTP",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.extrabold, color: Color(0xFF00E5FF)),
                      ),
                    )
                  : RichText(
                      text: TextSpan(
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        children: [
                          const TextSpan(text: "Resend available in "),
                          TextSpan(
                            text: "${_timerSeconds}s",
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
            ],
          ),
        ],
      ],
    );
  }

  /// Maps generic decoration parameters across fields
  InputDecoration _getInputDecoration(IconData icon, String hintText, {Widget? suffixIcon}) {
    return InputDecoration(
      prefixIcon: Icon(icon, color: const Color(0xFF475569), size: 18),
      suffixIcon: suffixIcon,
      hintText: hintText,
      hintStyle: const TextStyle(color: Color(0xFF475569)),
      fillColor: const Color(0xFF020617),
      filled: true,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF1E293B), width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF00E5FF), width: 1.5),
      ),
    );
  }
}
