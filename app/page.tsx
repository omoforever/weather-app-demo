import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function HomePage() {
  return (
    <Container maxWidth="sm" sx={{ py: 12 }}>
      <Stack spacing={4}>
        <Typography variant="h4" component="h1">
          Weather
        </Typography>
        <Typography color="text.secondary">
          Search UI lands with the next ticket. The data endpoint is live at{' '}
          <Typography component="span" variant="caption">
            /api/weather?location=…
          </Typography>
        </Typography>
      </Stack>
    </Container>
  )
}
