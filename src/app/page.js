'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [examCode, setExamCode] = useState('');

  const handleJoinExam = (e) => {
    e.preventDefault();
    if (!examCode.trim()) return;

    let cleanCode = examCode.trim();
    if (cleanCode.includes('/exam/')) {
      const parts = cleanCode.split('/exam/');
      cleanCode = parts[1].split('?')[0];
    }
    router.push(`/exam/${cleanCode}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Box
        component="header"
        sx={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #dadce0',
          py: 2,
          px: { xs: 2, sm: 6 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: '#e8f0fe',
              color: '#1a73e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SchoolIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>
            ExamFlow
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<AdminPanelSettingsOutlinedIcon />}
          onClick={() => router.push('/admin-login')}
          sx={{ borderColor: '#dadce0', color: '#1a73e8', fontWeight: 600 }}
        >
          Admin Console
        </Button>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="md" sx={{ py: { xs: 6, sm: 10 }, textAlign: 'center', flexGrow: 1 }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            color: '#202124',
            letterSpacing: '-0.8px',
            fontSize: { xs: '2.2rem', sm: '3.2rem' },
            mb: 2,
          }}
        >
          Modular Online Examination Platform
        </Typography>

        <Typography
          variant="h6"
          sx={{
            color: '#5f6368',
            fontWeight: 400,
            maxWidth: 680,
            mx: 'auto',
            mb: 5,
            lineHeight: 1.5,
          }}
        >
          Authoritative server timer, instant schema validation, automatic MCQ grading,
          and robust written answer evaluation in a distraction-free environment.
        </Typography>

        {/* Student Code Entry Card */}
        <Card
          sx={{
            maxWidth: 540,
            mx: 'auto',
            borderRadius: 3,
            p: 1,
            boxShadow: '0 2px 6px 0 rgba(60,64,67,0.15)',
            border: '1px solid #dadce0',
            mb: 8,
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#202124', mb: 0.5 }}>
              Have an Examination Link or Code?
            </Typography>
            <Typography variant="body2" sx={{ color: '#5f6368', mb: 2.5 }}>
              Enter the examination identifier (e.g. ex-7a3b9f) to start
            </Typography>

            <Box component="form" onSubmit={handleJoinExam} sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter exam ID or URL..."
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AutoStoriesOutlinedIcon fontSize="small" sx={{ color: '#5f6368' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardIcon />}
                sx={{ borderRadius: '6px', px: 3, flexShrink: 0 }}
              >
                Join
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Key Feature Pillars */}
        <Grid container spacing={3} sx={{ textAlign: 'left' }}>
          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <TimerOutlinedIcon sx={{ color: '#1a73e8', fontSize: 32, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Authoritative Timer
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368' }}>
                Server-backed timestamps prevent reload cheating and enforce automatic submission upon expiration.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <SecurityOutlinedIcon sx={{ color: '#137333', fontSize: 32, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Enterprise Security
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368' }}>
                IP brute-force protection, HTTP-only SameSite cookies, PIN validation, and rate limiting.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <AssessmentOutlinedIcon sx={{ color: '#e37400', fontSize: 32, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Dual Evaluation
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368' }}>
                Instant automatic grading for MCQs combined with manual instructor scoring for written answers.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          textAlign: 'center',
          borderTop: '1px solid #dadce0',
          backgroundColor: '#ffffff',
          color: '#5f6368',
        }}
      >
        <Typography variant="caption">
          ExamFlow &copy; 2026. Built with Next.js App Router, Material UI, and MongoDB Atlas.
        </Typography>
      </Box>
    </Box>
  );
}
