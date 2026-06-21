import { useNavigate } from 'react-router-dom'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)',
      padding: '60px 24px 100px',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-faint)', fontSize: 13, padding: 0,
            marginBottom: 48, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#F4845F', marginBottom: 14, opacity: 0.8,
          }}>Legal</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700,
            margin: '0 0 16px', letterSpacing: '-0.02em',
          }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>
            Last updated: June 21, 2026
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

          <Section title="What Indelify is">
            Indelify is a music discovery app that uses AI to suggest songs based on your mood,
            environment, dreams, or lyrical themes. It is operated by Ananya Shanker as a personal project.
          </Section>

          <Section title="What data we collect">
            <p>When you sign in, we receive basic profile information from your OAuth provider (Google or Spotify):</p>
            <ul>
              <li>Your name and email address</li>
              <li>Your profile picture URL</li>
              <li>A unique account identifier</li>
            </ul>
            <p>When you use the app while signed in, we store:</p>
            <ul>
              <li>Your saved playlists (track lists and names you choose)</li>
              <li>Your recent search history (the prompts you entered)</li>
            </ul>
            <p>
              We do <strong>not</strong> collect payment information, precise location, contacts,
              or any data beyond what is listed above.
            </p>
          </Section>

          <Section title="How we use your data">
            <ul>
              <li>To save your playlists and search history to your account</li>
              <li>To display your name and profile picture in the app</li>
              <li>To push playlists to your Spotify account when you request it</li>
            </ul>
            <p>We do not sell your data, share it with advertisers, or use it for any purpose beyond operating the app.</p>
          </Section>

          <Section title="Third-party services">
            <p>Indelify uses the following external services:</p>
            <ul>
              <li><strong>Google OAuth</strong> — for sign-in. Governed by Google's Privacy Policy.</li>
              <li><strong>Spotify OAuth</strong> — for sign-in and playlist creation. Governed by Spotify's Privacy Policy.</li>
              <li><strong>Supabase</strong> — stores your account data and playlists. Data is stored in the EU (AWS eu-west-1). Governed by Supabase's Privacy Policy.</li>
              <li><strong>Groq / Meta LLaMA</strong> — processes your text and image inputs to generate music recommendations. Your inputs are sent to Groq's API but are not linked to your identity.</li>
            </ul>
          </Section>

          <Section title="Image uploads">
            When you use the Environment tab, the photo you upload is sent directly to our AI model
            (Groq) for analysis and is not stored anywhere. It is discarded immediately after the
            response is returned.
          </Section>

          <Section title="Your rights">
            <p>You can:</p>
            <ul>
              <li>Delete your saved playlists at any time from within the app</li>
              <li>Request deletion of your account and all associated data by emailing{' '}
                <a href="mailto:ananyashanker24@gmail.com" style={{ color: '#F4845F' }}>
                  ananyashanker24@gmail.com
                </a>
              </li>
            </ul>
            <p>
              If you are in the EU or UK, you have additional rights under GDPR including the right
              to access, rectify, and port your data.
            </p>
          </Section>

          <Section title="Cookies and local storage">
            Indelify does not use tracking cookies. We use your browser's localStorage to save
            your theme preference and recent search history locally on your device.
          </Section>

          <Section title="Changes to this policy">
            If we make significant changes, we will update the "Last updated" date at the top of
            this page. Continued use of the app after changes means you accept the updated policy.
          </Section>

          <Section title="Contact">
            Questions? Email{' '}
            <a href="mailto:ananyashanker24@gmail.com" style={{ color: '#F4845F' }}>
              ananyashanker24@gmail.com
            </a>
          </Section>

        </div>

        <div style={{
          marginTop: 64, paddingTop: 24,
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-faint)',
        }}>
          © 2026 Ananya Shanker · Indelify
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{
        fontSize: 15, fontWeight: 600, marginBottom: 12,
        color: 'var(--text-primary)', letterSpacing: '-0.01em',
      }}>{title}</h2>
      <div style={{
        fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75,
      }}>
        {typeof children === 'string' ? <p style={{ margin: 0 }}>{children}</p> : children}
      </div>
    </div>
  )
}
