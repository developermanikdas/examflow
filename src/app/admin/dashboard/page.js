'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        // error handled
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const handleDownloadDemo = () => {
    window.location.href = '/demo-exam-template.json';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ color: '#1a73e8' }} />
      </Box>
    );
  }

  const kpis = [
    {
      label: 'Total Examinations',
      value: stats?.totalExaminations || 0,
      icon: <QuizOutlinedIcon sx={{ color: '#1a73e8' }} />,
      bgColor: '#e8f0fe',
      href: '/admin/examinations',
    },
    {
      label: 'Attempted Papers',
      value: stats?.attemptedExaminations || 0,
      icon: <AssignmentTurnedInIcon sx={{ color: '#137333' }} />,
      bgColor: '#e6f4ea',
      href: '/admin/examinations',
    },
    {
      label: 'Not Given Yet',
      value: stats?.unattemptedExaminations || 0,
      icon: <HourglassEmptyIcon sx={{ color: '#e37400' }} />,
      bgColor: '#fef7e0',
      href: '/admin/examinations',
    },
    {
      label: 'Total Attempts',
      value: stats?.totalAttempts || 0,
      icon: <GroupOutlinedIcon sx={{ color: '#1a73e8' }} />,
      bgColor: '#e8f0fe',
      href: '/admin/attempts',
    },
    {
      label: 'Completed Attempts',
      value: stats?.completedAttempts || 0,
      icon: <FactCheckOutlinedIcon sx={{ color: '#137333' }} />,
      bgColor: '#e6f4ea',
      href: '/admin/attempts',
    },
    {
      label: 'Pending Evaluations',
      value: stats?.pendingEvaluations || 0,
      icon: <PendingActionsOutlinedIcon sx={{ color: '#d93025' }} />,
      bgColor: '#fce8e6',
      href: '/admin/attempts',
    },
  ];

  return (
    <Box>
      {/* Page Title & Top Actions */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124' }}>
            System Overview
          </Typography>
          <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
            Real-time status of examinations, student participation, and evaluation queues
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadOutlinedIcon />}
            onClick={handleDownloadDemo}
            sx={{
              borderColor: '#dadce0',
              color: '#3c4043',
              backgroundColor: '#ffffff',
            }}
          >
            Demo JSON Paper
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlinedIcon />}
            onClick={() => router.push('/admin/examinations/new')}
            sx={{
              borderRadius: '6px',
            }}
          >
            Create Examination
          </Button>
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={4} key={idx}>
            <Card
              onClick={() => kpi.href && router.push(kpi.href)}
              sx={{
                borderRadius: 2,
                boxShadow: '0 1px 2px 0 rgba(60,64,67,0.1)',
                border: '1px solid #dadce0',
                cursor: kpi.href ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 2px 6px 0 rgba(60,64,67,0.15)',
                  borderColor: '#1a73e8',
                },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2.5 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: kpi.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  {kpi.icon}
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#202124', lineHeight: 1.1 }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#5f6368', mt: 0.5 }}>
                    {kpi.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Table Card */}
      <Card sx={{ borderRadius: 2, border: '1px solid #dadce0', mb: 3 }}>
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f1f3f4',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Recent Student Submissions
            </Typography>
            <Typography variant="body2" sx={{ color: '#5f6368' }}>
              Latest attempts recorded across examinations
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => router.push('/admin/attempts')}
            sx={{ color: '#1a73e8' }}
          >
            View All
          </Button>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Examination</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Score / %</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Evaluation</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#5f6368' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats?.recentAttempts && stats.recentAttempts.length > 0 ? (
                stats.recentAttempts.map((attempt) => (
                  <TableRow key={attempt._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#202124' }}>
                        {attempt.studentName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#5f6368' }}>
                        {attempt.studentEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#3c4043' }}>
                        {attempt.examinationId?.title || attempt.examPublicId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={attempt.status}
                        size="small"
                        color={
                          attempt.status === 'evaluated'
                            ? 'success'
                            : attempt.status === 'submitted' || attempt.status === 'auto_submitted'
                            ? 'primary'
                            : 'warning'
                        }
                        sx={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {attempt.obtainedMarks} / {attempt.totalMarks} ({attempt.percentage}%)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          attempt.evaluationStatus === 'fully_evaluated'
                            ? 'Complete'
                            : attempt.evaluationStatus === 'partially_evaluated'
                            ? 'Partially Graded'
                            : 'Pending'
                        }
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor:
                            attempt.evaluationStatus === 'fully_evaluated' ? '#137333' : '#e37400',
                          color:
                            attempt.evaluationStatus === 'fully_evaluated' ? '#137333' : '#e37400',
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => router.push(`/admin/attempts/${attempt._id}`)}
                        sx={{ color: '#1a73e8' }}
                      >
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#5f6368' }}>
                    No student attempts recorded yet. Publish an examination and share the link with students to get started.
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
