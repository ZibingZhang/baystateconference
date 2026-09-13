import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  colorSchemes: {
    light: true,
    dark: true,
  },
  typography: {
    fontFamily: 'Roboto, system-ui, sans-serif',
  },
  shape: {
    borderRadius: 6,
  },
})

export default theme
