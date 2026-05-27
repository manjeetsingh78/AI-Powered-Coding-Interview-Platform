import React from 'react';

const MonacoMock = ({ value = '', onChange }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      style={{ width: '100%', height: '400px', fontFamily: 'monospace' }}
    />
  );
};

export default MonacoMock;
