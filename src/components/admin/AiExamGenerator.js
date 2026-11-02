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
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LaunchIcon from '@mui/icons-material/Launch';
import KeyIcon from '@mui/icons-material/Key';
import TimerIcon from '@mui/icons-material/Timer';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import GradeIcon from '@mui/icons-material/Grade';
import { useRouter } from 'next/navigation';

export default function AiExamGenerator() {
  const router = useRouter();

  const [sourceType, setSourceType] = useState('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [rawText, setRawText] = useState('');

  // Generation options
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionType, setQuestionType] = useState('mixed');
  const [subject, setSubject] = useState('');

  // Process states
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState('');
  const [createdExam, setCreatedExam] = useState(null);
  const [copied, setCopied] = useState(false);

  const handlePdfChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF file (.pdf)');
        return;
      }
      setPdfFile(file);
      setError('');
    }
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles(files);
      const previews = files.map((f) => URL.createObjectURL(f));
      setImagePreviews(previews);
      setError('');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setCreatedExam(null);

    // Validate inputs
    if (sourceType === 'youtube' && !youtubeUrl.trim()) {
      setError('Please provide a valid YouTube lecture URL.');
      return;
    }
    if (sourceType === 'pdf' && !pdfFile) {
      setError('Please upload a PDF document.');
      return;
    }
    if (sourceType === 'image' && imageFiles.length === 0) {
      setError('Please select at least one image/photo of notes or pages.');
      return;
    }
    if (sourceType === 'text' && (!rawText.trim() || rawText.trim().length < 30)) {
      setError('Please enter at least 30 characters of study notes or text.');
      return;
    }

    setGenerating(true);
    setProgressStep('Step 1/3: Reading and extracting study material content...');

    try {
      let res;

      if (sourceType === 'pdf' || sourceType === 'image') {
        const formData = new FormData();
        formData.append('sourceType', sourceType);
        formData.append('questionCount', questionCount.toString());
        formData.append('difficulty', difficulty);
        formData.append('questionType', questionType);
        if (subject.trim()) formData.append('subject', subject.trim());

        if (sourceType === 'pdf') {
          formData.append('pdf', pdfFile);
        } else if (sourceType === 'image') {
          for (const img of imageFiles) {
            formData.append('images', img);
          }
        }

        setProgressStep('Step 2/3: Groq AI is analyzing concepts & synthesizing examination questions...');

        res = await fetch('/api/admin/examinations/ai-generate', {
          method: 'POST',
          body: formData,
        });
      } else {
        setProgressStep('Step 2/3: Groq AI is analyzing lecture transcript & formulating questions...');

        res = await fetch('/api/admin/examinations/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceType,
            content: sourceType === 'youtube' ? youtubeUrl : rawText,
            questionCount,
            difficulty,
            questionType,
            subject: subject.trim() || undefined,
          }),
        });
      }

      setProgressStep('Step 3/3: Validating schema & automatically publishing exam...');

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate examination with AI');
      }

      setCreatedExam(data.examination);
    } catch (err) {
      setError(err.message || 'An error occurred while generating the examination.');
    } finally {
      setGenerating(false);
      setProgressStep('');
    }
  };

  const handleCopyLink = () => {
    if (!createdExam) return;
    const fullUrl = `${window.location.origin}/exam/${createdExam.publicId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Box>
      {/* Success View */}
      {createdExam ? (
        <Card
          sx={{
            border: '2px solid #34a853',
            borderRadius: 3,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 20px 0 rgba(52,168,83,0.15)',
            p: { xs: 2, sm: 4 },
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 68,
              height: 68,
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
            <CheckCircleOutlinedIcon sx={{ fontSize: 44 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: '#202124', mb: 1 }}>
            🎉 Examination Created & Published!
          </Typography>

          <Typography variant="body1" sx={{ color: '#5f6368', mb: 3 }}>
            <strong>{createdExam.title}</strong> has been synthesized by AI and is immediately live for candidates.
          </Typography>

          {/* Quick Metrics Badge Grid */}
          <Grid container spacing={2} sx={{ maxWidth: 650, mx: 'auto', mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <KeyIcon sx={{ color: '#1a73e8', fontSize: 24, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#5f6368', display: 'block' }}>
                  Exam PIN
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a73e8' }}>
                  {createdExam.pin}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <TimerIcon sx={{ color: '#f2994a', fontSize: 24, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#5f6368', display: 'block' }}>
                  Duration
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {createdExam.durationMinutes} min
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <QuizOutlinedIcon sx={{ color: '#9b51e0', fontSize: 24, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#5f6368', display: 'block' }}>
                  Questions
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {createdExam.questionCount}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <GradeIcon sx={{ color: '#27ae60', fontSize: 24, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#5f6368', display: 'block' }}>
                  Total Marks
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {createdExam.totalMarks}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Action CTAs */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyLink}
              sx={{ px: 3, py: 1.2, fontWeight: 600, borderRadius: 2 }}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Student Link'}
            </Button>

            <Button
              variant="outlined"
              color="primary"
              endIcon={<LaunchIcon />}
              component="a"
              href={`/exam/${createdExam.publicId}`}
              target="_blank"
              sx={{ px: 3, py: 1.2, fontWeight: 600, borderRadius: 2 }}
            >
              Open Student Portal
            </Button>

            <Button
              variant="outlined"
              onClick={() => router.push(`/admin/examinations/${createdExam.publicId}`)}
              sx={{ px: 3, py: 1.2, fontWeight: 600, borderRadius: 2, borderColor: '#dadce0', color: '#3c4043' }}
            >
              Manage in Admin Console
            </Button>

            <Button
              variant="text"
              onClick={() => {
                setCreatedExam(null);
                setYoutubeUrl('');
                setPdfFile(null);
                setImageFiles([]);
                setImagePreviews([]);
                setRawText('');
              }}
              sx={{ px: 3, py: 1.2, color: '#5f6368' }}
            >
              + Create Another Exam
            </Button>
          </Box>
        </Card>
      ) : (
        /* Generator Input Form */
        <Card sx={{ border: '1px solid #dadce0', borderRadius: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              backgroundColor: '#f8fafd',
              p: 3,
              borderBottom: '1px solid #e0e5eb',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                backgroundColor: '#e8f0fe',
                color: '#1a73e8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoAwesomeIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#202124', lineHeight: 1.2 }}>
                Instant AI Exam Generator
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.3 }}>
                Upload study material, paste a YouTube lecture link, or provide textbook photos. AI will automatically generate and publish the test.
              </Typography>
            </Box>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* Source Type Selector */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#202124', mb: 1.5 }}>
              Choose Study Material Source:
            </Typography>

            <ToggleButtonGroup
              value={sourceType}
              exclusive
              onChange={(e, val) => val && setSourceType(val)}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                mb: 3,
                gap: 1,
                '& .MuiToggleButton-root': {
                  borderRadius: 2,
                  px: 2.5,
                  py: 1,
                  border: '1px solid #dadce0 !important',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    backgroundColor: '#e8f0fe',
                    color: '#1a73e8',
                    borderColor: '#1a73e8 !important',
                  },
                },
              }}
            >
              <ToggleButton value="youtube">
                <YouTubeIcon sx={{ color: '#ea4335', mr: 1, fontSize: 20 }} />
                YouTube Lecture
              </ToggleButton>
              <ToggleButton value="pdf">
                <PictureAsPdfIcon sx={{ color: '#ea4335', mr: 1, fontSize: 20 }} />
                PDF Document / Book
              </ToggleButton>
              <ToggleButton value="image">
                <ImageIcon sx={{ color: '#34a853', mr: 1, fontSize: 20 }} />
                Notes / Textbook Photos
              </ToggleButton>
              <ToggleButton value="text">
                <DescriptionIcon sx={{ color: '#1a73e8', mr: 1, fontSize: 20 }} />
                Text / Syllabus Notes
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Dynamic Source Input Section */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 4, backgroundColor: '#ffffff' }}>
              {sourceType === 'youtube' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    YouTube Video URL
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    helperText="AI automatically fetches the video captions and transcript to create questions."
                  />
                </Box>
              )}

              {sourceType === 'pdf' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Upload PDF Document or Chapter
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed #dadce0',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      backgroundColor: '#f8f9fa',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#1a73e8', backgroundColor: '#f4f7fe' },
                    }}
                    component="label"
                  >
                    <input type="file" accept=".pdf" hidden onChange={handlePdfChange} />
                    <PictureAsPdfIcon sx={{ fontSize: 44, color: pdfFile ? '#137333' : '#ea4335', mb: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {pdfFile ? pdfFile.name : 'Click to browse or drop your PDF here'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', mt: 0.5 }}>
                      {pdfFile
                        ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze`
                        : 'Supports textbooks, lecture slides, research papers, notes (up to 15MB)'}
                    </Typography>
                  </Box>
                </Box>
              )}

              {sourceType === 'image' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Upload Textbook Pages or Hand-Written Notes
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed #dadce0',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      backgroundColor: '#f8f9fa',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#34a853', backgroundColor: '#f4fef7' },
                    }}
                    component="label"
                  >
                    <input type="file" accept="image/*" multiple hidden onChange={handleImagesChange} />
                    <ImageIcon sx={{ fontSize: 44, color: imageFiles.length > 0 ? '#137333' : '#34a853', mb: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {imageFiles.length > 0
                        ? `${imageFiles.length} photo(s) selected`
                        : 'Click to select or drop photos of notes/pages'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', mt: 0.5 }}>
                      Multimodal vision AI directly extracts and reads math formulas, text, diagrams, and notes.
                    </Typography>
                  </Box>

                  {imagePreviews.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                      {imagePreviews.map((src, i) => (
                        <Box
                          key={i}
                          component="img"
                          src={src}
                          alt={`Upload preview ${i + 1}`}
                          sx={{
                            width: 72,
                            height: 72,
                            objectFit: 'cover',
                            borderRadius: 1.5,
                            border: '1px solid #dadce0',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {sourceType === 'text' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Paste Lecture Notes or Syllabus Text
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    placeholder="Paste chapter notes, lecture summary, key formulas, or key concepts here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                </Box>
              )}
            </Paper>

            {/* Customization Controls */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#202124', mb: 2 }}>
              Generation Configuration:
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Question Count"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <MenuItem value={5}>5 Questions (Express Quiz)</MenuItem>
                  <MenuItem value={10}>10 Questions (Standard Test)</MenuItem>
                  <MenuItem value={15}>15 Questions (Full Exam)</MenuItem>
                  <MenuItem value={20}>20 Questions (Comprehensive)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Difficulty Level"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <MenuItem value="Easy">Easy (Conceptual & Direct)</MenuItem>
                  <MenuItem value="Medium">Medium (Analytical & Balanced)</MenuItem>
                  <MenuItem value="Hard">Hard (Advanced Problem Solving)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Question Composition"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                >
                  <MenuItem value="mixed">Mixed (MCQs + Written)</MenuItem>
                  <MenuItem value="mcq">MCQ Only (Instant Grading)</MenuItem>
                  <MenuItem value="written">Written / Short Answer Only</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Subject Hint (Optional)"
                  placeholder="e.g. Organic Chemistry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </Grid>
            </Grid>

            {/* Progress Display during generation */}
            {generating && (
              <Box sx={{ mb: 3 }}>
                <LinearProgress sx={{ borderRadius: 1, height: 6, mb: 1.5 }} />
                <Typography variant="body2" sx={{ color: '#1a73e8', fontWeight: 600 }}>
                  {progressStep}
                </Typography>
              </Box>
            )}

            {/* Action Button */}
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={generating}
              onClick={handleGenerate}
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{ py: 1.5, fontWeight: 700, borderRadius: 2, fontSize: '1rem' }}
            >
              {generating ? 'Synthesizing Examination with AI...' : 'Generate & Publish Examination Immediately'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
