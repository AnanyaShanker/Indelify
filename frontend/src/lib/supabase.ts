import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://cmytcwztovpetvvuxogd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNteXRjd3p0b3ZwZXR2dnV4b2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTUzODQsImV4cCI6MjA5NzI3MTM4NH0.dAbeExLTswyEmMf6mPrtyzg8q80AKrimPiYXEiR4OPk'
)
