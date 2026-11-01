'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8', // Google Blue
      light: '#e8f0fe',
      dark: '#1557b0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#5f6368', // Google Grey
      light: '#f1f3f4',
      dark: '#3c4043',
      contrastText: '#ffffff',
    },
    success: {
      main: '#1e8e3e',
      light: '#e6f4ea',
      dark: '#137333',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f9ab00',
      light: '#fef7e0',
      dark: '#e37400',
      contrastText: '#202124',
    },
    error: {
      main: '#d93025',
      light: '#fce8e6',
      dark: '#c5221f',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
      disabled: '#80868b',
    },
    divider: '#dadce0',
  },
  typography: {
    fontFamily: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 500,
      letterSpacing: '-0.25px',
      color: '#202124',
    },
    h5: {
      fontWeight: 500,
      color: '#202124',
    },
    h6: {
      fontWeight: 500,
      color: '#202124',
    },
    subtitle1: {
      color: '#5f6368',
      fontWeight: 400,
    },
    subtitle2: {
      fontWeight: 500,
      color: '#3c4043',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '7px 18px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#1557b0',
          },
        },
        outlined: {
          borderColor: '#dadce0',
          color: '#1a73e8',
          '&:hover': {
            backgroundColor: '#f1f3f4',
            borderColor: '#dadce0',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #dadce0',
          boxShadow: '0 1px 2px 0 rgba(60,64,67,0.06)',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: '#dadce0',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#202124',
          borderBottom: '1px solid #dadce0',
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
        },
      },
    },
  },
});

export default theme;

