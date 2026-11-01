'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import SaveIcon from '@mui/icons-material/Save';
import LockResetIcon from '@mui/icons-material/LockReset';
import SecurityIcon from '@mui/icons-material/Security';
import TimerIcon from '@mui/icons-material/Timer';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Default time allocations
  const [mcqTime, setMcqTime] = useState(2);
  const [shortAnswerTime, setShortAnswerTime] = useState(4);
  const [descriptiveTime, setDescriptiveTime] = useState(15);
  const [longAnswerTime, setLongAnswerTime] = useState(30);

  // Policies
  const [defaultAttemptLimit, setDefaultAttemptLimit] = useState(1);
  const [adminMaxLoginAttempts, setAdminMaxLoginAttempts] = useState(5);
  const [adminLockoutMinutes, setAdminLockoutMinutes] = useState(30);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.defaultTimePerType) {
            setMcqTime(s.defaultTimePerType.mcq || 2);
            setShortAnswerTime(s.defaultTimePerType.short_answer || 4);
            setDescriptiveTime(s.defaultTimePerType.descriptive || 15);
            setLongAnswerTime(s.defaultTimePerType.long_answer || 30);
          }
          if (s.defaultAttemptLimit) setDefaultAttemptLimit(s.defaultAttemptLimit);
          if (s.adminMaxLoginAttempts) setAdminMaxLoginAttempts(s.adminMaxLoginAttempts);
          if (s.adminLockoutMinutes) setAdminLockoutMinutes(s.adminLockoutMinutes);
        }
      } catch (err) {
        // error
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSavePolicies = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultTimePerType: {
            mcq: Number(mcqTime),
            short_answer: Number(shortAnswerTime),
            descriptive: Number(descriptiveTime),
            long_answer: Number(longAnswerTime),
          },
          defaultAttemptLimit: Number(defaultAttemptLimit),
          adminMaxLoginAttempts: Number(adminMaxLoginAttempts),
          adminLockoutMinutes: Number(adminLockoutMinutes),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to save', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Network error', severity: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword || !newPassword) {
      setPasswordError('Please provide both current and new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passwordChange: {
            currentPassword,
            newPassword,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Password changed successfully!', severity: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Password update failed.');
      }
    } catch (err) {
      setPasswordError('Network error changing password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ color: '#1a73e8' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 6 }}>
      {/* Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124' }}>
          Platform Settings & Security
        </Typography>
        <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
          Configure automatic question timing formulas, security lockouts, and credentials
        </Typography>
      </Box>

      {/* 1. Timer Formula Allocations */}
      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2, mb: 4 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <TimerIcon sx={{ color: '#1a73e8' }} />
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Default Time Allocations (per Question Type)
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#5f6368', mb: 3 }}>
            These values are used during JSON upload to automatically compute the suggested examination duration.
          </Typography>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="MCQ (Minutes)"
                value={mcqTime}
                onChange={(e) => setMcqTime(e.target.value)}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Short Answer (Minutes)"
                value={shortAnswerTime}
                onChange={(e) => setShortAnswerTime(e.target.value)}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Descriptive (Minutes)"
                value={descriptiveTime}
                onChange={(e) => setDescriptiveTime(e.target.value)}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Long Answer (Minutes)"
                value={longAnswerTime}
                onChange={(e) => setLongAnswerTime(e.target.value)}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 2. Security & Policy Settings */}
      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2, mb: 4 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <SecurityIcon sx={{ color: '#1a73e8' }} />
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Security & Attempt Restrictions
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#5f6368', mb: 3 }}>
            Configure brute-force defense thresholds, IP lockout durations, and default student limits.
          </Typography>

          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Default Attempt Limit"
                value={defaultAttemptLimit}
                onChange={(e) => setDefaultAttemptLimit(e.target.value)}
                helperText="Applies to new examinations"
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Max Failed Login Attempts"
                value={adminMaxLoginAttempts}
                onChange={(e) => setAdminMaxLoginAttempts(e.target.value)}
                helperText="Threshold before IP block"
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Lockout Duration (Minutes)"
                value={adminLockoutMinutes}
                onChange={(e) => setAdminLockoutMinutes(e.target.value)}
                helperText="IP block period"
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={savingSettings ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleSavePolicies}
              disabled={savingSettings}
              sx={{ borderRadius: '6px' }}
            >
              {savingSettings ? 'Saving...' : 'Save Policy Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 3. Admin Password Change */}
      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <LockResetIcon sx={{ color: '#1a73e8' }} />
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Change Administrator Password
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#5f6368', mb: 3 }}>
            Update your account password securely. Requires current password verification.
          </Typography>

          {passwordError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {passwordError}
            </Alert>
          )}

          <Box component="form" onSubmit={handlePasswordChange}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                type="submit"
                variant="outlined"
                color="primary"
                disabled={savingPassword}
                startIcon={savingPassword ? <CircularProgress size={16} color="inherit" /> : <LockResetIcon />}
                sx={{ borderRadius: '6px' }}
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

