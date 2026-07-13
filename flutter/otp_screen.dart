import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'auth_repository.dart';

class OtpVerificationScreen extends StatefulWidget {
  final String targetDestination; // Can be a Phone Number (+91...) or Email ID
  final bool isEmailVerification; // True for Email, False for Mobile
  final String? verificationId;  // Pass current Firebase verificationId if Mobile

  const OtpVerificationScreen({
    Key? key,
    required this.targetDestination,
    required this.isEmailVerification,
    this.verificationId,
  }) : super(key: key);

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final AuthRepository _authRepository = AuthRepository();
  
  // 6 separate controllers and FocusNodes for individual PIN boxes to create a polished UX
  final List<TextEditingController> _pinControllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _pinFocusNodes = List.generate(6, (_) => FocusNode());

  // Countdown timer parameters
  Timer? _countdownTimer;
  int _timerSeconds = 30;
  bool _canResend = false;
  bool _isLoading = false;
  String? _currentVerificationId;

  @override
  void initState() {
    super.initState();
    _currentVerificationId = widget.verificationId;
    _startResendTimer();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    for (var i = 0; i < 6; i++) {
      _pinControllers[i].dispose();
      _pinFocusNodes[i].dispose();
    }
    super.dispose();
  }

  /// Begins the 30-second countdown timer for OTP resending
  void _startResendTimer() {
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

  /// Triggers a modern dynamic session Notification / Snackbar
  void _showDynamicNotification(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: isError ? Colors.redAccent : const Color(0xFF00D4B2),
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontFamily: 'Roboto',
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A), // Elegant Dark Slate
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: isError ? Colors.redAccent.withOpacity(0.3) : const Color(0xFF00D4B2).withOpacity(0.3),
            width: 1.5,
          ),
        ),
        duration: const Duration(seconds: 4),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  /// Re-triggers OTP dispatching
  Future<void> _resendOTP() async {
    if (!_canResend || _isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      if (widget.isEmailVerification) {
        // Resend Email OTP
        await _authRepository.sendEmailOTP(email: widget.targetDestination);
        _showDynamicNotification("A new verification code was sent to ${widget.targetDestination}");
      } else {
        // Resend Mobile Phone OTP
        await _authRepository.verifyPhoneNumber(
          phoneNumber: widget.targetDestination,
          onCodeSent: (newVerificationId, token) {
            setState(() {
              _currentVerificationId = newVerificationId;
            });
            _showDynamicNotification("SMS code successfully resent to ${widget.targetDestination}");
          },
          onVerificationFailed: (e) {
            _showDynamicNotification(e.message ?? "Phone verification failed", isError: true);
          },
          onVerificationCompleted: (credential) async {
            // Auto-retrieved verification
            _showDynamicNotification("Verification auto-completed!");
          },
          timeout: const Duration(seconds: 30),
        );
      }
      _startResendTimer();
    } catch (e) {
      _showDynamicNotification(e.toString().replaceAll("Exception: ", ""), isError: true);
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Submits the entered 6-digit OTP code to verify and sign in
  Future<void> _verifySubmittedOTP() async {
    // Combine 6 separate controller digits
    final otpCode = _pinControllers.map((controller) => controller.text).join();

    if (otpCode.length < 6) {
      _showDynamicNotification("Please complete the 6-digit OTP validation code.", isError: true);
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      if (widget.isEmailVerification) {
        // Validate Email OTP secondary authentication
        await _authRepository.verifyEmailOTP(
          email: widget.targetDestination,
          otpCode: otpCode,
        );
        _showDynamicNotification("Authenticated successfully! Welcome email triggered. 🚀");
        Navigator.pop(context, true); // Returns true upon successful authentication
      } else {
        // Validate Mobile SMS OTP
        if (_currentVerificationId == null) {
          throw Exception("Verification session is expired. Please click Resend OTP.");
        }
        await _authRepository.signInWithPhoneCode(
          verificationId: _currentVerificationId!,
          smsCode: otpCode,
        );
        _showDynamicNotification("Sign-In Completed! Access granted securely. 👋");
        Navigator.pop(context, true);
      }
    } catch (e) {
      _showDynamicNotification(e.toString().replaceAll("Exception: ", ""), isError: true);
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Standard Responsive layout measurements (Desktop max-width limits vs Mobile fluidity)
    final screenSize = MediaQuery.of(context).size;
    final isDesktop = screenSize.width > 768;
    final contentWidth = isDesktop ? 450.0 : screenSize.width * 0.92;

    return Scaffold(
      backgroundColor: const Color(0xFF020617), // Ambient Deep Cosmic Slate
      appBar: AppBar(
        title: const Text(
          "SECURITY VERIFICATION",
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.extrabold,
            letterSpacing: 1.5,
            fontFamily: 'Roboto',
            color: Color(0xFF94A3B8),
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF64748B)),
          onPressed: () => Navigator.pop(context, false),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Container(
            width: contentWidth,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            decoration: BoxDecoration(
              color: const Color(0xFF0B1329), // Card slate
              borderRadius: BorderRadius.circular(24),
              border: BorderSide(
                color: const Color(0xFF1E293B).withOpacity(0.8),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.5),
                  blurRadius: 30,
                  offset: const Offset(0, 15),
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Visual Icon Header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: (widget.isEmailVerification ? Colors.amber : const Color(0xFF00D4B2)).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    widget.isEmailVerification ? Icons.mail_lock : Icons.phonelink_lock,
                    size: 38,
                    color: widget.isEmailVerification ? Colors.amber : const Color(0xFF00D4B2),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Destination Headers
                Text(
                  widget.isEmailVerification ? "Verify Your Email" : "Verify Your Mobile Phone",
                  style: const TextStyle(
                    fontFamily: 'Roboto',
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: RichText(
                    textAlign: TextAlign.center,
                    text: TextSpan(
                      style: const TextStyle(
                        fontFamily: 'Roboto',
                        fontSize: 13,
                        color: Color(0xFF94A3B8),
                        height: 1.4,
                      ),
                      children: [
                        const TextSpan(text: "We have dispatched a 6-digit confirmation code to "),
                        TextSpan(
                          text: widget.targetDestination,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const TextSpan(text: ". Enter it below to unlock your dashboard."),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Responsive 6-Digit PIN Inputs
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(6, (index) {
                    return SizedBox(
                      width: isDesktop ? 54 : (contentWidth - 64) / 6.5,
                      height: 58,
                      child: TextField(
                        controller: _pinControllers[index],
                        focusNode: _pinFocusNodes[index],
                        autofocus: index == 0,
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 1,
                        style: const TextStyle(
                          fontFamily: 'Roboto',
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        decoration: InputDecoration(
                          counterText: "", // Hides length counter
                          fillColor: const Color(0xFF020617),
                          filled: true,
                          contentPadding: EdgeInsets.zero,
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: Color(0xFF334155),
                              width: 1.5,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: widget.isEmailVerification ? Colors.amber : const Color(0xFF00D4B2),
                              width: 2.0,
                            ),
                          ),
                        ),
                        onChanged: (value) {
                          // Dynamic focus traversal logic
                          if (value.isNotEmpty) {
                            if (index < 5) {
                              FocusScope.of(context).requestFocus(_pinFocusNodes[index + 1]);
                            } else {
                              _pinFocusNodes[index].unfocus();
                            }
                          } else {
                            if (index > 0) {
                              FocusScope.of(context).requestFocus(_pinFocusNodes[index - 1]);
                            }
                          }
                        },
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 36),

                // Primary Validate/Verify Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: widget.isEmailVerification ? Colors.amber : const Color(0xFF00D4B2),
                      foregroundColor: Colors.black,
                      elevation: 4,
                      shadowColor: (widget.isEmailVerification ? Colors.amber : const Color(0xFF00D4B2)).withOpacity(0.3),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: _isLoading ? null : _verifySubmittedOTP,
                    child: _isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Text(
                                "VERIFY SECURITY CODE",
                                style: TextStyle(
                                  fontFamily: 'Roboto',
                                  fontSize: 13,
                                  fontWeight: FontWeight.extrabold,
                                  letterSpacing: 1.0,
                                ),
                              ),
                              SizedBox(width: 8),
                              Icon(Icons.shield, size: 16),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 24),

                // Resend Countdown Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.timer, size: 14, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    _canResend
                        ? TextButton(
                            onPressed: _isLoading ? null : _resendOTP,
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              "Resend OTP",
                              style: TextStyle(
                                fontFamily: 'Roboto',
                                fontSize: 13,
                                fontWeight: FontWeight.extrabold,
                                color: widget.isEmailVerification ? Colors.amber : const Color(0xFF00D4B2),
                              ),
                            ),
                          )
                        : RichText(
                            text: TextSpan(
                              style: const TextStyle(
                                fontFamily: 'Roboto',
                                fontSize: 13,
                                color: Color(0xFF64748B),
                              ),
                              children: [
                                const TextSpan(text: "Resend code in "),
                                TextSpan(
                                  text: "${_timerSeconds}s",
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
