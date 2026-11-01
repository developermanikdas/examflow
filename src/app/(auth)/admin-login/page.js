'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SchoolIcon from '@mui/icons-material/School';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutAlert, setLockoutAlert] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLockoutAlert(false);

    if (!email || !password) {
      setErrorMessage('Please provide both your administrator email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setLockoutAlert(true);
        }
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      // Success
      router.push('/admin/dashboard');
    } catch (err) {
      setErrorMessage('A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          p: { xs: 2, sm: 4 },
          borderRadius: 3,
          boxShadow: '0 1px 3px 0 rgba(60,64,67,0.15), 0 4px 8px 3px rgba(60,64,67,0.05)',
          border: '1px solid #dadce0',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Header Brand */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#e8f0fe',
                color: '#1a73e8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <SchoolIcon fontSize="large" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124', textAlign: 'center' }}>
              ExamFlow
            </Typography>
            <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5, textAlign: 'center' }}>
              Sign in to manage examinations, timer policies, and student submissions
            </Typography>
          </Box>

          {/* Error & Lockout Alert */}
          {errorMessage && (
            <Alert
              severity={lockoutAlert ? 'error' : 'warning'}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Admin Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOutlinedIcon />}
              sx={{
                py: 1.2,
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#1a73e8',
                '&:hover': {
                  backgroundColor: '#1557b0',
                },
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #f1f3f4', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#80868b' }}>
              Protected with rate limiting and server-side session authentication.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

