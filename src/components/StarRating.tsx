import React from 'react';

type Props = {
  value: number;
  onChange: (v: number) => void;
  size?: number;
};

const StarRating: React.FC<Props> = ({ value, onChange, size = 30 }) => {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: size,
              lineHeight: 1,
              padding: 0,
              color: active ? '#f59e0b' : '#6b7280',
            }}
            aria-label={`${n} star`}
          >
            ★
          </button>
        );
      })}
      <span style={{ color: '#9ca3af', marginLeft: 8 }}>
        {value ? `${value}/5` : 'Select rating'}
      </span>
    </div>
  );
};

export default StarRating;