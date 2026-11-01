'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PublishIcon from '@mui/icons-material/Publish';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useRouter } from 'next/navigation';

export default function ExaminationsListPage() {
  const router = useRouter();
  const [examinations, setExaminations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, exam: null, deleting: false });

  const fetchExams = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusTab !== 'all') queryParams.append('status', statusTab);
      if (search.trim()) queryParams.append('search', search.trim());

      const res = await fetch(`/api/examinations?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExaminations(data.examinations || []);
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to load examinations', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [statusTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchExams();
  };

  const handleCopyLink = (publicId, pin) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/exam/${publicId}`;
    navigator.clipboard.writeText(shareUrl);
    setSnackbar({
      open: true,
      message: `Link copied! Exam PIN: ${pin}`,
      severity: 'success',
    });
  };

  const handlePublish = async (publicId) => {
    try {
      const res = await fetch(`/api/examinations/${publicId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Examination published successfully!', severity: 'success' });
        fetchExams();
      } else {
        setSnackbar({ open: true, message: data.error || 'Publish failed', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Network error', severity: 'error' });
    }
  };

  const handleDeactivate = async (publicId) => {
    try {
      const res = await fetch(`/api/examinations/${publicId}/deactivate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Examination deactivated.', severity: 'info' });
        fetchExams();
      } else {
        setSnackbar({ open: true, message: data.error || 'Deactivation failed', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Network error', severity: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.exam) return;
    setDeleteDialog((prev) => ({ ...prev, deleting: true }));

    try {
      const res = await fetch(`/api/examinations/${deleteDialog.exam.publicId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Examination deleted successfully', severity: 'success' });
        setDeleteDialog({ open: false, exam: null, deleting: false });
        fetchExams();
      } else {
        setSnackbar({ open: true, message: data.error || 'Delete failed', severity: 'error' });
        setDeleteDialog((prev) => ({ ...prev, deleting: false }));
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to delete examination', severity: 'error' });
      setDeleteDialog((prev) => ({ ...prev, deleting: false }));
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124' }}>
            Examinations
          </Typography>
          <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
            Create, publish, configure PINs, and generate student access links
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddCircleOutlinedIcon />}
          onClick={() => router.push('/admin/examinations/new')}
          sx={{ borderRadius: '6px' }}
        >
          Create Examination
        </Button>
      </Box>

      {/* Tabs & Search Filter Card */}
      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2, mb: 3 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 2,
            borderBottom: '1px solid #f1f3f4',
          }}
        >
          <Tabs
            value={statusTab}
            onChange={(e, val) => setStatusTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 44 }}
          >
            <Tab label="All Papers" value="all" sx={{ textTransform: 'none', fontWeight: 500 }} />
            <Tab label="Published" value="published" sx={{ textTransform: 'none', fontWeight: 500 }} />
            <Tab label="Drafts" value="draft" sx={{ textTransform: 'none', fontWeight: 500 }} />
            <Tab label="Deactivated" value="deactivated" sx={{ textTransform: 'none', fontWeight: 500 }} />
          </Tabs>

          <Box component="form" onSubmit={handleSearchSubmit} sx={{ width: { xs: '100%', md: 320 } }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search title, subject, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#5f6368' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        {/* Table of Examinations */}
        <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 850 }}>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Examination</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Questions / Marks</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Duration</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Access PIN</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Attempts</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#5f6368' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#1a73e8' }} />
                  </TableCell>
                </TableRow>
              ) : examinations.length > 0 ? (
                examinations.map((exam) => (
                  <TableRow key={exam._id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: '#1a73e8',
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={() => router.push(`/admin/examinations/${exam.publicId}`)}
                      >
                        {exam.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#80868b' }}>
                        ID: {exam.publicId}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{exam.subject}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {exam.questionCount} Qs &bull; {exam.totalMarks} Marks
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{exam.durationMinutes} mins</Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={exam.pin}
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          backgroundColor: '#f1f3f4',
                          color: '#202124',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={exam.status}
                        size="small"
                        color={
                          exam.status === 'published'
                            ? 'success'
                            : exam.status === 'draft'
                            ? 'warning'
                            : 'default'
                        }
                        sx={{ textTransform: 'capitalize', fontSize: '0.75rem' }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {exam.attemptCount || 0}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        {exam.status === 'published' && (
                          <Tooltip title="Copy Shareable Student URL">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyLink(exam.publicId, exam.pin)}
                              sx={{ color: '#1a73e8' }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Download Original JSON">
                          <IconButton
                            size="small"
                            component="a"
                            href={`/api/examinations/${exam.publicId}/raw`}
                            sx={{ color: '#5f6368' }}
                          >
                            <FileDownloadOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="View & Edit Details">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/admin/examinations/${exam.publicId}`)}
                            sx={{ color: '#5f6368' }}
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {exam.status === 'draft' || exam.status === 'deactivated' ? (
                          <Tooltip title="Publish Examination">
                            <IconButton
                              size="small"
                              onClick={() => handlePublish(exam.publicId)}
                              sx={{ color: '#137333' }}
                            >
                              <PublishIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Deactivate Examination">
                            <IconButton
                              size="small"
                              onClick={() => handleDeactivate(exam.publicId)}
                              sx={{ color: '#e37400' }}
                            >
                              <PauseCircleOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Delete Examination">
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, exam, deleting: false })}
                            sx={{
                              color: '#d93025',
                              '&:hover': { backgroundColor: '#fce8e6' },
                            }}
                            aria-label="Delete Examination"
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#5f6368' }}>
                    No examinations found in this category. Click &quot;Create Examination&quot; to upload your first JSON paper.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => !deleteDialog.deleting && setDeleteDialog({ open: false, exam: null, deleting: false })}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete examination &quot;{deleteDialog.exam?.title}&quot; ({deleteDialog.exam?.publicId})?
            All associated student attempts and grading records will also be removed. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, exam: null, deleting: false })}
            disabled={deleteDialog.deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteDialog.deleting}
            startIcon={deleteDialog.deleting && <CircularProgress size={16} color="inherit" />}
          >
            {deleteDialog.deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

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
