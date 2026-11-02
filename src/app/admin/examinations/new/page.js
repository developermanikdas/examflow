'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useRouter } from 'next/navigation';
import { QuestionPaperSchema, calculateExamMetrics } from '@/lib/validation';
import AiExamGenerator from '@/components/admin/AiExamGenerator';

const STEPS = ['Upload JSON Paper', 'Review & Configure', 'Confirm & Publish'];

export default function CreateExaminationPage() {
  const router = useRouter();
  const [creationMode, setCreationMode] = useState('ai');
  const [activeStep, setActiveStep] = useState(0);

  // Raw JSON & Validation state
  const [jsonText, setJsonText] = useState('');
  const [parsedPaper, setParsedPaper] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Overrides / Configurations
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [pin, setPin] = useState(Math.floor(100000 + Math.random() * 900000).toString());
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [publishImmediately, setPublishImmediately] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Handle JSON file selection
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setJsonText(content);
        validateAndParse(content);
      }
    };
    reader.readAsText(file);
  };

  // Validates JSON structure and calculates authoritative metrics
  const validateAndParse = (raw) => {
    setValidationError('');
    setServerError('');
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') {
        throw new Error('Root JSON must be an object.');
      }
      if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
        throw new Error("JSON must include a non-empty 'questions' array.");
      }

      // Check full schema with Zod
      const parseResult = QuestionPaperSchema.safeParse(obj);
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues?.[0];
        const path = firstIssue?.path?.join('.') || '';
        throw new Error(`${firstIssue?.message || 'Invalid format'}${path ? ` (at ${path})` : ''}`);
      }

      const validData = parseResult.data;
      const metricsData = calculateExamMetrics(validData.questions);

      setParsedPaper(validData);
      setTitle(validData.title || 'Untitled Assessment');
      setDescription(validData.description || '');
      setSubject(validData.subject || 'General');
      setDurationMinutes(metricsData.durationMinutes);

      setMetrics({
        totalQuestions: validData.questions.length,
        totalMarks: metricsData.totalMarks,
        calculatedDuration: metricsData.durationMinutes,
        typeBreakdown: {
          mcq: metricsData.typeCounts.mcq,
          short_answer: metricsData.typeCounts.short_answer,
          descriptive: metricsData.typeCounts.descriptive,
          long_answer: metricsData.typeCounts.long_answer,
        },
      });

      return true;
    } catch (err) {
      setParsedPaper(null);
      setMetrics(null);
      setValidationError(err.message);
      return false;
    }
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      const isValid = validateAndParse(jsonText);
      if (!isValid) return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCreateExam = async (shouldPublish = false) => {
    setSubmitting(true);
    setServerError('');

    try {
      const res = await fetch('/api/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionPaper: parsedPaper,
          overrides: {
            title,
            description,
            subject,
            durationMinutes: Number(durationMinutes),
            pin,
            maxAttempts: Number(maxAttempts),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create examination');
      }

      // If user chose to publish immediately
      if (shouldPublish || publishImmediately) {
        await fetch(`/api/examinations/${data.examination.publicId}/publish`, {
          method: 'POST',
        });
      }

      router.push(`/admin/examinations/${data.examination.publicId}`);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
      {/* Page Title */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124' }}>
          Create New Examination
        </Typography>
        <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
          Synthesize exams from lectures, PDFs, textbook photos using Groq AI, or manually upload a structured JSON paper.
        </Typography>
      </Box>

      {/* Creation Mode Tabs */}
      <Box sx={{ borderBottom: '1px solid #dadce0', mb: 3.5 }}>
        <Tabs
          value={creationMode}
          onChange={(e, val) => setCreationMode(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.92rem',
              color: '#5f6368',
              px: 3,
              '&.Mui-selected': {
                color: '#1a73e8',
                fontWeight: 600,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1a73e8',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab
            value="ai"
            icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="AI Examination Generator"
          />
          <Tab
            value="manual"
            icon={<UploadFileOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Upload JSON Question Paper"
          />
        </Tabs>
      </Box>

      {/* AI Generator Mode */}
      {creationMode === 'ai' && <AiExamGenerator />}

      {/* Manual JSON Stepper Mode */}
      {creationMode === 'manual' && (
        <>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

      {/* Step 1: Upload JSON Paper */}
      {activeStep === 0 && (
        <Card sx={{ border: '1px solid #dadce0', borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                mb: 3,
              }}
            >
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Upload Question Paper
              </Typography>

              <Button
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                component="a"
                href="/demo-exam-template.json"
                download="demo-exam-template.json"
                sx={{ borderColor: '#dadce0', color: '#1a73e8' }}
              >
                Download Demo JSON Template
              </Button>
            </Box>

            {/* Drop / File Select Box */}
            <Box
              component="label"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer?.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const content = event.target?.result;
                    if (typeof content === 'string') {
                      setJsonText(content);
                      validateAndParse(content);
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 3, sm: 5 },
                textAlign: 'center',
                backgroundColor: isDragging ? '#e8f0fe' : '#f8f9fa',
                border: isDragging ? '2px dashed #1a73e8' : '2px dashed #dadce0',
                borderRadius: 2,
                cursor: 'pointer',
                mb: 3,
                width: '100%',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#1a73e8',
                  backgroundColor: isDragging ? '#e8f0fe' : '#f1f3f4',
                },
              }}
            >
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <UploadFileOutlinedIcon sx={{ fontSize: 48, color: '#1a73e8', mb: 1.5 }} />
              <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500, color: '#202124', mb: 0.5 }}>
                Click to browse or drop your JSON question paper here
              </Typography>
              <Typography variant="body2" component="div" sx={{ color: '#5f6368' }}>
                Strict versioned schema format (v1.0). Only valid JSON papers can be published.
              </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#5f6368', mb: 1 }}>
              Or paste raw JSON content:
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={9}
              placeholder="Paste JSON here... e.g. { &quot;schemaVersion&quot;: &quot;1.0&quot;, &quot;title&quot;: &quot;...&quot;, &quot;questions&quot;: [...] }"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                if (e.target.value.trim()) {
                  validateAndParse(e.target.value);
                }
              }}
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                mb: 3,
              }}
            />

            {validationError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                <strong>Validation Error:</strong> {validationError}
              </Alert>
            )}

            {metrics && (
              <Alert
                icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
                severity="success"
                sx={{ mb: 3, borderRadius: 2 }}
              >
                <strong>Valid Question Paper Detected:</strong> {metrics.totalQuestions} questions found.
                Calculated total marks: <strong>{metrics.totalMarks}</strong>. Suggested duration:{' '}
                <strong>{metrics.calculatedDuration} minutes</strong>.
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                disabled={!metrics}
                onClick={handleNextStep}
                sx={{ borderRadius: '6px' }}
              >
                Proceed to Configuration &rarr;
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review & Configure */}
      {activeStep === 1 && metrics && (
        <Card sx={{ border: '1px solid #dadce0', borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 1 }}>
              Examination Parameters & Duration Formula
            </Typography>
            <Typography variant="body2" sx={{ color: '#5f6368', mb: 3 }}>
              Adjust examination metadata and inspect the automatic duration calculation
            </Typography>

            {/* Duration Calculation Insight Card */}
            <Card
              sx={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dadce0',
                borderRadius: 2,
                p: 2.5,
                mb: 4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CalculateOutlinedIcon sx={{ color: '#1a73e8' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#202124' }}>
                  Authoritative Timer Calculation Formula
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#5f6368', mb: 1.5 }}>
                Duration = Sum of (Questions per type &times; Configured time allocation):
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1.5, backgroundColor: '#ffffff', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>MCQs (2 min each)</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {metrics.typeBreakdown.mcq} &times; 2m = {metrics.typeBreakdown.mcq * 2}m
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1.5, backgroundColor: '#ffffff', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>Short Answer (4 min)</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {metrics.typeBreakdown.short_answer} &times; 4m = {metrics.typeBreakdown.short_answer * 4}m
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1.5, backgroundColor: '#ffffff', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>Descriptive (15 min)</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {metrics.typeBreakdown.descriptive} &times; 15m = {metrics.typeBreakdown.descriptive * 15}m
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1.5, backgroundColor: '#ffffff', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" sx={{ color: '#5f6368' }}>Long Answer (30 min)</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {metrics.typeBreakdown.long_answer} &times; 30m = {metrics.typeBreakdown.long_answer * 30}m
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`Calculated Duration: ${metrics.calculatedDuration} Minutes`}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`Total Marks: ${metrics.totalMarks}`}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Card>

            {/* Editable Fields */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Examination Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Subject / Topic"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Instructions / Description for Students"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Examination PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  helperText="Required for student entry"
                  InputProps={{
                    startAdornment: <KeyOutlinedIcon fontSize="small" sx={{ mr: 1, color: '#5f6368' }} />,
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (Minutes Override)"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  helperText="Admin can manually override"
                  InputProps={{
                    startAdornment: <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: '#5f6368' }} />,
                  }}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Attempts"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  helperText="Default 1 attempt per student"
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button onClick={handlePrevStep}>&larr; Back to JSON</Button>
              <Button variant="contained" onClick={handleNextStep} sx={{ borderRadius: '6px' }}>
                Review Paper &rarr;
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm & Publish */}
      {activeStep === 2 && parsedPaper && (
        <Card sx={{ border: '1px solid #dadce0', borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 1 }}>
              Confirm & Create Examination
            </Typography>
            <Typography variant="body2" sx={{ color: '#5f6368', mb: 3 }}>
              Verify final examination specifications before creating the unique URL
            </Typography>

            {serverError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {serverError}
              </Alert>
            )}

            {/* Summary Paper Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, backgroundColor: '#f8f9fa' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, letterSpacing: '0.5px' }}>
                    TITLE
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                    {title}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, letterSpacing: '0.5px' }}>
                    SUBJECT
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                    {subject}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, letterSpacing: '0.5px' }}>
                    ACCESS PIN
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {pin}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, letterSpacing: '0.5px' }}>
                    QUESTIONS & MARKS
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {parsedPaper.questions.length} Questions &bull; {metrics.totalMarks} Marks
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, letterSpacing: '0.5px' }}>
                    DURATION
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {durationMinutes} Minutes
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, letterSpacing: '0.5px' }}>
                    MAX ATTEMPTS
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {maxAttempts} per student
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Questions Quick Preview */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#3c4043', mb: 2 }}>
              Questions Preview ({parsedPaper.questions.length}):
            </Typography>

            <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 1, mb: 4 }}>
              {parsedPaper.questions.map((q, idx) => (
                <Box
                  key={q.id}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    border: '1px solid #dadce0',
                    borderRadius: 1.5,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Q{idx + 1}. {q.question}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={q.type} size="small" sx={{ fontSize: '0.72rem' }} />
                      <Chip label={`${q.marks} Marks`} size="small" color="primary" sx={{ fontSize: '0.72rem' }} />
                    </Box>
                  </Box>

                  {q.type === 'mcq' && q.options && (
                    <Box sx={{ mt: 1, pl: 2 }}>
                      {q.options.map((opt) => (
                        <Typography
                          key={opt.id}
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: opt.id === q.correctAnswer ? '#137333' : '#5f6368',
                            fontWeight: opt.id === q.correctAnswer ? 600 : 400,
                          }}
                        >
                          ({opt.id}) {opt.text} {opt.id === q.correctAnswer && '✔ (Correct Key)'}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Button onClick={handlePrevStep} disabled={submitting}>
                &larr; Back to Settings
              </Button>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  disabled={submitting}
                  onClick={() => handleCreateExam(false)}
                  sx={{ borderRadius: '6px' }}
                >
                  Save as Draft
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                  onClick={() => handleCreateExam(true)}
                  sx={{ borderRadius: '6px' }}
                >
                  {submitting ? 'Creating...' : 'Publish Immediately & Get Link'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </Box>
  );
}
