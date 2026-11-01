'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import GradingIcon from '@mui/icons-material/Grading';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { useRouter } from 'next/navigation';

export default function EvaluationQueuePage() {
  const router = useRouter();
  const [pendingAttempts, setPendingAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/admin/attempts?limit=100');
        const data = await res.json();
        if (data.success) {
          // Include both manually submitted and auto-submitted exams awaiting evaluation
          const filtered = (data.attempts || []).filter(
            (a) =>
              ['submitted', 'auto_submitted'].includes(a.status) &&
              (a.evaluationStatus === 'pending' || a.evaluationStatus === 'partially_evaluated')
          );
          setPendingAttempts(filtered);
        }
      } catch (err) {
        // error
      } finally {
        setLoading(false);
      }
    }
    fetchPending();
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124' }}>
          Manual Evaluation Queue
        </Typography>
        <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
          Submissions with written questions (Short Answer, Descriptive, Long Answer) awaiting instructor grading
        </Typography>
      </Box>

      <Card sx={{ border: '1px solid #dadce0', borderRadius: 2 }}>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Examination</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Submitted At</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Evaluation Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Current Marks</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#5f6368' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#1a73e8' }} />
                  </TableCell>
                </TableRow>
              ) : pendingAttempts.length > 0 ? (
                pendingAttempts.map((att) => (
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
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {att.examinationId?.title || att.examPublicId}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {att.submittedAt
                          ? new Date(att.submittedAt).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Recent'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={att.evaluationStatus === 'partially_evaluated' ? 'Partially Graded' : 'Pending Grading'}
                        size="small"
                        sx={{
                          backgroundColor: att.evaluationStatus === 'partially_evaluated' ? '#fef7e0' : '#fce8e6',
                          color: att.evaluationStatus === 'partially_evaluated' ? '#e37400' : '#c5221f',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {att.obtainedMarks} / {att.totalMarks}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        startIcon={<GradingIcon />}
                        onClick={() => router.push(`/admin/attempts/${att._id}`)}
                        sx={{ borderRadius: '6px' }}
                      >
                        Grade Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <CheckCircleOutlinedIcon sx={{ fontSize: 44, color: '#137333' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#202124' }}>
                        Evaluation Queue is Clear!
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#5f6368' }}>
                        All student submissions have been fully graded.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
