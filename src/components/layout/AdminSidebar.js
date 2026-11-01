'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import GradingOutlinedIcon from '@mui/icons-material/GradingOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import { usePathname, useRouter } from 'next/navigation';

const DRAWER_WIDTH = 250;

const NAV_ITEMS = [
  { label: 'Overview', path: '/admin/dashboard', icon: <DashboardOutlinedIcon /> },
  { label: 'Examinations', path: '/admin/examinations', icon: <QuizOutlinedIcon /> },
  { label: 'Student Attempts', path: '/admin/attempts', icon: <PeopleOutlinedIcon /> },
  { label: 'Evaluation', path: '/admin/evaluation', icon: <GradingOutlinedIcon /> },
  { label: 'Settings', path: '/admin/settings', icon: <SettingsOutlinedIcon /> },
];

export default function AdminSidebar({ mobileOpen, onCloseMobile }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = (path) => {
    router.push(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 2, pb: 2 }}>
      {/* Primary Action Button */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<AddCircleOutlinedIcon />}
          onClick={() => handleNavigate('/admin/examinations/new')}
          sx={{
            py: 1.2,
            fontWeight: 500,
            borderRadius: '24px', // Google-style pill FAB / Button
            boxShadow: '0 1px 3px 0 rgba(60,64,67,0.3)',
          }}
        >
          Create Exam
        </Button>
      </Box>

      {/* Navigation List */}
      <List sx={{ px: 1, flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.path || (item.path !== '/admin/dashboard' && pathname.startsWith(item.path));
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: '0 24px 24px 0',
                  mr: 1,
                  py: 1,
                  px: 2,
                  color: isActive ? '#1a73e8' : '#3c4043',
                  backgroundColor: isActive ? '#e8f0fe !important' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  '&:hover': {
                    backgroundColor: isActive ? '#e8f0fe' : '#f1f3f4',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? '#1a73e8' : '#5f6368',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ my: 1, borderColor: '#dadce0' }} />

      {/* Version and System Info footer */}
      <Box sx={{ px: 3, pt: 1 }}>
        <Box sx={{ fontSize: '0.75rem', color: '#80868b' }}>
          ExamFlow v1.0.0
        </Box>
        <Box sx={{ fontSize: '0.75rem', color: '#bdc1c6', mt: 0.5 }}>
          Google Material UI Edition
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer (Temporary) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid #dadce0',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer (Permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid #dadce0',
            top: '64px',
            height: 'calc(100% - 64px)',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
