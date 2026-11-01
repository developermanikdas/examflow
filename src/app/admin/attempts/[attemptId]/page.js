'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useRouter, useParams } from 'next/navigation';

export default function AttemptDetailsAndGradingPage() {
  const router = useRouter();
  const { attemptId } = useParams();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Local state for grading inputs: { [questionId]: { marks: number, feedback: string, saving: boolean } }
  const [gradingState, setGradingState] = useState({});

  const fetchAttempt = async () => {
    try {
      const res = await fetch(`/api/admin/attempts/${attemptId}`);
      const data = await res.json();
      if (data.success && data.attempt) {
        setAttempt(data.attempt);

        // Pre-populate grading inputs for all questions in the exam
        const initialGrading = {};
        const existingEvals = new Map(
          (data.attempt.questionEvaluations || []).map((e) => [e.questionId, e])
        );
        for (const q of data.attempt.examinationId?.questions || []) {
          const evalItem = existingEvals.get(q.id);
          initialGrading[q.id] = {
            marks: evalItem?.marksAwarded ?? 0,
            feedback: evalItem?.evaluatorFeedback || '',
            saving: false,
          };
        }
        setGradingState(initialGrading);
      } else {
        setSnackbar({ open: true, message: data.error || 'Attempt not found', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load attempt', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  const handleGradeChange = (questionId, field, value) => {
    setGradingState((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { marks: 0, feedback: '', saving: false }),
        [field]: value,
      },
    }));
  };

  const handleSaveGrade = async (questionId, maxMarks) => {
    const qGrade = gradingState[questionId] || { marks: 0, feedback: '', saving: false };

    const marksNum = Number(qGrade.marks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
      setSnackbar({
        open: true,
        message: `Marks must be between 0 and ${maxMarks}`,
        severity: 'warning',
      });
      return;
    }

    setGradingState((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), saving: true },
    }));

    try {
      const res = await fetch(`/api/admin/attempts/${attemptId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          marksAwarded: marksNum,
          evaluatorFeedback: qGrade.feedback,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Question graded successfully!', severity: 'success' });
        // Refresh attempt data to reflect updated total marks & percentages
        fetchAttempt();
      } else {
        setSnackbar({ open: true, message: data.error || 'Grading failed', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Network error saving grade', severity: 'error' });
    } finally {
      setGradingState((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], saving: false },
      }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ color: '#1a73e8' }} />
      </Box>
    );
  }

  if (!attempt) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6">Attempt not found.</Typography>
        <Button onClick={() => router.push('/admin/attempts')} sx={{ mt: 2 }}>
          Back to Attempts
        </Button>
      </Box>
    );
  }

  const exam = attempt.examinationId;
  const questions = exam?.questions || [];
  const answersMap = new Map();
  for (const a of attempt.answers || []) {
    answersMap.set(a.questionId, a.answer);
  }

  const evalsMap = new Map();
  for (const ev of attempt.questionEvaluations || []) {
    evalsMap.set(ev.questionId, ev);
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
      {/* Back button */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/attempts')}
          sx={{ color: '#5f6368' }}
        >
          Student Attempts
        </Button>
      </Box>

      {/* Header Profile & Score Card */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 2,
          border: '1px solid #dadce0',
          boxShadow: '0 1px 3px 0 rgba(60,64,67,0.1)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonOutlinedIcon sx={{ color: '#1a73e8' }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124' }}>
                  {attempt.studentName}
                </Typography>
                <Chip
                  label={`Attempt #${attempt.attemptNumber}`}
                  size="small"
                  sx={{ backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
                {attempt.studentEmail} &bull; Examination: <strong>{exam?.title}</strong> ({attempt.examPublicId})
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              component="a"
              href={`/api/admin/attempts/export?attemptId=${attempt._id}`}
              sx={{ borderColor: '#dadce0', color: '#1a73e8', backgroundColor: '#ffffff' }}
            >
              Download Attempt JSON
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Session & Scoring Grid */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" sx={{ color: '#5f6368' }}>TOTAL SCORE</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a73e8' }}>
                {attempt.obtainedMarks} / {attempt.totalMarks}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5f6368' }}>
                {attempt.percentage}% Overall
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Typography variant="caption" sx={{ color: '#5f6368' }}>STATUS</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={attempt.status.replace('_', ' ')}
                  size="small"
                  color={
                    attempt.status === 'evaluated'
                      ? 'success'
                      : ['submitted', 'auto_submitted'].includes(attempt.status)
                      ? 'primary'
                      : 'warning'
                  }
                  sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                />
              </Box>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Typography variant="caption" sx={{ color: '#5f6368' }}>EVALUATION</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={
                    attempt.evaluationStatus === 'fully_evaluated'
                      ? 'Fully Graded'
                      : attempt.evaluationStatus === 'partially_evaluated'
                      ? 'Partially Graded'
                      : 'Pending Grading'
                  }
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: attempt.evaluationStatus === 'fully_evaluated' ? '#137333' : '#e37400',
                    color: attempt.evaluationStatus === 'fully_evaluated' ? '#137333' : '#e37400',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Typography variant="caption" sx={{ color: '#5f6368' }}>SUBMISSION TIME</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                {attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })
                  : 'In Progress'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Questions & Responses Grading Section */}
      <Typography variant="h6" sx={{ fontSize: '1.15rem', fontWeight: 600, mb: 2 }}>
        Question-by-Question Evaluation
      </Typography>

      {questions.map((q, idx) => {
        const studentAns = answersMap.get(q.id);
        const evalItem = evalsMap.get(q.id);
        const isMcq = q.type === 'mcq';
        const qGrade = gradingState[q.id] || { marks: 0, feedback: '', saving: false };

        return (
          <Card
            key={q.id}
            sx={{
              border: '1px solid #dadce0',
              borderRadius: 2,
              mb: 3,
              boxShadow: '0 1px 2px 0 rgba(60,64,67,0.06)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              {/* Question Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#202124' }}>
                    Question {idx + 1}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#3c4043', mt: 0.5, fontWeight: 500 }}>
                    {q.question}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, ml: 2, flexShrink: 0 }}>
                  <Chip label={q.type.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize' }} />
                  <Chip label={`Max: ${q.marks} Marks`} size="small" color="primary" variant="outlined" />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Student Response Display */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, textTransform: 'uppercase' }}>
                  Student Response:
                </Typography>

                {isMcq ? (
                  <Box sx={{ mt: 1 }}>
                    {studentAns ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Selected: ({studentAns}){' '}
                          {q.options?.find((o) => o.id === studentAns)?.text || studentAns}
                        </Typography>

                        {evalItem?.isCorrect ? (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                            label={`Correct (+${q.marks} mark${q.marks === 1 ? '' : 's'})`}
                            size="small"
                            sx={{ backgroundColor: '#e6f4ea', color: '#137333', fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            icon={<CancelIcon sx={{ fontSize: '1rem !important' }} />}
                            label="Incorrect (0 marks)"
                            size="small"
                            sx={{ backgroundColor: '#fce8e6', color: '#c5221f', fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#80868b', fontStyle: 'italic', mt: 0.5 }}>
                        Unanswered
                      </Typography>
                    )}

                    {/* Show Correct Answer Key */}
                    <Typography variant="caption" sx={{ color: '#137333', display: 'block', mt: 1, fontWeight: 500 }}>
                      Correct Key: ({q.correctAnswer}) {q.options?.find((o) => o.id === q.correctAnswer)?.text}
                    </Typography>
                  </Box>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mt: 1,
                      backgroundColor: studentAns ? '#ffffff' : '#f8f9fa',
                      borderRadius: 1.5,
                      borderColor: '#dadce0',
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        color: studentAns ? '#202124' : '#80868b',
                        fontStyle: studentAns ? 'normal' : 'italic',
                      }}
                    >
                      {studentAns ? String(studentAns) : 'Student did not provide an answer.'}
                    </Typography>
                  </Paper>
                )}
              </Box>

              {/* Reference Answer Guide (if written) */}
              {!isMcq && q.expectedAnswer && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    backgroundColor: '#f8f9fa',
                    border: '1px dashed #dadce0',
                    borderRadius: 1.5,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, display: 'block' }}>
                    Instructor Evaluation Guide / Expected Answer:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#3c4043', mt: 0.5 }}>
                    {q.expectedAnswer}
                  </Typography>
                </Box>
              )}

              {/* Manual Grading Inputs (for written questions) */}
              {!isMcq && (
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: '#f1f3f4',
                    border: '1px solid #dadce0',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#202124', mb: 2 }}>
                    Manual Evaluation & Scoring:
                  </Typography>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={`Marks Awarded (Max ${q.marks})`}
                        value={qGrade.marks ?? ''}
                        onChange={(e) => handleGradeChange(q.id, 'marks', e.target.value)}
                        inputProps={{ min: 0, max: q.marks, step: 0.5 }}
                        sx={{ backgroundColor: '#ffffff', borderRadius: 1 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Evaluator Comments / Feedback (Optional)"
                        value={qGrade.feedback}
                        onChange={(e) => handleGradeChange(q.id, 'feedback', e.target.value)}
                        placeholder="e.g. Good explanation, missed TCP details."
                        sx={{ backgroundColor: '#ffffff', borderRadius: 1 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        startIcon={qGrade.saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                        disabled={qGrade.saving}
                        onClick={() => handleSaveGrade(q.id, q.marks)}
                        sx={{ borderRadius: '6px', py: 0.9 }}
                      >
                        {qGrade.saving ? 'Saving...' : 'Save Grade'}
                      </Button>
                    </Grid>
                  </Grid>

                  {evalItem?.evaluatedAt && (
                    <Typography variant="caption" sx={{ color: '#137333', mt: 1.5, display: 'block' }}>
                      Graded on {new Date(evalItem.evaluatedAt).toLocaleString()} ({evalItem.marksAwarded} / {q.marks} marks assigned)
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Snackbar alerts */}
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
