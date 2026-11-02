'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/layout/AdminNavbar';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (isMounted) {
          if (data.authenticated && data.admin) {
            setAdmin(data.admin);
            setLoading(false);
          } else {
            router.push('/admin-login');
          }
        }
      } catch (err) {
        if (isMounted) {
          router.push('/admin-login');
        }
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleToggleSidebar = () => {
    setMobileOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          gap: 2,
        }}
      >
        <CircularProgress size={42} sx={{ color: '#1a73e8' }} />
        <Typography variant="body2" sx={{ color: '#5f6368', fontWeight: 500 }}>
          Authenticating Admin Console...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <AdminNavbar onToggleSidebar={handleToggleSidebar} admin={admin} />
      <Box sx={{ display: 'flex', flexGrow: 1, pt: '64px' }}>
        <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: { xs: '100%', md: 'calc(100% - 250px)' },
            width: '100%',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

