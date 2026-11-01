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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PublishIcon from '@mui/icons-material/Publish';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useRouter, useParams } from 'next/navigation';

export default function ExaminationDetailsPage() {
  const router = useRouter();
  const { id } = useParams();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [pin, setPin] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(1);

  const fetchExam = async () => {
    try {
      const res = await fetch(`/api/examinations/${id}`);
      const data = await res.json();
      if (data.success && data.examination) {
        const e = data.examination;
        setExam(e);
        setTitle(e.title || '');
        setDescription(e.description || '');
        setSubject(e.subject || '');
        setPin(e.pin || '');
        setDurationMinutes(e.durationMinutes || 30);
        setMaxAttempts(e.maxAttempts || 1);
      } else {
        setSnackbar({ open: true, message: data.error || 'Exam not found', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to fetch exam', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExam();
  }, [id]);

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/exam/${exam.publicId}`;
    navigator.clipboard.writeText(shareUrl);
    setSnackbar({ open: true, message: 'Shareable link copied to clipboard!', severity: 'success' });
  };

  const handleSaveUpdates = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/examinations/${exam.publicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          subject,
          pin,
          durationMinutes: Number(durationMinutes),
          maxAttempts: Number(maxAttempts),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Examination updated successfully', severity: 'success' });
        fetchExam();
      } else {
        setSnackbar({ open: true, message: data.error || 'Update failed', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Network error', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    const action = exam.status === 'published' ? 'deactivate' : 'publish';
    try {
      const res = await fetch(`/api/examinations/${exam.publicId}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSnackbar({
          open: true,
          message: `Examination ${action === 'publish' ? 'published' : 'deactivated'} successfully`,
          severity: 'success',
        });
        fetchExam();
      } else {
        setSnackbar({ open: true, message: data.error || 'Action failed', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Action failed', severity: 'error' });
    }
  };

  const handleDeleteExam = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/examinations/${exam.publicId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Examination deleted successfully', severity: 'success' });
        setTimeout(() => {
          router.push('/admin/examinations');
        }, 500);
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to delete examination', severity: 'error' });
        setDeleting(false);
        setDeleteDialogOpen(false);
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Network error deleting examination', severity: 'error' });
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ color: '#1a73e8' }} />
      </Box>
    );
  }

  if (!exam) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6">Examination not found.</Typography>
        <Button onClick={() => router.push('/admin/examinations')} sx={{ mt: 2 }}>
          Back to Examinations
        </Button>
      </Box>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareableUrl = `${origin}/exam/${exam.publicId}`;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
      {/* Back button & Title */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/examinations')}
          sx={{ color: '#5f6368' }}
        >
          Examinations
        </Button>
      </Box>

      {/* Shareable Link Banner (if published) */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 2,
          border: '1px solid #1a73e8',
          backgroundColor: '#e8f0fe',
          boxShadow: '0 1px 3px 0 rgba(26,115,232,0.15)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a73e8', textTransform: 'uppercase' }}>
                Student Shareable Link & PIN
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500, color: '#202124', mt: 0.5 }}>
                {shareableUrl}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5f6368' }}>
                Examination PIN: <strong>{exam.pin}</strong> &bull; Status: {exam.status}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyLink}
                sx={{ borderRadius: '6px' }}
              >
                Copy Link
              </Button>

              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                component="a"
                href={`/api/examinations/${exam.publicId}/raw`}
                sx={{ backgroundColor: '#ffffff', borderColor: '#dadce0', color: '#3c4043' }}
              >
                JSON Paper
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2, mb: 4 }}>
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
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Examination Configuration
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368' }}>
                Public ID: {exam.publicId} &bull; Total Marks: {exam.totalMarks}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color={exam.status === 'published' ? 'warning' : 'success'}
                startIcon={exam.status === 'published' ? <PauseCircleOutlinedIcon /> : <PublishIcon />}
                onClick={handleTogglePublish}
              >
                {exam.status === 'published' ? 'Deactivate' : 'Publish'}
              </Button>

              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveUpdates}
                disabled={saving}
                sx={{ borderRadius: '6px' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlinedIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                sx={{
                  borderColor: '#dadce0',
                  color: '#d93025',
                  '&:hover': {
                    borderColor: '#d93025',
                    backgroundColor: '#fce8e6',
                  },
                }}
              >
                Delete
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Examination Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Instructions / Description"
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
                helperText="Required PIN for students"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Duration (Minutes)"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                helperText="Changes apply to new attempts"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Max Attempts per Student"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                helperText="Enforced server-side"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Questions Preview */}
      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Questions & Answer Keys ({exam.questions?.length || 0})
            </Typography>
            <Chip
              label={`${exam.totalMarks} Marks Total`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {exam.questions &&
            exam.questions.map((q, idx) => (
              <Box
                key={q.id}
                sx={{
                  p: 2.5,
                  mb: 2,
                  border: '1px solid #dadce0',
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#202124' }}>
                    Q{idx + 1}. {q.question}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                    <Chip label={q.type} size="small" sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }} />
                    <Chip label={`${q.marks} Marks`} size="small" color="primary" sx={{ fontSize: '0.7rem' }} />
                  </Box>
                </Box>

                {q.type === 'mcq' && q.options && (
                  <Box sx={{ pl: 2, mt: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 500, display: 'block', mb: 0.5 }}>
                      Options:
                    </Typography>
                    {q.options.map((opt) => {
                      const isCorrect = opt.id === q.correctAnswer;
                      return (
                        <Box
                          key={opt.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            py: 0.5,
                            color: isCorrect ? '#137333' : '#3c4043',
                            fontWeight: isCorrect ? 600 : 400,
                          }}
                        >
                          <Typography variant="body2">
                            ({opt.id}) {opt.text}
                          </Typography>
                          {isCorrect && (
                            <Chip
                              label="Correct Answer"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.68rem',
                                backgroundColor: '#e6f4ea',
                                color: '#137333',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {q.expectedAnswer && (
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: '#f8f9fa',
                      border: '1px dashed #dadce0',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#5f6368', fontWeight: 600, display: 'block' }}>
                      Expected Answer Reference:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#3c4043' }}>
                      {q.expectedAnswer}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card
        sx={{
          border: '1px solid #fce8e6',
          borderRadius: 2,
          backgroundColor: '#fffbfa',
          mt: 4,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#d93025' }}>
                Danger Zone: Delete This Examination
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
                Permanently delete this examination (&quot;{exam.title}&quot;) and all its questions, student submissions, and grading records.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteOutlinedIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                backgroundColor: '#d93025',
                '&:hover': { backgroundColor: '#b31412' },
              }}
            >
              Delete Examination
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#d93025' }}>
          Delete Examination?
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            Are you sure you want to permanently delete <strong>&quot;{exam.title}&quot;</strong> ({exam.publicId})?
            <Box sx={{ mt: 2, mb: 1, pl: 1 }}>
              <Typography variant="body2" sx={{ color: '#5f6368' }}>
                This will permanently remove:
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368', ml: 1.5, mt: 0.5 }}>
                &bull; All examination questions and answer keys<br />
                &bull; All student attempts and submitted papers<br />
                &bull; All grading evaluation records
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#d93025', mt: 1.5 }}>
              This action cannot be undone.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteExam}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlinedIcon />}
            sx={{ backgroundColor: '#d93025', '&:hover': { backgroundColor: '#b31412' } }}
          >
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

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
