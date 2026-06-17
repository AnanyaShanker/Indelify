export default function TrackCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="track-card" style={{ opacity: 1 - i * 0.12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 15, width: '58%', borderRadius: 5, marginBottom: 7 }} />
                  <div className="skeleton" style={{ height: 12, width: '38%', borderRadius: 5 }} />
                </div>
                <div className="skeleton" style={{ height: 30, width: 58, borderRadius: 8, flexShrink: 0 }} />
              </div>
              <div className="skeleton" style={{ height: 12, width: '88%', borderRadius: 5, marginBottom: 5 }} />
              <div className="skeleton" style={{ height: 12, width: '68%', borderRadius: 5 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
