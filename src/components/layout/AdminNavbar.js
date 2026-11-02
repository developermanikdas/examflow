'use client';

import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import SchoolIcon from '@mui/icons-material/School';
import Chip from '@mui/material/Chip';
import { useRouter } from 'next/navigation';

export default function AdminNavbar({ onToggleSidebar, admin }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    router.push('/admin-login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #dadce0',
      }}
    >
      <Toolbar sx={{ minHeight: '64px', px: { xs: 2, sm: 3 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onToggleSidebar}
          sx={{ mr: 2, display: { md: 'none' }, color: '#5f6368' }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo and Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => router.push('/admin/dashboard')}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#e8f0fe',
              color: '#1a73e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SchoolIcon fontSize="medium" />
          </Box>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              color: '#202124',
              letterSpacing: '-0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
            }}
          >
            ExamFlow
            <Chip
              label="Admin Console"
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                backgroundColor: '#e8f0fe',
                color: '#1a73e8',
                fontWeight: 600,
                borderRadius: '4px',
              }}
            />
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* User Info & Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {admin && (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#1a73e8',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
              </Avatar>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#202124', lineHeight: 1.2 }}>
                  {admin.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#5f6368' }}>
                  {admin.email}
                </Typography>
              </Box>
            </Box>
          )}

          <Tooltip title="Sign Out">
            <Button
              variant="outlined"
              size="small"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{
                color: '#5f6368',
                borderColor: '#dadce0',
                '&:hover': {
                  borderColor: '#d93025',
                  color: '#d93025',
                  backgroundColor: '#fce8e6',
                },
              }}
            >
              Logout
            </Button>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

