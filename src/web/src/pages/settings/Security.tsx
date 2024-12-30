import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import zxcvbn from 'zxcvbn';
import qrcode from 'qrcode';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

// Interfaces for form data
interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface MFAFormData {
  phoneNumber: string;
  verificationCode: string;
  preferredMethod: 'TOTP' | 'SMS';
}

interface SessionData {
  sessionId: string;
  deviceInfo: string;
  lastActivity: Date;
  location: string;
  isCurrentSession: boolean;
}

const Security: React.FC = () => {
  // Auth context
  const { user, loading } = useAuth();

  // Form states
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaQRCode, setMfaQRCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([]);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  // Form handling
  const passwordForm = useForm<PasswordFormData>({
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const mfaForm = useForm<MFAFormData>({
    mode: 'onChange',
    defaultValues: {
      phoneNumber: '',
      verificationCode: '',
      preferredMethod: 'TOTP'
    }
  });

  // Password strength calculation
  const calculatePasswordStrength = useCallback((password: string) => {
    const result = zxcvbn(password);
    setPasswordStrength(result.score * 25);
    return result;
  }, []);

  // Password validation rules
  const passwordValidation = useMemo(() => ({
    required: 'Password is required',
    minLength: {
      value: 12,
      message: 'Password must be at least 12 characters'
    },
    validate: {
      strength: (value: string) => {
        const result = calculatePasswordStrength(value);
        return result.score >= 3 || 'Password is too weak';
      },
      match: (value: string) => {
        return value === passwordForm.watch('newPassword') || 'Passwords do not match';
      }
    }
  }), [calculatePasswordStrength, passwordForm]);

  // Handle password change
  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      // Validate current password
      if (data.newPassword === data.currentPassword) {
        throw new Error('New password must be different from current password');
      }

      // Check password strength
      const strengthResult = calculatePasswordStrength(data.newPassword);
      if (strengthResult.score < 3) {
        throw new Error('Please choose a stronger password');
      }

      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Password updated successfully');
      passwordForm.reset();
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    }
  };

  // Handle MFA setup
  const handleMFASetup = async (data: MFAFormData) => {
    try {
      setIsGeneratingCodes(true);

      // Generate QR code for TOTP
      if (data.preferredMethod === 'TOTP') {
        const secretKey = 'JBSWY3DPEHPK3PXP'; // This would come from the API
        const otpauthUrl = `otpauth://totp/${user?.email}?secret=${secretKey}&issuer=TaskManager`;
        const qrCode = await qrcode.toDataURL(otpauthUrl);
        setMfaQRCode(qrCode);
      }

      // Generate backup codes
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substr(2, 8).toUpperCase()
      );
      setBackupCodes(codes);

      setMfaEnabled(true);
      toast.success('MFA enabled successfully');
    } catch (error) {
      toast.error('Failed to enable MFA');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  // Handle session management
  const handleTerminateSession = async (sessionId: string) => {
    try {
      // API call would go here
      setActiveSessions(prev => 
        prev.filter(session => session.sessionId !== sessionId)
      );
      toast.success('Session terminated successfully');
    } catch (error) {
      toast.error('Failed to terminate session');
    }
  };

  // Load active sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        // API call would go here
        const mockSessions: SessionData[] = [
          {
            sessionId: '1',
            deviceInfo: 'Chrome on Windows',
            lastActivity: new Date(),
            location: 'New York, US',
            isCurrentSession: true
          }
        ];
        setActiveSessions(mockSessions);
      } catch (error) {
        toast.error('Failed to load active sessions');
      }
    };

    loadSessions();
  }, []);

  if (loading) {
    return <div>Loading security settings...</div>;
  }

  return (
    <div className="security-settings">
      <h1>Security Settings</h1>

      {/* Password Section */}
      <section className="security-section">
        <h2>Password Management</h2>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)}>
          <Input
            id="currentPassword"
            type="password"
            label="Current Password"
            {...passwordForm.register('currentPassword', { required: true })}
            error={passwordForm.formState.errors.currentPassword?.message}
          />

          <Input
            id="newPassword"
            type="password"
            label="New Password"
            {...passwordForm.register('newPassword', passwordValidation)}
            error={passwordForm.formState.errors.newPassword?.message}
          />

          {passwordForm.watch('newPassword') && (
            <div className="password-strength">
              <div className="strength-bar" style={{ width: `${passwordStrength}%` }} />
              <span>Password strength: {passwordStrength}%</span>
            </div>
          )}

          <Input
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            {...passwordForm.register('confirmPassword', passwordValidation)}
            error={passwordForm.formState.errors.confirmPassword?.message}
          />

          <Button
            type="submit"
            disabled={!passwordForm.formState.isValid || passwordForm.formState.isSubmitting}
          >
            Update Password
          </Button>
        </form>
      </section>

      {/* MFA Section */}
      <section className="security-section">
        <h2>Two-Factor Authentication</h2>
        {!mfaEnabled ? (
          <form onSubmit={mfaForm.handleSubmit(handleMFASetup)}>
            <div className="mfa-method-selection">
              <label>
                <input
                  type="radio"
                  value="TOTP"
                  {...mfaForm.register('preferredMethod')}
                />
                Authenticator App
              </label>
              <label>
                <input
                  type="radio"
                  value="SMS"
                  {...mfaForm.register('preferredMethod')}
                />
                SMS Authentication
              </label>
            </div>

            {mfaForm.watch('preferredMethod') === 'SMS' && (
              <Input
                id="phoneNumber"
                type="tel"
                label="Phone Number"
                {...mfaForm.register('phoneNumber', {
                  required: 'Phone number is required for SMS authentication'
                })}
                error={mfaForm.formState.errors.phoneNumber?.message}
              />
            )}

            <Button
              type="submit"
              disabled={isGeneratingCodes || !mfaForm.formState.isValid}
            >
              Enable 2FA
            </Button>
          </form>
        ) : (
          <div className="mfa-status">
            <p>Two-factor authentication is enabled</p>
            <Button
              variant="outlined"
              onClick={() => setMfaEnabled(false)}
            >
              Disable 2FA
            </Button>
          </div>
        )}

        {mfaQRCode && (
          <div className="qr-code">
            <img src={mfaQRCode} alt="MFA QR Code" />
            <p>Scan this QR code with your authenticator app</p>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="backup-codes">
            <h3>Backup Codes</h3>
            <p>Store these codes securely. They can be used to access your account if you lose your authentication device.</p>
            <div className="codes-grid">
              {backupCodes.map((code, index) => (
                <div key={index} className="code">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Active Sessions Section */}
      <section className="security-section">
        <h2>Active Sessions</h2>
        <div className="sessions-list">
          {activeSessions.map(session => (
            <div key={session.sessionId} className="session-item">
              <div className="session-info">
                <p>{session.deviceInfo}</p>
                <p>Last activity: {session.lastActivity.toLocaleString()}</p>
                <p>Location: {session.location}</p>
              </div>
              {!session.isCurrentSession && (
                <Button
                  variant="outlined"
                  onClick={() => handleTerminateSession(session.sessionId)}
                >
                  Terminate Session
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Security;