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
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import GradingIcon from '@mui/icons-material/Grading';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useRouter } from 'next/navigation';

export default function StudentAttemptsPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState([]);
  const [examinations, setExaminations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [evalFilter, setEvalFilter] = useState('all');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch examinations for dropdown
  useEffect(() => {
    async function loadExams() {
      try {
        const res = await fetch('/api/examinations?limit=100');
        const data = await res.json();
        if (data.success) {
          setExaminations(data.examinations || []);
        }
      } catch (err) {
        // error
      }
    }
    loadExams();
  }, []);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.append('search', search.trim());
      if (selectedExamId) q.append('examinationId', selectedExamId);
      if (statusFilter !== 'all') q.append('status', statusFilter);
      if (evalFilter !== 'all') q.append('evaluationStatus', evalFilter);

      const res = await fetch(`/api/admin/attempts?${q.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAttempts(data.attempts || []);
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to fetch attempts', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, [selectedExamId, statusFilter, evalFilter]);

  const handleExportAll = () => {
    if (!selectedExamId) {
      setSnackbar({ open: true, message: 'Please select an examination first to export all its attempts.', severity: 'info' });
      return;
    }
    const exam = examinations.find((e) => e._id === selectedExamId);
    const identifier = exam ? exam.publicId : selectedExamId;
    window.location.href = `/api/admin/attempts/export?examPublicId=${identifier}`;
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
            Student Examination Attempts
          </Typography>
          <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
            Review student submissions, manual evaluation grades, and export comprehensive audit records
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={handleExportAll}
          disabled={!selectedExamId}
          sx={{ borderColor: '#dadce0', color: '#1a73e8', backgroundColor: '#ffffff' }}
        >
          Export Exam Submissions (JSON)
        </Button>
      </Box>

      {/* Filter Toolbar */}
      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2, mb: 3 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
          }}
        >
          {/* Search Field */}
          <Box component="form" onSubmit={(e) => { e.preventDefault(); fetchAttempts(); }} sx={{ flexGrow: 1, minWidth: 220 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search student name, email, exam ID..."
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

          {/* Exam Selector */}
          <TextField
            select
            size="small"
            label="Examination"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Examinations</MenuItem>
            {examinations.map((ex) => (
              <MenuItem key={ex._id} value={ex._id}>
                {ex.title} ({ex.publicId})
              </MenuItem>
            ))}
          </TextField>

          {/* Submission Status */}
          <TextField
            select
            size="small"
            label="Attempt Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="auto_submitted">Auto Submitted</MenuItem>
            <MenuItem value="evaluated">Evaluated</MenuItem>
          </TextField>

          {/* Evaluation Status */}
          <TextField
            select
            size="small"
            label="Evaluation"
            value={evalFilter}
            onChange={(e) => setEvalFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="all">All Evaluations</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="partially_evaluated">Partially Graded</MenuItem>
            <MenuItem value="fully_evaluated">Fully Graded</MenuItem>
          </TextField>
        </Box>

        {/* Attempts Table */}
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Examination</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Attempt #</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Score / %</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Evaluation</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Submitted</TableCell>
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
              ) : attempts.length > 0 ? (
                attempts.map((att) => {
                  const exam = att.examinationId;
                  const isSubmitted = ['submitted', 'auto_submitted', 'evaluated'].includes(att.status);
                  return (
                    <TableRow key={att._id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#202124' }}>
                          {att.studentName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#5f6368' }}>
                          {att.studentEmail}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#3c4043' }}>
                          {exam?.title || att.examPublicId}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#80868b' }}>
                          {att.examPublicId}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">#{att.attemptNumber}</Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={att.status.replace('_', ' ')}
                          size="small"
                          color={
                            att.status === 'evaluated'
                              ? 'success'
                              : isSubmitted
                              ? 'primary'
                              : 'warning'
                          }
                          sx={{ textTransform: 'capitalize', fontSize: '0.75rem' }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {att.obtainedMarks} / {att.totalMarks} ({att.percentage}%)
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={
                            att.evaluationStatus === 'fully_evaluated'
                              ? 'Graded'
                              : att.evaluationStatus === 'partially_evaluated'
                              ? 'Partial'
                              : 'Pending'
                          }
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor:
                              att.evaluationStatus === 'fully_evaluated' ? '#137333' : '#e37400',
                            color:
                              att.evaluationStatus === 'fully_evaluated' ? '#137333' : '#e37400',
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#5f6368' }}>
                          {att.submittedAt
                            ? new Date(att.submittedAt).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : 'In progress'}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="Inspect & Grade">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/admin/attempts/${att._id}`)}
                              sx={{ color: '#1a73e8' }}
                            >
                              <GradingIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Download Attempt JSON">
                            <IconButton
                              size="small"
                              component="a"
                              href={`/api/admin/attempts/export?attemptId=${att._id}`}
                              sx={{ color: '#5f6368' }}
                            >
                              <FileDownloadOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#5f6368' }}>
                    No attempts found matching the current search and filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

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

