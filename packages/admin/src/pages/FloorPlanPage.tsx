import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const FATE_COLORS: Record<string, string> = {
  KEEP: '#16a34a',
  SELL: '#f97316',
  DONATE: '#7c3aed',
  TRASH: '#dc2626',
  UNDECIDED: '#6b7280',
};

const FATE_ORDER = ['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED'];

interface Room {
  id: string;
  name: string;
  floor: string;
  color: string;
  totalItems: number;
  fateCounts: Record<string, number>;
}

interface FloorData {
  floor: string;
  rooms: Room[];
}

export function FloorPlanPage() {
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [house, setHouse] = useState('Eagle Mountain, UT');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('stash_token');
    fetch(`/api/floorplan/${encodeURIComponent(house)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setFloors(data.floors || []))
      .finally(() => setLoading(false));
  }, [house]);

  if (loading) return <div className="loading">Loading floor plan...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Floor Plan</h2>
        <div className="floor-plan-house-toggle">
          <button
            className={`btn ${house === 'Eagle Mountain, UT' ? 'btn-primary' : ''}`}
            onClick={() => setHouse('Eagle Mountain, UT')}
          >
            Origin (Utah)
          </button>
          <button
            className={`btn ${house === 'NC Property — TBD' ? 'btn-primary' : ''}`}
            onClick={() => setHouse('NC Property — TBD')}
          >
            Destination (NC)
          </button>
        </div>
      </div>

      {/* Fate Legend */}
      <div className="floor-plan-legend">
        {FATE_ORDER.map((fate) => (
          <div key={fate} className="floor-plan-legend-item">
            <div className="floor-plan-legend-dot" style={{ backgroundColor: FATE_COLORS[fate] }} />
            <span>{fate}</span>
          </div>
        ))}
      </div>

      {floors.length === 0 ? (
        <div className="empty-state">No locations found for {house}</div>
      ) : (
        floors.map((floorData) => (
          <div key={floorData.floor} className="floor-plan-floor">
            <h3 className="floor-plan-floor-title">{floorData.floor}</h3>
            <div className="floor-plan-grid">
              {floorData.rooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/locations/${room.id}`}
                  className="floor-plan-room"
                  style={{ borderLeftColor: room.color }}
                >
                  <div className="floor-plan-room-header">
                    <span className="floor-plan-room-name">{room.name}</span>
                    <span className="floor-plan-room-count">{room.totalItems}</span>
                  </div>

                  {room.totalItems > 0 && (
                    <div className="floor-plan-fate-bar">
                      {FATE_ORDER.map((fate) => {
                        const count = room.fateCounts[fate] || 0;
                        if (count === 0) return null;
                        const pct = (count / room.totalItems) * 100;
                        return (
                          <div
                            key={fate}
                            className="floor-plan-fate-segment"
                            style={{ width: `${pct}%`, backgroundColor: FATE_COLORS[fate] }}
                            title={`${fate}: ${count}`}
                          />
                        );
                      })}
                    </div>
                  )}

                  {room.totalItems > 0 && (
                    <div className="floor-plan-fate-counts">
                      {FATE_ORDER.map((fate) => {
                        const count = room.fateCounts[fate] || 0;
                        if (count === 0) return null;
                        return (
                          <span key={fate} className="floor-plan-fate-label" style={{ color: FATE_COLORS[fate] }}>
                            {fate[0]}: {count}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
