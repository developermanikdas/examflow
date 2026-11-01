'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import SendIcon from '@mui/icons-material/Send';
import MenuIcon from '@mui/icons-material/Menu';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import { useParams } from 'next/navigation';

export default function StudentExaminationPage() {
  const { examId } = useParams();

  // Workflow states: 'VERIFY' | 'INSTRUCTIONS' | 'EXAM' | 'SUBMITTED'
  const [stage, setStage] = useState('VERIFY');

  // Verification Form State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Exam and Session State
  const [examMeta, setExamMeta] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student Answers Map: { [questionId]: answerValue }
  const [answers, setAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'local' | 'error'

  // Timer & Expiry State (Authoritative Server Timers)
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Pause State (freezes timer when window closed)
  const [isPaused, setIsPaused] = useState(false);
  const [resuming, setResuming] = useState(false);
  const remainingSecondsRef = useRef(0);
  const hasDirtyAnswersRef = useRef(false);

  // Autosave Debounce Ref
  const pendingSaveTimeoutRef = useRef(null);
  const lastSavedAnswersRef = useRef({});
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  // Navigation Panel (for Mobile Drawer)
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  // Submit Dialog State
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Pre-load from sessionStorage if student reloaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAttempt = sessionStorage.getItem(`examflow_att_${examId}`);
      const storedEmail = sessionStorage.getItem(`examflow_email_${examId}`);
      const storedName = sessionStorage.getItem(`examflow_name_${examId}`);

      if (storedAttempt && storedEmail) {
        setAttemptId(storedAttempt);
        setStudentEmail(storedEmail);
        if (storedName) setStudentName(storedName);

        // Resume session from server
        resumeActiveSession(storedAttempt, storedEmail);
      }
    }
  }, [examId]);

  // Resumes active session from server authoritative state
  const resumeActiveSession = async (attId, email) => {
    try {
      const res = await fetch(`/api/exam/${examId}/session?attemptId=${attId}&email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (data.success) {
        if (['submitted', 'auto_submitted', 'evaluated'].includes(data.status)) {
          setSubmissionResult({
            totalMarks: data.evaluation?.totalMarks || 0,
            obtainedMarks: data.evaluation?.obtainedMarks || 0,
            percentage: data.evaluation?.percentage || 0,
            evaluationStatus: data.evaluation?.evaluationStatus || 'pending',
            status: data.status,
            submittedAt: data.submittedAt,
          });
          setStage('SUBMITTED');
          return;
        }

        // Active exam resumption
        setExamMeta(data.exam);
        setQuestions(data.exam.questions || []);
        if (data.isPaused) {
          setIsPaused(true);
          setRemainingSeconds(data.remainingSeconds || 0);
          setExpiresAt(null);
        } else {
          setIsPaused(false);
          setExpiresAt(new Date(data.expiresAt));
          setRemainingSeconds(data.remainingSeconds);
        }

        // Populate answers from server, overlaid with any local drafts from localStorage
        const ansObj = {};
        for (const a of data.answers || []) {
          ansObj[a.questionId] = a.answer;
        }

        try {
          const localDraftStr = localStorage.getItem(`examflow_answers_${attId}`);
          if (localDraftStr) {
            const localDraft = JSON.parse(localDraftStr);
            for (const [k, v] of Object.entries(localDraft)) {
              if (v !== undefined && ansObj[k] === undefined) {
                ansObj[k] = v;
              }
            }
          }
        } catch (e) {}

        setAnswers(ansObj);
        answersRef.current = ansObj;
        lastSavedAnswersRef.current = { ...ansObj };

        setStage('EXAM');
      }
    } catch (err) {
      // fallback to verify
    }
  };

  // Step 1: Verify Student & PIN
  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifyError('');

    if (!studentName.trim() || !studentEmail.trim() || !pin.trim()) {
      setVerifyError('Please enter your full name, email address, and examination PIN.');
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(`/api/exam/${examId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName.trim(),
          email: studentEmail.trim().toLowerCase(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setExamMeta(data.exam);

      // Save credentials in session storage for reload recovery
      sessionStorage.setItem(`examflow_email_${examId}`, studentEmail.trim().toLowerCase());
      sessionStorage.setItem(`examflow_name_${examId}`, studentName.trim());

      if (data.canResume && data.activeAttemptId) {
        // Can directly resume active attempt
        setAttemptId(data.activeAttemptId);
        sessionStorage.setItem(`examflow_att_${examId}`, data.activeAttemptId);
        await resumeActiveSession(data.activeAttemptId, studentEmail.trim().toLowerCase());
      } else {
        setStage('INSTRUCTIONS');
      }
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  // Step 2: Confirms instructions and Starts the Examination
  const handleStartExam = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/exam/${examId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName.trim(),
          email: studentEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start examination session');
      }

      setAttemptId(data.attemptId);
      sessionStorage.setItem(`examflow_att_${examId}`, data.attemptId);

      setExamMeta(data.exam);
      setQuestions(data.exam.questions || []);
      if (data.isPaused) {
        setIsPaused(true);
        setRemainingSeconds(data.remainingSeconds || 0);
        setExpiresAt(null);
      } else {
        setIsPaused(false);
        setExpiresAt(new Date(data.expiresAt));
        setRemainingSeconds(data.remainingSeconds);
      }

      // Populate existing answers if resumed
      const ansObj = {};
      for (const a of data.answers || []) {
        ansObj[a.questionId] = a.answer;
      }
      try {
        const localDraftStr = localStorage.getItem(`examflow_answers_${data.attemptId}`);
        if (localDraftStr) {
          const localDraft = JSON.parse(localDraftStr);
          for (const [k, v] of Object.entries(localDraft)) {
            if (v !== undefined && ansObj[k] === undefined) {
              ansObj[k] = v;
            }
          }
        }
      } catch (e) {}

      setAnswers(ansObj);
      answersRef.current = ansObj;
      lastSavedAnswersRef.current = { ...ansObj };

      setStage('EXAM');
    } catch (err) {
      setVerifyError(err.message);
      setStage('VERIFY');
    } finally {
      setVerifying(false);
    }
  };

  // Authoritative countdown timer loop: runs only when EXAM is active and NOT paused
  useEffect(() => {
    if (stage !== 'EXAM' || !expiresAt || isPaused) return;

    const timer = setInterval(() => {
      const now = new Date();
      const diffSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setRemainingSeconds(diffSeconds);

      // Time Expiry: Automatically trigger submission
      if (diffSeconds <= 0) {
        clearInterval(timer);
        handleFinalSubmit(true); // Auto submit
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, expiresAt, isPaused]);

  // Window Close Detection: Stop timer and pause attempt ONLY when the browser window/tab is closed
  // NOTE: Tab/Window switching (blur/visibilitychange) intentionally will NOT pause the timer.
  useEffect(() => {
    if (stage !== 'EXAM' || !attemptId || isPaused) return;

    const handleWindowClose = () => {
      const currentRemaining = remainingSecondsRef.current;
      const latestAnswers = answersRef.current;

      const payload = JSON.stringify({
        email: studentEmail.trim().toLowerCase(),
        remainingSeconds: currentRemaining,
        answers: Object.entries(latestAnswers).map(([qId, val]) => ({
          questionId: qId,
          answer: val,
        })),
      });

      // Save locally first
      try {
        localStorage.setItem(`examflow_answers_${attemptId}`, JSON.stringify(latestAnswers));
      } catch (e) {}

      // Send beacon or keepalive fetch so request completes reliably as window unloads
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`/api/attempts/${attemptId}/pause`, blob);
      } else {
        fetch(`/api/attempts/${attemptId}/pause`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    };

    window.addEventListener('pagehide', handleWindowClose);
    window.addEventListener('beforeunload', handleWindowClose);

    return () => {
      window.removeEventListener('pagehide', handleWindowClose);
      window.removeEventListener('beforeunload', handleWindowClose);
    };
  }, [stage, attemptId, isPaused, studentEmail]);

  // Resumes examination countdown when student returns and clicks "Resume Examination"
  const handleResumeExam = async () => {
    if (!attemptId) return;
    setResuming(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPaused(false);
        setRemainingSeconds(data.remainingSeconds);
        setExpiresAt(new Date(data.expiresAt));
      } else if (data.expired) {
        handleFinalSubmit(true);
      }
    } catch (err) {
      console.error('Failed to resume examination:', err);
    } finally {
      setResuming(false);
    }
  };

  // Batched Save: flushes locally held answer updates to MongoDB in ONE consolidated request
  const flushAnswersToDatabase = useCallback(async () => {
    if (!attemptId || !hasDirtyAnswersRef.current) return;

    const answersPayload = answersRef.current;
    const itemsToSave = Object.entries(answersPayload).map(([qId, val]) => ({
      questionId: qId,
      answer: val,
    }));

    if (itemsToSave.length === 0) return;

    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail.trim().toLowerCase(),
          answers: itemsToSave,
        }),
      });

      if (res.status === 408) {
        // Timer expired on server
        handleFinalSubmit(true);
        return;
      }

      if (!res.ok) throw new Error('Save failed');

      hasDirtyAnswersRef.current = false;
      lastSavedAnswersRef.current = { ...answersPayload };
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  }, [attemptId, studentEmail]);

  // Periodic 12-second background sync to flush dirty answers to MongoDB
  useEffect(() => {
    if (stage !== 'EXAM' || !attemptId) return;

    const syncInterval = setInterval(() => {
      if (hasDirtyAnswersRef.current) {
        flushAnswersToDatabase();
      }
    }, 12000); // Batched periodic sync every 12s

    return () => clearInterval(syncInterval);
  }, [stage, attemptId, flushAnswersToDatabase]);

  // Local-first answer change: stores in localStorage immediately, batches DB calls
  const handleAnswerChange = (questionId, value) => {
    if (answersRef.current[questionId] === value) return; // Prevent duplicate work
    const updated = { ...answersRef.current, [questionId]: value };
    answersRef.current = updated;
    setAnswers(updated);
    hasDirtyAnswersRef.current = true;
    setSaveStatus('local');

    // Instantly persist to localStorage (0ms latency, zero database hits)
    try {
      if (attemptId) {
        localStorage.setItem(`examflow_answers_${attemptId}`, JSON.stringify(updated));
      }
    } catch (e) {}

    // Clear previous pending debounce timeout
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }

    // Debounce: save to database after 6 seconds of idle
    pendingSaveTimeoutRef.current = setTimeout(() => {
      flushAnswersToDatabase();
    }, 6000);
  };

  // Navigates between questions without triggering extra database requests
  const handleNavigateQuestion = (newIndex) => {
    setCurrentIndex(newIndex);
    setNavDrawerOpen(false);
  };

  // Step 3: Final Examination Submission
  const handleFinalSubmit = async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitDialogOpen(false);

    // Save any pending answers first
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }
    await flushAnswersToDatabase();

    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail.trim().toLowerCase(),
          isAutoSubmit: isAuto,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit examination');
      }

      setSubmissionResult(data);
      setStage('SUBMITTED');

      // Clear session storage on completion
      sessionStorage.removeItem(`examflow_att_${examId}`);
    } catch (err) {
      alert(`Submission error: ${err.message}. Please check your connection and retry.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Format remaining seconds into HH:MM:SS
  const formatTimer = (totalSecs) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== '' && answers[k] !== undefined).length;
  const currentQuestion = questions[currentIndex];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Box
        component="header"
        sx={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #dadce0',
          py: 1.5,
          px: { xs: 2, sm: 4 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              backgroundColor: '#e8f0fe',
              color: '#1a73e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SchoolIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#202124', lineHeight: 1.2 }}>
              ExamFlow
            </Typography>
            <Typography variant="caption" sx={{ color: '#5f6368' }}>
              {examMeta?.title || 'Online Assessment'}
            </Typography>
          </Box>
        </Box>

        {stage === 'EXAM' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Autosave Indicator */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.8 }}>
              {saveStatus === 'local' && (
                <>
                  <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: '#5f6368' }} />
                  <Typography variant="caption" sx={{ color: '#5f6368' }}>Saved locally</Typography>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <CircularProgress size={14} sx={{ color: '#1a73e8' }} />
                  <Typography variant="caption" sx={{ color: '#1a73e8' }}>Syncing to database...</Typography>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CloudDoneOutlinedIcon sx={{ fontSize: 16, color: '#137333' }} />
                  <Typography variant="caption" sx={{ color: '#137333', fontWeight: 500 }}>Saved in database</Typography>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <ErrorOutlinedIcon sx={{ fontSize: 16, color: '#d93025' }} />
                  <Typography variant="caption" sx={{ color: '#d93025' }}>Offline - Saved locally</Typography>
                </>
              )}
            </Box>

            {/* Authoritative Timer Pill */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                px: 2,
                py: 0.8,
                borderRadius: '20px',
                backgroundColor: isPaused ? '#fef7e0' : remainingSeconds < 300 ? '#fce8e6' : '#f1f3f4',
                color: isPaused ? '#b06000' : remainingSeconds < 300 ? '#c5221f' : '#202124',
                border: isPaused ? '1px solid #f9ab00' : remainingSeconds < 300 ? '1px solid #d93025' : '1px solid #dadce0',
                transition: 'all 0.3s ease',
              }}
            >
              {isPaused ? <PauseCircleOutlinedIcon sx={{ fontSize: 18 }} /> : <TimerOutlinedIcon sx={{ fontSize: 18 }} />}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                {isPaused ? `${formatTimer(remainingSeconds)} (Paused)` : formatTimer(remainingSeconds)}
              </Typography>
            </Box>

            {isPaused && (
              <Button
                variant="contained"
                size="small"
                onClick={handleResumeExam}
                disabled={resuming}
                startIcon={<PlayArrowIcon fontSize="small" />}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  backgroundColor: '#137333',
                  '&:hover': { backgroundColor: '#0d652d' },
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                }}
              >
                {resuming ? 'Resuming...' : 'Resume'}
              </Button>
            )}

            {/* Mobile Question Palette Drawer Toggle */}
            <IconButton
              sx={{ display: { xs: 'flex', md: 'none' }, color: '#5f6368' }}
              onClick={() => setNavDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Main Container */}
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, display: 'flex', justifyContent: 'center' }}>
        {/* STAGE 1: VERIFICATION & PIN FORM */}
        {stage === 'VERIFY' && (
          <Card
            sx={{
              maxWidth: 500,
              width: '100%',
              borderRadius: 3,
              border: '1px solid #dadce0',
              boxShadow: '0 1px 3px 0 rgba(60,64,67,0.15)',
              my: 'auto',
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124' }}>
                  Student Examination Entry
                </Typography>
                <Typography variant="body2" sx={{ color: '#5f6368', mt: 1 }}>
                  Enter your verification details and examination PIN provided by your instructor to start.
                </Typography>
              </Box>

              {verifyError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {verifyError}
                </Alert>
              )}

              <Box component="form" onSubmit={handleVerify}>
                <TextField
                  fullWidth
                  label="Full Name"
                  placeholder="e.g. Alex Johnson"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  disabled={verifying}
                  required
                  sx={{ mb: 2.5 }}
                />

                <TextField
                  fullWidth
                  type="email"
                  label="Email Address"
                  placeholder="e.g. student@institution.edu"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  disabled={verifying}
                  required
                  sx={{ mb: 2.5 }}
                />

                <TextField
                  fullWidth
                  label="Examination PIN"
                  placeholder="6-character access PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={verifying}
                  required
                  sx={{ mb: 3 }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={verifying}
                  startIcon={verifying ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{ py: 1.2, fontWeight: 600, borderRadius: '6px' }}
                >
                  {verifying ? 'Verifying...' : 'Verify & Continue'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* STAGE 2: INSTRUCTIONS SCREEN */}
        {stage === 'INSTRUCTIONS' && examMeta && (
          <Card
            sx={{
              maxWidth: 700,
              width: '100%',
              borderRadius: 3,
              border: '1px solid #dadce0',
              boxShadow: '0 1px 3px 0 rgba(60,64,67,0.1)',
              my: 'auto',
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124', mb: 1 }}>
                {examMeta.title}
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#1a73e8', fontWeight: 500, mb: 2 }}>
                Subject: {examMeta.subject}
              </Typography>

              {examMeta.description && (
                <Typography variant="body2" sx={{ color: '#3c4043', mb: 3, whiteSpace: 'pre-line' }}>
                  {examMeta.description}
                </Typography>
              )}

              {/* Exam Metadata Grid */}
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>DURATION</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{examMeta.durationMinutes} Mins</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>TOTAL MARKS</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{examMeta.totalMarks} Marks</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>QUESTIONS</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{examMeta.questionCount} Questions</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>CANDIDATE</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {studentName}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Rules and Instructions */}
              <Box sx={{ p: 2.5, backgroundColor: '#e8f0fe', borderRadius: 2, mb: 4, border: '1px solid #dadce0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a73e8', mb: 1 }}>
                  Examination Guidelines:
                </Typography>
                <Box component="ul" sx={{ pl: 2.5, m: 0, color: '#3c4043', fontSize: '0.88rem' }}>
                  <li>The examination timer runs continuously once started and is authoritative on the server.</li>
                  <li>Your answers are automatically saved to the server as you type or select options.</li>
                  <li>Refreshing or reopening your browser will restore your saved answers and current time remaining.</li>
                  <li>The paper will automatically submit when the countdown timer reaches 00:00.</li>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={() => setStage('VERIFY')}>Back</Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleStartExam}
                  disabled={verifying}
                  sx={{ borderRadius: '6px', px: 4 }}
                >
                  {verifying ? 'Starting...' : 'I Agree, Start Examination'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* STAGE 3: ACTIVE DISTRACTION-FREE EXAMINATION INTERFACE */}
        {stage === 'EXAM' && currentQuestion && (
          <Box sx={{ width: '100%', maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Paused Notification Banner */}
            {isPaused && (
              <Paper
                elevation={1}
                sx={{
                  p: 2.5,
                  backgroundColor: '#fef7e0',
                  border: '1px solid #f9ab00',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PauseCircleOutlinedIcon sx={{ fontSize: 36, color: '#b06000' }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#7a4100' }}>
                      Examination Timer Paused
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#5f6368' }}>
                      Your exam was paused when you closed the window. Remaining time:{' '}
                      <Box component="strong" sx={{ color: '#202124', fontFamily: 'monospace' }}>
                        {formatTimer(remainingSeconds)}
                      </Box>
                      . Click &quot;Resume Examination&quot; to continue.
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleResumeExam}
                  disabled={resuming}
                  startIcon={<PlayArrowIcon />}
                  sx={{
                    backgroundColor: '#137333',
                    '&:hover': { backgroundColor: '#0d652d' },
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                    px: 3,
                  }}
                >
                  {resuming ? 'Resuming...' : 'Resume Examination'}
                </Button>
              </Paper>
            )}

            <Box sx={{ width: '100%', display: 'flex', gap: 3 }}>
              {/* Left Main Question Pane */}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Card sx={{ border: '1px solid #dadce0', borderRadius: 2, mb: 3 }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                  {/* Question Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#5f6368' }}>
                      Question {currentIndex + 1} of {questions.length}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={currentQuestion.type.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize' }} />
                      <Chip label={`${currentQuestion.marks} Marks`} size="small" color="primary" sx={{ fontWeight: 600 }} />
                    </Box>
                  </Box>

                  {/* Question Prompt */}
                  <Typography variant="h6" sx={{ fontWeight: 500, color: '#202124', mb: 3, lineHeight: 1.4 }}>
                    {currentQuestion.question}
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  {/* Answer Input depending on type */}
                  {currentQuestion.type === 'mcq' ? (
                    <FormControl component="fieldset" sx={{ width: '100%' }}>
                      <RadioGroup
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      >
                        {currentQuestion.options?.map((opt) => (
                          <Paper
                            key={opt.id}
                            variant="outlined"
                            sx={{
                              mb: 1.5,
                              p: 1.2,
                              px: 2,
                              borderRadius: 2,
                              borderColor: answers[currentQuestion.id] === opt.id ? '#1a73e8' : '#dadce0',
                              backgroundColor: answers[currentQuestion.id] === opt.id ? '#e8f0fe' : '#ffffff',
                              cursor: 'pointer',
                              '&:hover': { borderColor: '#1a73e8' },
                            }}
                            onClick={() => handleAnswerChange(currentQuestion.id, opt.id)}
                          >
                            <FormControlLabel
                              value={opt.id}
                              control={<Radio color="primary" />}
                              label={
                                <Typography variant="body1" sx={{ color: '#202124' }}>
                                  ({opt.id}) {opt.text}
                                </Typography>
                              }
                              sx={{ width: '100%', m: 0 }}
                            />
                          </Paper>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  ) : (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#5f6368', mb: 1, display: 'block' }}>
                        Write your response in the workspace below. Your progress saves automatically.
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={currentQuestion.type === 'long_answer' ? 12 : currentQuestion.type === 'descriptive' ? 8 : 4}
                        placeholder="Type your response here..."
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        sx={{
                          backgroundColor: '#ffffff',
                          borderRadius: 1.5,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#80868b', mt: 0.8, display: 'block', textAlign: 'right' }}>
                        Character Count: {(answers[currentQuestion.id] || '').length}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Bottom Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<NavigateBeforeIcon />}
                  disabled={currentIndex === 0}
                  onClick={() => handleNavigateQuestion(currentIndex - 1)}
                  sx={{ borderColor: '#dadce0', color: '#3c4043' }}
                >
                  Previous
                </Button>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {currentIndex < questions.length - 1 ? (
                    <Button
                      variant="contained"
                      color="primary"
                      endIcon={<NavigateNextIcon />}
                      onClick={() => handleNavigateQuestion(currentIndex + 1)}
                      sx={{ borderRadius: '6px' }}
                    >
                      Next Question
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      endIcon={<SendIcon />}
                      onClick={() => setSubmitDialogOpen(true)}
                      sx={{ borderRadius: '6px' }}
                    >
                      Finish & Submit
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Right Question Palette (Desktop Permanent, Mobile Drawer) */}
            <Box
              sx={{
                width: 280,
                flexShrink: 0,
                display: { xs: 'none', md: 'block' },
              }}
            >
              <Card sx={{ border: '1px solid #dadce0', borderRadius: 2, position: 'sticky', top: 80 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#202124', mb: 1 }}>
                    Question Navigation
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#5f6368', mb: 2, display: 'block' }}>
                    {answeredCount} of {questions.length} answered
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 3 }}>
                    {questions.map((q, idx) => {
                      const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                      const isCurrent = idx === currentIndex;
                      return (
                        <Button
                          key={q.id}
                          variant={isCurrent ? 'contained' : isAnswered ? 'outlined' : 'text'}
                          color={isCurrent ? 'primary' : isAnswered ? 'success' : 'inherit'}
                          size="small"
                          onClick={() => handleNavigateQuestion(idx)}
                          sx={{
                            minWidth: 0,
                            height: 40,
                            borderRadius: 1.5,
                            fontWeight: 600,
                            border: isAnswered ? '1px solid #137333' : '1px solid #dadce0',
                            backgroundColor: isCurrent ? '#1a73e8' : isAnswered ? '#e6f4ea' : '#f8f9fa',
                            color: isCurrent ? '#ffffff' : isAnswered ? '#137333' : '#3c4043',
                          }}
                        >
                          {idx + 1}
                        </Button>
                      );
                    })}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<SendIcon />}
                    onClick={() => setSubmitDialogOpen(true)}
                    sx={{ borderRadius: '6px', py: 1 }}
                  >
                    Submit Examination
                  </Button>
                </CardContent>
              </Card>
            </Box>

            {/* Mobile Drawer for Palette */}
            <Drawer anchor="right" open={navDrawerOpen} onClose={() => setNavDrawerOpen(false)}>
              <Box sx={{ width: 280, p: 3 }}>
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600, mb: 1 }}>
                  Questions
                </Typography>
                <Typography variant="caption" sx={{ color: '#5f6368', mb: 2, display: 'block' }}>
                  {answeredCount} of {questions.length} answered
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 3 }}>
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                    const isCurrent = idx === currentIndex;
                    return (
                      <Button
                        key={q.id}
                        variant={isCurrent ? 'contained' : isAnswered ? 'outlined' : 'text'}
                        size="small"
                        onClick={() => handleNavigateQuestion(idx)}
                        sx={{
                          minWidth: 0,
                          height: 40,
                          borderRadius: 1.5,
                          fontWeight: 600,
                          border: isAnswered ? '1px solid #137333' : '1px solid #dadce0',
                          backgroundColor: isCurrent ? '#1a73e8' : isAnswered ? '#e6f4ea' : '#f8f9fa',
                          color: isCurrent ? '#ffffff' : isAnswered ? '#137333' : '#3c4043',
                        }}
                      >
                        {idx + 1}
                      </Button>
                    );
                  })}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={() => {
                    setNavDrawerOpen(false);
                    setSubmitDialogOpen(true);
                  }}
                >
                  Submit Examination
                </Button>
              </Box>
            </Drawer>
            </Box>
          </Box>
        )}

        {/* STAGE 4: SUBMITTED / RESULTS SCREEN */}
        {stage === 'SUBMITTED' && (
          <Card
            sx={{
              maxWidth: 600,
              width: '100%',
              borderRadius: 3,
              border: '1px solid #dadce0',
              boxShadow: '0 1px 3px 0 rgba(60,64,67,0.1)',
              my: 'auto',
              textAlign: 'center',
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#e6f4ea',
                  color: '#137333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <AssignmentTurnedInIcon sx={{ fontSize: 36 }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124', mb: 1 }}>
                Examination Successfully Submitted!
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368', mb: 4 }}>
                Thank you, <strong>{studentName}</strong>. Your attempt has been registered and verified by the server.
              </Typography>

              {/* Result Summary Box */}
              {submissionResult && (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, backgroundColor: '#f8f9fa', mb: 4 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {questions.some((q) => q.type === 'mcq') ? 'MCQ / Auto Score' : 'Total Examination Marks'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a73e8' }}>
                        {questions.some((q) => q.type === 'mcq')
                          ? `${submissionResult.obtainedMarks} / ${submissionResult.totalMarks}`
                          : `${submissionResult.totalMarks} Marks`}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Evaluation Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={
                            submissionResult.evaluationStatus === 'fully_evaluated'
                              ? 'Fully Evaluated'
                              : 'Written Review Pending'
                          }
                          size="small"
                          color={submissionResult.evaluationStatus === 'fully_evaluated' ? 'success' : 'warning'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  {submissionResult.evaluationStatus !== 'fully_evaluated' && (
                    <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', mt: 2 }}>
                      {questions.some((q) => q.type === 'mcq')
                        ? '* Your MCQ answers were automatically evaluated. Your written responses have been sent to the instructor for manual grading.'
                        : '* All questions in this assessment are written responses and have been securely queued for instructor manual grading.'}
                    </Typography>
                  )}
                </Paper>
              )}

              <Typography variant="caption" sx={{ color: '#80868b' }}>
                You may now safely close this browser window.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Confirmation Dialog before manual submission */}
      <Dialog open={submitDialogOpen} onClose={() => !submitting && setSubmitDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Examination Submission</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
          </DialogContentText>
          {answeredCount < questions.length && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You still have <strong>{questions.length - answeredCount}</strong> unanswered question(s).
            </Alert>
          )}
          <DialogContentText>
            Are you sure you want to finish and submit your paper? You will not be able to modify your answers after submission.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSubmitDialogOpen(false)} disabled={submitting}>
            Continue Examination
          </Button>
          <Button
            onClick={() => handleFinalSubmit(false)}
            variant="contained"
            color="success"
            disabled={submitting}
            startIcon={submitting && <CircularProgress size={16} color="inherit" />}
          >
            {submitting ? 'Submitting...' : 'Yes, Submit Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
