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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import LaunchOutlinedIcon from '@mui/icons-material/LaunchOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import GradeOutlinedIcon from '@mui/icons-material/GradeOutlined';
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
      setError('Please select at least one image or photo of study materials.');
      return;
    }
    if (sourceType === 'text' && (!rawText.trim() || rawText.trim().length < 30)) {
      setError('Please enter at least 30 characters of study notes or text.');
      return;
    }

    setGenerating(true);
    setProgressStep('Step 1 of 3: Extracting material content...');

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

        setProgressStep('Step 2 of 3: AI is analyzing concepts and formulating questions...');

        res = await fetch('/api/admin/examinations/ai-generate', {
          method: 'POST',
          body: formData,
        });
      } else {
        setProgressStep('Step 2 of 3: AI is analyzing lecture transcript and formulating questions...');

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

      setProgressStep('Step 3 of 3: Validating schema and publishing live...');

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
            border: '1px solid #dadce0',
            borderRadius: 2,
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.06)',
            p: { xs: 2.5, sm: 4 },
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
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
            <CheckCircleOutlinedIcon sx={{ fontSize: 32 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124', mb: 0.5 }}>
            Examination Published Successfully
          </Typography>

          <Typography variant="body2" sx={{ color: '#5f6368', mb: 3 }}>
            <strong>{createdExam.title}</strong> has been synthesized by AI and is live for candidates.
          </Typography>

          {/* KPI Metrics Grid */}
          <Grid container spacing={2} sx={{ maxWidth: 640, mx: 'auto', mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: '#f8f9fa' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#e8f0fe',
                    color: '#1a73e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  <VpnKeyOutlinedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PIN
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a73e8', mt: 0.2 }}>
                  {createdExam.pin}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: '#f8f9fa' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#fef7e0',
                    color: '#e37400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  <TimerOutlinedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Duration
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#202124', mt: 0.2 }}>
                  {createdExam.durationMinutes} min
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: '#f8f9fa' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#f1f3f4',
                    color: '#5f6368',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  <QuizOutlinedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Questions
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#202124', mt: 0.2 }}>
                  {createdExam.questionCount}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: '#f8f9fa' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#e6f4ea',
                    color: '#137333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  <GradeOutlinedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Marks
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#137333', mt: 0.2 }}>
                  {createdExam.totalMarks}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ContentCopyOutlinedIcon />}
              onClick={handleCopyLink}
              sx={{ px: 2.5, py: 1 }}
            >
              {copied ? 'Link Copied' : 'Copy Student Link'}
            </Button>

            <Button
              variant="outlined"
              color="primary"
              endIcon={<LaunchOutlinedIcon />}
              component="a"
              href={`/exam/${createdExam.publicId}`}
              target="_blank"
              sx={{ px: 2.5, py: 1 }}
            >
              Open Student Portal
            </Button>

            <Button
              variant="outlined"
              onClick={() => router.push(`/admin/examinations/${createdExam.publicId}`)}
              sx={{ px: 2.5, py: 1, borderColor: '#dadce0', color: '#3c4043' }}
            >
              Manage in Console
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
              sx={{ px: 2, py: 1, color: '#5f6368' }}
            >
              Create Another Examination
            </Button>
          </Box>
        </Card>
      ) : (
        /* Generator Input Form */
        <Card sx={{ border: '1px solid #dadce0', borderRadius: 2 }}>
          <Box
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderBottom: '1px solid #dadce0',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                backgroundColor: '#e8f0fe',
                color: '#1a73e8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoAwesomeOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600, color: '#202124' }}>
                AI Examination Generator
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.2 }}>
                Provide lecture materials, video links, or textbook notes to automatically synthesize an authoritative examination paper.
              </Typography>
            </Box>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>
                {error}
              </Alert>
            )}

            {/* Source Type Tabs */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#202124', mb: 1.5 }}>
              Study Material Source:
            </Typography>

            <Tabs
              value={sourceType}
              onChange={(e, val) => val && setSourceType(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                minHeight: 44,
                borderBottom: '1px solid #dadce0',
                mb: 3,
                '& .MuiTab-root': {
                  minHeight: 44,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.88rem',
                  color: '#5f6368',
                  px: 2.5,
                  '&.Mui-selected': {
                    color: '#1a73e8',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <Tab
                value="youtube"
                icon={<YouTubeIcon sx={{ color: '#d93025', fontSize: 20 }} />}
                iconPosition="start"
                label="YouTube Lecture"
              />
              <Tab
                value="pdf"
                icon={<PictureAsPdfOutlinedIcon sx={{ color: '#d93025', fontSize: 20 }} />}
                iconPosition="start"
                label="PDF Document"
              />
              <Tab
                value="image"
                icon={<ImageOutlinedIcon sx={{ color: '#137333', fontSize: 20 }} />}
                iconPosition="start"
                label="Textbook Photos"
              />
              <Tab
                value="text"
                icon={<DescriptionOutlinedIcon sx={{ color: '#1a73e8', fontSize: 20 }} />}
                iconPosition="start"
                label="Notes & Syllabus"
              />
            </Tabs>

            {/* Source Input Area */}
            <Box sx={{ mb: 3.5 }}>
              {sourceType === 'youtube' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    YouTube Video URL
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    helperText="Captions and transcript are extracted automatically to formulate assessment questions."
                  />
                </Box>
              )}

              {sourceType === 'pdf' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#202124' }}>
                    Upload PDF Document or Chapter
                  </Typography>
                  <Box
                    component="label"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        if (!file.name.toLowerCase().endsWith('.pdf')) {
                          setError('Please drop a valid PDF file (.pdf)');
                          return;
                        }
                        setPdfFile(file);
                        setError('');
                      }
                    }}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                      border: pdfFile ? '1.5px solid #137333' : '1.5px dashed #dadce0',
                      borderRadius: 2,
                      py: 4,
                      px: 3,
                      textAlign: 'center',
                      backgroundColor: pdfFile ? '#f6fbf7' : '#f8f9fa',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#1a73e8',
                        backgroundColor: pdfFile ? '#eef7f0' : '#f1f3f4',
                      },
                    }}
                  >
                    <input type="file" accept=".pdf" hidden onChange={handlePdfChange} />
                    <PictureAsPdfOutlinedIcon
                      sx={{ fontSize: 44, color: pdfFile ? '#137333' : '#5f6368', mb: 1.5 }}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#202124' }}>
                      {pdfFile ? pdfFile.name : 'Click to select or drag and drop a PDF file'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', mt: 0.5 }}>
                      {pdfFile
                        ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze (click or drop new file to replace)`
                        : 'Supports textbooks, research papers, chapters, and course notes (up to 25MB)'}
                    </Typography>
                  </Box>
                </Box>
              )}

              {sourceType === 'image' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#202124' }}>
                    Upload Textbook Pages or Hand-Written Notes
                  </Typography>
                  <Box
                    component="label"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = Array.from(e.dataTransfer.files || []).filter((f) =>
                        f.type.startsWith('image/')
                      );
                      if (files.length > 0) {
                        setImageFiles(files);
                        const previews = files.map((f) => URL.createObjectURL(f));
                        setImagePreviews(previews);
                        setError('');
                      } else {
                        setError('Please drop valid image files (JPG, PNG, WebP).');
                      }
                    }}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                      border: imageFiles.length > 0 ? '1.5px solid #137333' : '1.5px dashed #dadce0',
                      borderRadius: 2,
                      py: 4,
                      px: 3,
                      textAlign: 'center',
                      backgroundColor: imageFiles.length > 0 ? '#f6fbf7' : '#f8f9fa',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#1a73e8',
                        backgroundColor: imageFiles.length > 0 ? '#eef7f0' : '#f1f3f4',
                      },
                    }}
                  >
                    <input type="file" accept="image/*" multiple hidden onChange={handleImagesChange} />
                    <ImageOutlinedIcon
                      sx={{ fontSize: 44, color: imageFiles.length > 0 ? '#137333' : '#5f6368', mb: 1.5 }}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#202124' }}>
                      {imageFiles.length > 0
                        ? `${imageFiles.length} photo(s) selected (click to replace)`
                        : 'Click to select or drag and drop photos of pages/notes'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', mt: 0.5 }}>
                      Multimodal vision model reads textbook diagrams, handwritten notes, and formulas.
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
                            width: 68,
                            height: 68,
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
                    rows={5}
                    placeholder="Paste chapter notes, lecture summaries, key formulas, or syllabus concepts..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                </Box>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Configuration Controls */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#202124', mb: 2 }}>
              Examination Parameters:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3.5 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Question Count"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <MenuItem value={5}>5 Questions</MenuItem>
                  <MenuItem value={10}>10 Questions</MenuItem>
                  <MenuItem value={15}>15 Questions</MenuItem>
                  <MenuItem value={20}>20 Questions</MenuItem>
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
                  <MenuItem value="Easy">Easy (Conceptual)</MenuItem>
                  <MenuItem value="Medium">Medium (Balanced)</MenuItem>
                  <MenuItem value="Hard">Hard (Analytical)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Question Type"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                >
                  <MenuItem value="mixed">Mixed (MCQs & Written)</MenuItem>
                  <MenuItem value="mcq">Multiple Choice Only</MenuItem>
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

            {/* Progress Display */}
            {generating && (
              <Box sx={{ mb: 3 }}>
                <LinearProgress sx={{ borderRadius: 1, height: 4, mb: 1.5 }} />
                <Typography variant="body2" sx={{ color: '#1a73e8', fontWeight: 500 }}>
                  {progressStep}
                </Typography>
              </Box>
            )}

            {/* Action Button */}
            <Button
              variant="contained"
              color="primary"
              disabled={generating}
              onClick={handleGenerate}
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeOutlinedIcon />}
              sx={{ px: 3, py: 1.2, fontWeight: 500 }}
            >
              {generating ? 'Synthesizing Examination...' : 'Generate & Publish Examination'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
