import React, { forwardRef, useImperativeHandle, useRef } from 'react';

const CanvasDrawMock = forwardRef(function CanvasDrawMock(props, ref) {
  const canvasRef = useRef();

  useImperativeHandle(ref, () => ({
    getSaveData: () => JSON.stringify({ strokes: [] }),
    loadSaveData: (data) => {
      // no-op: mock
      return;
    },
    clear: () => {},
  }));

  return (
    <canvas
      ref={canvasRef}
      width={props.canvasWidth || 500}
      height={props.canvasHeight || 500}
      style={{ background: props.background || 'transparent' }}
    />
  );
});

export default CanvasDrawMock;
