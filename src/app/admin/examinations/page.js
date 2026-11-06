'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
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
import MenuItem from '@mui/material/MenuItem';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ClearIcon from '@mui/icons-material/Clear';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import { useRouter } from 'next/navigation';

export default function ExaminationsListPage() {
  const router = useRouter();
  const [examinations, setExaminations] = useState([]);
  const [students, setStudents] = useState([]);
  const [metrics, setMetrics] = useState({ totalCount: 0, attemptedCount: 0, unattemptedCount: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [attemptFilter, setAttemptFilter] = useState('all'); // 'all' | 'attempted' | 'unattempted'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'draft' | 'deactivated'
  const [selectedStudent, setSelectedStudent] = useState(''); // email of candidate
  const [search, setSearch] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, exam: null, deleting: false });

  const fetchExams = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (attemptFilter !== 'all') queryParams.append('attemptFilter', attemptFilter);
      if (selectedStudent) queryParams.append('student', selectedStudent);
      if (search.trim()) queryParams.append('search', search.trim());

      const res = await fetch(`/api/examinations?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExaminations(data.examinations || []);
        if (data.students) setStudents(data.students);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to load examinations', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [attemptFilter, statusFilter, selectedStudent]);

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

  const activeStudentObj = students.find((s) => s.email === selectedStudent);

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
            Track which examinations have been attempted or not given by candidates, configure PINs, and manage papers
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

      {/* Top Attempt Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card
            onClick={() => setAttemptFilter('all')}
            sx={{
              p: 2,
              borderRadius: 2,
              cursor: 'pointer',
              border: attemptFilter === 'all' ? '2px solid #1a73e8' : '1px solid #dadce0',
              backgroundColor: attemptFilter === 'all' ? '#f8fafd' : '#ffffff',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#1a73e8' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#5f6368', textTransform: 'uppercase', fontWeight: 600 }}>
                  All Examinations
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#202124', mt: 0.5 }}>
                  {metrics.totalCount}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#e8f0fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a73e8',
                }}
              >
                <QuizOutlinedIcon fontSize="small" />
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            onClick={() => setAttemptFilter('attempted')}
            sx={{
              p: 2,
              borderRadius: 2,
              cursor: 'pointer',
              border: attemptFilter === 'attempted' ? '2px solid #137333' : '1px solid #dadce0',
              backgroundColor: attemptFilter === 'attempted' ? '#f6fbf7' : '#ffffff',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#137333' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#137333', textTransform: 'uppercase', fontWeight: 600 }}>
                  Attempted (Given)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#137333', mt: 0.5 }}>
                  {metrics.attemptedCount}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#e6f4ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#137333',
                }}
              >
                <AssignmentTurnedInIcon fontSize="small" />
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            onClick={() => setAttemptFilter('unattempted')}
            sx={{
              p: 2,
              borderRadius: 2,
              cursor: 'pointer',
              border: attemptFilter === 'unattempted' ? '2px solid #e37400' : '1px solid #dadce0',
              backgroundColor: attemptFilter === 'unattempted' ? '#fefaf0' : '#ffffff',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#e37400' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#b06000', textTransform: 'uppercase', fontWeight: 600 }}>
                  Not Given Yet (Unattempted)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#e37400', mt: 0.5 }}>
                  {metrics.unattemptedCount}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#fef7e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e37400',
                }}
              >
                <HourglassEmptyIcon fontSize="small" />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Candidate Filter Alert Banner (if student selected) */}
      {selectedStudent && (
        <Alert
          severity="info"
          icon={<PersonOutlinedIcon />}
          action={
            <Button color="inherit" size="small" onClick={() => setSelectedStudent('')} startIcon={<ClearIcon />}>
              Clear Filter
            </Button>
          }
          sx={{ mb: 3, borderRadius: 2 }}
        >
          Filtering examinations for candidate: <strong>{activeStudentObj?.name || selectedStudent}</strong> ({selectedStudent}).
          Showing papers {attemptFilter === 'attempted' ? 'they have appeared for' : attemptFilter === 'unattempted' ? 'they have NOT given yet' : 'and their attempt records'}.
        </Alert>
      )}

      {/* Primary Tabs & Filters Card */}
      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2, mb: 3 }}>
        {/* Attempt Status Tabs */}
        <Box sx={{ borderBottom: '1px solid #f1f3f4', px: 2, pt: 1 }}>
          <Tabs
            value={attemptFilter}
            onChange={(e, val) => setAttemptFilter(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 46 }}
          >
            <Tab
              label={`All Papers (${metrics.totalCount})`}
              value="all"
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' }}
            />
            <Tab
              icon={<CheckCircleIcon sx={{ fontSize: '16px !important', color: '#137333' }} />}
              iconPosition="start"
              label={`Attempted (${metrics.attemptedCount})`}
              value="attempted"
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' }}
            />
            <Tab
              icon={<HourglassEmptyIcon sx={{ fontSize: '16px !important', color: '#e37400' }} />}
              iconPosition="start"
              label={`Not Given Yet (${metrics.unattemptedCount})`}
              value="unattempted"
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' }}
            />
          </Tabs>
        </Box>

        {/* Secondary Filter Toolbar */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Candidate Dropdown */}
          <TextField
            select
            size="small"
            label="Candidate / Student"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            sx={{ minWidth: 230 }}
          >
            <MenuItem value="">All Candidates (Global View)</MenuItem>
            {students.map((st) => (
              <MenuItem key={st.email} value={st.email}>
                {st.name} ({st.email})
              </MenuItem>
            ))}
          </TextField>

          {/* Paper Publication Status */}
          <TextField
            select
            size="small"
            label="Paper Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="draft">Drafts</MenuItem>
            <MenuItem value="deactivated">Deactivated</MenuItem>
          </TextField>

          {/* Search Field */}
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, minWidth: 200 }}>
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
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Examination</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Questions / Marks</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Duration</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>PIN</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Student Attempt Status</TableCell>
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

                    {/* Student Attempt Status Column */}
                    <TableCell>
                      {exam.isAttempted ? (
                        <Box>
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                            label={
                              exam.attemptCount === 1
                                ? 'Attempted (1)'
                                : `Attempted (${exam.attemptCount})`
                            }
                            size="small"
                            sx={{
                              backgroundColor: '#e6f4ea',
                              color: '#137333',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                          {exam.latestAttempt && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, color: '#202124', display: 'block', lineHeight: 1.2 }}
                              >
                                {exam.latestAttempt.studentName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#5f6368', display: 'block' }}>
                                {exam.latestAttempt.status === 'in_progress'
                                  ? 'Active Session'
                                  : `${exam.latestAttempt.obtainedMarks} / ${exam.totalMarks} (${exam.latestAttempt.percentage}%)`}
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                                onClick={() => router.push(`/admin/attempts/${exam.latestAttempt.id}`)}
                                sx={{
                                  p: 0,
                                  minWidth: 0,
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  color: '#1a73e8',
                                  mt: 0.2,
                                }}
                              >
                                View Attempt
                              </Button>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box>
                          <Chip
                            icon={<HourglassEmptyIcon sx={{ fontSize: '14px !important' }} />}
                            label="Not Given Yet"
                            size="small"
                            sx={{
                              backgroundColor: '#fef7e0',
                              color: '#b06000',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#80868b', display: 'block', mt: 0.5 }}>
                            No submissions
                          </Typography>
                          {exam.status === 'published' && (
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<ContentCopyIcon sx={{ fontSize: 12 }} />}
                              onClick={() => handleCopyLink(exam.publicId, exam.pin)}
                              sx={{
                                p: 0,
                                minWidth: 0,
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                color: '#1a73e8',
                                mt: 0.2,
                              }}
                            >
                              Copy Link & PIN
                            </Button>
                          )}
                        </Box>
                      )}
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
                    {attemptFilter === 'attempted'
                      ? 'No attempted examinations found with the current filters.'
                      : attemptFilter === 'unattempted'
                      ? 'All examinations have been attempted! No unattempted examinations found.'
                      : 'No examinations found in this category. Click "Create Examination" to publish a new paper.'}
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
